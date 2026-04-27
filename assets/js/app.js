async function loadModule(folder, page, title) {
    const view = document.getElementById('router-view');
    const titleEl = document.getElementById('dynamic-title');
    
    // Atualiza o título no Header
    if(title) titleEl.innerText = title;
    
    view.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div></div>';
    
    try {
        const res = await fetch(`pages/${folder}/${page}.html`);
        if (!res.ok) throw new Error('Página não encontrada');
        const html = await res.text();
        view.innerHTML = html;
        
        // Mobile: fecha sidebar ao clicar
        if(window.innerWidth < 992) document.querySelector('.sidebar').classList.remove('active');

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
    } else { alert('Credenciais inválidas!'); }
});

function init() {
    if (localStorage.getItem('rdo_auth') === 'true') {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadModule('gestao', 'coletas', 'Gestão: Coletas');
    }
}

function logout() { 
    localStorage.removeItem('rdo_auth'); 
    location.reload(); 
}

window.onload = init;
