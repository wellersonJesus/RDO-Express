var SECRET_KEY = "aquieumakdjdddggjrtr";

var MODELO_PADRAO = [
  '📦 Olá! Para agilizarmos o pedido, por favor preencha os dados abaixo:',
  '', 'SOLICITANTE: ', 'CONTATO: ', 'HORÁRIO ESTIMADO P/ COLETA:  ',
  'MERCADORIA: (Sacola, Coleta, Bolsa, Envelope)', 'ROTA(s): ',
  '📍1. De: ... | Para: ...', '📍2. De: ... | Para: ... ', '📍3. De: ... | Para: ... ',
  'RETORNO:  (SIM /NÃO)', 'PRIORIDADE: (Normal, Agendado, Urgente) ',
  'OBSERVAÇÃO: Descreva a observação aqui se necessario', '',
  'Assim que enviar esta mensagem preenchida, ', 'calcularemos á sua taxa! 🏁'
].join('\n');

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents)
      return responder({ status: "error", message: "Payload vazio" });

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return responder({ status: "error", message: "JSON invalido: " + err.toString() });
    }

    var action = String(data.action || "").toLowerCase().trim();
    if (!action)
      return responder({ status: "error", message: "Nenhuma acao informada" });

    if (action === "login")
      return responder(processarLogin(data.username, data.password));

    if (!data.apiKey || data.apiKey !== SECRET_KEY)
      return responder({ status: "error", message: "Acesso Negado" });

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "criarpedido") {
      var sheetPedidos = buscarAba(ss, "pedidos");
      if (!sheetPedidos) return responder({ status: "error", message: "Aba 'pedidos' nao encontrada" });
      return responder(processarCriarPedido(sheetPedidos, data));
    }

    if (action === "criarchat" || action === "addchat" || action === "savechat")
      return responder({ status: "error", message: "Acao bloqueada. O chat e criado automaticamente junto com o pedido." });

    if (action === "getfinanceirocompleto")
      return responder(processarGetFinanceiroCompleto());

    if (action === "validarsenhamaster")
      return responder(processarValidarSenhaMaster(data.senha));

    if (action === "deletechat")
      return responder(processarDeleteChat(ss, data));

    var entidade = extrairEntidade(action);
    var nomeAba  = mapearEntidade(entidade);
    var sheet    = buscarAba(ss, nomeAba);

    if (!sheet)
      return responder({ status: "error", message: "Aba nao encontrada: '" + nomeAba + "' (action: " + action + ")" });

    if (action.indexOf("get")    === 0) return responder(processarGet(sheet));
    if (action.indexOf("add")    === 0 ||
        action.indexOf("save")   === 0 ||
        action.indexOf("criar")  === 0) return responder(processarAdd(sheet, data, nomeAba));
    if (action.indexOf("update") === 0) return responder(processarUpdate(sheet, data));
    if (action.indexOf("delete") === 0) return responder(processarDelete(sheet, data.id));

    return responder({ status: "error", message: "Acao nao suportada: " + action });

  } catch (err) {
    return responder({ status: "error", message: "Erro interno: " + err.toString() });
  }
}

function processarDeleteChat(ss, data) {
  var sheetChat = buscarAba(ss, "chat");
  if (!sheetChat) return { status: "error", message: "Aba 'chat' nao encontrada" };

  var pedidoId = String(data.pedido_id || data.id || "").trim();
  if (!pedidoId) return { status: "error", message: "pedido_id nao informado" };

  var rows    = sheetChat.getDataRange().getValues();
  var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var colPedidoId = headers.indexOf("pedido_id");
  var colId       = headers.indexOf("id");

  if (colPedidoId === -1 && colId === -1)
    return { status: "error", message: "Coluna 'pedido_id' nao encontrada na aba chat" };

  var colBusca   = colPedidoId !== -1 ? colPedidoId : colId;
  var pedidoNorm = pedidoId.replace(/^RDO0*/i, "").trim();
  var deletados  = 0;

  for (var i = rows.length - 1; i >= 1; i--) {
    var valCelula = String(rows[i][colBusca]).trim();
    var valNorm   = valCelula.replace(/^RDO0*/i, "").trim();
    if (valCelula === pedidoId || valNorm === pedidoNorm ||
        valCelula.toUpperCase() === pedidoId.toUpperCase()) {
      sheetChat.deleteRow(i + 1);
      deletados++;
    }
  }

  if (deletados > 0)
    return { status: "success", message: "Chat excluido! Registros: " + deletados };

  return { status: "success", message: "Nenhum chat encontrado para pedido_id: " + pedidoId };
}

function chatJaExiste(sheetChat, idPedido) {
  var rows = sheetChat.getDataRange().getValues();
  if (rows.length <= 1) return false;
  var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var colPedidoId = headers.indexOf("pedido_id");
  if (colPedidoId === -1) return false;

  var idNorm = String(idPedido).trim().toUpperCase();
  for (var i = 1; i < rows.length; i++) {
    var valCelula = String(rows[i][colPedidoId]).trim().toUpperCase();
    if (valCelula === idNorm) return true;
  }
  return false;
}

function montarTextoChat(idPedido, data) {
  var solicitante = String(data.solicitante || "").trim() || "N/D";
  var contato     = String(data.contato || data.telefone || "").trim() || "N/D";
  var mercadoria  = String(data.mercadoria || "").trim() || "N/D";

  var rotasTexto = String(data.rotas_texto || "").trim();
  var linhasRotas = [];

  if (rotasTexto) {
    var linhasBrutas = rotasTexto.split("\n");
    for (var i = 0; i < linhasBrutas.length; i++) {
      var linha = linhasBrutas[i].trim();
      if (!linha) continue;
      var deMatch   = linha.match(/De:\s*([^|]+)/i);
      var paraMatch = linha.match(/Para:\s*(.+)/i);
      var de   = deMatch   ? deMatch[1].trim()   : "N/D";
      var para = paraMatch ? paraMatch[1].trim() : "N/D";
      linhasRotas.push((linhasRotas.length + 1) + ". De: " + de + " | Para: " + para + ".");
    }
  }

  if (linhasRotas.length === 0) {
    var de   = String(data.de   || "").trim() || "N/D";
    var para = String(data.para || "").trim() || "N/D";
    linhasRotas.push("1. De: " + de + " | Para: " + para + ".");
  }

  var distancia = String(data.distancia || "").trim() || "-";
  var tempo     = String(data.tempo     || "").trim() || "-";

  var valorRaw = data.valor_corrida || data.valor_final || "";
  var valorNum = parseFloat(String(valorRaw).replace("R$", "").replace(".", "").replace(",", "."));
  var valor = isNaN(valorNum) ? "-" : valorNum.toFixed(2).replace(".", ",");

  var linhas = [
    "📦 N.SERVIÇO: " + idPedido,
    "👤 : " + solicitante + " 📞 : " + contato,
    "📦 : " + mercadoria,
    "📍 ROTAS:"
  ];

  for (var r = 0; r < linhasRotas.length; r++) {
    linhas.push(linhasRotas[r]);
  }

  linhas.push("🛣️ " + distancia + " km ⏱️ " + tempo + "min 💰 R$ " + valor);

  return linhas.join("\n");
}

function processarCriarPedido(sheetPedidos, data) {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var sheetChat = buscarAba(ss, "chat");

  var idPedido  = String(data.id || "").trim() || gerarId(sheetPedidos, "pedidos");
  var idCliente = String(data.id_cliente || data.id_chat || "").trim();

  var rotas_texto = String(data.rotas_texto || "");
  var deStr   = "";
  var paraStr = "";

  if (rotas_texto) {
    var primeiraLinha = rotas_texto.split("\n")[0] || "";
    var deMatch       = primeiraLinha.match(/De:\s*([^|]+)/i);
    var paraMatch     = primeiraLinha.match(/Para:\s*(.+)/i);
    if (deMatch)   deStr   = deMatch[1].trim();
    if (paraMatch) paraStr = paraMatch[1].trim();
  }
  if (!deStr)   deStr   = String(data.de   || "");
  if (!paraStr) paraStr = String(data.para || "");

  var agora   = new Date();
  var horaStr = String(data.hora || data.horario_chat || agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })).trim();
  var dataStr = String(data.data_chat || agora.toLocaleDateString("pt-BR")).trim();

  if (sheetChat && idCliente && !chatJaExiste(sheetChat, idPedido)) {
    var textoChat = montarTextoChat(idPedido, data);
    var idMsg = Math.random().toString(36).substring(2, 13).toUpperCase();
    sheetChat.appendRow([idMsg, idCliente, idPedido, textoChat, horaStr, dataStr, "TRUE"]);
  }

  var headers = obterHeaders(sheetPedidos);
  var idIndex = headers.indexOf("id");

  if (headers.length > 1 && idIndex !== -1) {
    var rowData = {};
    rowData.id             = idPedido;
    rowData.id_cliente     = idCliente;
    rowData.solicitante    = String(data.solicitante   || "");
    rowData.contato        = String(data.contato       || "");
    rowData.horario        = String(data.horario       || "");
    rowData.mercadoria     = String(data.mercadoria    || "");
    rowData.de             = deStr;
    rowData.para           = paraStr;
    rowData.retorno        = String(data.retorno       || "");
    rowData.prioridade     = String(data.prioridade    || "N/A");
    rowData.valor_corrida  = String(data.valor_corrida || data.valor_final || "");
    rowData.valor_base     = String(data.valor_base    || "");
    rowData.taxa_espera    = String(data.taxa_espera   || "");
    rowData.motoboy        = String(data.motoboy       || "");
    rowData.status         = String(data.status        || "PENDENTE");
    rowData.observacao     = String(data.observacao    || data.obs || "");
    rowData.distancia      = String(data.distancia     || "");
    rowData.tempo          = String(data.tempo         || "");
    rowData.valor_km       = String(data.valor_km      || "");
    rowData.dinamica       = String(data.dinamica      || "");
    rowData.numero_servico = idPedido;
    rowData.data           = dataStr;
    rowData.hora           = horaStr;

    var row = [];
    for (var i = 0; i < headers.length; i++) {
      row.push(rowData[headers[i]] !== undefined ? rowData[headers[i]] : "");
    }
    sheetPedidos.appendRow(row);
  } else {
    sheetPedidos.appendRow([
      idPedido, idCliente,
      String(data.solicitante   || ""),
      String(data.contato       || ""),
      String(data.horario       || ""),
      String(data.mercadoria    || ""),
      deStr, paraStr,
      String(data.retorno       || ""),
      String(data.prioridade    || "N/A"),
      String(data.valor_corrida || data.valor_final || ""),
      String(data.valor_base    || ""),
      String(data.taxa_espera   || ""),
      String(data.motoboy       || ""),
      String(data.status        || "PENDENTE"),
      String(data.observacao    || data.obs || ""),
      dataStr, horaStr
    ]);
  }

  return { status: "success", id: idPedido, message: "Pedido criado com sucesso!" };
}

function processarValidarSenhaMaster(senha) {
  if (!senha || String(senha).trim() === "")
    return { status: "error", valido: false, message: "Senha nao informada." };

  var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
  if (!sheet)
    return { status: "error", valido: false, message: "Aba 'usuarios' nao encontrada." };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1)
    return { status: "error", valido: false, message: "Nenhum usuario cadastrado." };

  var headers  = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var colPass  = buscarColuna(headers, ["password", "senha", "pass"]);
  var colTipo  = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);

  if (colPass === -1)
    return { status: "error", valido: false, message: "Coluna de senha nao encontrada." };

  var senhaTrim = String(senha).trim();
  for (var i = 1; i < rows.length; i++) {
    var tipo     = colTipo !== -1 ? String(rows[i][colTipo]).trim().toLowerCase() : "";
    var isMaster = tipo === "master" || tipo === "admin";
    if (isMaster && String(rows[i][colPass]).trim() === senhaTrim)
      return { status: "success", valido: true };
  }
  return { status: "success", valido: false };
}

function processarLogin(user, pass) {
  if (!user || !pass)
    return { status: "error", message: "Usuario e senha sao obrigatorios" };

  var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
  if (!sheet)
    return { status: "error", message: "Aba 'usuarios' nao encontrada" };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1)
    return { status: "error", message: "Nenhum usuario cadastrado" };

  var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
  var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
  var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);
  var colImg  = buscarColuna(headers, ["imagem", "foto", "avatar", "image"]);

  if (colUser === -1 || colPass === -1)
    return { status: "error", message: "Colunas 'username' ou 'password' nao encontradas" };

  var userTrim = String(user).trim();
  var passTrim = String(pass).trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][colUser]).trim() === userTrim &&
        String(rows[i][colPass]).trim() === passTrim) {
      return {
        status: "success",
        user: {
          username: String(rows[i][colUser]).trim(),
          tipo:     colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
          imagem:   colImg  !== -1 ? String(rows[i][colImg]).trim()  : ""
        }
      };
    }
  }
  return { status: "error", message: "Usuario ou senha incorretos" };
}

function processarGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers   = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var resultado = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== "") obj[headers[j]] = converterValorCelula(rows[i][j]);
    }
    resultado.push(obj);
  }
  return resultado;
}

function processarGetFinanceiroCompleto() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var sheetFin = buscarAba(ss, "financeiro");
  var sheetPed = buscarAba(ss, "pedidos");
  var sheetCli = buscarAba(ss, "clientes");

  if (!sheetFin)
    return { status: "error", message: "Aba 'financeiro' nao encontrada" };

  var finRows = sheetFin.getDataRange().getValues();
  if (finRows.length <= 1) return { status: "success", data: [] };

  var finHeaders = finRows[0].map(function (h) { return String(h).toLowerCase().trim(); });

  var pedidosMap = {};
  if (sheetPed) {
    var pedRows = sheetPed.getDataRange().getValues();
    if (pedRows.length > 1) {
      var pedHeaders        = pedRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
      var pedIdIdx          = pedHeaders.indexOf("id");
      var pedClienteIdx     = pedHeaders.indexOf("id_cliente");
      var pedSolicitanteIdx = pedHeaders.indexOf("solicitante");
      for (var p = 1; p < pedRows.length; p++) {
        var pedId = pedIdIdx !== -1 ? String(pedRows[p][pedIdIdx]).trim() : "";
        if (pedId) pedidosMap[pedId] = {
          id_cliente:  pedClienteIdx     !== -1 ? String(pedRows[p][pedClienteIdx]).trim()     : "",
          solicitante: pedSolicitanteIdx !== -1 ? String(pedRows[p][pedSolicitanteIdx]).trim() : ""
        };
      }
    }
  }

  var clientesMap = {};
  if (sheetCli) {
    var cliRows = sheetCli.getDataRange().getValues();
    if (cliRows.length > 1) {
      var cliHeaders     = cliRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
      var cliIdIdx       = cliHeaders.indexOf("id");
      var cliUsernameIdx = cliHeaders.indexOf("username");
      for (var c = 1; c < cliRows.length; c++) {
        var cliId = cliIdIdx !== -1 ? String(cliRows[c][cliIdIdx]).trim() : "";
        if (cliId) clientesMap[cliId] = {
          username: cliUsernameIdx !== -1 ? String(cliRows[c][cliUsernameIdx]).trim() : ""
        };
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
      if (finHeaders[col] !== "") obj[finHeaders[col]] = converterValorCelula(finRows[r][col]);
    }
    var idPedido = finIdPedidoIdx !== -1 ? String(finRows[r][finIdPedidoIdx]).trim() : "";
    var pedido   = idPedido ? pedidosMap[idPedido] : null;
    if (pedido) {
      obj.solicitante = pedido.solicitante || "";
      var cliente     = pedido.id_cliente ? clientesMap[pedido.id_cliente] : null;
      obj.cliente     = cliente ? cliente.username || "" : "";
    } else {
      obj.solicitante = obj.solicitante || "";
      obj.cliente     = obj.cliente     || "";
    }
    resultado.push(obj);
  }

  return { status: "success", data: resultado };
}

function processarAdd(sheet, data, entity) {
  var headers = obterHeaders(sheet);
  var idIndex = headers.indexOf("id");

  if (idIndex !== -1) {
    var idAtual = data.id !== undefined && data.id !== null ? String(data.id).trim() : "";
    if (!idAtual) data.id = gerarId(sheet, entity);
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var campo = headers[i];
    var valor = "";

    if (campo === "contato" && data.telefone && !data.contato) {
      valor = String(data.telefone).trim();
    } else if (campo === "data_criacao" && !data.data_criacao) {
      valor = new Date().toISOString();
    } else if (data[campo] !== undefined && data[campo] !== null) {
      valor = String(data[campo]).trim();
    }

    row.push(valor);
  }

  sheet.appendRow(row);

  var idIndexRetorno = headers.indexOf("id");
  return { status: "success", message: "Adicionado!", id: idIndexRetorno !== -1 ? data.id : undefined };
}

function processarUpdate(sheet, data) {
  var values  = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");

  if (idIndex === -1) return { status: "error", message: "Coluna 'id' nao encontrada" };
  if (!data.id)       return { status: "error", message: "ID nao informado para atualizacao" };

  var idBusca    = String(data.id).trim();
  var idBuscaNum = idBusca.replace(/^RDO0*/i, "").trim();

  for (var i = 1; i < values.length; i++) {
    var idCelula    = String(values[i][idIndex]).trim();
    var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();

    if (idCelula === idBusca || idCelulaNum === idBuscaNum) {
      var keys = Object.keys(data);
      for (var k = 0; k < keys.length; k++) {
        var colIndex = headers.indexOf(String(keys[k]).toLowerCase().trim());
        if (colIndex !== -1)
          sheet.getRange(i + 1, colIndex + 1).setValue(data[keys[k]]);
      }
      return { status: "success", message: "Atualizado!" };
    }
  }
  return { status: "error", message: "ID nao encontrado: " + data.id };
}

function processarDelete(sheet, id) {
  if (!id || String(id).trim() === "")
    return { status: "error", message: "ID nao informado para exclusao" };

  var rows    = sheet.getDataRange().getValues();
  var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");

  if (idIndex === -1)
    return { status: "error", message: "Coluna 'id' nao encontrada" };

  var idBusca     = String(id).trim();
  var idBuscaNum  = idBusca.replace(/^RDO0*/i, "").trim();
  var idBuscaFull = idBusca.toUpperCase();

  for (var i = rows.length - 1; i >= 1; i--) {
    var idCelula    = String(rows[i][idIndex]).trim();
    var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();
    if (idCelula === idBuscaFull || idCelulaNum === idBuscaNum || idCelula === idBusca) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluido!" };
    }
  }
  return { status: "error", message: "ID nao encontrado: " + id };
}

function extrairEntidade(action) {
  var acoes = ["criar", "get", "add", "delete", "update", "save"];
  for (var i = 0; i < acoes.length; i++) {
    if (action.indexOf(acoes[i]) === 0) {
      return action.substring(acoes[i].length).toLowerCase().trim();
    }
  }
  return action.toLowerCase().trim();
}

function mapearEntidade(entity) {
  var mapa = {
    "usuario":       "usuarios",
    "usuarios":      "usuarios",
    "cliente":       "clientes",
    "clientes":      "clientes",
    "contato":       "clientes",
    "contatos":      "clientes",
    "colaborador":   "colaboradores",
    "colaboradores": "colaboradores",
    "chat":          "chat",
    "chats":         "chat",
    "pedido":        "pedidos",
    "pedidos":       "pedidos",
    "financeiro":    "financeiro",
    "financeiros":   "financeiro",
    "relatorio":     "relatorios",
    "relatorios":    "relatorios"
  };
  return mapa[entity] || entity;
}

function buscarAba(ss, nome) {
  var sheets    = ss.getSheets();
  var nomeLower = nome.toLowerCase().trim();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).toLowerCase().trim() === nomeLower)
      return sheets[i];
  }
  return null;
}

function obterHeaders(sheet) {
  var data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return [];
  return data[0].map(function (h) { return String(h).toLowerCase().trim(); });
}

function converterValorCelula(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    var d = val.getDate();
    var m = val.getMonth() + 1;
    var y = val.getFullYear();
    return (d < 10 ? "0" + d : d) + "/" + (m < 10 ? "0" + m : m) + "/" + y;
  }
  if (typeof val === "number")  return val;
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  return String(val).trim();
}

function buscarColuna(headers, nomesPossiveis) {
  for (var n = 0; n < nomesPossiveis.length; n++) {
    var idx = headers.indexOf(nomesPossiveis[n]);
    if (idx !== -1) return idx;
  }
  return -1;
}

function gerarId(sheet, entity) {
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");

  if (entity.indexOf("pedido") !== -1) {
    var maxId = 0;
    for (var i = 1; i < data.length; i++) {
      var val = parseInt(String(data[i][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(val) && val > maxId) maxId = val;
    }
    var next   = maxId + 1;
    var padded = String(next);
    while (padded.length < 3) padded = "0" + padded;
    return "RDO" + padded;
  }

  if (entity.indexOf("financeiro") !== -1) {
    var maxFin = 0;
    for (var j = 1; j < data.length; j++) {
      var num = parseInt(String(data[j][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > maxFin) maxFin = num;
    }
    var nextFin   = maxFin + 1;
    var paddedFin = String(nextFin);
    while (paddedFin.length < 4) paddedFin = "0" + paddedFin;
    return "FIN" + paddedFin;
  }

  if (entity.indexOf("relatorio") !== -1) {
    return "REL" + Date.now();
  }

  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var id    = "";
  for (var k = 0; k < 11; k++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
