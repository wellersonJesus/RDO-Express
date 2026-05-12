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
    
    // Entidades suportadas: usuarios, clientes, colaboradores, pedidos, financeiro, botconfig, chatlive
    var entity = action.replace(/get|add|delete|update/, '').toLowerCase();
    var sheet = ss.getSheetByName(entity);
    
    if (!sheet) return response({ status: "error", message: "Aba '" + entity + "' não encontrada no Google Sheets." });

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

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(function(h) { return h.toString().toLowerCase().trim(); });
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
    var key = header.toLowerCase().trim();
    // Se for ID e não vier no payload, gera um UUID. Caso contrário, busca a chave correspondente
    if (key === "id" && !data[key]) return Utilities.getUuid();
    return data[key] !== undefined ? data[key] : "";
  });
  sheet.appendRow(newRow);
  return { status: "success", message: "Registrado com sucesso!" };
}

function handleUpdate(sheet, data) {
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h) { return h.toString().toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] == data.id) {
      headers.forEach(function(header, j) {
        if (data[header] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[header]);
        }
      });
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(function(h) { return h.toString().toLowerCase().trim(); }).indexOf("id");
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluído!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}