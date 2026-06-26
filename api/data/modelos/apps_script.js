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
            return responder({ status: "error", message: "JSON invalido: " + parseErr.toString() });
        }

        var action = String(data.action || "").toLowerCase().trim();

        if (!action) {
            return responder({ status: "error", message: "Nenhuma acao informada" });
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

        if (action === "criarpedido") {
            var ss          = SpreadsheetApp.getActiveSpreadsheet();
            var sheetPedidos = buscarAba(ss, "pedidos");
            if (!sheetPedidos) return responder({ status: "error", message: "Tabela 'pedidos' nao encontrada" });
            return responder(processarCriarPedido(sheetPedidos, data));
        }

        if (action === "finalizarpedido") {
            var ss2          = SpreadsheetApp.getActiveSpreadsheet();
            var sheetPed2    = buscarAba(ss2, "pedidos");
            if (!sheetPed2) return responder({ status: "error", message: "Tabela 'pedidos' nao encontrada" });
            return responder(processarPedidoComChat(sheetPed2, data));
        }

        var entidade = extrairEntidade(action);
        var nomeAba  = mapearEntidade(entidade);
        var ss3      = SpreadsheetApp.getActiveSpreadsheet();
        var sheet    = buscarAba(ss3, nomeAba);

        if (!sheet) {
            return responder({
                status:  "error",
                message: "Tabela nao encontrada: " + nomeAba + " (action: " + action + ")"
            });
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

        return responder({ status: "error", message: "Acao nao suportada: " + action });
    } catch (err) {
        return responder({ status: "error", message: "Erro interno: " + err.toString() });
    }
}

function processarCriarPedido(sheetPedidos, data) {
    var ss        = SpreadsheetApp.getActiveSpreadsheet();
    var sheetChat = buscarAba(ss, "chat");

    var idPedido  = gerarId(sheetPedidos, "pedidos");
    var idCliente = String(data.id_cliente || data.id_chat || "").trim();

    var rotas_texto = String(data.rotas_texto || "");
    var deStr  = "";
    var paraStr = "";

    if (rotas_texto) {
        var deMatch   = rotas_texto.match(/De:\s*([^|]+)/i);
        var paraMatch = rotas_texto.match(/Para:\s*([^|]+)/i);
        if (deMatch)   deStr   = deMatch[1].trim();
        if (paraMatch) paraStr = paraMatch[1].trim();
    }

    if (!deStr)   deStr   = String(data.de   || "");
    if (!paraStr) paraStr = String(data.para  || "");

    var agora   = new Date();
    var horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    var dataStr = agora.toLocaleDateString("pt-BR");

    if (sheetChat && idCliente) {
        var mensagemFinal = String(data.mensagem || "Pedido criado via painel.").replace("[ID_GERADO]", idPedido);
        var idMsg         = Math.random().toString(36).substring(2, 13).toUpperCase();
        sheetChat.appendRow([idMsg, idCliente, idPedido, mensagemFinal, horaStr, dataStr, "TRUE"]);
    }

    var headers  = obterHeaders(sheetPedidos);
    var idIndex  = headers.indexOf("id");

    if (headers.length > 1 && idIndex !== -1) {
        var rowData = {};
        rowData.id             = idPedido;
        rowData.id_cliente     = idCliente;
        rowData.solicitante    = String(data.solicitante  || "");
        rowData.contato        = String(data.contato      || "");
        rowData.horario        = String(data.horario      || "");
        rowData.mercadoria     = String(data.mercadoria   || "");
        rowData.de             = deStr;
        rowData.para           = paraStr;
        rowData.retorno        = String(data.retorno      || "");
        rowData.prioridade     = String(data.prioridade   || "N/A");
        rowData.valor_corrida  = String(data.valor_final  || data.valor_corrida || "");
        rowData.valor_base     = String(data.valor_base   || "");
        rowData.taxa_espera    = String(data.taxa_espera  || "");
        rowData.motoboy        = "";
        rowData.status         = "PENDENTE";
        rowData.observacao     = String(data.observacao   || "");
        rowData.distancia      = String(data.distancia    || "");
        rowData.tempo          = String(data.tempo        || "");
        rowData.valor_km       = String(data.valor_km     || "");
        rowData.dinamica       = String(data.dinamica     || "");
        rowData.data           = dataStr;
        rowData.hora           = horaStr;

        var row = [];
        for (var i = 0; i < headers.length; i++) {
            row.push(rowData[headers[i]] !== undefined ? rowData[headers[i]] : "");
        }
        sheetPedidos.appendRow(row);
    } else {
        sheetPedidos.appendRow([
            idPedido,
            idCliente,
            String(data.solicitante  || ""),
            String(data.contato      || ""),
            String(data.horario      || ""),
            String(data.mercadoria   || ""),
            deStr,
            paraStr,
            String(data.retorno      || ""),
            String(data.prioridade   || "N/A"),
            String(data.valor_final  || data.valor_corrida || ""),
            String(data.valor_base   || ""),
            String(data.taxa_espera  || ""),
            "",
            "PENDENTE",
            String(data.observacao   || ""),
            dataStr,
            horaStr
        ]);
    }

    return {
        status:  "success",
        id:      idPedido,
        message: "Pedido criado com sucesso!"
    };
}

function processarValidarSenhaMaster(senha) {
    if (!senha || String(senha).trim() === "") {
        return { status: "error", valido: false, message: "Senha nao informada." };
    }

    var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");

    if (!sheet) {
        return { status: "error", valido: false, message: "Tabela 'usuarios' nao encontrada." };
    }

    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
        return { status: "error", valido: false, message: "Nenhum usuario cadastrado." };
    }

    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
    var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);

    if (colPass === -1) {
        return { status: "error", valido: false, message: "Coluna de senha nao encontrada." };
    }

    var senhaTrim = String(senha).trim();

    for (var i = 1; i < rows.length; i++) {
        var tipo     = colTipo !== -1 ? String(rows[i][colTipo]).trim().toLowerCase() : "";
        var isMaster = tipo === "master" || tipo === "admin";
        if (isMaster && String(rows[i][colPass]).trim() === senhaTrim) {
            return { status: "success", valido: true };
        }
    }

    return { status: "success", valido: false };
}

function extrairEntidade(action) {
    return action
        .replace("finalizar", "")
        .replace("criar",  "")
        .replace("get",    "")
        .replace("add",    "")
        .replace("delete", "")
        .replace("update", "")
        .replace("save",   "")
        .toLowerCase()
        .trim();
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
        "pedido":        "pedidos",
        "pedidos":       "pedidos",
        "financeiro":    "financeiro"
    };
    return mapa[entity] || entity;
}

function buscarAba(ss, nome) {
    var sheets    = ss.getSheets();
    var nomeLower = nome.toLowerCase().trim();
    for (var i = 0; i < sheets.length; i++) {
        if (String(sheets[i].getName()).toLowerCase().trim() === nomeLower) {
            return sheets[i];
        }
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
        return (d < 10 ? "0" + d : "" + d) + "/" + (m < 10 ? "0" + m : "" + m) + "/" + y;
    }
    if (typeof val === "number")  return val;
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    return String(val).trim();
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

    if (!sheetFin) {
        return { status: "error", message: "Tabela 'financeiro' nao encontrada" };
    }

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
                if (pedId) {
                    pedidosMap[pedId] = {
                        id_cliente:  pedClienteIdx     !== -1 ? String(pedRows[p][pedClienteIdx]).trim()    : "",
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
            var cliHeaders     = cliRows[0].map(function (h) { return String(h).toLowerCase().trim(); });
            var cliIdIdx       = cliHeaders.indexOf("id");
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

    if (idIndex !== -1 && (!data.id || data.id === "")) {
        data.id = gerarId(sheet, entity);
    }

    var row = [];
    for (var i = 0; i < headers.length; i++) {
        row.push(headers[i] === "id" ? data.id : (data[headers[i]] !== undefined ? data[headers[i]] : ""));
    }

    sheet.appendRow(row);
    return { status: "success", message: "Adicionado!", id: data.id };
}

function processarUpdate(sheet, data) {
    var values  = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var idIndex = headers.indexOf("id");

    if (idIndex === -1) return { status: "error", message: "Coluna 'id' nao encontrada" };
    if (!data.id)       return { status: "error", message: "ID nao informado para atualizacao" };

    var idBusca    = String(data.id).trim();
    var idBuscaNum = idBusca.replace(/^RDO0*/i, '').trim();

    for (var i = 1; i < values.length; i++) {
        var idCelula    = String(values[i][idIndex]).trim();
        var idCelulaNum = idCelula.replace(/^RDO0*/i, '').trim();

        if (idCelula === idBusca || idCelulaNum === idBuscaNum) {
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

    return { status: "error", message: "ID nao encontrado: " + data.id };
}

function processarDelete(sheet, id) {
    if (!id || String(id).trim() === "") {
        return { status: "error", message: "ID nao informado para exclusao" };
    }

    var rows    = sheet.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var idIndex = headers.indexOf("id");

    if (idIndex === -1) {
        return { status: "error", message: "Coluna 'id' nao encontrada" };
    }

    var idBusca      = String(id).trim();
    var idBuscaNum   = idBusca.replace(/^RDO0*/i, '').trim(); // "7"
    var idBuscaFull  = idBusca.toUpperCase();                  // "RDO7"

    for (var i = rows.length - 1; i >= 1; i--) {
        var idCelula    = String(rows[i][idIndex]).trim();
        var idCelulaNum = idCelula.replace(/^RDO0*/i, '').trim();
        // Aceita comparação com ou sem prefixo
        if (idCelula === idBuscaFull || idCelulaNum === idBuscaNum) {
            sheet.deleteRow(i + 1);
            return { status: "success", message: "Excluido!" };
        }
    }

    return { status: "error", message: "ID nao encontrado: " + id };
}

function processarPedidoComChat(sheetPedidos, data) {
    var ss        = SpreadsheetApp.getActiveSpreadsheet();
    var sheetChat = buscarAba(ss, "chat");

    if (!sheetChat) {
        return { status: "error", message: "Tabela 'chat' nao encontrada" };
    }

    var idPedido  = gerarId(sheetPedidos, "pedidos");
    var idCliente = String(data.id_cliente || "").trim();

    if (!idCliente) {
        return { status: "error", message: "ID do cliente nao informado" };
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

    var mensagemFinal = String(data.mensagem || "").replace("[ID_GERADO]", idPedido);
    var agora         = new Date();
    var horaStr       = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    var dataStr       = agora.toLocaleDateString("pt-BR");
    var idMsg         = Math.random().toString(36).substring(2, 13).toUpperCase();

    sheetChat.appendRow([idMsg, idCliente, idPedido, mensagemFinal, horaStr, dataStr, "TRUE"]);

    sheetPedidos.appendRow([
        idPedido,
        idCliente,
        String(data.solicitante  || ""),
        String(data.contato      || ""),
        String(data.horario      || ""),
        String(data.mercadoria   || ""),
        deStr,
        paraStr,
        String(data.retorno      || ""),
        String(data.prioridade   || "N/A"),
        String(data.valor_corrida || ""),
        "",
        "PENDENTE",
        String(data.observacao   || "")
    ]);

    return {
        status:     "success",
        id:         idPedido,
        id_cliente: idCliente,
        message:    "Pedido e chat salvos com sucesso!"
    };
}

function processarLogin(user, pass) {
    if (!user || !pass) {
        return { status: "error", message: "Usuario e senha sao obrigatorios" };
    }

    var sheet = buscarAba(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");

    if (!sheet) {
        return { status: "error", message: "Tabela 'usuarios' nao encontrada" };
    }

    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
        return { status: "error", message: "Nenhum usuario cadastrado" };
    }

    var headers = rows[0].map(function (h) { return String(h).toLowerCase().trim(); });
    var colUser = buscarColuna(headers, ["username", "usuario", "user", "login", "nome"]);
    var colPass = buscarColuna(headers, ["password", "senha", "pass"]);
    var colTipo = buscarColuna(headers, ["tipo", "role", "cargo", "perfil"]);
    var colImg  = buscarColuna(headers, ["imagem", "foto", "avatar", "image"]);

    if (colUser === -1 || colPass === -1) {
        return { status: "error", message: "Colunas 'username' ou 'password' nao encontradas" };
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
                    tipo:     colTipo !== -1 ? String(rows[i][colTipo]).trim() : "",
                    imagem:   colImg  !== -1 ? String(rows[i][colImg]).trim()  : ""
                }
            };
        }
    }

    return { status: "error", message: "Usuario ou senha incorretos" };
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
        var next      = maxId + 1;
        var paddedPed = String(next);
        while (paddedPed.length < 3) paddedPed = "0" + paddedPed;
        return "RDO" + paddedPed; // "RDO001", "RDO012", "RDO100"
    }

    if (entity.indexOf("financeiro") !== -1) {
        var maxFin = 0;
        for (var j = 1; j < data.length; j++) {
            var numPart = parseInt(String(data[j][idIndex]).replace(/[^0-9]/g, ""), 10);
            if (!isNaN(numPart) && numPart > maxFin) maxFin = numPart;
        }
        var nextFin    = maxFin + 1;
        var paddedFin  = String(nextFin);
        while (paddedFin.length < 4) paddedFin = "0" + paddedFin;
        return "FIN" + paddedFin; // "FIN0001", "FIN0012", "FIN1000"
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
