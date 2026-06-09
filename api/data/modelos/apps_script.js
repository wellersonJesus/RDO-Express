var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return response({ status: "error", message: "Payload vazio" });
    
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || "").toLowerCase().trim();

    if (action === 'login') return response(handleLogin(data.username, data.password));
    if (!data.apiKey || data.apiKey !== SECRET_KEY) return response({ status: "error", message: "Acesso Negado" });

    var mapaEntidades = {
      "usuario": "usuarios", "cliente": "clientes", "contato": "clientes", "contatos": "clientes",
      "colaborador": "colaboradores", "colaboradores": "colaboradores", "bot": "botconfig",
      "chat": "chat", "pedido": "pedidos", "pedidos": "pedidos", "financeiro": "financeiro"
    };

    var entity = action.replace(/get|add|delete|update|save|finalizar/g, '').toLowerCase().trim();
    var nomeAba = mapaEntidades[entity] || entity;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetCaseInsensitive(ss, nomeAba);

    if (!sheet) return response({ status: "error", message: "Tabela não encontrada: " + nomeAba });

    if (action === 'finalizarpedido') return response(handleSalvarPedidoComChat(sheet, data));
    if (action.startsWith('get')) return response(handleGet(sheet));
    if (action.startsWith('add') || action.startsWith('save')) return response(handleAdd(sheet, data, nomeAba));
    if (action.startsWith('update')) return response(handleUpdate(sheet, data));
    if (action.startsWith('delete')) return response(handleDelete(sheet, data.id));

    return response({ status: "error", message: "Ação não suportada" });
  } catch (err) {
    return response({ status: "error", message: "Erro: " + err.toString() });
  }
}

// --- FUNÇÕES DE SUPORTE (Onde o handleGet deve estar) ---

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

function handleAdd(sheet, data, entity) {
  var headers = sheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");
  if (idIndex !== -1 && (!data.id || data.id === "")) data.id = generateId(sheet, entity);
  var row = headers.map(h => (h === "id" ? data.id : (data[h] || "")));
  sheet.appendRow(row);
  return { status: "success", message: "Adicionado!", id: data.id };
}

function handleUpdate(sheet, data) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).toLowerCase().trim());
  const idIndex = headers.indexOf("id");
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]).trim() === String(data.id).trim()) {
      Object.keys(data).forEach(key => {
        const colIndex = headers.indexOf(String(key).toLowerCase().trim());
        if (colIndex !== -1) sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
      });
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID não encontrado" };
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
  return { status: "error", message: "ID não encontrado" };
}

function handleSalvarPedidoComChat(sheetPedidos, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetChat = getSheetCaseInsensitive(ss, "chat");
  var idPedido = generateId(sheetPedidos, "pedidos");
  var idChatUnico = generateId(sheetChat, "chat");
  var linhasRota = data.rotas_texto ? data.rotas_texto.split('\n') : [];
  var deStr = linhasRota.map(l => l.split('|')[0] ? l.split('|')[0].replace(/De:/i, '').trim() : "").join(', ');
  var paraStr = linhasRota.map(l => l.split('|')[1] ? l.split('|')[1].replace(/Para:/i, '').trim() : "").join(', ');

  sheetPedidos.appendRow([idPedido, idChatUnico, data.solicitante, data.contato, data.horario, data.mercadoria, deStr, paraStr, data.retorno, data.prioridade || "N/A", data.valor_corrida, "", "PENDENTE", data.observacao]);

  if (sheetChat) {
    var agora = new Date();
    sheetChat.appendRow([idChatUnico, idPedido, data.mensagem, agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), agora.toLocaleDateString('pt-BR'), "TRUE"]);
  }
  return { status: "success", id: idPedido };
}

function handleLogin(user, pass) {
    var sheet = getSheetCaseInsensitive(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
    var data = sheet.getDataRange().getValues();
    var userRow = data.slice(1).find(r => String(r[1]).trim() === user && String(r[4]).trim() === pass);
    return userRow ? { status: "success", user: { username: userRow[1], tipo: userRow[2] } } : { status: "error", message: "Credenciais inválidas" };
}

function generateId(sheet, entity) {
  var data = sheet.getDataRange().getValues();
  if (entity.includes("pedido")) {
    var maxId = 0;
    var idIndex = data[0].map(h => String(h).toLowerCase().trim()).indexOf("id");
    for (var i = 1; i < data.length; i++) {
      var val = parseInt(String(data[i][idIndex]).replace(/[^0-9]/g, ''));
      if (!isNaN(val) && val > maxId) maxId = val;
    }
    return "RDO" + ("000000" + (maxId + 1)).slice(-6);
  }
  return Math.random().toString(36).substring(2, 13).toUpperCase();
}

function getSheetCaseInsensitive(ss, name) {
  return ss.getSheets().find(s => String(s.getName()).toLowerCase().trim() === name.toLowerCase().trim());
}

function response(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }