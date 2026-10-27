const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const message = document.getElementById('message');
const form = document.getElementById('authForm');

let mode = 'login';

// Already logged in? Go straight to the dashboard
if (localStorage.getItem('token')) location.href = '/dashboard.html';

function setMode(newMode) {
  mode = newMode;
  const isRegister = mode === 'register';
  nameInput.classList.toggle('hidden', !isRegister);
  nameInput.required = isRegister;
  registerTab.classList.toggle('active', isRegister);
  loginTab.classList.toggle('active', !isRegister);
  submitBtn.textContent = isRegister ? 'Create account' : 'Login';
  message.textContent = '';
}

loginTab.onclick = () => setMode('login');
registerTab.onclick = () => setMode('register');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.textContent = '';

  const body = { email: emailInput.value, password: passwordInput.value };
  if (mode === 'register') body.name = nameInput.value;

  try {
    const res = await fetch('/api/auth/' + mode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      message.textContent = data.message || 'Something went wrong';
      return;
    }

    localStorage.setItem('token', data.token);
    location.href = '/dashboard.html';
  } catch (err) {
    message.textContent = 'Cannot reach the server';
  }
});