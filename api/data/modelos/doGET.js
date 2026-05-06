var SECRET_KEY = "aquieumakdjdddggjrtr"; 

function doGet(e) {
  return response({ status: "success", message: "API RDO Express ativa e online." });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return response({ status: "error", message: "Acesso Negado: Chave Inválida" });
    }
    var action = data.action; 
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var entity = action.replace(/get|add|delete|update/, '').toLowerCase();
    var sheet = ss.getSheetByName(entity);
    if (!sheet) return response({ status: "error", message: "Aba '" + entity + "' não encontrada." });

    var result;
    if (action.startsWith('get')) result = handleGet(sheet);
    else if (action.startsWith('add')) result = handleAdd(sheet, data);
    else if (action.startsWith('update')) result = handleUpdate(sheet, data);
    else if (action.startsWith('delete')) result = handleDelete(sheet, data.id);
    else return response({ status: "error", message: "Ação não mapeada" });
    return response(result);
  } catch (err) {
    return response({ status: "error", message: "Erro no servidor: " + err.toString() });
  }
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 1) return [];
  var headers = rows[0];
  var data = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      // Força a primeira coluna a ser sempre 'id' e as outras em minúsculo
      var key = (j === 0) ? 'id' : headers[j].toString().toLowerCase();
      obj[key] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

function handleAdd(sheet, data) {
  delete data.action;
  delete data.apiKey;
  sheet.appendRow(Object.values(data));
  return { status: "success" };
}

function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
  // Normaliza cabeçalhos para busca
  var headers = rows[0].map(function(h) { return h.toString().toLowerCase(); });
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      for (var key in data) {
        var colIndex = headers.indexOf(key.toLowerCase());
        if (colIndex > -1) sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
      }
      return { status: "success" };
    }
  }
  return { status: "error", message: "ID não encontrado" };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
  return { status: "error", message: "ID não encontrado" };
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
