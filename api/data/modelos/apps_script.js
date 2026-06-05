var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return response({ status: "error", message: "Payload vazio" });
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || "").toLowerCase().trim();

    // 1. Rota de Login (Não exige API Key)
    if (action === 'login') return response(handleLogin(data.username, data.password));

    // 2. Segurança
    if (!data.apiKey || data.apiKey !== SECRET_KEY) return response({ status: "error", message: "Acesso Negado" });
    
    // 3. Mapeamento
    var mapaEntidades = {
      "usuario": "usuarios", "cliente": "clientes", "colaborador": "colaboradores",
      "bot": "botconfig", "chat": "chat", "pedido": "pedidos", "financeiro": "financeiro"
    };
    
    var entity = action.replace(/get|add|delete|update|save|finalizar/g, '').toLowerCase().trim();
    var nomeAba = mapaEntidades[entity] || entity;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetCaseInsensitive(ss, nomeAba);
    
    if (!sheet) return response({ status: "error", message: "Tabela não encontrada: " + nomeAba });

    // 4. Operações
    if (action === 'finalizarpedido') return response(handleSalvarPedidoComChat(sheet, data));
    if (action.startsWith('get')) return response(handleGet(sheet));
    if (action.startsWith('add') || action.startsWith('save')) return response(handleAdd(sheet, data, nomeAba));
    if (action.startsWith('update')) return response(handleUpdate(sheet, data));
    if (action.startsWith('delete')) return response(handleDelete(sheet, data.id));
    
    return response({ status: "error", message: "Ação não suportada: " + action });
  } catch (err) { 
    return response({ status: "error", message: "Erro crítico: " + err.toString() }); 
  }
}

// Funções únicas e consolidadas
function handleLogin(user) {
  var sheet = getSheetCaseInsensitive(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
  if (!sheet) return { status: "error", message: "Tabela usuários não encontrada" };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(h => String(h).toLowerCase().trim());
  var userIndex = headers.indexOf("username");
  var passIndex = headers.indexOf("password");
  var tipoIndex = headers.indexOf("tipo");
  
  var userRow = data.slice(1).find(r => String(r[userIndex]).trim() === user);
  
  if (!userRow) return { status: "error", message: "Usuário não encontrado" };
  
  // Retorna o hash para o Node.js validar
  return { 
    status: "success", 
    user: { 
      username: user, 
      tipo: userRow[tipoIndex], 
      password: String(userRow[passIndex]).trim() 
    } 
  };
}

function handleAdd(sheet, data, entity) {
  var headers = sheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");
  if (idIndex !== -1 && (!data.id || data.id === "")) data.id = generateId(sheet, entity);
  sheet.appendRow(headers.map(h => data[h] || ""));
  return { status: "success", message: "Adicionado!", id: data.id };
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(h => String(h).toLowerCase().trim());
  return rows.slice(1).map(row => {
    var obj = {};
    headers.forEach((h, i) => { if (h !== "") obj[h] = row[i]; });
    return obj;
  });
}

function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() === String(data.id).trim()) {
      headers.forEach((h, j) => { if (data.hasOwnProperty(h)) sheet.getRange(i + 1, j + 1).setValue(data[h]); });
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(h => String(h).toLowerCase().trim()).indexOf("id");
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() == String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluído!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function handleSalvarPedidoComChat(sheetPedidos, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetChat = getSheetCaseInsensitive(ss, "chat");
  data.id = generateId(sheetPedidos, "pedidos");
  
  // Processamento de Rotas
  const linhasRota = data.rotas_texto ? data.rotas_texto.split('\n') : [];
  data.de = linhasRota.map(l => l.split('|')[0] ? l.split('|')[0].replace(/De:/i, '').trim() : "").join(', ');
  data.para = linhasRota.map(l => l.split('|')[1] ? l.split('|')[1].replace(/Para:/i, '').trim() : "").join(', ');

  // ABA PEDIDOS: Ordem exata das colunas
  sheetPedidos.appendRow([
    data.id, data.id_chat, data.solicitante, data.contato, 
    data.horario, data.mercadoria, data.de, data.para, 
    data.retorno, data.prioridade, data.valor_corrida, data.observacao
  ]);

  // ABA CHAT: Ordem exata (id, jid_numero, pedido_id, texto, hora, data, finalizado)
  if (sheetChat) {
    const agora = new Date();
    sheetChat.appendRow([
      "MSG" + new Date().getTime(), // id
      data.id_chat,                 // jid_numero
      data.id,                      // pedido_id
      data.mensagem,                // texto (Mensagem formatada com valor)
      agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), // hora
      agora.toLocaleDateString('pt-BR'), // data
      "TRUE"                        // finalizado
    ]);
  }
  return { status: "success", id: data.id };
}

function getSheetCaseInsensitive(ss, name) { return ss.getSheets().find(s => s.getName().toLowerCase().trim() === name.toLowerCase()); }

function generateId(sheet, entity) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return (entity.includes("pedido")) ? "RDO1" : 1;
  
  var headers = data[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");
  
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var rawId = String(data[i][idIndex] || "0");
    // Extrai apenas os números, ignorando "RDO"
    var val = parseInt(rawId.replace(/[^0-9]/g, ''));
    if (!isNaN(val) && val > maxId) maxId = val;
  }
  
  var nextId = maxId + 1;
  return (entity.includes("pedido")) ? "RDO" + nextId : nextId;
}

function response(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }