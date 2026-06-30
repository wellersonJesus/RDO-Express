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
            s.indexOf('/') === 0 ||
            s.indexOf('http://') === 0 ||
            s.indexOf('https://') === 0
        );
    }

    function _proxificarUrl(url) {
        if (!url || typeof url !== 'string') return url;
        var s = url.trim();
        if (s.indexOf('http://') === 0 || s.indexOf('https://') === 0) {
            return '/api/avatar?url=' + encodeURIComponent(s);
        }
        return s;
    }

    window.resolverSrcAvatar = function (urlBanco, nome) {
        if (_urlValida(urlBanco)) return urlBanco.trim();
        var iniciais = _iniciais(nome || '');
        return _gerarSVG(iniciais || (nome || 'U').charAt(0).toUpperCase());
    };

    function _aplicarAvatarComFallback(imgEl, iconEl, urlOriginal, svg) {
        if (!imgEl) return;

        var tentativas = 0;

        function _exibirImagem(src) {
            imgEl.onerror = null;
            imgEl.onload = null;
            imgEl.style.display = 'none';

            imgEl.onload = function () {
                this.onload = null;
                this.onerror = null;
                this.style.display = 'block';
                if (iconEl) iconEl.style.display = 'none';
            };

            imgEl.onerror = function () {
                this.onerror = null;
                this.onload = null;
                tentativas++;

                if (tentativas === 1 && urlOriginal &&
                    (urlOriginal.indexOf('http://') === 0 || urlOriginal.indexOf('https://') === 0)) {
                    _exibirImagem(_proxificarUrl(urlOriginal));
                    return;
                }

                // Fallback final: SVG (data:image não dispara onerror, onload é seguro)
                _usarSVG();
            };

            imgEl.src = src;
        }

        function _usarSVG() {
            imgEl.onerror = null;
            imgEl.onload = null;
            imgEl.src = svg;
            imgEl.style.display = 'block'; // ← garante exibição do SVG
            if (iconEl) iconEl.style.display = 'none';
        }

        if (_urlValida(urlOriginal)) {
            _exibirImagem(urlOriginal.trim());
        } else {
            _usarSVG(); // ← sem URL válida, vai direto pro SVG com display:block
        }
    }

    window.atualizarAvatar = function () {
        var username = localStorage.getItem('username') || 'Usuário';
        var tipo = localStorage.getItem('tipo') || '';
        var imagem = localStorage.getItem('imagem') || '';

        var iniciais = _iniciais(username);
        var svg = _gerarSVG(iniciais);

        var seletores = [
            { imgId: 'user-avatar-img', iconId: 'avatar-fallback-icon' },
            { imgId: 'header-user-avatar', iconId: 'header-avatar-fallback-icon' }
        ];

        seletores.forEach(function (s) {
            var imgEl = document.getElementById(s.imgId);
            var iconEl = document.getElementById(s.iconId); // ← getElementById, mais confiável
            _aplicarAvatarComFallback(imgEl, iconEl, imagem, svg);
        });

        var nameEl = document.getElementById('display-username');
        var cargoEl = document.getElementById('display-cargo');
        if (nameEl) nameEl.textContent = username;
        if (cargoEl) cargoEl.textContent = tipo || '—';
    };

})();
