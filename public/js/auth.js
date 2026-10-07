// Handles BOTH the login form and the signup form.
// The form's data-mode attribute ("login" or "signup") tells us which one we're on.
(() => {
  const form = document.getElementById('auth-form');
  const mode = form.dataset.mode;
  const msg = document.getElementById('form-msg');
  const btn = document.getElementById('submit-btn');
  const idleLabel = btn.textContent;

  // Already logged in? Skip the form.
  if (EC.getToken()) window.location.replace('/dashboard');

  function showMessage(type, text) {
    msg.className = 'form-msg' + (type ? ' show ' + type : '');
    msg.textContent = text; // textContent (not innerHTML) so text can never run as code
  }

  // "Show / Hide" button on the password field
  document.querySelectorAll('.toggle-pass').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.dataset.target);
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      toggle.textContent = hidden ? 'Hide' : 'Show';
      toggle.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop the browser's default page reload
    showMessage('', '');

    const data = Object.fromEntries(new FormData(form)); // { email: '...', password: '...' }

    // Quick checks for fast feedback. The server checks everything again.
    if (mode === 'signup' && data.password !== data.confirm) {
      return showMessage('error', 'Passwords do not match. Type the same one twice.');
    }
    if (data.password.length < 8) {
      return showMessage('error', 'Password needs at least 8 characters.');
    }

    btn.disabled = true;
    btn.textContent = mode === 'signup' ? 'Creating your account...' : 'Logging in...';

    try {
      const payload =
        mode === 'signup'
          ? { name: data.name, email: data.email, password: data.password }
          : { email: data.email, password: data.password };

      const result = await EC.api('/' + mode, { method: 'POST', body: payload });

      EC.setToken(result.token); // keep the token so the dashboard can use it
      sessionStorage.setItem('ecell_welcome', mode); // tells the dashboard which greeting to show

      const first = result.user.name.split(' ')[0];
      showMessage(
        'success',
        (mode === 'signup' ? 'Welcome to E-Cell, ' : 'Welcome back, ') +
          first + '. Taking you to your dashboard...'
      );
      setTimeout(() => (window.location.href = '/dashboard'), 1400);
    } catch (err) {
      showMessage('error', err.message);
      btn.disabled = false;
      btn.textContent = idleLabel;
    }
  });
})();
