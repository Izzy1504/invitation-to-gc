/* Lightweight animated "circuit network" background canvas */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, nodes;
  // Lighter network on phones / low-power devices to save battery and jank.
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;
  const NODE_COUNT = smallScreen ? 38 : 70;
  const MAX_DIST = smallScreen ? 110 : 140;
  // Render at device pixel density (capped at 2) so lines stay crisp on
  // high-DPI flagships without paying the full 3x-4x fill cost.
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // draw using CSS-pixel coordinates
  }

  function initNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }

  function render() {
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          ctx.strokeStyle = `rgba(0, 246, 255, ${0.12 * (1 - dist / MAX_DIST)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      ctx.fillStyle = 'rgba(0, 246, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let lastT = performance.now();
  function step(now) {
    // Normalise motion to ~60fps units so speed is identical on 60/90/120Hz
    // displays (otherwise particles race on high-refresh phones).
    const dt = Math.min((now - lastT) / 16.667, 3);
    lastT = now;
    for (const n of nodes) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    render();
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);

  resize();
  initNodes();
  lastT = performance.now();
  requestAnimationFrame(step);
})();
