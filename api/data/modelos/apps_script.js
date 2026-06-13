var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return response({ status: "error", message: "Payload vazio" });
    }

    var data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return response({ status: "error", message: "JSON inválido: " + parseErr.toString() });
    }

    var action = String(data.action || "").toLowerCase().trim();

    if (!action || action === "") {
      return response({ status: "error", message: "Nenhuma ação informada (action vazio)" });
    }

    if (action === "login") {
      return response(handleLogin(data.username, data.password));
    }

    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return response({ status: "error", message: "Acesso Negado" });
    }

    var mapaEntidades = {
      "usuario": "usuarios",
      "usuarios": "usuarios",
      "cliente": "clientes",
      "clientes": "clientes",
      "contato": "clientes",
      "contatos": "clientes",
      "colaborador": "colaboradores",
      "colaboradores": "colaboradores",
      "bot": "botconfig",
      "botconfig": "botconfig",
      "chat": "chat",
      "pedido": "pedidos",
      "pedidos": "pedidos",
      "financeiro": "financeiro"
    };

    var entity = action
      .replace("finalizar", "")
      .replace("get", "")
      .replace("add", "")
      .replace("delete", "")
      .replace("update", "")
      .replace("save", "")
      .toLowerCase()
      .trim();

    var nomeAba = mapaEntidades[entity] || entity;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetCaseInsensitive(ss, nomeAba);

    if (!sheet) {
      return response({
        status: "error",
        message: "Tabela não encontrada: " + nomeAba + " (action: " + action + ", entity: " + entity + ")"
      });
    }

    if (action === "finalizarpedido") {
      return response(handleSalvarPedidoComChat(sheet, data));
    }

    if (action.startsWith("get")) {
      return response(handleGet(sheet));
    }

    if (action.startsWith("add") || action.startsWith("save")) {
      return response(handleAdd(sheet, data, nomeAba));
    }

    if (action.startsWith("update")) {
      return response(handleUpdate(sheet, data));
    }

    if (action.startsWith("delete")) {
      return response(handleDelete(sheet, data.id));
    }

    return response({ status: "error", message: "Ação não suportada: " + action });

  } catch (err) {
    return response({ status: "error", message: "Erro interno no servidor: " + err.toString() });
  }
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      if (h !== "") obj[h] = row[i];
    });
    return obj;
  });
}

function handleAdd(sheet, data, entity) {
  var headers = sheet.getDataRange().getValues()[0].map(function(h) {
    return String(h).toLowerCase().trim();
  });
  var idIndex = headers.indexOf("id");
  if (idIndex !== -1 && (!data.id || data.id === "")) {
    data.id = generateId(sheet, entity);
  }
  var row = headers.map(function(h) {
    return h === "id" ? data.id : (data[h] || "");
  });
  sheet.appendRow(row);
  return { status: "success", message: "Adicionado!", id: data.id };
}

function handleUpdate(sheet, data) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) {
    return { status: "error", message: "Coluna 'id' não encontrada na tabela" };
  }

  if (!data.id) {
    return { status: "error", message: "ID não informado para atualização" };
  }

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]).trim() === String(data.id).trim()) {
      var keys = Object.keys(data);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var colIndex = headers.indexOf(String(key).toLowerCase().trim());
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
        }
      }
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID não encontrado: " + data.id };
}

function handleDelete(sheet, id) {
  if (!id) {
    return { status: "error", message: "ID não informado para exclusão" };
  }

  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("id");

  if (idIndex === -1) {
    return { status: "error", message: "Coluna 'id' não encontrada na tabela" };
  }

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() == String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluído!" };
    }
  }
  return { status: "error", message: "ID não encontrado: " + id };
}

function handleSalvarPedidoComChat(sheetPedidos, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetChat = getSheetCaseInsensitive(ss, "chat");

  if (!sheetChat) {
    return { status: "error", message: "Tabela 'chat' não encontrada" };
  }

  var idPedido = generateId(sheetPedidos, "pedidos");
  var idCliente = String(data.id_cliente || '').trim();

  if (!idCliente) {
    return { status: "error", message: "ID do cliente não informado" };
  }

  var linhasRota = data.rotas_texto ? data.rotas_texto.split('\n') : [];

  var deStr = linhasRota.map(function(l) {
    var parte = l.split('|')[0];
    return parte ? parte.replace(/De:/i, '').trim() : "";
  }).join(', ');

  var paraStr = linhasRota.map(function(l) {
    var parte = l.split('|')[1];
    return parte ? parte.replace(/Para:/i, '').trim() : "";
  }).join(', ');

  var mensagemFinal = data.mensagem || "";
  mensagemFinal = mensagemFinal.replace("[ID_GERADO]", idPedido);

  var agora = new Date();
  var horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  var dataStr = agora.toLocaleDateString('pt-BR');

  var idMsg = Math.random().toString(36).substring(2, 13).toUpperCase();

  // ─── CHAT: id | id_cliente | pedido_id | texto | hora | data | finalizado ───
  sheetChat.appendRow([
    idMsg,
    idCliente,
    idPedido,
    mensagemFinal,
    horaStr,
    dataStr,
    "TRUE"
  ]);

  // ─── PEDIDOS: id | id_cliente | solicitante | contato | horario | mercadoria | de | para | retorno | prioridade | valor_corrida | motoboy | status | observacao ───
  sheetPedidos.appendRow([
    idPedido,
    idCliente,
    data.solicitante || "",
    data.contato || "",
    data.horario || "",
    data.mercadoria || "",
    deStr,
    paraStr,
    data.retorno || "",
    data.prioridade || "N/A",
    data.valor_corrida || "",
    "",
    "PENDENTE",
    data.observacao || ""
  ]);

  return {
    status: "success",
    id: idPedido,
    id_cliente: idCliente,
    message: "Pedido e chat salvos com sucesso!"
  };
}

function handleLogin(user, pass) {
    if (!user || !pass) {
        return { status: "error", message: "Usuário e senha são obrigatórios" };
    }

    var sheet = getSheetCaseInsensitive(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");

    if (!sheet) {
        return { status: "error", message: "Tabela 'usuarios' não encontrada" };
    }

    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
        return { status: "error", message: "Nenhum usuário cadastrado" };
    }

    var headers = rows[0].map(function (h) {
        return String(h).toLowerCase().trim();
    });

    var colUser = findColumnIndex(headers, ["username", "usuario", "user", "login", "nome"]);
    var colPass = findColumnIndex(headers, ["password", "senha", "pass"]);
    var colTipo = findColumnIndex(headers, ["tipo", "role", "cargo", "perfil"]);
    var colImg = findColumnIndex(headers, ["imagem", "foto", "avatar", "image"]);

    if (colUser === -1 || colPass === -1) {
        return {
            status: "error",
            message: "Colunas 'username' ou 'password' não encontradas. Headers: " + headers.join(", ")
        };
    }

    for (var i = 1; i < rows.length; i++) {
        var rowUser = String(rows[i][colUser]).trim();
        var rowPass = String(rows[i][colPass]).trim();

        if (rowUser === String(user).trim() && rowPass === String(pass).trim()) {
            return {
                status: "success",
                user: {
                    username: rowUser,
                    tipo: colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
                    imagem: colImg !== -1 ? String(rows[i][colImg]).trim() : ""
                }
            };
        }
    }

    return { status: "error", message: "Usuário ou senha incorretos" };
}

function findColumnIndex(headers, possibleNames) {
    for (var n = 0; n < possibleNames.length; n++) {
        var idx = headers.indexOf(possibleNames[n]);
        if (idx !== -1) return idx;
    }
    return -1;
}

function generateId(sheet, entity) {
  var data = sheet.getDataRange().getValues();
  if (entity.includes("pedido")) {
    var maxId = 0;
    var idIndex = data[0].map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("id");
    for (var i = 1; i < data.length; i++) {
      var val = parseInt(String(data[i][idIndex]).replace(/[^0-9]/g, ''));
      if (!isNaN(val) && val > maxId) maxId = val;
    }
    var next = maxId + 1;
    return "RDO" + (next < 10 ? "0" + next : String(next));
  }
  return Math.random().toString(36).substring(2, 13).toUpperCase();
}

function getSheetCaseInsensitive(ss, name) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).toLowerCase().trim() === name.toLowerCase().trim()) {
      return sheets[i];
    }
  }
  return null;
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
