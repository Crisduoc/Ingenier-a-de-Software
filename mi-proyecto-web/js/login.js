const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Aquí iría la lógica de autenticación (por ejemplo, enviar los datos a un servidor)
    if (username === 'admin' && password === 'password') {
        window.location.href = 'admin.html'; // Redirige al admin
    } else {
        errorMessage.textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
    }
});