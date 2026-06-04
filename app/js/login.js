window.togglePasswordVisibility = function() {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('togglePassIcon');
    const isPassword = passInput.type === 'password';
    
    passInput.type = isPassword ? 'text' : 'password';
    icon.className = isPassword 
        ? 'bi bi-eye-slash toggle-password-icon' 
        : 'bi bi-eye toggle-password-icon';
};

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('loginForm');
        if (!form) return;

        const DOM = {
            form: form,
            user: document.getElementById('user'),
            pass: document.getElementById('pass'),
            btn: document.getElementById('btnSubmit'),
            msg: document.getElementById('login-msg')
        };

        DOM.form.onsubmit = async (e) => {
            e.preventDefault();
            DOM.btn.disabled = true;
            DOM.msg.innerText = "Autenticando...";

            try {
                const response = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'login', 
                        username: DOM.user.value.trim(), 
                        password: DOM.pass.value.trim() 
                    })
                });

                const resData = await response.json();

                if (response.ok && resData.status === 'success') {
                    localStorage.setItem('rdo_auth', 'true');
                    localStorage.setItem('username', resData.user.username);
                    localStorage.setItem('tipo', resData.user.tipo);
                    localStorage.setItem('imagem', resData.user.imagem || '');
                    window.location.replace('/');
                } else {
                    throw new Error(resData.message || "Credenciais inválidas.");
                }
            } catch (err) {
                console.error("Erro no login:", err);
                DOM.msg.innerText = err.message;
                DOM.btn.disabled = false;
            }
        };
    });
})();