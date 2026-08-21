const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'pages', 'fin', 'fin.html');

console.log('--- DIAGNÓSTICO DO OLHINHO RDOP ---');

if (!fs.existsSync(filePath)) {
    console.error(`[ERRO CRÍTICO] Arquivo não encontrado no caminho: ${filePath}`);
    console.error('Certifique-se de executar este comando na raiz do seu projeto.');
    process.exit(1);
}

const conteudo = fs.readFileSync(filePath, 'utf8');

// Verifica se a função existe
if (!conteudo.includes('function configurarOlhinhoCarteiraRDOP')) {
    console.error('[ERRO] A função "configurarOlhinhoCarteiraRDOP" não foi encontrada neste arquivo.');
    process.exit(1);
}

console.log('[OK] Função "configurarOlhinhoCarteiraRDOP" encontrada.');

// Análise de divergências e motivos comuns para o valor não aparecer
console.log('\n--- ANÁLISE DE POSSÍVEIS CAUSAS ---');

let problemasEncontrados = 0;

if (!conteudo.includes('atualizarCardsCaixa')) {
    problemasEncontrados++;
    console.log(`${problemasEncontrados}. A função "atualizarCardsCaixa" pode não estar sendo chamada corretamente para atualizar a interface.`);
}

if (!conteudo.includes('aplicarMascaraValores')) {
    problemasEncontrados++;
    console.log(`${problemasEncontrados}. A função "aplicarMascaraValores" pode estar mascarando os campos como vazios ou ocultando-os antes da renderização.`);
}

if (!conteudo.includes('state.caixaValoresVisiveis')) {
    problemasEncontrados++;
    console.log(`${problemasEncontrados}. A variável de estado "state.caixaValoresVisiveis" pode estar dessincronizada com o HTML.`);
}

console.log('\n--- DIAGNÓSTICO DA LÓGICA ATUAL ---');
console.log('Por que o valor pode não estar sendo exibido ao clicar no olhinho?');
console.log('1. Se "chkAtivo" for nulo (nenhum item selecionado na lista), o bloco de cálculo é pulado e nenhum valor é injetado nos cards.');
console.log('2. A alternância de classes (".mostrar-info" ou ".oculto") pode estar ocultando o elemento via CSS no momento exato em que os dados são recalculados.');
console.log('3. A ordem de execução: o ideal é recalcular e atualizar os dados ANTES de alternar o estado de visibilidade, ou garantir que o painel receba o HTML renderizado.');

console.log('\n--- FIM DO DIAGNÓSTICO ---');
fs.unlinkSync(__filename); // Remove o script após a execução
