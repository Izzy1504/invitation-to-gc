/* ==========================================================================
   Xianxia (Tiên Hiệp) edition behaviour
   - Ink-night canvas: falling snow (layered, with slow wind) over the mountains
   - Enter gate, countdown, scroll reveals
   - RSVP submit → "please wait" → "thank you" (same backend as the main site)
   - Background music via the YouTube IFrame API (starts on the enter tap)
   Standalone: shares nothing with the cyberpunk version except js/config.js.
   ========================================================================== */
(function () {
  const API_BASE = window.API_BASE || '/api';
  const EVENT_TIME = new Date('2026-08-09T11:00:00+07:00').getTime();
  const YT_VIDEO_ID = 'gXg2Rc8UuxY'; // 知我 — Lưu Vũ Hân (OST Tước Cốt)

  /* ---------------- Background canvas ---------------- */
  function initCanvas() {
    const canvas = document.getElementById('sky-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const small = Math.min(window.innerWidth, window.innerHeight) < 768;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;

    const COUNT = small ? 120 : 210; // total snowflakes across all depths

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // Pre-render one soft, fuzzy snowflake (radial gradient) so every flake has
    // feathered edges — this is what makes it read as real falling snow rather
    // than hard dots. We just stamp this sprite, scaled, for each flake.
    const SP = 64;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = SP;
    const sctx = sprite.getContext('2d');
    const grad = sctx.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(245,249,252,0.85)');
    grad.addColorStop(1, 'rgba(245,249,252,0)');
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(SP / 2, SP / 2, SP / 2, 0, Math.PI * 2);
    sctx.fill();

    // depth 0 = far (tiny, crisp, slow) → 1 = near (big, soft, faster, more sway)
    function spawnFlake(anywhere) {
      const depth = Math.random();
      const r = 1.2 + depth * depth * 9;
      return {
        x: Math.random() * (w || window.innerWidth),
        y: anywhere ? Math.random() * (h || window.innerHeight) : -r - 6,
        r,
        speed: 0.35 + depth * 1.5,
        sway: 0.4 + depth * 1.3,
        drift: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + (1 - depth) * 0.5 + depth * 0.14,
      };
    }

    const flakes = Array.from({ length: COUNT }, () => spawnFlake(true));

    function frame(now, dt) {
      ctx.clearRect(0, 0, w, h);
      // Wind: steady rightward drift plus layered gusts → snow slants and surges.
      const wind = 0.7 + Math.sin(now * 0.00016) * 0.9 + Math.sin(now * 0.00007) * 0.6;
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.x += (wind * (0.5 + f.sway * 0.25) + f.drift +
                Math.sin(now * 0.0008 + f.phase) * f.sway) * dt;
        if (f.y > h + f.r + 6 || f.x > w + f.r + 8) Object.assign(f, spawnFlake(false));
        ctx.globalAlpha = Math.min(1, f.alpha);
        ctx.drawImage(sprite, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      ctx.globalAlpha = 1;
    }

    let last = performance.now();
    function loop(now) {
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      frame(now, dt);
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    resize();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  /* ---------------- Countdown ---------------- */
  function initCountdown() {
    const d = document.getElementById('cd-days');
    const hh = document.getElementById('cd-hours');
    const mm = document.getElementById('cd-mins');
    const ss = document.getElementById('cd-secs');
    if (!d) return;
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      let diff = Math.max(0, EVENT_TIME - Date.now());
      d.textContent = pad(Math.floor(diff / 86400000));
      hh.textContent = pad(Math.floor((diff / 3600000) % 24));
      mm.textContent = pad(Math.floor((diff / 60000) % 60));
      ss.textContent = pad(Math.floor((diff / 1000) % 60));
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    items.forEach((el) => obs.observe(el));
  }

  /* ---------------- Gentle guqin-like pluck (interaction feedback) ---------------- */
  let actx = null;
  function pluck(freq) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      osc.connect(g).connect(actx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.95);
    } catch (e) { /* ignore */ }
  }

  // "Xuyên không" — deep bass drop + cosmic whoosh resolving into a resonant
  // arrival chime. Fully synthesized (no audio files), fired on the enter tap.
  function playTransmigration() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime;
      const master = actx.createGain();
      master.gain.value = 0.9;
      master.connect(actx.destination);

      // 1) deep bass drop
      const bass = actx.createOscillator();
      const bg = actx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(150, t);
      bass.frequency.exponentialRampToValueAtTime(32, t + 1.1);
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.55, t + 0.06);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      bass.connect(bg).connect(master);
      bass.start(t); bass.stop(t + 1.6);

      // 2) cosmic whoosh — noise through a sweeping band-pass
      const dur = 2.3;
      const frames = Math.floor(actx.sampleRate * dur);
      const buf = actx.createBuffer(1, frames, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const noise = actx.createBufferSource();
      noise.buffer = buf;
      const bp = actx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(260, t);
      bp.frequency.exponentialRampToValueAtTime(4200, t + 1.1);
      bp.frequency.exponentialRampToValueAtTime(420, t + 2.2);
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.4, t + 0.4);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      noise.connect(bp).connect(ng).connect(master);
      noise.start(t); noise.stop(t + dur);

      // 3) resonant arrival chime (bell-like, detuned partials)
      const ct = t + 2.0;
      [523.25, 784, 1046.5, 1567.98].forEach((f, i) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        g.gain.setValueAtTime(0.0001, ct);
        g.gain.exponentialRampToValueAtTime(0.2 / (i * 0.6 + 1), ct + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ct + 2.6);
        o.connect(g).connect(master);
        o.start(ct); o.stop(ct + 2.7);
      });
    } catch (e) { /* ignore */ }
  }

  /* ---------------- YouTube background music ---------------- */
  const Music = (function () {
    let player = null;
    let ready = false;
    let playing = false;
    let wantPlay = false;
    const btn = () => document.getElementById('music-toggle');
    const ICON_ON =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    const ICON_OFF =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';

    function paint() {
      const b = btn();
      if (!b) return;
      b.innerHTML = playing ? ICON_ON : ICON_OFF;
      b.classList.toggle('playing', playing);
    }

    function load() {
      window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-holder', {
          videoId: YT_VIDEO_ID,
          playerVars: {
            autoplay: 0, controls: 0, loop: 1, playlist: YT_VIDEO_ID,
            playsinline: 1, modestbranding: 1, rel: 0,
          },
          events: {
            onReady: () => { ready = true; if (wantPlay) start(); },
            onStateChange: (e) => {
              playing = e.data === YT.PlayerState.PLAYING;
              paint();
            },
          },
        });
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }

    function start() {
      wantPlay = true;
      if (ready && player) { player.unMute(); player.setVolume(55); player.playVideo(); }
    }
    function toggle() {
      if (!player || !ready) { start(); return; }
      if (playing) player.pauseVideo();
      else { player.unMute(); player.playVideo(); }
    }

    function init() {
      load();
      const b = btn();
      if (b) { b.addEventListener('click', toggle); paint(); }
    }
    return { init, start };
  })();

  /* ---------------- Enter gate ---------------- */
  function initGate() {
    const gate = document.getElementById('enter-gate');
    const btn = document.getElementById('enter-btn');
    if (!gate) return;
    function enter() {
      playTransmigration();
      gate.classList.add('gone');
      document.body.classList.add('warping');
      const reveal = () => {
        document.body.classList.remove('warping');
        Music.start();
      };
      if (window.Warp3D) {
        // WebGL vortex → time tunnel → white-out; page revealed on the flash.
        window.Warp3D.play(reveal);
        setTimeout(() => { gate.style.display = 'none'; }, 500);
      } else {
        // Lightweight CSS fallback.
        const warp = document.getElementById('warp');
        if (warp) warp.classList.add('active');
        setTimeout(reveal, 850);
        setTimeout(() => {
          if (warp) warp.classList.remove('active');
          gate.style.display = 'none';
        }, 1550);
      }
    }
    if (btn) {
      btn.addEventListener('click', enter, { once: true });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
      }, { once: true });
    }
    gate.addEventListener('click', (e) => { if (e.target === gate) enter(); }, { once: true });
  }

  /* ---------------- Modals ---------------- */
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }

  // Gentle nudge shown after the RSVP is accepted.
  function showHint() {
    let t = document.getElementById('hint-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'hint-toast';
      t.className = 'hint-toast';
      t.setAttribute('role', 'status');
      t.innerHTML = '<span class="arrows" aria-hidden="true">\u25B2<br>\u25BC</span>' +
        '<span>Vu\u1ed1t m\u00e0n h\u00ecnh l\u00ean ho\u1eb7c xu\u1ed1ng \u0111\u1ec3 xem th\u00eam th\u00f4ng tin nh\u00e9</span>';
      document.body.appendChild(t);
    }
    clearTimeout(t._timer);
    requestAnimationFrame(() => t.classList.add('show'));
    t._timer = setTimeout(() => t.classList.remove('show'), 8000);
  }

  /* ---------------- RSVP ---------------- */
  function initRsvp() {
    const form = document.getElementById('rsvp-form');
    const statusEl = document.getElementById('rsvp-status');
    if (!form) return;
    const submitBtn = document.getElementById('rsvp-submit');
    const tyClose = document.getElementById('ty-close');
    if (tyClose) tyClose.addEventListener('click', () => { pluck(523); closeModal('thankyou-modal'); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        guestName: form.guestName.value.trim(),
        attending: form.attending.value,
        guestCount: Number(form.guestCount.value) || 1,
        message: form.message.value.trim(),
      };
      statusEl.textContent = 'Đang gửi…';
      statusEl.className = 'rsvp-status';
      submitBtn.disabled = true;
      openModal('transmit-modal');

      try {
        const res = await fetch(`${API_BASE}/rsvp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('failed');
        closeModal('transmit-modal');
        statusEl.textContent = '✔ Đã nhận hồi âm. Hẹn gặp ngày 09/08!';
        statusEl.className = 'rsvp-status ok';
        pluck(659);
        form.classList.add('submitted');
        form.querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = true; });
        openModal('thankyou-modal');
        showHint();
      } catch (err) {
        closeModal('transmit-modal');
        statusEl.textContent = '✖ Gửi thất bại. Vui lòng thử lại sau.';
        statusEl.className = 'rsvp-status err';
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------- Interaction sounds ---------------- */
  function initPluck() {
    document.querySelectorAll('.btn, .enter-seal').forEach((el) => {
      el.addEventListener('pointerdown', () => pluck(330 + Math.random() * 120));
    });
  }

  /* ---------------- Floating calligraphy parallax ---------------- */
  function initParallax() {
    const chars = Array.from(document.querySelectorAll('.kchar'));
    if (!chars.length) return;
    const fine = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    let mx = 0, my = 0;
    function apply() {
      const sy = window.scrollY || 0;
      for (const c of chars) {
        const d = parseFloat(c.dataset.depth) || 0.03;
        const tx = mx * d * 640;
        const ty = my * d * 420 - sy * d;
        c.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      }
    }
    if (fine) {
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
        apply();
      }, { passive: true });
    }
    window.addEventListener('scroll', apply, { passive: true });
    apply();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initCountdown();
    initReveal();
    initParallax();
    Music.init();
    initGate();
    initRsvp();
    initPluck();
  });
})();
