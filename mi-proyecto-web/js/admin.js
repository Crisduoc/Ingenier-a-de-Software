const adminContent = document.getElementById('admin-content');
const logoutButton = document.getElementById('logout-button');

// Aquí iría la lógica para obtener y mostrar los datos de administración
adminContent.innerHTML = '<h1>Bienvenido, Administrador</h1><p>Aquí puedes gestionar los datos del sistema.</p>';

logoutButton.addEventListener('click', () => {
    window.location.href = 'login.html'; // Redirige al login
});