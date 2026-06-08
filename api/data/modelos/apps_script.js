var SECRET_KEY = "aquieumakdjdddggjrtr";

function doPost(e) {
  try {
    // 1. Validação de Payload
    if (!e || !e.postData || !e.postData.contents) {
      return response({ status: "error", message: "Payload vazio" });
    }

    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || "").toLowerCase().trim();

    // 2. Rota de Login (Pública)
    if (action === 'login') return response(handleLogin(data.username, data.password));

    // 3. Segurança (Validar API Key)
    if (!data.apiKey || data.apiKey !== SECRET_KEY) {
      return response({ status: "error", message: "Acesso Negado: Chave inválida" });
    }

    // 4. Mapeamento de Entidades
    // ADICIONEI 'contato' mapeando para 'clientes' aqui para corrigir seu erro
    // 4. Mapeamento de Entidades
    var mapaEntidades = {
      "usuario": "usuarios",
      "cliente": "clientes",
      "contato": "clientes",       // Mapeia 'contato' para 'clientes'
      "contatos": "clientes",      // Adicionado plural
      "colaborador": "colaboradores",
      "colaboradores": "colaboradores",
      "bot": "botconfig",
      "chat": "chat",
      "pedido": "pedidos",
      "pedidos": "pedidos",
      "financeiro": "financeiro"
    };

    // Extrai o nome da entidade da action (remove o prefixo de operação)
    var entity = action.replace(/get|add|delete|update|save|finalizar/g, '').toLowerCase().trim();
    var nomeAba = mapaEntidades[entity] || entity;

    // 5. Busca da Tabela/Aba
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetCaseInsensitive(ss, nomeAba);

    if (!sheet) {
      console.error("Erro: Tabela não encontrada -> " + nomeAba);
      return response({ status: "error", message: "Tabela não encontrada: " + nomeAba });
    }

    // 6. Roteamento de Ações
    if (action === 'finalizarpedido') return response(handleSalvarPedidoComChat(sheet, data));
    if (action.startsWith('get')) return response(handleGet(sheet));
    if (action.startsWith('add') || action.startsWith('save')) return response(handleAdd(sheet, data, nomeAba));
    if (action.startsWith('update')) return response(handleUpdate(sheet, data));
    if (action.startsWith('delete')) return response(handleDelete(sheet, data.id));

    return response({ status: "error", message: "Ação não suportada: " + action });

  } catch (err) {
    // Log de erro crítico para depuração no editor do Google Apps Script
    console.error("ERRO CRÍTICO NO BACKEND: " + err.toString());
    return response({
      status: "error",
      message: "Erro crítico no servidor: " + err.toString()
    });
  }
}

// Função auxiliar para padronizar respostas (garanta que ela exista no seu código)
function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Funções únicas e consolidadas
function handleLogin(user) {
  var sheet = getSheetCaseInsensitive(SpreadsheetApp.getActiveSpreadsheet(), "usuarios");
  if (!sheet) return { status: "error", message: "Tabela usuários não encontrada" };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { status: "error", message: "Nenhum usuário cadastrado" };

  var headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var userIndex = headers.indexOf("username");
  var passIndex = headers.indexOf("password");
  var tipoIndex = headers.indexOf("tipo");

  // Identifica a coluna de imagem/foto/avatar de forma dinâmica
  var imgIndex = headers.findIndex(function (h) {
    return ["foto", "avatar", "imagem", "url_foto", "img"].indexOf(h) !== -1;
  });

  var userRow = data.slice(1).find(function (r) {
    return String(r[userIndex]).trim() === user;
  });

  if (!userRow) return { status: "error", message: "Usuário não encontrado" };

  // Monta o objeto de resposta incluindo a imagem encontrada (ou string vazia se não houver coluna)
  return {
    status: "success",
    user: {
      username: user,
      tipo: userRow[tipoIndex],
      password: String(userRow[passIndex]).trim(),
      imagem: imgIndex !== -1 ? String(userRow[imgIndex]) : ""
    }
  };
}

function handleAdd(sheet, data, entity) {
  var headers = sheet.getDataRange().getValues()[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");
  if (idIndex !== -1 && (!data.id || data.id === "")) data.id = generateId(sheet, entity);
  sheet.appendRow(headers.map(h => data[h] || ""));
  return { status: "success", message: "Adicionado!", id: data.id };
}

function handleGet(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  // Normaliza cabeçalhos: remove espaços, converte para minúsculo e padroniza nomes de imagem
  var headers = rows[0].map(h => {
    var key = String(h).toLowerCase().trim();
    // Mapeia variações comuns para a chave padrão 'imagem'
    if (["foto", "avatar", "imagem_url", "url_foto"].includes(key)) return "imagem";
    return key;
  });

  return rows.slice(1).map(row => {
    var obj = {};
    headers.forEach((h, i) => {
      if (h !== "") obj[h] = row[i];
    });
    return obj;
  });
}

function handleUpdate(sheet, data) {
    if (!data || !data.id) {
        return { status: "error", message: "ID não fornecido para atualização." };
    }

    const range = sheet.getDataRange();
    const values = range.getValues();
    const headers = values[0].map(h => String(h).toLowerCase().trim());
    
    // Procura pelo índice da coluna 'id'
    const idIndex = headers.indexOf("id");
    if (idIndex === -1) {
        return { status: "error", message: "Coluna 'id' não encontrada na tabela." };
    }

    // Busca a linha correspondente ao ID
    for (let i = 1; i < values.length; i++) {
        if (String(values[i][idIndex]).trim() === String(data.id).trim()) {
            
            // Itera sobre as chaves do objeto de dados enviado (ex: {status: "EM_ROTA"})
            Object.keys(data).forEach(key => {
                const colIndex = headers.indexOf(String(key).toLowerCase().trim());
                
                // Se a chave existir no cabeçalho da planilha, atualiza o valor
                if (colIndex !== -1) {
                    sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
                }
            });
            
            return { status: "success", message: "Registro atualizado com sucesso!" };
        }
    }
    
    return { status: "error", message: "ID " + data.id + " não encontrado na tabela." };
}

function handleDelete(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  var idIndex = rows[0].map(h => String(h).toLowerCase().trim()).indexOf("id");
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idIndex]).trim() == String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Excluído!" };
    }
  }
  return { status: "error", message: "ID não encontrado." };
}

function handleSalvarPedidoComChat(sheetPedidos, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetChat = getSheetCaseInsensitive(ss, "chat");

  // 1. Gera o ID do pedido (ex: RDO1)
  data.id = generateId(sheetPedidos, "pedidos");

  // 2. Processamento de Rotas
  var linhasRota = data.rotas_texto ? data.rotas_texto.split('\n') : [];
  data.de = linhasRota.map(function (l) {
    return l.split('|')[0] ? l.split('|')[0].replace(/De:/i, '').trim() : "";
  }).join(', ');

  data.para = linhasRota.map(function (l) {
    return l.split('|')[1] ? l.split('|')[1].replace(/Para:/i, '').trim() : "";
  }).join(', ');

  // 3. Limpeza do ID do cliente
  var idChatLimpo = String(data.id_chat).replace(/\D/g, '');

  // 4. ABA PEDIDOS: Gravação
  sheetPedidos.appendRow([
    data.id,
    idChatLimpo,
    data.solicitante,
    data.contato,
    data.horario,
    data.mercadoria,
    data.de,
    data.para,
    data.retorno,
    data.prioridade || "N/A",
    data.valor_corrida,
    data.observacao
  ]);

  // 5. ABA CHAT: Gravação do histórico
  // Seguindo a estrutura: id, pedido_id, texto, hora, data, jid_numero, finalizado
  if (sheetChat) {
    var agora = new Date();
    sheetChat.appendRow([
      data.id,                              // id (coluna 1)
      data.id,                              // pedido_id (coluna 2 - RDOx)
      data.mensagem,                        // texto (coluna 3 - ONDE O CHAT VAI LER)
      agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), // hora (coluna 4)
      agora.toLocaleDateString('pt-BR'),    // data (coluna 5)
      idChatLimpo,                          // jid_numero (coluna 6 - ONDE O FILTRO VAI PESQUISAR)
      "TRUE"                                // finalizado (coluna 7)
    ]);
  }

  return { status: "success", id: data.id };
}

function getSheetCaseInsensitive(ss, name) {
  var nameNormalized = String(name).toLowerCase().trim();
  return ss.getSheets().find(function (s) {
    var sheetName = String(s.getName()).toLowerCase().trim();
    return sheetName === nameNormalized;
  });
}

function generateId(sheet, entity) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return (entity.includes("pedido")) ? "RDO1" : 1;

  var headers = data[0].map(h => String(h).toLowerCase().trim());
  var idIndex = headers.indexOf("id");

  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var rawId = String(data[i][idIndex] || "0");
    // Extrai apenas os números, ignorando "RDO"
    var val = parseInt(rawId.replace(/[^0-9]/g, ''));
    if (!isNaN(val) && val > maxId) maxId = val;
  }

  var nextId = maxId + 1;
  return (entity.includes("pedido")) ? "RDO" + nextId : nextId;
}

function response(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }