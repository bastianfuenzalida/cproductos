<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Master Productos</title>
    <link rel="stylesheet" href="assets/styles.css">
    <style>
        body {
            background: #181818;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: #232323;
            border-radius: 16px;
            box-shadow: 0 4px 32px rgba(0,0,0,0.4);
            padding: 2.5rem 2.2rem 2rem 2.2rem;
            max-width: 350px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .login-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: #ffb300;
            margin-bottom: 1.2rem;
            text-align: center;
        }
        .login-form {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.1rem;
        }
        .login-form input {
            width: 100%;
            padding: 0.7rem 1rem;
            border: 2px solid #333;
            border-radius: 8px;
            font-size: 1rem;
            background: #292929;
            color: #fff;
            transition: border 0.2s;
            margin-bottom: 0.2rem;
            text-align: center;
        }
        .login-form input:focus {
            border-color: #ffb300;
            outline: none;
        }
        .login-btn {
            background: #ffb300;
            color: #222;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1.1rem;
            padding: 0.7rem 0;
            cursor: pointer;
            transition: background 0.2s;
            width: 100%;
            margin-top: 0.5rem;
        }
        .login-btn:hover {
            background: #ffd54f;
        }
        .login-error {
            color: #ff4444;
            background: #2a1818;
            border-radius: 6px;
            padding: 0.7em 1em;
            margin-bottom: 0.7em;
            text-align: center;
            font-size: 1rem;
            display: none;
            width: 100%;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-title">Master Productos</div>
        <form class="login-form" id="loginForm" autocomplete="off">
            <input type="text" id="loginUser" placeholder="Usuario Odoo" required autofocus>
            <div style="position:relative;width:100%;display:flex;align-items:center;">
                <input type="password" id="loginPass" placeholder="Contraseña" required style="width:100%;padding-right:2.5em;">
                <button type="button" id="togglePass" tabindex="-1" style="position:absolute;right:0.7em;background:none;border:none;cursor:pointer;color:#aaa;font-size:1.2em;outline:none;display:flex;align-items:center;justify-content:center;" title="Mostrar contraseña">
                    <span id="eyeIcon">🙉</span>
                </button>
            </div>
            <div class="login-error" id="loginError"></div>
            <button type="submit" class="login-btn">Ingresar</button>
        </form>
    </div>
    <script>
    let errorTimeout = null;
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        const errorDiv = document.getElementById('loginError');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        if (errorTimeout) clearTimeout(errorTimeout);
        const btn = this.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Conectando...';
        try {
            const res = await fetch('odoo_login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, pass })
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = 'index.php';
            } else {
                errorDiv.textContent = data.error || 'Credenciales incorrectas';
                errorDiv.style.display = 'block';
                errorTimeout = setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);
            }
        } catch (err) {
            errorDiv.textContent = 'Error de conexión con el servidor';
            errorDiv.style.display = 'block';
            errorTimeout = setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
        btn.disabled = false;
        btn.textContent = 'Ingresar';
    });
    document.getElementById('togglePass').addEventListener('click', function() {
        const passInput = document.getElementById('loginPass');
        const eyeIcon = document.getElementById('eyeIcon');
        if (passInput.type === 'password') {
            passInput.type = 'text';
            eyeIcon.textContent = '🙈';
            this.title = 'Ocultar contraseña';
        } else {
            passInput.type = 'password';
            eyeIcon.textContent = '🙉';
            this.title = 'Mostrar contraseña';
        }
    });
    </script>
</body>
</html>
