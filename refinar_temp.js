const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const SCRIPT_PATH = __filename;

console.log("[Auto-Refining] Analisando projeto e ajustando escopos...");

function getAllJsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') return;
        if (fs.statSync(filePath).isDirectory()) {
            getAllJsFiles(filePath, fileList);
        } else if (file.endsWith('.js') && filePath !== SCRIPT_PATH) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const jsFiles = getAllJsFiles(ROOT_DIR);
let modificados = 0;

jsFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let alterado = false;

    if (content.includes('emit_polinho_caixa')) {
        content = content.replace(/emit_polinho_caixa/g, 'emit_polinho_caixa');
        alterado = true;
    }

    if (content.includes('alternarValoresGlobal')) {
        const patchSeguro = `
  // [Auto-Patch] Função global de compatibilidade blindada contra loops
  let _ultimaAlt_${path.basename(file, '.js').replace(/[^a-zA-Z0-9]/g, '_')} = 0;
  
  // [Auto-Patch] Função global de compatibilidade blindada contra loops
  let _ultimaAlt_refinar_temp = 0;
  function alternarValoresGlobal() {
    const agora = Date.now();
    if (agora - _ultimaAlt_refinar_temp < 50) return; 
    _ultimaAlt_refinar_temp = agora;
    console.warn("[FIN] Chamada legada a alternarValoresGlobal redirecionada com segurança.");
    var btnRdo = document.getElementById('btn-toggle-rdo-valores');
    var btnCaixa = document.getElementById('btn-toggle-caixa-valores');
    if (btnRdo) btnRdo.click();
    if (btnCaixa) btnCaixa.click();
  }
 < 50) return; 
    _ultimaAlt_${path.basename(file, '.js').replace(/[^a-zA-Z0-9]/g, '_')} = agora;
    console.warn("[FIN] Chamada legada a alternarValoresGlobal redirecionada com segurança.");
    var btnRdo = document.getElementById('btn-toggle-rdo-valores');
    var btnCaixa = document.getElementById('btn-toggle-caixa-valores');
    if (btnRdo) btnRdo.click();
    if (btnCaixa) btnCaixa.click();
  }
`;
        if (!content.includes('function alternarValoresGlobal')) {
            content += "\n" + patchSeguro;
        } else {
            content = content.replace(/function\s+alternarValoresGlobal\s*\([^)]*\)\s*\{[^}]*\}/g, patchSeguro);
        }
        alterado = true;
    }

    if ((file.includes('fin.js') || file.includes('dashboard.js')) && !content.includes('function emit_polinho_caixa')) {
        const funcaoOIM = `
  // [Auto-Patch] Função isolada OIM por aba
  function emit_polinho_caixa(contexto, valor) {
    console.log(\`[OIM] emit_polinho_caixa executado para a aba/contexto: \${contexto}\`);
    const alvo = document.getElementById(contexto === 'RDO' ? 'btn-toggle-rdo-valores' : 'btn-toggle-caixa-valores');
    if (alvo) alvo.click();
  }
`;
        content += "\n" + funcaoOIM;
        alterado = true;
    }

    if (alterado) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`[Ajustado] ${path.relative(ROOT_DIR, file)}`);
        modificados++;
    }
});

console.log(`[Concluído] ${modificados} arquivo(s) refinado(s).`);

try {
    fs.unlinkSync(SCRIPT_PATH);
    console.log("[Limpeza] Arquivo temporário removido com sucesso.");
} catch (err) {
    console.error("[Erro ao remover arquivo temporário]:", err.message);
}
