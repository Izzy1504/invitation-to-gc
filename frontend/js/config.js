/* ---------------------------------------------------------------------------
 * Runtime API configuration.
 *
 * Local development: the Node/Express backend serves this frontend from the
 * same origin, so a relative "/api" path works and needs no CORS.
 *
 * Production: the frontend is hosted on GitHub Pages (a static host with no
 * backend), so it must call the Render backend directly using its full URL.
 *
 * 👉 After you deploy the backend to Render, copy its URL from the Render
 *    dashboard and paste it into RENDER_BACKEND_URL below (no trailing slash).
 *    Example: 'https://invitation-to-gc.onrender.com'
 * ------------------------------------------------------------------------- */
(function () {
  const RENDER_BACKEND_URL = 'https://invitation-to-gc.onrender.com';

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  window.API_BASE = isLocal
    ? '/api'
    : RENDER_BACKEND_URL.replace(/\/+$/, '') + '/api';
})();
