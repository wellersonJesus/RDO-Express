(async function () {
  const URL = 'https://script.google.com/macros/s/AKfycbyN3SLJ2MCYuls-gTxAW6EJlWggsRtZupgiY4-VSZhshKT4oUXDgFAQYkqorGtZJKASvg/exec';
  const KEY = 'aquieumakdjdddggjrtr';
  const MOTOBOY = 'AUANDER'; // corresponde ao "username" na aba colaboradores (não há mais coluna "colaborador")
  const ID_CLIENTE = 'ZEX40L56SJD';
  const NOME = 'MARIA PITANGA';

  let erros = 0;
  const ok = m => console.log('✅ ' + m);
  const err = m => { erros++; console.log('❌ ' + m); };
  const titulo = t => console.log('\n──── ' + t + ' ────');

  async function chamar(action, payload) {
    try {
      const r = await fetch(URL, { method: 'POST', body: JSON.stringify({ action, apiKey: KEY, ...payload }) });
      const j = await r.json();
      if (j.status === 'error') err('[' + action + '] ' + j.message);
      return j;
    } catch (e) {
      err('[' + action + '] falha de rede: ' + e.message);
      return { status: 'error' };
    }
  }

  // 1. Criar pedido
  titulo('1. Criar pedido');
  const criar = await chamar('criarpedido', {
    id_cliente: ID_CLIENTE,
    solicitante: NOME,
    contato: '(31) 99999-0000',
    mercadoria: 'Envelope - Teste RDO1307',
    de: 'Avenida Vilarinho, 1200, Belo Horizonte',
    para: 'Avenida Brasília, 13, Belo Horizonte',
    retorno: 'NAO',
    prioridade: 'Normal',
    valor_corrida: '500,00',
    status: 'PENDENTE',
    situacao_financeira: 'PENDENTE',
    observacao: 'TESTE RDO1307',
    data_pedido: '30/07/2026'
  });
  const id = criar.id;
  if (!id) { err('Pedido não criado'); process.exit(1); }
  ok('Pedido criado: ' + id);
  await new Promise(r => setTimeout(r, 2000));

  // 2. EM_ROTA
  titulo('2. EM_ROTA');
  const r2 = await chamar('updatepedido', { id, status: 'EM_ROTA', motoboy: MOTOBOY });
  r2.status === 'success' ? ok('Status EM_ROTA + motoboy ' + MOTOBOY) : err('Falha EM_ROTA');
  await new Promise(r => setTimeout(r, 2000));

  // 3. CONCLUIDO
  titulo('3. CONCLUIDO');
  const r3 = await chamar('updatepedido', { id, status: 'CONCLUIDO' });
  r3.status === 'success' ? ok('Pedido concluído') : err('Falha ao concluir');
  await new Promise(r => setTimeout(r, 1500));

  // 4. Financeiro
  titulo('4. Financeiro');
  const fin = await chamar('getfinanceirocompleto', {});
  const lanc = fin.data?.find(f => f.id_pedido === id);
  if (!lanc) {
    err('Lançamento financeiro NÃO encontrado');
  } else {
    ok('Lançamento encontrado');
    console.log(lanc);

    // ✅ AJUSTE: coluna "colaborador" foi removida da aba colaboradores.
    // O backend agora usa fallback = username do colaborador (motoboyRef).
    // Portanto o valor esperado é EXATAMENTE o username (ex: "AUANDER"), não mais um nome "bonito".
    (lanc.colaborador || '').toUpperCase() === MOTOBOY.toUpperCase()
      ? ok('Colaborador OK: ' + lanc.colaborador)
      : err('Colaborador errado: ' + lanc.colaborador + ' (esperado: ' + MOTOBOY + ')');

    lanc.tipo === 'Corrida' ? ok('Tipo OK: Corrida') : err('Tipo errado: ' + lanc.tipo);
    lanc.vlr_servico?.includes('500') ? ok('Valor OK') : err('Valor errado: ' + lanc.vlr_servico);
    lanc.situacao === 'PENDENTE' ? ok('Situação OK') : err('Situação errada: ' + lanc.situacao);

    // ✅ AJUSTE: getfinanceirocompleto NÃO retorna "id_cliente".
    // O campo "cliente" é o USERNAME do cliente (resolvido via pedidosMap -> clientesMap),
    // não o ID_CLIENTE. Validamos apenas que o campo foi preenchido (não é comparação de igualdade).
    lanc.cliente && lanc.cliente.trim() !== ''
      ? ok('Cliente vinculado OK (username: ' + lanc.cliente + ')')
      : err('Cliente não vinculado (campo "cliente" vazio)');
  }

  // 5. Chat
  titulo('5. Chat');
  const chat = await chamar('getchat', {});
  const msg = chat.data?.find(c => c.pedido_id === id);
  if (!msg) {
    err('Mensagem de chat NÃO encontrada');
  } else {
    ok('Mensagem encontrada');
    console.log(msg);
    msg.id_cliente === ID_CLIENTE ? ok('Chat vinculado ao cliente OK') : err('Chat com cliente errado: ' + msg.id_cliente);
    msg.texto?.includes('500,00') ? ok('Valor no texto OK') : err('Valor ausente no texto');
    msg.texto?.includes('30/07/2026') ? ok('Data no texto OK') : err('Data ausente no texto');
  }

  // 6. Pedido final
  titulo('6. Pedido final');
  const peds = await chamar('getpedidosrapido', {});
  const pf = peds.data?.find(p => p.id === id);
  if (!pf) {
    err('Pedido não encontrado na listagem');
  } else {
    ok('Pedido encontrado');
    console.log(pf);
    pf.status === 'CONCLUIDO' ? ok('Status final OK') : err('Status final errado: ' + pf.status);
    pf.motoboy === MOTOBOY ? ok('Motoboy OK') : err('Motoboy errado: ' + pf.motoboy);
    pf.data_pedido === '30/07/2026' ? ok('Data pedido OK') : err('Data pedido errada: ' + pf.data_pedido);
    pf.id_cliente === ID_CLIENTE ? ok('Cliente OK') : err('Cliente errado: ' + pf.id_cliente);
  }

  console.log('\n────────────────────');
  console.log(erros ? ('❌ TESTE COM ' + erros + ' ERRO(S)') : '✅ TESTE 100% OK');
  console.log('🆔 ID testado: ' + id);
})();
