(function () {
    'use strict';

    function _iniciais(nome) {
        if (!nome || nome === 'Usuário' || nome === '...') return 'U';
        var p = nome.trim().split(/\s+/);
        if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
        return p[0].substring(0, 2).toUpperCase();
    }

    function _gerarSVG(texto) {
        var t = (texto && texto.trim()) ? texto.trim() : 'U';
        return 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
            '<rect fill="#dc3545" width="80" height="80" rx="40"/>' +
            '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" ' +
            'fill="#fff" font-size="30" font-family="Poppins,-apple-system,BlinkMacSystemFont,sans-serif" ' +
            'font-weight="700">' + t + '</text></svg>'
        );
    }

    function _urlValida(url) {
        if (!url || typeof url !== 'string') return false;
        var s = url.trim();
        if (!s || s === 'null' || s === 'undefined' || s.length < 10) return false;
        return (
            s.indexOf('data:image/') === 0 ||
            s.indexOf('/')           === 0 ||
            s.indexOf('http://')     === 0 ||
            s.indexOf('https://')    === 0
        );
    }

    window.resolverSrcAvatar = function (urlBanco, nome) {
        if (_urlValida(urlBanco)) return urlBanco;
        var iniciais = _iniciais(nome || '');
        return _gerarSVG(iniciais || (nome || 'U').charAt(0).toUpperCase());
    };

    window.atualizarAvatar = function () {
        var username = localStorage.getItem('username') || 'Usuário';
        var imagem   = localStorage.getItem('imagem');
        var iniciais = _iniciais(username);
        var svg      = _gerarSVG(iniciais);
        var src      = _urlValida(imagem) ? imagem : svg;

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
})();
