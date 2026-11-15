'use strict';

// Filo landing page: the download link, the companion picker (the live thing),
// the question cards and the entrances. The page reads fully without it.
(function () {
  document.documentElement.classList.add('js');

  // ---------------------------------------------------------------- the download
  const dl = window.FILO_DOWNLOAD || {};
  for (const a of document.querySelectorAll('[data-download]')) {
    if (dl.url) a.href = dl.url;
    if (dl.file) a.setAttribute('download', dl.file);
  }
  for (const el of document.querySelectorAll('[data-file]')) el.textContent = dl.file || 'Filo.dmg';
  for (const el of document.querySelectorAll('[data-version]')) el.textContent = dl.version || '';
  const note = document.querySelector('[data-platform-note]');
  const mac = /Mac/i.test(navigator.platform || '') || /Macintosh/i.test(navigator.userAgent);
  const touch = navigator.maxTouchPoints > 1;
  if (note && (!mac || touch)) {
    note.textContent = 'Filo is a Mac app. Open this page on your Mac to download it.';
  } else if (note && dl.size) {
    note.textContent = `For macOS on Apple silicon · version ${dl.version} · ${dl.size}`;
  }

  // ---------------------------------------------------------------- meet the six (the live thing)
  const FRIENDS = {
    togepi: 'A little egg-shell companion, full of joy, who wanders off and does things his own way. He smells flowers, eats apples and goes on adventures.',
    pip: 'A clever little clockwork bird who thinks he’s much smarter than everyone else. He winds himself up, investigates things with a magnifying glass, and conducts the music you play.',
    mori: 'A small, quiet forest creature with a moss cap, calm and gentle, with a dry sense of humour. Mori makes tea, plants seeds and skips stones.',
    nomi: 'A little floating dream cloud who turns ordinary things into tiny dreams. She catches stars, blows dream bubbles and watches the moon at night.',
    tonk: 'A pocket-sized brass-and-steel robot who loves helping you get things done. Tonk checks off his to-do list, sorts screws and fixes himself with a tiny wrench.',
    wolfie: 'Stony Brook’s own Seawolf: your campus buddy who studies with you, eats with you and cheers every win. Go Seawolves!',
  };
  const NAMES = { togepi: 'Togepi', pip: 'Pip', mori: 'Mori', nomi: 'Nomi', tonk: 'Tonk', wolfie: 'Wolfie' };
  const frame = document.getElementById('live-friend');
  const plate = document.querySelector('[data-plate]');
  const tabs = [...document.querySelectorAll('[data-friend]')];

  function choose(id, focus) {
    tabs.forEach((t) => {
      const on = t.dataset.friend === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    for (const el of document.querySelectorAll('[data-friend-name]')) el.textContent = NAMES[id];
    const about = document.querySelector('[data-friend-about]');
    if (about) about.textContent = FRIENDS[id];
    if (plate) plate.dataset.plate = id;
    if (frame) frame.src = `live/renderer/live.html?character=${id}`;
    // The chosen companion is in the address, so it can be shared.
    const url = new URL(location.href);
    url.searchParams.set('companion', id);
    history.replaceState(null, '', url);
  }
  const asked = new URLSearchParams(location.search).get('companion');
  if (asked && NAMES[asked]) choose(asked);
  tabs.forEach((t, i) => {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', () => choose(t.dataset.friend));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      choose(tabs[(i + d + tabs.length) % tabs.length].dataset.friend, true);
    });
  });
  const patButton = document.querySelector('[data-pat]');
  if (patButton && frame) patButton.addEventListener('click', () => frame.contentWindow && frame.contentWindow.postMessage({ type: 'pat' }, location.origin));

  // The plate's companion grows with the plate (the renderer draws at a fixed size).
  const fit = () => {
    if (!plate || !frame) return;
    frame.style.setProperty('--s', Math.max(0.8, Math.min(1.9, (plate.clientWidth * 0.82) / 360)).toFixed(3));
  };
  fit();
  if ('ResizeObserver' in window && plate) new ResizeObserver(fit).observe(plate);

  // Their eyes follow your cursor across the page.
  const friends = [...document.querySelectorAll('iframe[src*="live.html"]')];
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const f of friends) {
        const r = f.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || !f.contentWindow) continue;
        const scale = r.width / (f.width || r.width);
        f.contentWindow.postMessage({ type: 'cursor', x: (e.clientX - (r.left + r.width / 2)) / scale, y: (e.clientY - (r.bottom - 18 * scale)) / scale }, location.origin);
      }
    });
  });

  // ---------------------------------------------------------------- the moving picture: pausable, still under reduced motion
  const video = document.querySelector('.wall video');
  const toggle = document.querySelector('[data-video-toggle]');
  const setPlaying = (on) => {
    if (!video || !toggle) return;
    if (on) video.play().catch(() => {});
    else video.pause();
    toggle.textContent = on ? 'All six · pause' : 'All six · play';
    toggle.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} the video of all six companions`);
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  if (toggle) toggle.addEventListener('click', () => setPlaying(video.paused));

  // ---------------------------------------------------------------- questions: one card open at a time
  const cards = [...document.querySelectorAll('.card')];
  cards.forEach((card) => {
    const btn = card.querySelector('button');
    const answer = card.querySelector('.card__a');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      cards.forEach((c) => {
        c.dataset.open = 'false';
        c.querySelector('button').setAttribute('aria-expanded', 'false');
        c.querySelector('.card__a').hidden = true;
      });
      if (!open) {
        card.dataset.open = 'true';
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });
  });

  // ---------------------------------------------------------------- entrances
  for (const group of document.querySelectorAll('[data-enter]')) [...group.children].forEach((c, i) => c.style.setProperty('--i', i));
  document.querySelectorAll('.wall__grid .word').forEach((w, i) => w.style.setProperty('--i', i % 4));
  document.querySelectorAll('.day__tiles .spec').forEach((w, i) => w.style.setProperty('--i', i % 3));
  cards.forEach((c, i) => c.style.setProperty('--i', i));

  const targets = document.querySelectorAll('[data-enter], .word, .card, .shutter, .stage');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  targets.forEach((t) => io.observe(t));
})();
