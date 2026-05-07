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
    // Extrai o nome da aba (ex: addusuarios -> usuarios)
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
  var action = data.action;
  delete data.action;
  delete data.apiKey;
  
  // Mapeia os dados de acordo com a ordem das colunas na planilha (id, username, cargo, password)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(header) {
    return data[header.toLowerCase()] !== undefined ? data[header.toLowerCase()] : "";
  });
  
  sheet.appendRow(newRow);
  return { status: "success", message: "Registro adicionado com sucesso." };
}

function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
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
