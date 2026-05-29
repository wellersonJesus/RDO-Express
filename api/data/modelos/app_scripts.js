var SECRET_KEY = "aquieumakdjdddggjrtr"; 

function doGet(e) {
  return response({ status: "success", message: "RDO Bot Engine Online." });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.apiKey || data.apiKey !== SECRET_KEY) return response({ status: "error", message: "Acesso Negado" });
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var entity = data.action.replace(/get|add|delete|update/, '').toLowerCase().trim();
    var sheet = getSheetCaseInsensitive(ss, entity);
    
    if (!sheet) return response({ status: "error", message: "Aba não encontrada." });

    var result;
    if (data.action.startsWith('get')) result = handleGet(sheet);
    else if (data.action.startsWith('add')) result = handleAdd(sheet, data);
    else if (data.action.startsWith('update')) result = handleUpdate(sheet, data);
    else if (data.action.startsWith('delete')) result = handleDelete(sheet, data.id);
    
    return response(result);
  } catch (err) { return response({ status: "error", message: err.toString() }); }
}

function handleAdd(sheet, data) {
  var headers = sheet.getDataRange().getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var newRow = headers.map(function(h) { return data[h] || ""; });
  sheet.appendRow(newRow);
  return { status: "success", message: "Adicionado com sucesso!" };
}

function getSheetCaseInsensitive(ss, entityName) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toLowerCase().trim();
    if (name === entityName || name === entityName.replace(/s$/, '')) return sheets[i];
  }
  return null;
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  // Normaliza cabeçalhos para minúsculo e remove espaços
  var headers = rows[0].map(function(h) { 
    return h.toString().toLowerCase().trim(); 
  });
  
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = rows[i][j];
      var key = headers[j];
      // Só adiciona se o cabeçalho não estiver vazio
      if (key !== "") {
        obj[key] = val;
      }
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
      // Atualiza todas as colunas baseado nos campos recebidos
      for (var j = 0; j < headers.length; j++) {
        if (data.hasOwnProperty(headers[j])) {
          sheet.getRange(i + 1, j + 1).setValue(data[headers[j]]);
        }
      }
      return { status: "success", message: "Registro atualizado com sucesso!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(function(h) { return h.toString().toLowerCase().trim(); }).indexOf("id");
  if (idIndex === -1) idIndex = 0;
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