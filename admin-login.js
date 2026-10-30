const API_BASE = window.SSTC_BACKEND_URL || 'http://localhost:4000';
const form = document.getElementById('loginForm');
const messageBox = document.getElementById('message');

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = 'message ' + type;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showMessage('Please enter both username and password.', 'error');
    return;
  }

  try {
    showMessage('Signing in...', 'success');

    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      showMessage(data.message || 'Login failed.', 'error');
      return;
    }

    showMessage('Login successful. Redirecting...', 'success');
    window.location.href = 'admin-page.html';
  } catch (error) {
    showMessage('Unable to connect to backend. Check backend URL and server status.', 'error');
  }
});
