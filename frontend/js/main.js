/* Main site behaviour: boot preloader, countdown, nav, reveal, map, RSVP */
(function () {
  // API base is resolved by js/config.js: a relative '/api' during local
  // development (backend serves the frontend), or the full Render backend URL
  // when this page is hosted on GitHub Pages.
  const API_BASE = window.API_BASE || '/api';

  /* ---------------- Preloader boot sequence ---------------- */
  const bootLines = [
    '> ESTABLISHING SECURE CONNECTION...',
    '> AUTHENTICATING GUEST CREDENTIALS...',
    '> LOADING INVITATION PROTOCOL v2026.08.09...',
    '> DECRYPTING VENUE COORDINATES: SÀI GÒN UNIVERSITY...',
    '> ACCESS GRANTED. WELCOME.',
  ];

  function runBootSequence() {
    const logEl = document.getElementById('boot-log');
    const progressEl = document.getElementById('boot-progress');
    const preloader = document.getElementById('preloader');
    if (!logEl || !preloader) return;

    let lineIndex = 0;
    let charIndex = 0;
    let printed = '';

    function typeNext() {
      if (lineIndex >= bootLines.length) {
        setTimeout(() => {
          preloader.classList.add('hide');
          startGuidedFlow();
        }, 400);
        return;
      }
      const line = bootLines[lineIndex];
      if (charIndex <= line.length) {
        logEl.textContent = printed + line.slice(0, charIndex) + '\n';
        charIndex++;
        const pct = Math.round(((lineIndex + charIndex / line.length) / bootLines.length) * 100);
        if (progressEl) progressEl.style.width = Math.min(pct, 100) + '%';
        setTimeout(typeNext, 14);
      } else {
        printed += line + '\n';
        lineIndex++;
        charIndex = 0;
        setTimeout(typeNext, 120);
      }
    }
    typeNext();
  }

  /* ---------------- Hero typewriter tagline ---------------- */
  function initTypewriter() {
    const el = document.getElementById('hero-typewriter');
    if (!el) return;
    const text = el.textContent;
    el.textContent = '';
    let i = 0;
    function type() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(type, 28);
      }
    }
    setTimeout(type, 700);
  }

  /* ---------------- Countdown ---------------- */
  function initCountdown() {
    const target = new Date('2026-08-09T11:00:00+07:00').getTime();
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');
    if (!daysEl) return;

    function pad(n) { return String(n).padStart(2, '0'); }

    function tick() {
      const now = Date.now();
      let diff = target - now;
      if (diff < 0) diff = 0;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      daysEl.textContent = pad(days);
      hoursEl.textContent = pad(hours);
      minsEl.textContent = pad(mins);
      secsEl.textContent = pad(secs);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- Nav toggle + scroll shadow ---------------- */
  function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => links.classList.remove('open'))
      );
    }
    // While the page is locked, in-page anchor clicks are handled by our own
    // glide (so the held position follows). Home / RSVP go to their section;
    // links to gated content nudge the guest to the RSVP form instead. Once
    // unlocked (after submit) links jump normally.
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener('click', (e) => {
        if (!locked) return;
        const id = a.getAttribute('href').slice(1);
        e.preventDefault();
        const targetId = GATED_SECTIONS.includes(id) ? 'rsvp' : id;
        smoothScrollTo(sectionTop(targetId), GUIDE_SCROLL_DURATION);
      })
    );
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((item) => observer.observe(item));
  }

  /* ---------------- Mission loaders (section transitions) ---------------- */
  function initMissionLoaders() {
    const loaders = document.querySelectorAll('.mission-loader');
    if (!loaders.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add('in-view');
          const pctEl = el.querySelector('.ml-pct');
          if (pctEl && !el.dataset.counted) {
            el.dataset.counted = '1';
            let n = 0;
            const step = () => {
              n = Math.min(100, n + Math.ceil(Math.random() * 8) + 4);
              pctEl.textContent = n + '%';
              if (n < 100) setTimeout(step, 55);
            };
            step();
          }
          observer.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    loaders.forEach((l) => observer.observe(l));
  }

  /* ---------------- Locked flow (RSVP gate) ---------------- */
  // After the intro the whole page is LOCKED: no manual scrolling up or down by
  // any means (wheel, touch, keyboard, scrollbar drag). The guest reaches the
  // form only via the "Confirm Attendance" button / RSVP nav link (our own glide
  // still works while locked). Nothing scrolls freely until they SUBMIT the RSVP
  // form — then the page unlocks and glides down to Event for free exploration.
  const GUIDE_SCROLL_DURATION = 1500;  // ms glide (higher = smoother)
  const GATED_SECTIONS = ['event', 'schedule', 'map']; // reachable only after RSVP
  let locked = false;                  // is manual scrolling blocked?
  let lockedY = 0;                     // the exact Y the guest is held at
  let isGliding = false;               // true only while our own glide animates

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Absolute document top of a section, independent of offsetParent.
  function sectionTop(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return Math.round(el.getBoundingClientRect().top + window.scrollY);
  }

  // Animate the scroll ourselves. While locked we also move the held position so
  // the guard below keeps the guest wherever the glide lands (e.g. on RSVP).
  function smoothScrollTo(targetY, duration) {
    const startY = window.scrollY || window.pageYOffset;
    const distance = targetY - startY;
    lockedY = targetY;
    if (Math.abs(distance) < 2) return;
    isGliding = true;
    let startTime = null;
    function frame(now) {
      if (startTime === null) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      // behavior:'instant' stops CSS `scroll-behavior: smooth` from
      // double-animating each frame of our own animation.
      window.scrollTo({ top: startY + distance * easeInOutCubic(t), behavior: 'instant' });
      if (t < 1) requestAnimationFrame(frame);
      else isGliding = false;
    }
    requestAnimationFrame(frame);
  }

  // --- Full scroll lock: blocks EVERY way of scrolling (wheel, touch, keyboard
  //     and dragging the scrollbar) in both directions, but never our own
  //     glides. Typing in form fields still works. ---
  const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown']);
  function blockWheel(e) { if (locked && !isGliding) e.preventDefault(); }
  function blockKeys(e) {
    if (!locked || isGliding) return;
    const el = e.target;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    if (SCROLL_KEYS.has(e.key)) e.preventDefault();
  }
  // Catches anything the handlers miss (scrollbar drag / momentum fling): snap
  // straight back to the held position.
  function scrollGuard() {
    if (locked && !isGliding && Math.abs(window.scrollY - lockedY) > 1) {
      window.scrollTo(0, lockedY);
    }
  }
  function lockScroll() {
    if (locked) return;
    locked = true;
    window.addEventListener('wheel', blockWheel, { passive: false });
    window.addEventListener('touchmove', blockWheel, { passive: false });
    window.addEventListener('keydown', blockKeys, false);
    window.addEventListener('scroll', scrollGuard, { passive: true });
    document.body.classList.add('guide-locked');
  }
  function unlockScroll() {
    locked = false;
    window.removeEventListener('wheel', blockWheel, { passive: false });
    window.removeEventListener('touchmove', blockWheel, { passive: false });
    window.removeEventListener('keydown', blockKeys, false);
    window.removeEventListener('scroll', scrollGuard, { passive: true });
    document.body.classList.remove('guide-locked');
  }

  // Start held at the very top (Home) with everything locked.
  function startGuidedFlow() {
    window.scrollTo(0, 0);
    lockedY = 0;
    requestAnimationFrame(lockScroll);
  }

  function endGuide() {
    unlockScroll();
  }

  // After a successful RSVP submit: unlock the page and glide down to Event.
  function resumeGuideAfterRsvp() {
    if (!locked) return;
    unlockScroll();
    setTimeout(() => smoothScrollTo(sectionTop('event'), GUIDE_SCROLL_DURATION), 900);
  }

  /* ---------------- RSVP form ---------------- */
  function initRsvpForm() {
    const form = document.getElementById('rsvp-form');
    const statusEl = document.getElementById('rsvp-status');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('rsvp-submit');
      const payload = {
        guestName: form.guestName.value.trim(),
        attending: form.attending.value,
        guestCount: Number(form.guestCount.value) || 1,
        message: form.message.value.trim(),
      };

      statusEl.textContent = 'Transmitting...';
      statusEl.className = 'rsvp-status';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/rsvp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Request failed');
        statusEl.textContent = '✔ Response received. See you on August 9th!';
        statusEl.className = 'rsvp-status ok';
        form.reset();
        resumeGuideAfterRsvp();
      } catch (err) {
        statusEl.textContent = '✖ Transmission failed. Please try again later.';
        statusEl.className = 'rsvp-status err';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------- Map route trigger ---------------- */
  function initMapAnimation() {
    const wrap = document.querySelector('.map-wrap');
    if (!wrap) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(wrap);
  }

  document.addEventListener('DOMContentLoaded', () => {
    runBootSequence();
    initTypewriter();
    initCountdown();
    initNav();
    initReveal();
    initMissionLoaders();
    initMapAnimation();
    initRsvpForm();
  });
})();
