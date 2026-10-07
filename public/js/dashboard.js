// Dashboard: only works with a valid token. Otherwise we send you to /login.
(() => {
  const $ = (id) => document.getElementById(id);

  function kickOut() {
    EC.clearToken();
    window.location.replace('/login');
  }

  // No token at all? Don't even ask the server.
  if (!EC.getToken()) return kickOut();

  function tickStep(name) {
    const li = document.querySelector('[data-step="' + name + '"]');
    li.classList.add('done');
    li.querySelector('.tick').textContent = '\u2713'; // check mark
  }

  function renderIdea() {
    const slot = $('idea-slot');
    let idea = null;
    try {
      idea = JSON.parse(localStorage.getItem('ecell_idea'));
    } catch {}

    if (idea && idea.text) {
      const note = document.createElement('div');
      note.className = 'note';
      const p = document.createElement('p');
      p.textContent = idea.text;
      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = idea.stamp;
      note.append(p, stamp);
      slot.append(note);
    } else {
      const p = document.createElement('p');
      p.className = 'empty';
      p.append('Nothing on the board yet. ');
      const a = document.createElement('a');
      a.href = '/';
      a.textContent = 'Stamp an idea on the home page.';
      p.append(a);
      slot.append(p);
    }
  }

  async function init() {
    try {
      // The protected call: the server verifies our token before answering.
      const { user } = await EC.api('/me');

      const first = user.name.split(' ')[0];
      $('greeting').textContent = 'Hi ' + first + '.';
      $('f-name').textContent = user.name;
      $('f-email').textContent = user.email;
      $('f-since').textContent = new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      // One-time welcome banner right after logging in or signing up
      const how = sessionStorage.getItem('ecell_welcome');
      const welcome = $('welcome');
      if (how) {
        welcome.textContent =
          how === 'signup'
            ? 'Account created. Welcome to E-Cell, ' + first + '!'
            : 'Logged in. Welcome back, ' + first + '!';
        welcome.hidden = false;
        sessionStorage.removeItem('ecell_welcome');
      }

      ['landing', 'account', 'token', 'dash'].forEach(tickStep);
      renderIdea();
    } catch (err) {
      if (err.status === 401) return kickOut(); // expired or fake token
      $('greeting').textContent = "Couldn't load your dashboard.";
      const p = document.createElement('p');
      p.className = 'dash-lede';
      p.textContent = err.message;
      $('greeting').after(p);
    }
  }

  $('logout-btn').addEventListener('click', kickOut);
  init();
})();
