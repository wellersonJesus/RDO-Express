window.atualizarAvatar = function () {
    var username = localStorage.getItem('username') || 'Usuário';
    var imagem   = localStorage.getItem('imagem');

    function _iniciais(nome) {
        if (!nome || nome === 'Usuário') return 'U';
        var p = nome.trim().split(/\s+/);
        if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
        return p[0].substring(0, 2).toUpperCase();
    }

    function _svg(t) {
        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
            '<rect fill="#dc3545" width="80" height="80" rx="40"/>' +
            '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" ' +
            'fill="#fff" font-size="30" font-family="Poppins,sans-serif" font-weight="700">' + t + '</text></svg>'
        );
    }

    function _valida(url) {
        if (!url || typeof url !== 'string') return false;
        var s = url.trim();
        return s && s !== 'null' && s !== 'undefined' && s.length >= 10;
    }

    var iniciais = _iniciais(username);
    var svg      = _svg(iniciais);
    var src      = _valida(imagem) ? imagem : svg;

    var img1 = document.getElementById('user-avatar-img');
    if (img1) {
        img1.onerror       = function () { this.onerror = null; this.src = svg; };
        img1.src           = src;
        img1.style.display = 'block';
        var icon1 = document.querySelector('#avatar-container .avatar-fallback-icon');
        if (icon1) icon1.style.display = 'none';
    }

    var img2 = document.getElementById('header-user-avatar');
    if (img2) {
        img2.onerror       = function () { this.onerror = null; this.src = svg; };
        img2.src           = src;
        img2.style.display = 'block';
        var icon2 = document.querySelector('#header-avatar-container .avatar-fallback-icon');
        if (icon2) icon2.style.display = 'none';
    }
};
