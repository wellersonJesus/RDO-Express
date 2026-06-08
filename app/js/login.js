// /js/login.js

window.togglePasswordVisibility = function() {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('togglePassIcon');
    if (!passInput || !icon) return;
    
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    icon.className = isPassword ? 'bi bi-eye-slash toggle-password-icon' : 'bi bi-eye toggle-password-icon';
};

(function() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btnSubmit');
        const msg = document.getElementById('login-msg');
        const user = document.getElementById('user').value.trim();
        const pass = document.getElementById('pass').value.trim();

        btn.disabled = true;
        btn.innerText = "Autenticando...";
        msg.innerText = "";

        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username: user, password: pass })
            });

            const resData = await response.json();

            if (response.ok && resData.status === 'success') {
                // Persistência de sessão
                localStorage.setItem('rdo_auth', 'true');
                localStorage.setItem('username', resData.user.username);
                localStorage.setItem('tipo', resData.user.tipo);
                localStorage.setItem('imagem', resData.user.imagem || resData.user.foto || resData.user.avatar || '');
                
                // Redireciona para a raiz. O index.html tratará de carregar o Dashboard
                window.location.replace('/');
            } else {
                throw new Error(resData.message || "Credenciais inválidas.");
            }
        } catch (err) {
            console.error("Erro no login:", err);
            msg.innerText = err.message || "Erro de conexão com o servidor.";
            btn.disabled = false;
            btn.innerText = "Acessar Painel";
        }
    };
})();