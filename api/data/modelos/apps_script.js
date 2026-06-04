var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    if (!e?.postData?.contents) return response({ status: "error", message: "Requisição inválida" });
    const data = JSON.parse(e.postData.contents);
    if (data.apiKey !== SECRET_KEY) return response({ status: "error", message: "Acesso Negado" });

    const action = (data.action || "").toLowerCase();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Roteador de Ações Especiais (Fora da lógica de mapaAbas)
    if (action === 'finalizarpedido') {
      const sheet = getSheetCaseInsensitive(ss, "pedidos");
      if (!sheet) return response({ status: "error", message: "Aba 'pedidos' não encontrada" });
      return response(handleSalvarPedidoComChat(sheet, data));
    }

    // Lógica para Ações Padrão
    const mapaAbas = {
      "mensagem": "chat", "chat": "chat", "mensagens_chat": "chat",
      "pedido": "pedidos", "pedidos": "pedidos",
      "colaborador": "colaboradores", "colaboradores": "colaboradores"
    };

    // Remove apenas os prefixos de ação, nunca o nome da entidade
    const entity = action.replace(/^(get|add|delete|update|save)/, '');
    const nomeAba = mapaAbas[entity] || entity;
    const sheet = getSheetCaseInsensitive(ss, nomeAba);

    if (!sheet) return response({ status: "error", message: "Aba não encontrada: " + nomeAba });

    // Roteador de Handlers
    if (action.startsWith('get')) return response(handleGet(sheet));
    if (action.startsWith('add')) return response(handleAdd(sheet, data, entity));
    if (action.startsWith('update')) return response(handleUpdate(sheet, data));
    if (action.startsWith('delete')) return response(handleDelete(sheet, data.id));

    return response({ status: "error", message: "Ação não suportada" });

  } catch (err) {
    return response({ status: "error", message: err.toString() });
  }
}

// Helper para garantir resposta JSON padrão
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Lógica de Geração de ID Automática
function generateId(sheet, entity) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("id");
  
  if (idIndex === -1) return null;

  var maxId = 0;
  for (var i = 1; i < rows.length; i++) {
    var val = String(rows[i][idIndex]).replace("RDO", "");
    if (!isNaN(val) && parseInt(val) > maxId) maxId = parseInt(val);
  }
  
  var nextId = maxId + 1;
  return (entity === "pedido" || entity === "pedidos") ? "RDO" + nextId : nextId;
}

function handleAdd(sheet, data, entity) {
  var headers = sheet.getDataRange().getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");
  
  if (idIndex !== -1 && (!data.id || data.id === "")) {
    data.id = generateId(sheet, entity);
  }

  var newRow = headers.map(function(h) { return data[h] || ""; });
  sheet.appendRow(newRow);
  return { status: "success", message: "Adicionado com sucesso!", id: data.id };
}

// --- Funções de Suporte Mantidas ---
function getSheetCaseInsensitive(ss, entityName) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toLowerCase().trim();
    if (name === entityName.toLowerCase()) return sheets[i];
  }
  return null;
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== "") obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");
  
  if (idIndex === -1) return { status: "error", message: "Coluna 'id' não encontrada." };

  // Garantir comparação de string limpa
  var valorBusca = String(data.id || "").trim();

  for (var i = 1; i < rows.length; i++) {
    var idLinha = String(rows[i][idIndex]).trim();
    if (idLinha === valorBusca) {
      for (var j = 0; j < headers.length; j++) {
        // Se a chave existir no objeto de dados, atualiza a célula
        if (data.hasOwnProperty(headers[j])) {
          sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
        }
      }
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID " + valorBusca + " não encontrado." };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("id");
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
  
  // 1. Processar Pedido
  const headersPedidos = sheetPedidos.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
  data.id = generateId(sheetPedidos, "pedido");
  
  // Ajuste: O nome do campo no seu banco é "depara" e "observacao"
  // O código abaixo garante que o dado enviado pelo JS (rotas/obs) entre na coluna certa
  data.depara = data.rotas || "";
  data.observacao = data.obs || "";
  data.id_chat = data.id_mensagens_chat || "";
  
  const rowPedido = headersPedidos.map(h => data[h] || "");
  sheetPedidos.appendRow(rowPedido);

  // 2. Processar Chat
  if (sheetChat) {
    const headersChat = sheetChat.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
    const novaLinhaChat = headersChat.map(h => {
      if (h === "id") return "MSG" + new Date().getTime();
      if (h === "pedido_id") return data.id;
      if (h === "id_numero") return data.id_mensagens_chat || "";
      if (h === "texto") return data.mensagem_formatada;
      if (h === "horario") return new Date().toLocaleTimeString();
      if (h === "data") return new Date().toLocaleDateString();
      if (h === "finalizado") return "TRUE";
      return "";
    });
    sheetChat.appendRow(novaLinhaChat);
  }

  return { status: "success", message: "Pedido e Chat salvos!", id: data.id };
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}