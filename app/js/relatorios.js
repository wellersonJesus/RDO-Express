window.initRelatorios = function () {
    var userName = localStorage.getItem('user_name') || localStorage.getItem('username') || 'Usuário';
    var el = document.getElementById('user-display-name');
    if (el) el.innerText = userName;
    console.log('[Relatorios] Módulo inicializado.');
};
