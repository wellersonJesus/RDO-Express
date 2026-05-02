const API_URL = window.CONFIG ? window.CONFIG.API_URL : "http://localhost:8000";

async function loadModule(folder, file) {
    const mainContent = document.getElementById('router-view');
    // Caminho relativo para funcionar com -t client
    const url = "pages/" + folder + "/" + file + ".html"; 
    try {
        const response = await fetch(url);
        if(!response.ok) throw new Error("404");
        mainContent.innerHTML = await response.text();
    } catch (e) { 
        mainContent.innerHTML = "<div class='p-3 text-danger'>Erro ao carregar módulo: " + url + "</div>"; 
    }
}
