const API_URL = "http://localhost:8000";

async function loadModule(folder, file) {
    const mainContent = document.getElementById('router-view');
    // Exemplo de chamada para a API
    try {
        const response = await fetch(`${API_URL}/${folder}/${file}`);
        mainContent.innerHTML = await response.text();
    } catch (e) { mainContent.innerHTML = "Erro ao conectar com API."; }
}
