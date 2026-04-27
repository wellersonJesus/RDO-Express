async function loadModule(folder, file, title) {
    const routerView = document.getElementById('router-view');
    const dynamicTitle = document.getElementById('dynamic-title');
    
    if (dynamicTitle) dynamicTitle.innerText = title;
    
    try {
        const path = `pages/${folder}/${file}.html`;
        const response = await fetch(path);
        
        if (!response.ok) throw new Error(`Página ${file} não encontrada.`);
        
        const html = await response.text();
        routerView.innerHTML = html;

        // Executa scripts inseridos no HTML manualmente
        const scripts = routerView.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

    } catch (err) {
        console.error(err);
        routerView.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar módulo: ${err.message}</div>`;
    }
}
