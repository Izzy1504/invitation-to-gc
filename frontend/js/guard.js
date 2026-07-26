/* ==========================================================================
   Lightweight content protection — deters CASUAL copying of the page.
   NOTE: this is not security. Client-side HTML/CSS/JS is always retrievable by
   a determined visitor; this only adds friction against right-click, view-source,
   devtools and text/image copying. Form fields stay fully usable.
   ========================================================================== */
(function () {
  'use strict';

  var OWNER = '\u00A9 2026 \u0110o\u00E0n Minh Kh\u00F4i \u2014 Graduation Invitation. All rights reserved.';

  // True for elements where the guest legitimately needs copy/paste/selection.
  function inField(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
  }

  // Block the right-click context menu (but keep it inside form fields).
  document.addEventListener('contextmenu', function (e) {
    if (!inField(e.target)) e.preventDefault();
  });

  // Prevent dragging images / links out of the page.
  document.addEventListener('dragstart', function (e) {
    var tag = (e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '');
    if (tag === 'IMG' || tag === 'A') e.preventDefault();
  });

  // Discourage view-source / save / copy / devtools shortcuts. Never inside inputs.
  document.addEventListener('keydown', function (e) {
    if (inField(e.target)) return;
    var k = (e.key || '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    var blockedCombo = mod && (k === 'u' || k === 's' || k === 'c' || k === 'a' || k === 'p');
    var blockedDev = k === 'f12' || (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c'));
    if (blockedCombo || blockedDev) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });

  // Ownership notice for anyone who does open the console.
  try {
    console.log('%c' + OWNER,
      'color:#00f6ff;font-size:13px;font-weight:bold;text-shadow:0 0 6px rgba(0,246,255,.5)');
    console.log('%cVui l\u00F2ng kh\u00F4ng sao ch\u00E9p m\u00E3 ngu\u1ED3n \u00B7 Please do not copy this source.',
      'color:#7d93a8;font-size:12px');
  } catch (e) { /* ignore */ }
})();
