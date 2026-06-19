(function () {
    'use strict';

    var form      = document.getElementById('loginForm');
    var btn       = document.getElementById('btnSubmit');
    var msg       = document.getElementById('login-msg');
    var inputUser = document.getElementById('user');
    var inputPass = document.getElementById('pass');
    var toggleIcon = document.getElementById('togglePassIcon');

    if (!form || !btn || !msg || !inputUser || !inputPass) {
        console.error('[Login] Elementos do formulário não encontrados.');
        return;
    }

    var originalBtnHTML = btn.innerHTML;

    // ── Toggle senha ──────────────────────────────────────────────
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

    // ── Helpers ───────────────────────────────────────────────────
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

    function salvarSessao(userData, token) {
        localStorage.setItem('rdo_auth', 'true');
        localStorage.setItem('username', userData.username || userData.user || '');
        localStorage.setItem('tipo',     userData.tipo     || userData.role  || '');
        localStorage.setItem('imagem',   userData.imagem   || userData.foto  || userData.avatar || '');
        if (token) localStorage.setItem('rdo_token', token);
    }

    // ── Submit ────────────────────────────────────────────────────
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
                return { status: response.status, ok: response.ok, data: data };
            });
        })
        .then(function (result) {
            console.log('[Login] Resposta do servidor:', result);

            if (!result.ok || result.data.status !== 'success' || !result.data.user) {
                throw new Error(result.data.message || 'Usuário ou senha incorretos.');
            }

            salvarSessao(result.data.user, result.data.token || null);
            showMsg('Autenticado! Redirecionando...', 'success');

            setTimeout(function () {
                window.location.replace('/');
            }, 800);
        })
        .catch(function (err) {
            console.error('[Login] Erro:', err);

            var isOffline = err instanceof TypeError && err.message === 'Failed to fetch';
            showMsg(isOffline
                ? 'Sem conexão com o servidor. Tente novamente.'
                : (err.message || 'Erro inesperado. Tente novamente.')
            );
            setLoading(false);
        });
    });

    // ── Enter no campo usuário avança para senha ──────────────────
    inputUser.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputPass.focus();
        }
    });

})();
