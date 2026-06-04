function togglePasswordVisibility() {
    const passInput = document.getElementById('pass');
    const icon = document.getElementById('togglePassIcon');
    passInput.type = (passInput.type === 'password') ? 'text' : 'password';
    icon.className = (passInput.type === 'text') ? 'bi bi-eye-slash toggle-password-icon' : 'bi bi-eye toggle-password-icon';
}

document.getElementById('loginForm').onsubmit = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const msg = document.getElementById('login-msg');
    
    btn.disabled = true;
    msg.innerText = "Autenticando...";

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

        if (resData.status === 'success') {
            localStorage.setItem('rdo_auth', 'true');
            localStorage.setItem('username', resData.user.username);
            localStorage.setItem('tipo', resData.user.tipo);
            localStorage.setItem('imagem', resData.user.imagem || '');
            window.location.replace('/'); // Vai para o index
        } else {
            throw new Error(resData.message || "Credenciais inválidas.");
        }
    } catch (err) {
        msg.innerText = err.message;
        btn.disabled = false;
    }
};
