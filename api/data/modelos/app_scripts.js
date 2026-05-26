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
    
    // Extrai o nome da entidade limpando a ação executada
    var entity = action.replace(/get|add|delete|update/, '').toLowerCase().trim();
    
    // Busca robusta pela aba correspondente
    var sheet = getSheetCaseInsensitive(ss, entity);
    
    if (!sheet) {
      return response({ status: "error", message: "Aba correspondente a '" + entity + "' não encontrada no Google Sheets. Verifique os nomes das abas!" });
    }

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

// Busca tolerante a variações comuns de nomes de tabelas/abas
function getSheetCaseInsensitive(ss, entityName) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toLowerCase().trim();
    
    if (name === entityName || 
        name === entityName.replace(/s$/, '') || 
        entityName === name.replace(/s$/, '') ||
        entityName.indexOf(name) !== -1 ||
        name.indexOf(entityName) !== -1) {
      return sheets[i];
    }
  }
  return null;
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
    var key = header.toString().toLowerCase().trim();
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
  if (idIndex === -1) {
    idIndex = 0; 
  }
  
  var targetId = data.id || data.id_pedido || data.id_mensagens_chat;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() == String(targetId).trim()) {
      headers.forEach(function(header, j) {
        var key = header.toString().toLowerCase().trim();
        if (data[key] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(data[key]);
        }
      });
      return { status: "success", message: "Atualizado com sucesso!" };
    }
  }
  return { status: "error", message: "ID '" + targetId + "' não encontrado para atualização na linha." };
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