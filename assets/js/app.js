async function loadModule(folder, page) {
    const view = document.getElementById('router-view');
    view.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div></div>';
    
    try {
        const res = await fetch(`pages/${folder}/${page}.html`);
        if (!res.ok) throw new Error('Página não encontrada');
        const html = await res.text();
        view.innerHTML = html;
        
        const scripts = view.querySelectorAll("script");
        scripts.forEach(oldScript => {
            const newScript = document.createElement("script");
            newScript.text = oldScript.text;
            document.body.appendChild(newScript).parentNode.removeChild(newScript);
        });
    } catch (e) {
        view.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

async function fetchSheetData(sheetName) {
    try {
        const res = await fetch(`${CONFIG.API_URL}?sheet=${sheetName}`);
        return await res.json();
    } catch (e) { return null; }
}

document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('user').value === CONFIG.MASTER_USER && 
        document.getElementById('pass').value === CONFIG.MASTER_PASS) {
        localStorage.setItem('rdo_auth', 'true');
        init();
    } else { alert('Erro!'); }
});

function init() {
    if (localStorage.getItem('rdo_auth') === 'true') {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadModule('gestao', 'coletas');
    }
}

function logout() { localStorage.removeItem('rdo_auth'); location.reload(); }
window.onload = init;
