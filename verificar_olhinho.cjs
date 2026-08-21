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

if (!conteudo.includes('function configurarOlhinhoCarteiraRDOP')) {
    console.error('[ERRO] A função "configurarOlhinhoCarteiraRDOP" não foi encontrada neste arquivo.');
    process.exit(1);
}

console.log('[OK] Função "configurarOlhinhoCarteiraRDOP" encontrada com sucesso.');
console.log('\n--- ANÁLISE DE PORQUE O VALOR NÃO APARECE ---');
console.log('1. Verifique se o checkbox da carteira realmente possui a classe ".periodo-caixa-checkbox" e está marcado (:checked) no momento do clique.');
console.log('2. A chamada a "renderCaixa()" no final da função pode estar recriando o DOM e limpando o valor recém-inserido.');
console.log('3. Certifique-se de que o objeto retornado por "buscarPeriodoCaixaPorId(idSelecionado)" contém a propriedade "registros" preenchida.');

fs.unlinkSync(__filename);
