const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    messageDiv.textContent = 'Attempting to log in...';
    window.electronAPI.login(username, password);
});

window.electronAPI.onLoginResponse((response) => {
    if (response.status === 'success') {
        messageDiv.textContent = 'Login successful! Redirecting...';
        // TODO: Load main application window/view
    } else {
        messageDiv.textContent = response.message || 'Login failed. Please try again.';
    }
});