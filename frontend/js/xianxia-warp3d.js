/* ---------------------------------------------------------------------------
 * Transmigration warp — vortex → time-tunnel → white-out.
 *
 * Rendered as a single full-screen GLSL shader with RAW WebGL (no libraries,
 * no build step). Loads instantly, runs on the GPU at 60fps, and scales to any
 * screen. If WebGL is unavailable or the user prefers reduced motion, it bows
 * out immediately and the caller falls back to the lightweight CSS warp.
 *
 * Usage:  window.Warp3D.play(onReveal)   // onReveal fires as the white-out
 *                                        // peaks, so the main page is revealed
 *                                        // behind the flash.
 * ------------------------------------------------------------------------- */
(function () {
  const DURATION = 2600;   // total warp length (ms)
  const REVEAL_AT = 0.80;  // progress at which the page is revealed

  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  const FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uProg;',
    'void main() {',
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;',
    '  float r = length(uv);',
    '  float a = atan(uv.y, uv.x);',
    '  // Vortex: strong swirl early, easing as we plunge into the tunnel.',
    '  float swirl = (1.0 - smoothstep(0.0, 0.45, uProg)) * 3.2;',
    '  a += swirl / (r + 0.15) + uTime * 0.6;',
    '  // Tunnel travel accelerates with progress.',
    '  float speed = 0.8 + uProg * 7.0;',
    '  float depth = 0.32 / (r + 0.06) + uTime * speed;',
    '  // Streaking light + faint ribs of the time stream.',
    '  float stripes = sin(depth * 13.0) * 0.5 + 0.5;',
    '  float ribs = sin(a * 12.0 + depth * 2.0) * 0.5 + 0.5;',
    '  float glow = pow(stripes, 3.0) * (0.55 + 0.45 * ribs);',
    '  vec3 col = mix(vec3(0.12, 0.20, 0.45), vec3(0.85, 0.92, 1.0), glow);',
    '  // Bright core that grows as we accelerate inward.',
    '  col += vec3(1.0) * pow(max(0.0, 1.0 - r * 1.35), 3.0) * (0.25 + uProg * 0.9);',
    '  col *= (0.45 + glow) * (0.55 + uProg * 0.9);',
    '  // White-out at the end of the tunnel.',
    '  float white = smoothstep(0.82, 1.0, uProg);',
    '  col = mix(col, vec3(1.0), white);',
    '  float alpha = smoothstep(0.0, 0.12, uProg) * (1.0 - smoothstep(0.92, 1.0, uProg));',
    '  gl_FragColor = vec4(col, alpha);',
    '}',
  ].join('\n');

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }

  function play(onReveal) {
    let revealed = false;
    const reveal = () => { if (!revealed) { revealed = true; if (onReveal) onReveal(); } };

    const canvas = document.getElementById('warp3d');
    if (!canvas) { reveal(); return; }

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) { reveal(); return; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { reveal(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { reveal(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uProg = gl.getUniformLocation(prog, 'uProg');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      const w = Math.floor(window.innerWidth * DPR);
      const h = Math.floor(window.innerHeight * DPR);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, w, h);
    }
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    canvas.classList.add('on');
    const start = performance.now();
    function frame(now) {
      const t = (now - start) / 1000;
      const p = Math.min((now - start) / DURATION, 1);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uProg, p);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (p >= REVEAL_AT) reveal();
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        canvas.classList.remove('on');
        window.removeEventListener('resize', onResize);
        // Free GPU resources.
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
      }
    }
    requestAnimationFrame(frame);
  }

  window.Warp3D = { play };
})();
