-- 1. Inserir Atendente (Responsável pelo Sistema)
INSERT INTO botConfig (id, nome, valor, logo, tipo, ativo) 
VALUES (
    'AT-001', 
    'Suporte RDO', 
    '5531900000000', 
    'https://cdn-icons-png.flaticon.com/512/4712/4712109.png', 
    'atendente', 
    true
);

-- 2. Inserir Grupo de Monitoramento (Baseado no seu modelo de ENTREGA)
INSERT INTO botConfig (id, nome, valor, logo, tipo, ativo) 
VALUES (
    'GRP-LOG-01', 
    'LOGÍSTICA - ENTREGAS', 
    '120363000000000000@g.us', 
    'https://cdn-icons-png.flaticon.com/512/709/709790.png', 
    'grupo', 
    true
);

-- 3. Exemplo de inserção do pedido capturado no chatLive
INSERT INTO chatLive (id, data_hora, cliente, ultima_msg, status, hora) 
VALUES (
    'MSG-ENTREGA-001', 
    '2026-05-08', 
    '120363000000000000@g.us', 
    'ENTREGA\nGabriel Fiuza\n\nAv Alvares Cabral 397 Lourdes sala 301\n\nCESTA $17.00', 
    'Aberto', 
    '13:09'
);
