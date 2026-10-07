// Landing page behaviour: headline animation + the "idea board".
(() => {
  // Respect users who asked their device for less motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // If the GSAP CDN failed to load, the page still works, just without animation.
  const animate = typeof window.gsap !== 'undefined' && !reduceMotion;

  // ---- 1. Page-load animation: headline lines slide up out of their "masks" ----
  if (animate) {
    gsap.from('.line-inner', { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.12 });
    gsap.from('.board-wrap', { opacity: 0, y: 30, rotation: 1.5, duration: 0.8, delay: 0.5, ease: 'power2.out' });
  }

  // ---- 2. The idea board ----
  const STAMPS = ['Worth a pitch', 'Needs a pivot', 'Ship it', 'Talk to 10 users', 'Too good to wait'];
  const NOTE_COLOURS = ['#ffe14d', '#ffffff', '#ffb3ad'];
  const MAX_NOTES = 4;
  const IDEA_KEY = 'ecell_idea';

  const board = document.getElementById('board');
  const empty = document.getElementById('board-empty');
  const form = document.getElementById('idea-form');
  const input = document.getElementById('idea');

  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function addNote(text) {
    empty.hidden = true;

    const note = document.createElement('div');
    note.className = 'note';
    note.style.background = pick(NOTE_COLOURS);

    const p = document.createElement('p');
    p.textContent = text; // textContent keeps user input from being treated as HTML

    const stamp = document.createElement('span');
    stamp.className = 'stamp';
    stamp.textContent = pick(STAMPS);

    note.append(p, stamp);
    board.append(note);

    // Random spot inside the board (we measure the board so it works on any screen)
    const noteWidth = note.offsetWidth;
    const noteHeight = note.offsetHeight;
    const x = rand(8, Math.max(9, board.clientWidth - noteWidth - 16));
    const y = rand(8, Math.max(9, board.clientHeight - noteHeight - 16));
    const tilt = rand(-6, 6);
    note.style.left = x + 'px';
    note.style.top = y + 'px';
    note.style.transform = 'rotate(' + tilt + 'deg)';

    // Keep the board tidy: remove the oldest note once there are too many
    const notes = board.querySelectorAll('.note');
    if (notes.length > MAX_NOTES) notes[0].remove();

    if (animate) {
      // Timeline = animations in order: drop the note, slam the stamp, shake the board.
      gsap.timeline()
        .from(note, { y: -320, opacity: 0, rotation: tilt + 25, duration: 0.8, ease: 'bounce.out' })
        .from(stamp, { scale: 3, opacity: 0, duration: 0.22, ease: 'power4.in' })
        .fromTo(board, { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(6, 0.3)' }, '<0.2');
    }

    return stamp.textContent;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const stampText = addNote(text);
    input.value = '';
    input.focus();

    // Remember the idea so the dashboard can show it after login
    try {
      localStorage.setItem(IDEA_KEY, JSON.stringify({ text, stamp: stampText }));
    } catch {
      /* storage can be blocked (private mode). The board still works. */
    }
  });
})();
