(function () {
    'use strict';

    var form = document.getElementById('loginForm');
    var btn = document.getElementById('btnSubmit');
    var msg = document.getElementById('login-msg');
    var inputUser = document.getElementById('user');
    var inputPass = document.getElementById('pass');
    var toggleIcon = document.getElementById('togglePassIcon');

    if (!form || !btn || !msg || !inputUser || !inputPass) return;

    var originalBtnHTML = btn.innerHTML;

    window.togglePasswordVisibility = function () {
        var isPassword = inputPass.type === 'password';
        inputPass.type = isPassword ? 'text' : 'password';
        if (toggleIcon) {
            toggleIcon.className = isPassword
                ? 'bi bi-eye-slash toggle-password-icon'
                : 'bi bi-eye toggle-password-icon';
        }
    };

    if (toggleIcon) {
        toggleIcon.addEventListener('click', window.togglePasswordVisibility);
        toggleIcon.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.togglePasswordVisibility();
            }
        });
    }

    function setLoading(active) {
        btn.disabled = active;
        btn.innerHTML = active
            ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Autenticando...'
            : originalBtnHTML;
    }

    function showMsg(text, type) {
        msg.className = 'text-center mt-3 small fw-bold text-' + (type || 'danger');
        msg.textContent = text;
    }

    function clearMsg() {
        msg.className = 'text-center mt-3 small fw-bold';
        msg.textContent = '';
    }

    function salvarSessao(userData) {
        var username = String(userData.username || userData.user || '').trim();
        var tipo = String(userData.tipo || userData.cargo || userData.role || '').trim();
        var idUsuario = String(userData.id || userData.id_usuario || userData.userId || '').trim();
        var cargo = String(userData.cargo || userData.role || tipo || '').trim();
        var imagem = String(
            userData.imagem || userData.foto || userData.avatar || userData.image ||
            userData.picture || userData.photo || userData.profile_image || ''
        ).trim();

        localStorage.setItem('rdo_auth', 'true');
        localStorage.setItem('username', username);
        localStorage.setItem('tipo', tipo);
        localStorage.setItem('id_usuario', idUsuario);
        localStorage.setItem('user_id', idUsuario);
        localStorage.setItem('user_cargo', cargo);

        if (imagem && imagem !== 'null' && imagem !== 'undefined' && imagem.length >= 10) {
            localStorage.setItem('imagem', imagem);
        } else {
            localStorage.removeItem('imagem');
        }

        if (typeof window.salvarSessaoLogin === 'function') {
            window.salvarSessaoLogin(userData);
        }
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearMsg();

        var user = inputUser.value.trim();
        var pass = inputPass.value.trim();

        if (!user || !pass) {
            showMsg('Preencha usuário e senha.');
            return;
        }

        setLoading(true);

        fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username: user, password: pass })
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (!result.ok || result.data.status !== 'success' || !result.data.user) {
                    throw new Error(result.data.message || 'Usuário ou senha incorretos.');
                }

                salvarSessao(result.data.user);
                showMsg('Autenticado! Redirecionando...', 'success');
                setTimeout(function () {
                    window.location.replace('/');
                }, 800);
            })
            .catch(function (err) {
                var isOffline = err instanceof TypeError && err.message === 'Failed to fetch';
                showMsg(isOffline
                    ? 'Sem conexão com o servidor. Tente novamente.'
                    : (err.message || 'Erro inesperado. Tente novamente.')
                );
                setLoading(false);
            });
    });

    inputUser.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputPass.focus();
        }
    });

})();
