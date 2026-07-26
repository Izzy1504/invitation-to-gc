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
        // Rapid keystroke ticks give the boot log a "coding" feel.
        if (window.SFX && charIndex > 0 && charIndex % 2 === 0) SFX.type();
        charIndex++;
        const pct = Math.round(((lineIndex + charIndex / line.length) / bootLines.length) * 100);
        if (progressEl) progressEl.style.width = Math.min(pct, 100) + '%';
        setTimeout(typeNext, 14);
      } else {
        printed += line + '\n';
        lineIndex++;
        charIndex = 0;
        if (window.SFX) SFX.boot();
        setTimeout(typeNext, 120);
      }
    }
    typeNext();
  }

  // Show the intro gate; the boot sequence (with sound) starts on tap so the
  // browser lets us play audio. Falls back to auto-start if the gate is absent.
  function initBootGate() {
    const gate = document.getElementById('boot-gate');
    const startBtn = document.getElementById('boot-start');
    const box = document.querySelector('.boot-box');

    function begin() {
      if (gate) gate.classList.add('hidden');
      if (box) box.classList.remove('pending');
      if (window.SFX) SFX.click();
      runBootSequence();
    }

    if (startBtn) {
      startBtn.addEventListener('click', begin, { once: true });
    } else {
      begin();
    }
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
        if (window.SFX && i > 0) SFX.type();
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
  // After the intro the guest may scroll freely from the top through the WHOLE
  // RSVP section (so the entire form — including the Submit button — is always
  // reachable, even on phones where the form is taller than the screen), but
  // cannot scroll PAST the RSVP section into the sections below until they SUBMIT
  // the form. On submit the page unlocks and glides down to Event. The
  // "Confirm Attendance" button / RSVP nav link still glide there directly.
  const GUIDE_SCROLL_DURATION = 1500;  // ms glide (higher = smoother)
  const GATED_SECTIONS = ['event', 'schedule', 'map']; // reachable only after RSVP
  let locked = false;                  // is forward scrolling gated?
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

  // --- Forward gate: clamp the scroll position so the guest can reach the whole
  //     RSVP section but not the gated sections beneath it. We never disable
  //     scrolling (that stranded the submit button off-screen on phones) — we
  //     only pull the page back if it goes past the allowed maximum. ---

  // Highest Y allowed before submitting: the bottom of the RSVP section aligned
  // to the bottom of the viewport, keeping gated content just out of view.
  function gatedMaxY() {
    const rsvp = document.getElementById('rsvp');
    if (!rsvp) return Number.POSITIVE_INFINITY;
    const bottom = rsvp.getBoundingClientRect().bottom + window.scrollY;
    return Math.max(0, Math.ceil(bottom - window.innerHeight));
  }

  function scrollGuard() {
    if (!locked || isGliding) return;
    const maxY = gatedMaxY();
    if (window.scrollY > maxY) window.scrollTo(0, maxY);
  }
  function lockScroll() {
    if (locked) return;
    locked = true;
    window.addEventListener('scroll', scrollGuard, { passive: true });
    document.body.classList.add('guide-locked');
  }
  function unlockScroll() {
    locked = false;
    window.removeEventListener('scroll', scrollGuard, { passive: true });
    document.body.classList.remove('guide-locked');
  }

  // Start held at the very top (Home) with everything locked.
  function startGuidedFlow() {
    window.scrollTo(0, 0);
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
      showTransmitting();

      try {
        const res = await fetch(`${API_BASE}/rsvp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Request failed');
        hideTransmitting();
        statusEl.textContent = '✔ Response received. See you on August 9th!';
        statusEl.className = 'rsvp-status ok';
        if (window.SFX) SFX.success();
        lockRsvpForm(form);
        showThankYou();
        resumeGuideAfterRsvp();
      } catch (err) {
        hideTransmitting();
        statusEl.textContent = '✖ Transmission failed. Please try again later.';
        statusEl.className = 'rsvp-status err';
        if (window.SFX) SFX.error();
        submitBtn.disabled = false;
      }
    });
  }

  // "Please wait" overlay shown while the RSVP is being transmitted. It is not
  // dismissable by the guest — it closes itself on success or failure.
  function showTransmitting() {
    const modal = document.getElementById('transmit-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (window.SFX) SFX.modal();
  }
  function hideTransmitting() {
    const modal = document.getElementById('transmit-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // Disable and grey out every field once the RSVP is accepted, so the guest
  // can see what they submitted but can no longer edit or re-send it.
  function lockRsvpForm(form) {
    form.classList.add('submitted');
    form.querySelectorAll('input, select, textarea, button').forEach((el) => {
      el.disabled = true;
    });
  }

  // Cyberpunk "thank you" overlay shown after a successful submit.
  function showThankYou() {
    const modal = document.getElementById('thankyou-modal');
    if (!modal) return;
    const closeBtn = document.getElementById('ty-close');
    const backdrop = modal.querySelector('.ty-backdrop');

    function close() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (window.SFX) SFX.modal();
    document.addEventListener('keydown', onKey);
    if (closeBtn) {
      closeBtn.onclick = close;
      setTimeout(() => closeBtn.focus(), 50);
    }
    if (backdrop) backdrop.onclick = close;
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

  /* ---------------- Map lightbox (tap to enlarge) ---------------- */
  function initMapLightbox() {
    const wrap = document.querySelector('.map-wrap');
    const map = document.getElementById('campus-map');
    if (!wrap || !map) return;
    wrap.classList.add('map-zoomable');
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'Phóng to bản đồ khuôn viên');
    let box = null;
    function onKey(e) { if (e.key === 'Escape') closeBox(); }
    function openBox() {
      if (box) return;
      box = document.createElement('div');
      box.className = 'map-lightbox';
      box.innerHTML =
        '<button type="button" class="map-lightbox-close" aria-label="Đóng">\u2715</button>' +
        '<div class="map-lightbox-inner"></div>' +
        '<div class="map-lightbox-hint">Kéo để xem · chạm nền hoặc \u2715 để đóng</div>';
      box.querySelector('.map-lightbox-inner').appendChild(map.cloneNode(true));
      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => box.classList.add('open'));
      box.addEventListener('click', (e) => {
        if (e.target === box ||
            e.target.classList.contains('map-lightbox-inner') ||
            e.target.closest('.map-lightbox-close')) closeBox();
      });
      document.addEventListener('keydown', onKey);
      if (window.SFX) SFX.click();
    }
    function closeBox() {
      if (!box) return;
      box.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      const b = box; box = null;
      setTimeout(() => b.remove(), 320);
    }
    wrap.addEventListener('click', openBox);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); }
    });
  }

  /* ---------------- Interactive sound effects ---------------- */
  function initSoundEffects() {
    if (!window.SFX) return;
    document.querySelectorAll('.btn, .nav-links a, .nav-logo').forEach((el) => {
      el.addEventListener('mouseenter', () => SFX.hover());
      el.addEventListener('pointerdown', () => SFX.click());
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initBootGate();
    initTypewriter();
    initCountdown();
    initNav();
    initReveal();
    initMissionLoaders();
    initMapAnimation();
    initMapLightbox();
    initRsvpForm();
    initSoundEffects();
  });
})();
