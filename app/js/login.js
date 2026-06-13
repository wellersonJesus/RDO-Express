window.togglePasswordVisibility = function () {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('togglePassIcon');
    if (!passInput || !icon) return;

    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    icon.className = isPassword
        ? 'bi bi-eye-slash toggle-password-icon'
        : 'bi bi-eye toggle-password-icon';
};

(function () {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const btn = document.getElementById('btnSubmit');
    const msg = document.getElementById('login-msg');
    const inputUser = document.getElementById('user');
    const inputPass = document.getElementById('pass');
    const originalBtnHTML = btn.innerHTML;

    function setLoading(active) {
        btn.disabled = active;
        btn.innerHTML = active
            ? '<i class="bi bi-arrow-repeat spinner-rotate me-2"></i> Autenticando...'
            : originalBtnHTML;
    }

    function showError(text) {
        msg.className = 'text-center mt-3 text-danger small fw-bold';
        msg.innerText = text;
    }

    function clearMsg() {
        msg.className = 'text-center mt-3 text-danger small fw-bold';
        msg.innerText = '';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMsg();

        const user = inputUser.value.trim();
        const pass = inputPass.value.trim();

        if (!user || !pass) {
            showError('Preencha usuário e senha.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username: user, password: pass })
            });

            const resData = await response.json();

            if (!response.ok || resData.status !== 'success' || !resData.user) {
                throw new Error(resData.message || 'Usuário ou senha incorretos.');
            }

            const userData = resData.user;

            localStorage.setItem('rdo_auth', 'true');
            localStorage.setItem('username', userData.username || userData.user || user);
            localStorage.setItem('tipo', userData.tipo || userData.role || '');
            localStorage.setItem('imagem', userData.imagem || userData.foto || userData.avatar || '');

            if (resData.token) {
                localStorage.setItem('rdo_token', resData.token);
            }

            window.location.replace('/');

        } catch (err) {
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                showError('Sem conexão com o servidor.');
            } else {
                showError(err.message || 'Erro inesperado. Tente novamente.');
            }
            setLoading(false);
        }
    });
})();
