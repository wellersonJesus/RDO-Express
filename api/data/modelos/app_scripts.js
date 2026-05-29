var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.apiKey || data.apiKey !== SECRET_KEY) return response({ status: "error", message: "Acesso Negado" });
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var entity = data.action.replace(/get|add|delete|update/, '').toLowerCase().trim();
    var sheet = getSheetCaseInsensitive(ss, entity);
    
    if (!sheet) return response({ status: "error", message: "Aba não encontrada: " + entity });

    var result;
    if (data.action.startsWith('get')) result = handleGet(sheet);
    else if (data.action.startsWith('add')) result = handleAdd(sheet, data, entity);
    else if (data.action.startsWith('update')) result = handleUpdate(sheet, data);
    else if (data.action.startsWith('delete')) result = handleDelete(sheet, data.id);
    
    return response(result);
  } catch (err) { return response({ status: "error", message: err.toString() }); }
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
    // Ajuste: verifica match exato para evitar conflitos (ex: pedidos vs pedidos_teste)
    if (name === entityName || name === entityName.replace(/s$/, '')) return sheets[i];
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
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() === String(data.id).trim()) {
      for (var j = 0; j < headers.length; j++) {
        if (data.hasOwnProperty(headers[j])) sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
      }
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
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

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}