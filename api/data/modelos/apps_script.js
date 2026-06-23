var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responder({ status: "error", message: "Payload vazio" });
    }

    var data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return responder({ status: "error", message: "JSON inválido: " + parseErr.toString() });
    }

    var action = String(data.action || "").toLowerCase().trim();

    if (!action) {
      return responder({ status: "error", message: "Nenhuma ação informada" });
    }

    if (action === "login") {
      return responder(processarLogin(data.username, data.password));
    }

    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return responder({ status: "error", message: "Acesso Negado" });
    }

    if (action === "getfinanceirocompleto") {
      return responder(processarGetFinanceiroCompleto());
    }

    if (action === "validarsenhamaster") {
      return responder(processarValidarSenhaMaster(data.senha));
    }

    var entidade = extrairEntidade(action);
    var nomeAba = mapearEntidade(entidade);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = buscarAba(ss, nomeAba);

    if (!sheet) {
      return responder({
        status: "error",
        message: "Tabela não encontrada: " + nomeAba + " (action: " + action + ")"
      });
    }

    if (action === "finalizarpedido") {
      return responder(processarPedidoComChat(sheet, data));
    }

    if (action.indexOf("get") === 0) {
      return responder(processarGet(sheet));
    }

    if (action.indexOf("add") === 0 || action.indexOf("save") === 0) {
      return responder(processarAdd(sheet, data, nomeAba));
    }

    if (action.indexOf("update") === 0) {
      return responder(processarUpdate(sheet, data));
    }

    if (action.indexOf("delete") === 0) {
      return responder(processarDelete(sheet, data.id));
    }

    return responder({ status: "error", message: "Ação não suportada: " + action });
  } catch (err) {
    return responder({ status: "error", message: "Erro interno: " + err.toString() });
  }
}

function processarValidarSenhaMaster(senha) {
  if (!senha || String(senha).trim() === "") {
    return { status: "error", valido: false, message: "Senha não informada." };
  }

  var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");

  if (!sheet) {
    return { status: "error", valido: false, message: "Tabela 'usuarios' não encontrada." };
  }

  var rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return { status: "error", valido: false, message: "Nenhum usuário cadastrado." };
  }

  var headers = rows[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });

  var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
  var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
  var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);

  if (colUser === -1 || colPass === -1) {
    return { status: "error", valido: false, message: "Colunas obrigatórias não encontradas." };
  }

  var senhaTrim = String(senha).trim();

  for (var i = 1; i < rows.length; i++) {
    var tipo = colTipo !== -1 ? String(rows[i][colTipo]).trim().toLowerCase() : "";
    var isMaster = tipo === "master" || tipo === "admin";

    if (isMaster) {
      var senhaArmazenada = String(rows[i][colPass]).trim();
      if (senhaArmazenada === senhaTrim) {
        return { status: "success", valido: true };
      }
    }
  }

  return { status: "success", valido: false };
}

function extrairEntidade(action) {
  return action
    .replace("finalizar", "")
    .replace("get", "")
    .replace("add", "")
    .replace("delete", "")
    .replace("update", "")
    .replace("save", "")
    .toLowerCase()
    .trim();
}

function mapearEntidade(entity) {
    var mapa = {
        "usuario": "usuarios",
        "usuarios": "usuarios",
        "cliente": "clientes",
        "clientes": "clientes",
        "contato": "clientes",
        "contatos": "clientes",
        "colaborador": "colaboradores",
        "colaboradores": "colaboradores",
        "chat": "chat",
        "pedido": "pedidos",
        "pedidos": "pedidos",
        "financeiro": "financeiro"
    };
    return mapa[entity] || entity;
}

function buscarAba(ss, nome) {
  var sheets = ss.getSheets();
  var nomeLower = nome.toLowerCase().trim();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).toLowerCase().trim() === nomeLower) {
      return sheets[i];
    }
  }
  return null;
}

function obterHeaders(sheet) {
  return sheet.getDataRange().getValues()[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });
}

function converterValorCelula(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    var d = val.getDate();
    var m = val.getMonth() + 1;
    var y = val.getFullYear();
    return (d < 10 ? "0" + d : "" + d) + "/" + (m < 10 ? "0" + m : "" + m) + "/" + y;
  }
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  return String(val).trim();
}

function processarGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers = rows[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });

  var resultado = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== "") {
        obj[headers[j]] = converterValorCelula(rows[i][j]);
      }
    }
    resultado.push(obj);
  }
  return resultado;
}

function processarGetFinanceiroCompleto() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheetFin = buscarAba(ss, "financeiro");
  var sheetPed = buscarAba(ss, "pedidos");
  var sheetCli = buscarAba(ss, "clientes");

  if (!sheetFin) {
    return { status: "error", message: "Tabela 'financeiro' não encontrada" };
  }

  var finRows = sheetFin.getDataRange().getValues();
  if (finRows.length <= 1) return { status: "success", data: [] };

  var finHeaders = finRows[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });

  var pedidosMap = {};
  if (sheetPed) {
    var pedRows = sheetPed.getDataRange().getValues();
    if (pedRows.length > 1) {
      var pedHeaders = pedRows[0].map(function (h) {
        return String(h).toLowerCase().trim();
      });
      var pedIdIdx = pedHeaders.indexOf("id");
      var pedClienteIdx = pedHeaders.indexOf("id_cliente");
      var pedSolicitanteIdx = pedHeaders.indexOf("solicitante");

      for (var p = 1; p < pedRows.length; p++) {
        var pedId = pedIdIdx !== -1 ? String(pedRows[p][pedIdIdx]).trim() : "";
        if (pedId) {
          pedidosMap[pedId] = {
            id_cliente: pedClienteIdx !== -1 ? String(pedRows[p][pedClienteIdx]).trim() : "",
            solicitante: pedSolicitanteIdx !== -1 ? String(pedRows[p][pedSolicitanteIdx]).trim() : ""
          };
        }
      }
    }
  }

  var clientesMap = {};
  if (sheetCli) {
    var cliRows = sheetCli.getDataRange().getValues();
    if (cliRows.length > 1) {
      var cliHeaders = cliRows[0].map(function (h) {
        return String(h).toLowerCase().trim();
      });
      var cliIdIdx = cliHeaders.indexOf("id");
      var cliUsernameIdx = cliHeaders.indexOf("username");

      for (var c = 1; c < cliRows.length; c++) {
        var cliId = cliIdIdx !== -1 ? String(cliRows[c][cliIdIdx]).trim() : "";
        if (cliId) {
          clientesMap[cliId] = {
            username: cliUsernameIdx !== -1 ? String(cliRows[c][cliUsernameIdx]).trim() : ""
          };
        }
      }
    }
  }

  var finIdPedidoIdx = -1;
  for (var fi = 0; fi < finHeaders.length; fi++) {
    if (finHeaders[fi] === "id_pedido" || finHeaders[fi] === "pedido_id") {
      finIdPedidoIdx = fi;
      break;
    }
  }

  var resultado = [];
  for (var r = 1; r < finRows.length; r++) {
    var obj = {};
    for (var col = 0; col < finHeaders.length; col++) {
      if (finHeaders[col] !== "") {
        obj[finHeaders[col]] = converterValorCelula(finRows[r][col]);
      }
    }

    var idPedido = finIdPedidoIdx !== -1 ? String(finRows[r][finIdPedidoIdx]).trim() : "";
    var pedido = idPedido ? pedidosMap[idPedido] : null;

    if (pedido) {
      obj.solicitante = pedido.solicitante || "";
      var cliente = pedido.id_cliente ? clientesMap[pedido.id_cliente] : null;
      obj.cliente = cliente ? cliente.username || "" : "";
    } else {
      obj.solicitante = obj.solicitante || "";
      obj.cliente = obj.cliente || "";
    }

    resultado.push(obj);
  }

  return { status: "success", data: resultado };
}

function processarAdd(sheet, data, entity) {
  var headers = obterHeaders(sheet);
  var idIndex = headers.indexOf("id");

  if (idIndex !== -1 && (!data.id || data.id === "")) {
    data.id = gerarId(sheet, entity);
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === "id") {
      row.push(data.id);
    } else {
      row.push(data[headers[i]] || "");
    }
  }

  sheet.appendRow(row);
  return { status: "success", message: "Adicionado!", id: data.id };
}

function processarUpdate(sheet, data) {
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) {
    return { status: "error", message: "Coluna 'id' não encontrada" };
  }

  if (!data.id) {
    return { status: "error", message: "ID não informado para atualização" };
  }

  var idBusca = String(data.id).trim();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]).trim() === idBusca) {
      var keys = Object.keys(data);
      for (var k = 0; k < keys.length; k++) {
        var colIndex = headers.indexOf(String(keys[k]).toLowerCase().trim());
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(data[keys[k]]);
        }
      }
      return { status: "success", message: "Atualizado!" };
    }
  }

  return { status: "error", message: "ID não encontrado: " + data.id };
}

function processarDelete(sheet, id) {
  if (!id) {
    return { status: "error", message: "ID não informado para exclusão" };
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) {
    return { status: "error", message: "Coluna 'id' não encontrada" };
  }

  var idBusca = String(id).trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() === idBusca) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluído!" };
    }
  }

  return { status: "error", message: "ID não encontrado: " + id };
}

function processarPedidoComChat(sheetPedidos, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetChat = buscarAba(ss, "chat");

  if (!sheetChat) {
    return { status: "error", message: "Tabela 'chat' não encontrada" };
  }

  var idPedido = gerarId(sheetPedidos, "pedidos");
  var idCliente = String(data.id_cliente || "").trim();

  if (!idCliente) {
    return { status: "error", message: "ID do cliente não informado" };
  }

  var linhasRota = data.rotas_texto ? data.rotas_texto.split("\n") : [];

  var deStr = linhasRota.map(function (l) {
    var parte = l.split("|")[0];
    return parte ? parte.replace(/De:/i, "").trim() : "";
  }).join(", ");

  var paraStr = linhasRota.map(function (l) {
    var parte = l.split("|")[1];
    return parte ? parte.replace(/Para:/i, "").trim() : "";
  }).join(", ");

  var mensagemFinal = (data.mensagem || "").replace("[ID_GERADO]", idPedido);
  var agora = new Date();
  var horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  var dataStr = agora.toLocaleDateString("pt-BR");
  var idMsg = Math.random().toString(36).substring(2, 13).toUpperCase();

  sheetChat.appendRow([
    idMsg,
    idCliente,
    idPedido,
    mensagemFinal,
    horaStr,
    dataStr,
    "TRUE"
  ]);

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

function processarLogin(user, pass) {
  if (!user || !pass) {
    return { status: "error", message: "Usuário e senha são obrigatórios" };
  }

  var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");

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

  var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
  var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
  var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);
  var colImg  = buscarColuna(headers, ["imagem", "foto", "avatar", "image"]);

  if (colUser === -1 || colPass === -1) {
    return { status: "error", message: "Colunas 'username' ou 'password' não encontradas" };
  }

  var userTrim = String(user).trim();
  var passTrim = String(pass).trim();

  for (var i = 1; i < rows.length; i++) {
    var rowUser = String(rows[i][colUser]).trim();
    var rowPass = String(rows[i][colPass]).trim();

    if (rowUser === userTrim && rowPass === passTrim) {
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

function buscarColuna(headers, nomesPossiveis) {
  for (var n = 0; n < nomesPossiveis.length; n++) {
    var idx = headers.indexOf(nomesPossiveis[n]);
    if (idx !== -1) return idx;
  }
  return -1;
}

function gerarId(sheet, entity) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) {
    return String(h).toLowerCase().trim();
  });
  var idIndex = headers.indexOf("id");

  if (entity.indexOf("pedido") !== -1) {
    var maxId = 0;
    for (var i = 1; i < data.length; i++) {
      var val = parseInt(String(data[i][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(val) && val > maxId) maxId = val;
    }
    var next = maxId + 1;
    return "RDO" + (next < 10 ? "0" + next : String(next));
  }

  if (entity.indexOf("financeiro") !== -1) {
    var maxFin = 0;
    for (var j = 1; j < data.length; j++) {
      var numPart = parseInt(String(data[j][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numPart) && numPart > maxFin) maxFin = numPart;
    }
    var nextFin = maxFin + 1;
    var padded = String(nextFin);
    while (padded.length < 4) padded = "0" + padded;
    return "FIN" + padded;
  }

  // usuarios, clientes, colaboradores, chat → 11 chars aleatórios
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var id = "";
  for (var k = 0; k < 11; k++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
