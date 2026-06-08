window.togglePasswordVisibility = function() {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('togglePassIcon');
    if (!passInput || !icon) return;
    
    const isPassword = passInput.type === 'password';
    passInput.type = isPassword ? 'text' : 'password';
    icon.className = isPassword ? 'bi bi-eye-slash toggle-password-icon' : 'bi bi-eye toggle-password-icon';
};

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('loginForm');
        const btn = document.getElementById('btnSubmit');
        const msg = document.getElementById('login-msg');

        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            btn.disabled = true;
            btn.innerText = "Autenticando...";
            msg.innerText = "";

            try {
                const response = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'login', 
                        username: document.getElementById('user').value.trim(), 
                        password: document.getElementById('pass').value.trim() 
                    })
                });

                const resData = await response.json();

                if (response.ok && resData.status === 'success') {
                    // Armazena dados no LocalStorage
                    localStorage.setItem('rdo_auth', 'true');
                    localStorage.setItem('username', resData.user.username);
                    localStorage.setItem('tipo', resData.user.tipo);
                    
                    // Captura a imagem, tentando chaves diferentes que a API possa retornar
                    const imgUrl = resData.user.imagem || resData.user.foto || resData.user.avatar || '';
                    localStorage.setItem('imagem', imgUrl);
                    
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
    });
})();