/* ---------------------------------------------------------------------------
 * Procedural "tech" sound effects — synthesized with the Web Audio API.
 *
 * No audio files are shipped: every sound is generated from oscillators and
 * noise bursts, so there are no downloads, no copyright concerns, and it works
 * offline. Browsers block audio until the first user gesture, so the context
 * is created/resumed on the first pointer or key event. A floating toggle
 * (persisted in localStorage) lets guests mute everything.
 * ------------------------------------------------------------------------- */
(function () {
  const STORAGE_KEY = 'mk_sfx_muted';
  let ctx = null;
  let master = null;
  let muted = localStorage.getItem(STORAGE_KEY) === '1';

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16; // keep the whole site subtle
    master.connect(ctx.destination);
    return ctx;
  }

  // A single oscillator tone with a fast attack + exponential decay.
  function tone(opts) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const {
      freq = 440, type = 'sine', dur = 0.12,
      gain = 0.4, glideTo = null, delay = 0,
    } = opts || {};
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Short filtered white-noise burst — used for clicks / glitch texture.
  function noise(opts) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const { dur = 0.06, gain = 0.25, type = 'highpass', freq = 1400 } = opts || {};
    const t0 = c.currentTime;
    const frames = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  const SFX = {
    hover() { tone({ freq: 660, type: 'square', dur: 0.05, gain: 0.18 }); },
    click() {
      tone({ freq: 880, type: 'square', dur: 0.07, gain: 0.32, glideTo: 1280 });
      noise({ dur: 0.04, gain: 0.14 });
    },
    boot() { tone({ freq: 300 + Math.random() * 160, type: 'square', dur: 0.03, gain: 0.12 }); },
    type() { tone({ freq: 1500, type: 'square', dur: 0.014, gain: 0.06 }); },
    modal() { tone({ freq: 300, type: 'sine', dur: 0.28, gain: 0.3, glideTo: 760 }); },
    success() {
      tone({ freq: 523.25, type: 'triangle', dur: 0.13, gain: 0.38, delay: 0.0 });
      tone({ freq: 659.25, type: 'triangle', dur: 0.13, gain: 0.38, delay: 0.1 });
      tone({ freq: 987.77, type: 'triangle', dur: 0.24, gain: 0.42, delay: 0.2 });
    },
    error() {
      tone({ freq: 220, type: 'sawtooth', dur: 0.2, gain: 0.35, glideTo: 100 });
      noise({ dur: 0.12, gain: 0.14, type: 'lowpass', freq: 400 });
    },
    isMuted() { return muted; },
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
      updateToggle();
    },
    toggle() {
      const willUnmute = muted;
      SFX.setMuted(!muted);
      if (willUnmute) SFX.click(); // confirmation blip when turning sound ON
    },
  };

  // Resume the audio context on the first user gesture (autoplay policy).
  function unlock() {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);

  /* ---- Floating mute toggle ---- */
  const ICON_ON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const ICON_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';

  let toggleBtn = null;
  function buildToggle() {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'sfx-toggle';
    toggleBtn.className = 'sfx-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Toggle sound effects');
    toggleBtn.addEventListener('click', () => SFX.toggle());
    document.body.appendChild(toggleBtn);
    updateToggle();
  }
  function updateToggle() {
    if (!toggleBtn) return;
    toggleBtn.classList.toggle('muted', muted);
    toggleBtn.innerHTML = muted ? ICON_OFF : ICON_ON;
    toggleBtn.title = muted ? 'Sound off' : 'Sound on';
    toggleBtn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }

  window.SFX = SFX;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToggle);
  } else {
    buildToggle();
  }
})();
