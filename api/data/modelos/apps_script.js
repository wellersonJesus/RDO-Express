var SECRET_KEY = "";
var MASTER_PASSWORD = "";

var MODELO_PADRAO = [
  '📦 Olá! Para agilizarmos o pedido, por favor preencha os dados abaixo:',
  '', 'SOLICITANTE: ', 'CONTATO: ', 'HORÁRIO ESTIMADO P/ COLETA:  ',
  'MERCADORIA: (Sacola, Coleta, Bolsa, Envelope)', 'ROTA(s): ',
  '📍1. De: ... | Para: ...', '📍2. De: ... | Para: ... ', '📍3. De: ... | Para: ... ',
  'RETORNO:  (SIM /NÃO)', 'PRIORIDADE: (Normal, Agendado, Urgente) ',
  'OBSERVAÇÃO: Descreva a observação aqui se necessario', '',
  'Assim que enviar esta mensagem preenchida, ', 'calcularemos á sua taxa! 🏁'
].join('\n');

var CAMPOS_MONETARIOS = [
  "valor_corrida", "valor_base", "taxa_espera", "valor_km",
  "vlr_servico", "valor_total", "valor_final", "valorcorrida"
];

var ALIASES_FINANCEIRO = {
  "situacao_pagamento": "situacao",
  "situacaopagamento": "situacao",
  "status_pagamento": "situacao",
  "statuspagamento": "situacao",
  "status": "situacao",
  "nova_situacao": "situacao",
  "novasituacao": "situacao",
  "valor_total": "vlr_servico",
  "valor_final": "vlr_servico",
  "valor": "vlr_servico",
  "pedido_id": "id_pedido",
  "colaboradorid": "colaborador_id",
  "vlrservico": "vlr_servico",
  "motoboy": "colaborador"
};

var ALIASES_PEDIDOS = {
  "situacao": "situacao_financeira",
  "situacao_pagamento": "situacao_financeira",
  "situacaopagamento": "situacao_financeira",
  "status_pagamento": "situacao_financeira",
  "statuspagamento": "situacao_financeira",
  "valor_total": "valor_corrida",
  "valor_final": "valor_corrida",
  "valorcorrida": "valor_corrida",
  "horario": "horario",
  "hora": "horario"
};

function testarHeadersFinanceiro() {
  var ss = SpreadsheetApp.openById('17foT_x60t_e6W9JATNrkLeGv8e3PshgVcIUa5hl0kOI');
  var sheet = ss.getSheetByName('financeiro');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log(JSON.stringify(headers));
}

function normalizarChave(str) {
  return String(str || "")
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\/]+/g, '_');
}

function ehCampoMonetario(chave) {
  return CAMPOS_MONETARIOS.indexOf(chave) !== -1;
}

function capitalizar(texto) {
  var t = String(texto || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  var texto = String(valor).trim();
  if (texto === "") return "";
  if (/^R\$\s*-?\d/.test(texto)) return texto;
  var limpo = texto.replace(/[^\d,.\-]/g, "");
  if (limpo === "") return "";
  var negativo = limpo.indexOf("-") === 0;
  limpo = limpo.replace("-", "");
  var numero;
  if (limpo.indexOf(",") !== -1) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
    numero = parseFloat(limpo);
  } else {
    numero = parseFloat(limpo);
  }
  if (isNaN(numero)) return texto;
  var formatado = numero.toFixed(2).replace(".", ",");
  var partes = formatado.split(",");
  var inteiro = partes[0];
  var decimal = partes[1];
  var comMilhares = "";
  var contador = 0;
  for (var i = inteiro.length - 1; i >= 0; i--) {
    comMilhares = inteiro.charAt(i) + comMilhares;
    contador++;
    if (contador % 3 === 0 && i !== 0) {
      comMilhares = "." + comMilhares;
    }
  }
  return (negativo ? "-" : "") + "R$ " + comMilhares + "," + decimal;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var temLock = false;
  try {
    temLock = lock.tryLock(10000);
    if (!temLock) {
      return responder({ status: "error", message: "Sistema ocupado, tente novamente em alguns segundos." });
    }
    if (!e || !e.postData || !e.postData.contents) {
      return responder({ status: "error", message: "Payload vazio" });
    }
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return responder({ status: "error", message: "JSON invalido: " + err.toString() });
    }
    var action = String(data.action || "").toLowerCase().trim();
    if (!action) {
      return responder({ status: "error", message: "Nenhuma acao informada" });
    }
    if (action.indexOf("del") === 0 && action.indexOf("delete") !== 0) {
      action = "delete" + action.substring(3);
    }
    if (action.indexOf("create") === 0) {
      action = "criar" + action.substring(6);
    }
    if (action.indexOf("list") === 0) {
      action = "get" + action.substring(4);
    }
    if (action.indexOf("edit") === 0) {
      action = "update" + action.substring(4);
    }
    if (action === "login") {
      return responder(processarLogin(data.username, data.password));
    }
    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return responder({ status: "error", message: "Acesso Negado" });
    }
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (errSS) {
      return responder({ status: "error", message: "Erro ao abrir planilha: " + errSS.toString() });
    }
    if (action === "debuginfo") {
      var abaPed = buscarAba(ss, "pedidos");
      var abaFin = buscarAba(ss, "financeiro");
      return responder({
        status: "success",
        spreadsheet_id: ss.getId(),
        spreadsheet_url: ss.getUrl(),
        aba_pedidos_linhas: abaPed ? abaPed.getLastRow() : "aba nao encontrada",
        aba_financeiro_linhas: abaFin ? abaFin.getLastRow() : "aba nao encontrada"
      });
    }
    if (action === "heartbeat") {
      var sheetUsuariosHb = buscarAba(ss, "usuarios");
      return responder(processarHeartbeat(sheetUsuariosHb, data.username));
    }
    if (action === "getusuariosonline") {
      var sheetUsuariosOn = buscarAba(ss, "usuarios");
      return responder(processarGetUsuariosOnline(sheetUsuariosOn));
    }
    if (action === "getpedidosrapido") {
      var sheetPedRapido = buscarAba(ss, "pedidos");
      if (!sheetPedRapido) return responder({ status: "error", message: "Aba 'pedidos' nao encontrada" });
      return responder(processarGetPedidosRapido(sheetPedRapido));
    }
    if (action === "getchatpedido") {
      var sheetChatRapido = buscarAba(ss, "chat");
      if (!sheetChatRapido) return responder({ status: "error", message: "Aba 'chat' nao encontrada" });
      return responder(processarGetChatPedido(sheetChatRapido, data.pedido_id || data.id_pedido || data.id));
    }
    if (action === "getdashboarddata") {
      return responder(processarGetDashboardData(ss));
    }
    if (action === "criarpedido") {
      var sheetPedidos = buscarAba(ss, "pedidos");
      if (!sheetPedidos) return responder({ status: "error", message: "Aba 'pedidos' nao encontrada" });
      return responder(processarCriarPedido(sheetPedidos, data));
    }
    if (action === "criarchat" || action === "addchat" || action === "savechat") {
      return responder({ status: "error", message: "Acao bloqueada. O chat e criado automaticamente junto com o pedido." });
    }
    if (action === "getfinanceirocompleto") {
      return responder(processarGetFinanceiroCompleto());
    }
    if (action === "validarsenhamaster") {
      return responder(processarValidarSenhaMaster(data.senha));
    }
    if (action === "deletechat") {
      return responder(processarDeleteChat(ss, data));
    }
    if (action === "excluirpedidocompleto") {
      return responder(processarExclusaoCompleta(ss, data));
    }
    if (action === "salvarrelatoriofinanceiro" || action === "addrelatoriofinanceiro" || action === "criarrelatoriofinanceiro") {
      var sheetRelFin = buscarAba(ss, "relatorios");
      if (!sheetRelFin) return responder({ status: "error", message: "Aba 'relatorios' nao encontrada" });
      return responder(processarSalvarRelatorioFinanceiro(sheetRelFin, data));
    }
    if (action === "salvarextrato" || action === "addextrato" || action === "criarextrato") {
      var sheetExt = buscarAba(ss, "extratos");
      if (!sheetExt) return responder({ status: "error", message: "Aba 'extratos' nao encontrada" });
      return responder(processarSalvarExtrato(sheetExt, data));
    }
    var entidade = extrairEntidade(action);
    var nomeAba = mapearEntidade(entidade);
    var sheet = buscarAba(ss, nomeAba);
    if (!sheet) {
      return responder({ status: "error", message: "Aba nao encontrada: '" + nomeAba + "' (action: " + action + ")" });
    }
    if (action.indexOf("get") === 0) {
      return responder(processarGet(sheet));
    }
    if (action.indexOf("add") === 0 || action.indexOf("save") === 0 || action.indexOf("criar") === 0) {
      return responder(processarAdd(sheet, data, nomeAba));
    }
    if (action.indexOf("update") === 0) {
      return responder(processarUpdateComSincronia(ss, sheet, nomeAba, data));
    }
    if (action.indexOf("delete") === 0) {
      if (nomeAba === "pedidos") {
        return responder(processarExclusaoCompleta(ss, { id: data.id, senha_master: "SKIP" }));
      }
      return responder(processarDelete(sheet, data.id));
    }
    return responder({ status: "error", message: "Acao nao suportada: " + action });
  } catch (err) {
    console.error("[doPost] Erro interno: " + err.toString() + " | Stack: " + (err.stack || "n/a"));
    return responder({ status: "error", message: "Erro interno: " + err.toString(), stack: err.stack || "n/a" });
  } finally {
    if (temLock) lock.releaseLock();
  }
}

function processarGetPedidosRapido(sheet) {
  try {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return { status: "success", data: [], total: 0 };
    var range = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = range[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var resultado = [];
    for (var i = 1; i < range.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        if (headers[j] === "") continue;
        var campoNorm = normalizarChave(headers[j]);
        var valor = converterValorCelula(range[i][j]);
        if (ehCampoMonetario(campoNorm) && valor !== "") {
          valor = formatarMoeda(valor);
        }
        obj[headers[j]] = valor;
      }
      resultado.push(obj);
    }
    return { status: "success", data: resultado, total: resultado.length };
  } catch (err) {
    return { status: "error", message: "Erro em processarGetPedidosRapido: " + err.toString() };
  }
}

function processarGetChatPedido(sheet, pedidoId) {
  try {
    if (!pedidoId) return { status: "error", message: "pedido_id nao informado" };
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return { status: "success", data: [], total: 0 };
    var range = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = range[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colPedidoId = headers.indexOf("pedido_id");
    if (colPedidoId === -1) return { status: "error", message: "Coluna 'pedido_id' nao encontrada na aba chat" };
    var idBusca = String(pedidoId).trim().toUpperCase();
    var idBuscaNorm = idBusca.replace(/^RDO0*/i, "").trim();
    var resultado = [];
    for (var i = 1; i < range.length; i++) {
      var valCelula = String(range[i][colPedidoId]).trim().toUpperCase();
      var valNorm = valCelula.replace(/^RDO0*/i, "").trim();
      if (valCelula === idBusca || valNorm === idBuscaNorm) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          if (headers[j] !== "") obj[headers[j]] = converterValorCelula(range[i][j]);
        }
        resultado.push(obj);
      }
    }
    return { status: "success", data: resultado, total: resultado.length };
  } catch (err) {
    return { status: "error", message: "Erro em processarGetChatPedido: " + err.toString() };
  }
}

function processarUpdateComSincronia(ss, sheet, nomeAba, data) {
  try {
    var aliases = nomeAba === "financeiro" ? ALIASES_FINANCEIRO :
      nomeAba === "pedidos" ? ALIASES_PEDIDOS : {};
    var resultadoUpdate = processarUpdate(sheet, data, aliases);
    if (nomeAba === "financeiro" &&
      (resultadoUpdate.status === "success" || resultadoUpdate.status === "partial_error")) {
      var chaveSituacao = null;
      var chaveIdPedido = null;
      var chavesRecebidas = Object.keys(data);
      for (var k = 0; k < chavesRecebidas.length; k++) {
        var norm = normalizarChave(chavesRecebidas[k]);
        var alvo = aliases[norm] || norm;
        if (alvo === "situacao") chaveSituacao = chavesRecebidas[k];
        if (norm === "id_pedido" || norm === "pedido_id") chaveIdPedido = chavesRecebidas[k];
      }
      if (chaveSituacao !== null) {
        var novaSituacaoVal = data[chaveSituacao];
        var idPedidoRelacionado = chaveIdPedido ? data[chaveIdPedido] : "";
        if (!idPedidoRelacionado) {
          idPedidoRelacionado = buscarIdPedidoNoFinanceiro(sheet, data.id);
        }
        if (idPedidoRelacionado) {
          var syncOk = sincronizarSituacaoFinanceiroComPedido(ss, idPedidoRelacionado, novaSituacaoVal);
          resultadoUpdate.sincronizadoComPedido = syncOk;
          resultadoUpdate.idPedidoSincronizado = idPedidoRelacionado;
        } else {
          resultadoUpdate.sincronizadoComPedido = false;
          resultadoUpdate.avisoSincronizacao = "id_pedido nao encontrado para vincular com 'pedidos'";
        }
      }
    }
    if (nomeAba === "pedidos" &&
      (resultadoUpdate.status === "success" || resultadoUpdate.status === "partial_error")) {
      var chavesRecebidasPed = Object.keys(data);
      var chaveSituacaoPed = null;
      var chaveStatusPed = null;
      for (var kp = 0; kp < chavesRecebidasPed.length; kp++) {
        var normPed = normalizarChave(chavesRecebidasPed[kp]);
        var alvoPed = ALIASES_PEDIDOS[normPed] || normPed;
        if (alvoPed === "situacao_financeira") chaveSituacaoPed = chavesRecebidasPed[kp];
        if (normPed === "status") chaveStatusPed = chavesRecebidasPed[kp];
      }
      if (chaveStatusPed !== null) {
        var statusValor = String(data[chaveStatusPed] || "").trim().toUpperCase();
        if (statusValor === "CANCELADO") {
          var sheetPedidosRef = buscarAba(ss, "pedidos");
          var valuesPed = sheetPedidosRef.getDataRange().getValues();
          var headersPed2 = valuesPed[0].map(function (h) { return normalizarChave(h); });
          var idIdxPed = headersPed2.indexOf("id");
          var colSitFinIdx = headersPed2.indexOf("situacao_financeira");
          if (idIdxPed !== -1 && colSitFinIdx !== -1) {
            var idBuscaCanc = String(data.id).trim().toUpperCase();
            for (var lp = 1; lp < valuesPed.length; lp++) {
              if (String(valuesPed[lp][idIdxPed]).trim().toUpperCase() === idBuscaCanc) {
                sheetPedidosRef.getRange(lp + 1, colSitFinIdx + 1).setValue("Cancelado");
                SpreadsheetApp.flush();
                break;
              }
            }
          }
          data["_forcarSituacaoFinanceira"] = "Cancelado";
        }
      }
      if (chaveSituacaoPed !== null || data["_forcarSituacaoFinanceira"]) {
        var novaSituacaoPedVal = data["_forcarSituacaoFinanceira"] || data[chaveSituacaoPed];
        var syncOkPed = sincronizarSituacaoPedidoComFinanceiro(ss, data.id, novaSituacaoPedVal);
        resultadoUpdate.sincronizadoComFinanceiro = syncOkPed;
      }
    }
    return resultadoUpdate;
  } catch (err) {
    return { status: "error", message: "Erro em processarUpdateComSincronia: " + err.toString() };
  }
}

function sincronizarSituacaoFinanceiroComPedido(ss, idPedido, novaSituacao) {
  try {
    if (!idPedido) return false;
    var sheetPedidos = buscarAba(ss, "pedidos");
    if (!sheetPedidos) return false;
    var values = sheetPedidos.getDataRange().getValues();
    if (values.length === 0) return false;
    var headers = values[0].map(function (h) { return normalizarChave(h); });
    var idIndex = headers.indexOf("id");
    var colSitFinIndex = headers.indexOf("situacao_financeira");
    if (idIndex === -1 || colSitFinIndex === -1) return false;
    var idBusca = String(idPedido).trim().toUpperCase();
    var idBuscaNum = idBusca.replace(/^RDO0*/i, "").trim();
    var sitFormatada = capitalizar(novaSituacao);
    for (var i = 1; i < values.length; i++) {
      var idCelula = String(values[i][idIndex]).trim().toUpperCase();
      var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();
      if (idCelula === idBusca || idCelulaNum === idBuscaNum) {
        sheetPedidos.getRange(i + 1, colSitFinIndex + 1).setValue(sitFormatada);
        SpreadsheetApp.flush();
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("Erro em sincronizarSituacaoFinanceiroComPedido: " + err.toString());
    return false;
  }
}

function sincronizarSituacaoPedidoComFinanceiro(ss, idPedido, novaSituacao) {
  try {
    if (!idPedido) return false;
    var sheetFinanceiro = buscarAba(ss, "financeiro");
    if (!sheetFinanceiro) return false;
    var values = sheetFinanceiro.getDataRange().getValues();
    if (values.length === 0) return false;
    var headers = values[0].map(function (h) { return normalizarChave(h); });
    var idPedidoIndex = headers.indexOf("id_pedido") !== -1 ? headers.indexOf("id_pedido") : headers.indexOf("pedido_id");
    var colSituacaoIndex = headers.indexOf("situacao");
    if (idPedidoIndex === -1 || colSituacaoIndex === -1) return false;
    var idBusca = String(idPedido).trim().toUpperCase();
    var idBuscaNum = idBusca.replace(/^RDO0*/i, "").trim();
    var sitFormatada = capitalizar(novaSituacao);
    var atualizou = false;
    for (var i = 1; i < values.length; i++) {
      var idCelula = String(values[i][idPedidoIndex]).trim().toUpperCase();
      var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();
      if (idCelula === idBusca || idCelulaNum === idBuscaNum) {
        sheetFinanceiro.getRange(i + 1, colSituacaoIndex + 1).setValue(sitFormatada);
        atualizou = true;
      }
    }
    if (atualizou) SpreadsheetApp.flush();
    return atualizou;
  } catch (err) {
    console.error("Erro em sincronizarSituacaoPedidoComFinanceiro: " + err.toString());
    return false;
  }
}

function processarGetDashboardData(ss) {
  try {
    var sheetClientes = buscarAba(ss, "clientes");
    var sheetColaboradores = buscarAba(ss, "colaboradores");
    var sheetUsuarios = buscarAba(ss, "usuarios");
    var sheetPedidos = buscarAba(ss, "pedidos");
    var sheetFinanceiro = buscarAba(ss, "financeiro");
    var sheetRelatorios = buscarAba(ss, "relatorios");
    var sheetExtratos = buscarAba(ss, "extratos");
    return {
      status: "success",
      data: {
        clientes: sheetClientes ? processarGet(sheetClientes) : [],
        colaboradores: sheetColaboradores ? processarGet(sheetColaboradores) : [],
        usuarios: sheetUsuarios ? processarGet(sheetUsuarios) : [],
        pedidos: sheetPedidos ? processarGet(sheetPedidos) : [],
        financeiro: sheetFinanceiro ? processarGet(sheetFinanceiro) : [],
        relatorios: sheetRelatorios ? processarGet(sheetRelatorios) : [],
        extratos: sheetExtratos ? processarGet(sheetExtratos) : []
      }
    };
  } catch (err) {
    return { status: "error", message: "Erro em processarGetDashboardData: " + err.toString() };
  }
}

function processarHeartbeat(sheet, username) {
  try {
    if (!sheet) return { status: "error", message: "Aba 'usuarios' nao encontrada" };
    var usernameTrim = String(username || "").trim();
    if (!usernameTrim) return { status: "error", message: "Username nao informado" };
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { status: "error", message: "Nenhum usuario cadastrado" };
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
    var colUltimoAcesso = headers.indexOf("ultimo_acesso");
    var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);
    var colImg = buscarColuna(headers, ["imagem", "foto", "avatar", "image"]);
    var colId = headers.indexOf("id");
    if (colUser === -1) return { status: "error", message: "Coluna 'username' nao encontrada" };
    if (colUltimoAcesso === -1) return { status: "error", message: "Coluna 'ultimo_acesso' nao encontrada" };
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colUser]).trim() === usernameTrim) {
        sheet.getRange(i + 1, colUltimoAcesso + 1).setValue(new Date().toISOString());
        return {
          status: "success",
          user: {
            id: colId !== -1 ? String(rows[i][colId]).trim() : "",
            username: String(rows[i][colUser]).trim(),
            tipo: colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
            cargo: colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
            imagem: colImg !== -1 ? String(rows[i][colImg]).trim() : ""
          }
        };
      }
    }
    return { status: "error", message: "Usuario '" + usernameTrim + "' nao encontrado" };
  } catch (err) {
    return { status: "error", message: "Erro em processarHeartbeat: " + err.toString() };
  }
}

function processarGetUsuariosOnline(sheet) {
  try {
    if (!sheet) return { status: "error", message: "Aba 'usuarios' nao encontrada" };
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { status: "success", total: 0, usuarios: [] };
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
    var colUltimoAcesso = headers.indexOf("ultimo_acesso");
    if (colUser === -1 || colUltimoAcesso === -1) {
      return { status: "success", total: 0, usuarios: [] };
    }
    var LIMITE_MS = 2 * 60 * 1000;
    var agora = new Date().getTime();
    var online = [];
    for (var i = 1; i < rows.length; i++) {
      var valAcesso = rows[i][colUltimoAcesso];
      if (!valAcesso) continue;
      var timestamp = new Date(valAcesso).getTime();
      if (isNaN(timestamp)) continue;
      if (agora - timestamp <= LIMITE_MS) {
        online.push(String(rows[i][colUser]).trim());
      }
    }
    return { status: "success", total: online.length, usuarios: online };
  } catch (err) {
    return { status: "error", message: "Erro em processarGetUsuariosOnline: " + err.toString() };
  }
}

function processarDeleteChat(ss, data) {
  try {
    var sheetChat = buscarAba(ss, "chat");
    if (!sheetChat) return { status: "error", message: "Aba 'chat' nao encontrada" };
    var pedidoId = String(data.pedido_id || data.id || "").trim();
    if (!pedidoId) return { status: "error", message: "pedido_id nao informado" };
    var rows = sheetChat.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colPedidoId = headers.indexOf("pedido_id");
    var colId = headers.indexOf("id");
    if (colPedidoId === -1 && colId === -1) {
      return { status: "error", message: "Coluna 'pedido_id' nao encontrada na aba chat" };
    }
    var colBusca = colPedidoId !== -1 ? colPedidoId : colId;
    var pedidoNorm = pedidoId.replace(/^RDO0*/i, "").trim();
    var deletados = 0;
    for (var i = rows.length - 1; i >= 1; i--) {
      var valCelula = String(rows[i][colBusca]).trim();
      var valNorm = valCelula.replace(/^RDO0*/i, "").trim();
      if (valCelula === pedidoId || valNorm === pedidoNorm || valCelula.toUpperCase() === pedidoId.toUpperCase()) {
        sheetChat.deleteRow(i + 1);
        deletados++;
      }
    }
    if (deletados > 0) return { status: "success", message: "Chat excluido! Registros: " + deletados };
    return { status: "success", message: "Nenhum chat encontrado para pedido_id: " + pedidoId };
  } catch (err) {
    return { status: "error", message: "Erro em processarDeleteChat: " + err.toString() };
  }
}

function processarExclusaoCompleta(ss, data) {
  try {
    var idBruto = String(data.id || data.pedido_id || "").trim();
    var senha = String(data.senha_master || "").trim();
    var bypassInterno = senha === "SKIP";
    if (!idBruto) return { status: "error", message: "ID do pedido nao informado." };
    if (!bypassInterno) {
      if (!senha) return { status: "error", message: "Senha master nao informada." };
      var validacao = processarValidarSenhaMaster(senha);
      if (!validacao || validacao.status !== "success" || validacao.valido !== true) {
        return { status: "error", message: "Senha master invalida." };
      }
    }
    var idNorm = idBruto.replace(/^RDO0*/i, "").trim();
    var idBuscaFull = idBruto.toUpperCase();
    var resultado = { status: "success", chat: { deletados: 0 }, pedido: { encontrado: false } };
    var sheetChat = buscarAba(ss, "chat");
    var sheetPedidos = buscarAba(ss, "pedidos");
    if (!sheetPedidos) return { status: "error", message: "Aba 'pedidos' nao encontrada." };
    if (sheetChat) {
      var rowsChat = sheetChat.getDataRange().getValues();
      var headersChat = rowsChat[0].map(function (h) { return String(h).toLowerCase().trim(); });
      var colPedidoId = headersChat.indexOf("pedido_id");
      if (colPedidoId !== -1) {
        for (var i = rowsChat.length - 1; i >= 1; i--) {
          var valCelula = String(rowsChat[i][colPedidoId]).trim();
          var valNorm = valCelula.replace(/^RDO0*/i, "").trim();
          if (valCelula === idBruto || valNorm === idNorm || valCelula.toUpperCase() === idBuscaFull) {
            sheetChat.deleteRow(i + 1);
            resultado.chat.deletados++;
          }
        }
      }
    }
    var rowsPed = sheetPedidos.getDataRange().getValues();
    var headersPed = rowsPed[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var idIndexPed = headersPed.indexOf("id");
    if (idIndexPed === -1) {
      resultado.status = "error";
      resultado.message = "Coluna 'id' nao encontrada na aba 'pedidos'.";
      return resultado;
    }
    var apagouPedido = false;
    for (var j = rowsPed.length - 1; j >= 1; j--) {
      var idCelulaPed = String(rowsPed[j][idIndexPed]).trim();
      var idCelulaPedNorm = idCelulaPed.replace(/^RDO0*/i, "").trim();
      if (idCelulaPed === idBruto || idCelulaPedNorm === idNorm || idCelulaPed === idBuscaFull) {
        sheetPedidos.deleteRow(j + 1);
        apagouPedido = true;
        break;
      }
    }
    resultado.pedido.encontrado = apagouPedido;
    if (!apagouPedido) {
      resultado.status = "error";
      resultado.message = "Pedido nao encontrado: " + idBruto + " (chat removido: " + resultado.chat.deletados + " registro(s)).";
      return resultado;
    }
    resultado.message = "Pedido e chat excluidos com sucesso. Chat removido: " + resultado.chat.deletados + " registro(s).";
    return resultado;
  } catch (err) {
    return { status: "error", message: "Erro em processarExclusaoCompleta: " + err.toString() };
  }
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
  var contato = String(data.contato || data.telefone || "").trim() || "N/D";
  var mercadoria = String(data.mercadoria || "").trim() || "N/D";
  var rotasTexto = String(data.rotas_texto || "").trim();
  var linhasRotas = [];
  if (rotasTexto) {
    var linhasBrutas = rotasTexto.split("\n");
    for (var i = 0; i < linhasBrutas.length; i++) {
      var linha = linhasBrutas[i].trim();
      if (!linha) continue;
      var deMatch = linha.match(/De:\s*([^|]+)/i);
      var paraMatch = linha.match(/Para:\s*(.+)/i);
      var de = deMatch ? deMatch[1].trim() : "N/D";
      var para = paraMatch ? paraMatch[1].trim() : "N/D";
      linhasRotas.push((linhasRotas.length + 1) + ". De: " + de + " | Para: " + para + ".");
    }
  }
  if (linhasRotas.length === 0) {
    var de2 = String(data.de || "").trim() || "N/D";
    var para2 = String(data.para || "").trim() || "N/D";
    linhasRotas.push("1. De: " + de2 + " | Para: " + para2 + ".");
  }
  var distancia = String(data.distancia || "").trim() || "-";
  var tempo = String(data.tempo || "").trim() || "-";
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

function normalizarDataStr(bruto) {
  if (bruto === null || bruto === undefined) return "";
  if (bruto instanceof Date) {
    var d = bruto.getDate();
    var m = bruto.getMonth() + 1;
    var y = bruto.getFullYear();
    return (d < 10 ? "0" + d : d) + "/" + (m < 10 ? "0" + m : m) + "/" + y;
  }
  var texto = String(bruto).trim();
  if (!texto) return "";
  var match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    var dia = ("0" + match[1]).slice(-2);
    var mes = ("0" + match[2]).slice(-2);
    var ano = match[3];
    if (ano.length === 2) ano = "20" + ano;
    return dia + "/" + mes + "/" + ano;
  }
  var matchIso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    var ano2 = matchIso[1];
    var mes2 = ("0" + matchIso[2]).slice(-2);
    var dia2 = ("0" + matchIso[3]).slice(-2);
    return dia2 + "/" + mes2 + "/" + ano2;
  }
  return texto;
}

function escreverComoTexto(sheet, linha, coluna, valorTexto) {
  sheet.getRange(linha, coluna).setNumberFormat("@");
  sheet.getRange(linha, coluna).setValue(valorTexto);
}

function processarCriarPedido(sheetPedidos, data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetChat = buscarAba(ss, "chat");
    var idPedido = String(data.id || "").trim() || gerarId(sheetPedidos, "pedidos");
    var idCliente = String(data.id_cliente || data.id_chat || "").trim();
    var rotasTexto = String(data.rotas_texto || "");
    var deStr = "";
    var paraStr = "";
    if (rotasTexto) {
      var primeiraLinha = rotasTexto.split("\n")[0] || "";
      var deMatch = primeiraLinha.match(/De:\s*([^|]+)/i);
      var paraMatch = primeiraLinha.match(/Para:\s*(.+)/i);
      if (deMatch) deStr = deMatch[1].trim();
      if (paraMatch) paraStr = paraMatch[1].trim();
    }
    if (!deStr) deStr = String(data.de || "");
    if (!paraStr) paraStr = String(data.para || "");
    var horaStr = String(data.hora || data.horario_chat || data.horario || "").trim();
    if (!horaStr) {
      horaStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
    }
    var dataBrutaRecebida = data.data || data.data_servico || data.data_chat || "";
    var dataStr = normalizarDataStr(dataBrutaRecebida);
    if (!dataStr) {
      dataStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    }
    if (sheetChat && idCliente && !chatJaExiste(sheetChat, idPedido)) {
      var textoChat = montarTextoChat(idPedido, data);
      var idMsg = Math.random().toString(36).substring(2, 13).toUpperCase();
      sheetChat.appendRow([idMsg, idCliente, idPedido, textoChat, horaStr, dataStr, "TRUE"]);
      escreverComoTexto(sheetChat, sheetChat.getLastRow(), 6, dataStr);
    }
    var situacaoFinanceira = capitalizar(data.situacao_financeira || "Pendente");
    var valorFormatado = formatarMoeda(data.valor_corrida || data.valor_final || "");
    var rowData = {
      id: idPedido,
      id_cliente: idCliente,
      solicitante: String(data.solicitante || ""),
      contato: String(data.contato || ""),
      data: dataStr,
      horario: horaStr,
      hora: horaStr,
      mercadoria: String(data.mercadoria || ""),
      de: deStr,
      para: paraStr,
      retorno: String(data.retorno || ""),
      prioridade: String(data.prioridade || "N/A"),
      valor_corrida: valorFormatado,
      motoboy: String(data.motoboy || ""),
      status: String(data.status || "PENDENTE"),
      situacao_financeira: situacaoFinanceira,
      observacao: String(data.observacao || data.obs || "")
    };
    var headersOriginais = obterHeaders(sheetPedidos);
    var headersNorm = headersOriginais.map(normalizarChave);
    var idIndex = headersNorm.indexOf("id");
    var colDataIndex = headersNorm.indexOf("data");
    if (headersNorm.length === 0 || idIndex === -1) {
      return { status: "error", message: "Cabecalho invalido na aba 'pedidos': coluna 'id' nao encontrada." };
    }
    var row = [];
    for (var i = 0; i < headersNorm.length; i++) {
      var campo = headersNorm[i];
      row.push(rowData[campo] !== undefined ? rowData[campo] : "");
    }
    sheetPedidos.appendRow(row);
    if (colDataIndex !== -1) {
      escreverComoTexto(sheetPedidos, sheetPedidos.getLastRow(), colDataIndex + 1, dataStr);
    }
    var sheetFinanceiro = buscarAba(ss, "financeiro");
    if (sheetFinanceiro) {
      var idFinanceiro = gerarId(sheetFinanceiro, "financeiro");
      var headersFin = obterHeaders(sheetFinanceiro);
      var rowDataFin = {
        id: idFinanceiro,
        colaborador_id: String(data.colaborador_id || ""),
        id_pedido: idPedido,
        pedido_id: idPedido,
        data: dataStr,
        tipo: "Corrida",
        descricao: "Referente ao pedido " + idPedido,
        vlr_servico: valorFormatado,
        colaborador: String(data.motoboy || ""),
        observacao: "",
        situacao: "Pendente"
      };
      var rowFin = [];
      for (var f = 0; f < headersFin.length; f++) {
        var campoFin = normalizarChave(headersFin[f]);
        rowFin.push(rowDataFin[campoFin] !== undefined ? rowDataFin[campoFin] : "");
      }
      sheetFinanceiro.appendRow(rowFin);
      var colDataFinIdx = headersFin.indexOf("data");
      if (colDataFinIdx !== -1) {
        escreverComoTexto(sheetFinanceiro, sheetFinanceiro.getLastRow(), colDataFinIdx + 1, dataStr);
      }
    }
    SpreadsheetApp.flush();
    return { status: "success", id: idPedido, message: "Pedido criado com sucesso!" };
  } catch (err) {
    return { status: "error", message: "Erro em processarCriarPedido: " + err.toString() };
  }
}

function processarValidarSenhaMaster(senha) {
  if (!senha || String(senha).trim() === "") {
    return { status: "error", valido: false, message: "Senha nao informada." };
  }
  var senhaTrim = String(senha).trim();
  if (senhaTrim === MASTER_PASSWORD) return { status: "success", valido: true };
  return { status: "success", valido: false };
}

function processarLogin(user, pass) {
  try {
    if (!user || !pass) return { status: "error", message: "Usuario e senha sao obrigatorios" };
    var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
    if (!sheet) return { status: "error", message: "Aba 'usuarios' nao encontrada" };
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return { status: "error", message: "Nenhum usuario cadastrado" };
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
    var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
    var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);
    var colImg = buscarColuna(headers, ["imagem", "foto", "avatar", "image"]);
    var colUltimoAcesso = headers.indexOf("ultimo_acesso");
    var colId = headers.indexOf("id");
    if (colUser === -1 || colPass === -1) return { status: "error", message: "Colunas 'username' ou 'password' nao encontradas" };
    var userTrim = String(user).trim();
    var passTrim = String(pass).trim();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][colUser]).trim() === userTrim && String(rows[i][colPass]).trim() === passTrim) {
        if (colUltimoAcesso !== -1) {
          sheet.getRange(i + 1, colUltimoAcesso + 1).setValue(new Date().toISOString());
        }
        return {
          status: "success",
          user: {
            id: colId !== -1 ? String(rows[i][colId]).trim() : "",
            username: String(rows[i][colUser]).trim(),
            tipo: colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
            imagem: colImg !== -1 ? String(rows[i][colImg]).trim() : ""
          }
        };
      }
    }
    return { status: "error", message: "Usuario ou senha incorretos" };
  } catch (err) {
    return { status: "error", message: "Erro em processarLogin: " + err.toString() };
  }
}

function processarGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var resultado = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== "") {
        var campoNorm = normalizarChave(headers[j]);
        var valorCel = converterValorCelula(rows[i][j]);
        if (ehCampoMonetario(campoNorm) && valorCel !== "") {
          valorCel = formatarMoeda(valorCel);
        }
        obj[headers[j]] = valorCel;
      }
    }
    resultado.push(obj);
  }
  return resultado;
}

function processarGetFinanceiroCompleto() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetFin = buscarAba(ss, "financeiro");
    var sheetPed = buscarAba(ss, "pedidos");
    var sheetCli = buscarAba(ss, "clientes");
    if (!sheetFin) return { status: "error", message: "Aba 'financeiro' nao encontrada" };
    var finRows = sheetFin.getDataRange().getValues();
    if (finRows.length <= 1) return { status: "success", data: [] };
    var finHeaders = finRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var pedidosMap = {};
    if (sheetPed) {
      var pedRows = sheetPed.getDataRange().getValues();
      if (pedRows.length > 1) {
        var pedHeaders = pedRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
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
        var cliHeaders = cliRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
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
          var campoNormFin = normalizarChave(finHeaders[col]);
          var valorCelFin = converterValorCelula(finRows[r][col]);
          if (ehCampoMonetario(campoNormFin) && valorCelFin !== "") {
            valorCelFin = formatarMoeda(valorCelFin);
          }
          obj[finHeaders[col]] = valorCelFin;
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
  } catch (err) {
    return { status: "error", message: "Erro em processarGetFinanceiroCompleto: " + err.toString() };
  }
}

function processarSalvarRelatorioFinanceiro(sheet, data) {
  try {
    var headers = obterHeaders(sheet);
    var id = String(data.id || "").trim() || gerarId(sheet, "relatorios");
    var rowData = {
      id: id,
      colaborador_id: String(data.colaborador_id || ""),
      id_pedido: String(data.id_pedido || "-"),
      data: normalizarDataStr(data.data) || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
      tipo: String(data.tipo || "Financeiro"),
      descricao: String(data.descricao || ""),
      vlr_servico: formatarMoeda(data.vlr_servico || "0"),
      colaborador: String(data.colaborador || ""),
      observacao: typeof data.observacao === "string" ? data.observacao : JSON.stringify(data.observacao || {}),
      situacao: String(data.situacao || "Concluído")
    };
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var campo = normalizarChave(headers[i]);
      row.push(rowData[campo] !== undefined ? rowData[campo] : "");
    }
    sheet.appendRow(row);
    var colDataIdx = headers.indexOf("data");
    if (colDataIdx !== -1) {
      escreverComoTexto(sheet, sheet.getLastRow(), colDataIdx + 1, rowData.data);
    }
    return { status: "success", id: id, message: "Relatório financeiro salvo com sucesso!" };
  } catch (err) {
    return { status: "error", message: "Erro em processarSalvarRelatorioFinanceiro: " + err.toString() };
  }
}

function processarSalvarExtrato(sheet, data) {
  try {
    var headers = obterHeaders(sheet);
    var id = String(data.id || "").trim() || gerarId(sheet, "extratos");
    var rowData = {};
    var chaves = Object.keys(data || {});
    for (var c = 0; c < chaves.length; c++) {
      var chaveO = chaves[c];
      rowData[normalizarChave(chaveO)] = data[chaveO];
    }
    rowData.id = id;
    if (rowData.registros !== undefined && typeof rowData.registros !== "string") {
      rowData.registros = JSON.stringify(rowData.registros);
    }
    if (rowData.totais !== undefined && typeof rowData.totais !== "string") {
      rowData.totais = JSON.stringify(rowData.totais);
    }
    if (!rowData.criado_em) {
      rowData.criado_em = new Date().toISOString();
    }
    if (rowData.data !== undefined) {
      rowData.data = normalizarDataStr(rowData.data);
    }
    if (headers.length > 0) {
      var row = [];
      for (var i = 0; i < headers.length; i++) {
        var campo = normalizarChave(headers[i]);
        row.push(rowData[campo] !== undefined ? String(rowData[campo]) : "");
      }
      sheet.appendRow(row);
      var colDataIdx = headers.indexOf("data");
      if (colDataIdx !== -1 && row[colDataIdx]) {
        escreverComoTexto(sheet, sheet.getLastRow(), colDataIdx + 1, row[colDataIdx]);
      }
    } else {
      sheet.appendRow([id, String(rowData.origem || ""), String(rowData.periodo_inicio || ""),
        String(rowData.periodo_fim || ""), String(rowData.periodolabel || ""),
        String(rowData.totais || ""), String(rowData.registros || ""), String(rowData.criado_em || "")]);
    }
    return { status: "success", id: id, message: "Extrato salvo com sucesso!" };
  } catch (err) {
    return { status: "error", message: "Erro em processarSalvarExtrato: " + err.toString() };
  }
}

function processarAdd(sheet, data, entity) {
  try {
    var headers = obterHeaders(sheet);
    var idIndex = headers.indexOf("id");
    var colDataIdx = headers.indexOf("data");
    var dataNorm = {};
    var chaves = Object.keys(data || {});
    for (var c = 0; c < chaves.length; c++) {
      var chaveO = chaves[c];
      var valorO = data[chaveO];
      dataNorm[normalizarChave(chaveO)] = (valorO !== null && typeof valorO === "object") ? JSON.stringify(valorO) : valorO;
    }
    if (idIndex !== -1) {
      var idAtual = dataNorm.id !== undefined && dataNorm.id !== null ? String(dataNorm.id).trim() : "";
      if (!idAtual) dataNorm.id = gerarId(sheet, entity);
      data.id = dataNorm.id;
    }
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var campo = normalizarChave(headers[i]);
      var valor = "";
      if (campo === "status" && dataNorm[campo] !== undefined && dataNorm[campo] !== null && dataNorm[campo] !== "") {
        var statusVal = String(dataNorm[campo]).trim().toUpperCase();
        valor = (statusVal === "TRUE" || statusVal === "FALSE") ? statusVal : String(dataNorm[campo]).trim();
      } else if (campo === "contato" && dataNorm.telefone && !dataNorm.contato) {
        valor = String(dataNorm.telefone).trim();
      } else if (campo === "data_criacao" && !dataNorm.data_criacao) {
        valor = new Date().toISOString();
      } else if (campo === "criado_em" && !dataNorm.criado_em) {
        valor = new Date().toISOString();
      } else if (campo === "data" && dataNorm[campo] !== undefined && dataNorm[campo] !== null) {
        valor = normalizarDataStr(dataNorm[campo]);
      } else if (campo === "situacao" && !dataNorm.situacao) {
        valor = "Pendente";
      } else if (campo === "situacao_financeira" && !dataNorm.situacao_financeira) {
        valor = "Pendente";
      } else if (ehCampoMonetario(campo) && dataNorm[campo] !== undefined && dataNorm[campo] !== null) {
        valor = formatarMoeda(dataNorm[campo]);
      } else if (dataNorm[campo] !== undefined && dataNorm[campo] !== null) {
        valor = String(dataNorm[campo]).trim();
      }
      row.push(valor);
    }
    sheet.appendRow(row);
    if (colDataIdx !== -1 && row[colDataIdx]) {
      escreverComoTexto(sheet, sheet.getLastRow(), colDataIdx + 1, row[colDataIdx]);
    }
    var idIndexRetorno = headers.indexOf("id");
    return { status: "success", message: "Adicionado!", id: idIndexRetorno !== -1 ? dataNorm.id : undefined };
  } catch (err) {
    return { status: "error", message: "Erro em processarAdd: " + err.toString() };
  }
}

function processarUpdate(sheet, data, aliases) {
  try {
    aliases = aliases || {};
    var values = sheet.getDataRange().getValues();
    if (values.length === 0) return { status: "error", message: "Planilha vazia" };
    var headers = values[0].map(function (h) { return String(h).toLowerCase().trim(); }).map(normalizarChave);
    var idIndex = headers.indexOf("id");
    if (idIndex === -1) return { status: "error", message: "Coluna 'id' nao encontrada" };
    if (!data || !data.id) return { status: "error", message: "ID nao informado para atualizacao" };
    var linhaEncontrada = _localizarLinhaPorId(values, idIndex, data.id);
    if (linhaEncontrada === -1) return { status: "error", message: "ID nao encontrado: " + data.id };
    var linhaPlanilha = linhaEncontrada + 1;
    var resultadoCampos = _aplicarCamposUpdate(sheet, linhaPlanilha, headers, aliases, data);
    SpreadsheetApp.flush();
    var falhouCritico = resultadoCampos.camposIgnorados.some(function (c) { return c.indexOf("situacao") !== -1; });
    return {
      status: falhouCritico ? "partial_error" : "success",
      message: falhouCritico ? "Atualizado parcialmente. Coluna de situacao NAO foi encontrada na planilha!" : "Atualizado!",
      camposAtualizados: resultadoCampos.camposAtualizados,
      camposIgnorados: resultadoCampos.camposIgnorados
    };
  } catch (err) {
    return { status: "error", message: "Erro em processarUpdate: " + err.toString() };
  }
}

function _localizarLinhaPorId(values, idIndex, idAlvo) {
  var idBusca = String(idAlvo).trim();
  var idBuscaUpper = idBusca.toUpperCase();
  var idBuscaNum = idBusca.replace(/^RDO0*/i, "").trim();
  var idBuscaFin = idBusca.replace(/^FIN0*/i, "").trim();
  for (var i = 1; i < values.length; i++) {
    var idCelula = String(values[i][idIndex]).trim();
    var idCelulaUpper = idCelula.toUpperCase();
    var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();
    var idCelulaFin = idCelula.replace(/^FIN0*/i, "").trim();
    if (idCelula === idBusca || idCelulaUpper === idBuscaUpper ||
      idCelulaNum === idBuscaNum || idCelulaFin === idBuscaFin) {
      return i;
    }
  }
  return -1;
}

function _resolverColuna(headers, chaveFinal) {
  var colIndex = headers.indexOf(chaveFinal);
  if (colIndex !== -1) return colIndex;
  for (var h = 0; h < headers.length; h++) {
    if (headers[h].indexOf(chaveFinal) !== -1 || chaveFinal.indexOf(headers[h]) !== -1) return h;
  }
  return -1;
}

function _escreverValorPorTipo(sheet, linha, colIndex, chaveFinal, valor) {
  if (chaveFinal === "data") {
    escreverComoTexto(sheet, linha, colIndex + 1, normalizarDataStr(valor));
  } else if (chaveFinal === "horario" || chaveFinal === "hora") {
    escreverComoTexto(sheet, linha, colIndex + 1, String(valor || ""));
  } else if (ehCampoMonetario(chaveFinal)) {
    escreverComoTexto(sheet, linha, colIndex + 1, formatarMoeda(valor));
  } else if (chaveFinal === "situacao" || chaveFinal === "situacao_financeira") {
    sheet.getRange(linha, colIndex + 1).setValue(capitalizar(valor));
  } else {
    if (valor !== null && typeof valor === "object") valor = JSON.stringify(valor);
    sheet.getRange(linha, colIndex + 1).setValue(valor === null || valor === undefined ? "" : valor);
  }
}

function _aplicarCamposUpdate(sheet, linhaPlanilha, headers, aliases, data) {
  var camposAtualizados = [];
  var camposIgnorados = [];
  var keys = Object.keys(data);
  for (var k = 0; k < keys.length; k++) {
    var chaveOriginal = keys[k];
    if (chaveOriginal === "id" || chaveOriginal === "apiKey" || chaveOriginal === "action") continue;
    var chaveNorm = normalizarChave(chaveOriginal);
    var chaveFinal = aliases[chaveNorm] || chaveNorm;
    var colIndex = _resolverColuna(headers, chaveFinal);
    if (colIndex === -1) {
      camposIgnorados.push(chaveOriginal + " (-> " + chaveFinal + ")");
      continue;
    }
    _escreverValorPorTipo(sheet, linhaPlanilha, colIndex, chaveFinal, data[chaveOriginal]);
    camposAtualizados.push(chaveFinal);
  }
  return { camposAtualizados: camposAtualizados, camposIgnorados: camposIgnorados };
}

function processarDelete(sheet, id) {
  try {
    if (!id || String(id).trim() === "") return { status: "error", message: "ID nao informado para exclusao" };
    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var idIndex = headers.indexOf("id");
    if (idIndex === -1) return { status: "error", message: "Coluna 'id' nao encontrada" };
    var idBusca = String(id).trim();
    var idBuscaNum = idBusca.replace(/^RDO0*/i, "").trim();
    var idBuscaFull = idBusca.toUpperCase();
    for (var i = rows.length - 1; i >= 1; i--) {
      var idCelula = String(rows[i][idIndex]).trim();
      var idCelulaNum = idCelula.replace(/^RDO0*/i, "").trim();
      if (idCelula === idBuscaFull || idCelulaNum === idBuscaNum || idCelula === idBusca) {
        sheet.deleteRow(i + 1);
        return { status: "success", message: "Excluido!" };
      }
    }
    return { status: "error", message: "ID nao encontrado: " + id };
  } catch (err) {
    return { status: "error", message: "Erro em processarDelete: " + err.toString() };
  }
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
    "usuario": "usuarios",
    "usuarios": "usuarios",
    "cliente": "clientes",
    "clientes": "clientes",
    "contato": "clientes",
    "contatos": "clientes",
    "colaborador": "colaboradores",
    "colaboradores": "colaboradores",
    "chat": "chat",
    "chats": "chat",
    "pedido": "pedidos",
    "pedidos": "pedidos",
    "financeiro": "financeiro",
    "financeiros": "financeiro",
    "relatorio": "relatorios",
    "relatorios": "relatorios",
    "relatoriofinanceiro": "relatorios",
    "relatoriosfinanceiros": "relatorios",
    "extrato": "extratos",
    "extratos": "extratos",
    "extratofinanceiro": "extratos",
    "extratosfinanceiros": "extratos"
  };
  return mapa[entity] || entity;
}

function buscarIdPedidoNoFinanceiro(sheetFinanceiro, idFinanceiro) {
  var values = sheetFinanceiro.getDataRange().getValues();
  if (values.length === 0) return "";
  var headers = values[0].map(function (h) { return normalizarChave(h); });
  var idIndex = headers.indexOf("id");
  var idPedidoIndex = headers.indexOf("id_pedido") !== -1 ? headers.indexOf("id_pedido") : headers.indexOf("pedido_id");
  if (idIndex === -1 || idPedidoIndex === -1) return "";
  var idBusca = String(idFinanceiro).trim().toUpperCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]).trim().toUpperCase() === idBusca) {
      return String(values[i][idPedidoIndex]).trim();
    }
  }
  return "";
}

function buscarAba(ss, nome) {
  var sheets = ss.getSheets();
  var nomeLower = nome.toLowerCase().trim();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).toLowerCase().trim() === nomeLower) return sheets[i];
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
    var y = val.getFullYear();
    if (y === 1899) {
      var h = val.getHours();
      var min = val.getMinutes();
      return (h < 10 ? "0" + h : h) + ":" + (min < 10 ? "0" + min : min);
    }
    var d = val.getDate();
    var m = val.getMonth() + 1;
    return (d < 10 ? "0" + d : d) + "/" + (m < 10 ? "0" + m : m) + "/" + y;
  }
  if (typeof val === "number") return val;
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
  var data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) {
    var chars0 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var id0 = "";
    for (var z = 0; z < 11; z++) {
      id0 += chars0.charAt(Math.floor(Math.random() * chars0.length));
    }
    return id0;
  }
  var headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var idIndex = headers.indexOf("id");
  if (entity.indexOf("pedido") !== -1 && idIndex !== -1) {
    var maxId = 0;
    for (var i = 1; i < data.length; i++) {
      var val = parseInt(String(data[i][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(val) && val > maxId) maxId = val;
    }
    var next = maxId + 1;
    var padded = String(next);
    while (padded.length < 3) padded = "0" + padded;
    return "RDO" + padded;
  }
  if (entity.indexOf("financeiro") !== -1 && idIndex !== -1) {
    var maxFin = 0;
    for (var j = 1; j < data.length; j++) {
      var num = parseInt(String(data[j][idIndex]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > maxFin) maxFin = num;
    }
    var nextFin = maxFin + 1;
    var paddedFin = String(nextFin);
    while (paddedFin.length < 4) paddedFin = "0" + paddedFin;
    return "FIN" + paddedFin;
  }
  if (entity.indexOf("relatorio") !== -1) {
    return "REL" + Date.now();
  }
  if (entity.indexOf("extrato") !== -1) {
    return "EXT" + Date.now();
  }
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var id = "";
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
