// ====== YAHAN APNA APPS SCRIPT WEB APP URL DAALO ======
const API_URL = 'https://script.google.com/macros/s/YAHAN_APNA_ID/exec';
// ======================================================

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

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!data.success) {
      showMessage(data.message || 'Login failed.', 'error');
      return;
    }

    sessionStorage.setItem('sstcAdmin', 'true');
    showMessage('Login successful. Redirecting...', 'success');
    window.location.href = 'admin-page.html';
  } catch (error) {
    showMessage('Unable to connect to server. Check the Apps Script URL and deployment.', 'error');
  }
});
