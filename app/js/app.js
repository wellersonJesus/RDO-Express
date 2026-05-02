function loadPage(page, title, subtitle) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-subtitle').innerText = subtitle;
    fetch(`pages/${page}.html`)
        .then(res => res.text())
        .then(html => document.getElementById('router-view').innerHTML = html)
        .catch(() => document.getElementById('router-view').innerHTML = "<h3>Página em construção</h3>");
}
function logout() { window.location.href = 'login.html'; }
