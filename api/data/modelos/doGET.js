var SECRET_KEY = "aquieumakdjdddggjrtr"; 

function doGet(e) {
  return response({ status: "success", message: "RDO Bot Engine Online." });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return response({ status: "error", message: "Acesso Negado" });
    }
    
    var action = data.action; 
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Entidades: usuarios, clientes, colaboradores, pedidos, financeiro, botconfig, chatlive
    var entity = action.replace(/get|add|delete|update/, '').toLowerCase();
    var sheet = ss.getSheetByName(entity);
    
    if (!sheet) return response({ status: "error", message: "Aba '" + entity + "' não encontrada." });

    var result;
    if (action.startsWith('get')) result = handleGet(sheet);
    else if (action.startsWith('add')) result = handleAdd(sheet, data);
    else if (action.startsWith('update')) result = handleUpdate(sheet, data);
    else if (action.startsWith('delete')) result = handleDelete(sheet, data.id);
    else return response({ status: "error", message: "Ação inválida" });
    
    return response(result);
  } catch (err) {
    return response({ status: "error", message: "Erro: " + err.toString() });
  }
}

// Funções handleGet, handleUpdate, handleDelete permanecem as mesmas do seu arquivo...
// (Mantendo sua lógica original para não quebrar a aplicação)

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(function(h) { return h.toString().toLowerCase(); });
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function handleAdd(sheet, data) {
  delete data.action;
  delete data.apiKey;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(header) {
    var key = header.toLowerCase();
    return data[key] !== undefined ? data[key] : (key === "id" ? Utilities.getUuid() : "");
  });
  sheet.appendRow(newRow);
  return { status: "success", message: "Registrado!" };
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}