const frame = document.querySelector('#landscape-view');
const root = new URL('../', import.meta.url);
let fullscreenRequest = null;

function layout() {
  const width = document.documentElement.clientWidth;
  const height = window.visualViewport?.height || document.documentElement.clientHeight;
  const upright = height > width;
  const availableWidth = upright ? height : width;
  const availableHeight = upright ? width : height;
  // A small minimum canvas avoids crushing settings and touch targets on
  // short browser viewports. Scale that complete landscape view to fit.
  const scale = Math.min(1, availableWidth / 640, availableHeight / 360);
  frame.style.width = `${availableWidth / scale}px`;
  frame.style.height = `${availableHeight / scale}px`;
  frame.style.top = `${height / 2}px`;
  frame.style.transform = `translate(-50%, -50%) rotate(${upright ? 90 : 0}deg) scale(${scale})`;
  frame.style.visibility = 'visible';
}

async function enterFullscreen() {
  if (document.hidden || document.fullscreenElement || document.webkitFullscreenElement) return;
  if (fullscreenRequest) return fullscreenRequest;
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  if (!request) return;
  fullscreenRequest = (async () => {
    try { await request.call(target, { navigationUI: 'hide' }); } catch { /* A user gesture may be required. */ }
    try { await screen.orientation?.lock?.('landscape'); } catch { /* The iframe supplies landscape regardless. */ }
  })();
  try { await fullscreenRequest; } finally { fullscreenRequest = null; layout(); }
}

// Called synchronously from a child click event so browser user activation
// is preserved. Frame navigation never replaces the fullscreen owner.
window.dlicomPresentation = { request: enterFullscreen };
addEventListener('resize', layout);
visualViewport?.addEventListener('resize', layout);
addEventListener('orientationchange', layout);
addEventListener('focus', () => { layout(); void enterFullscreen(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { layout(); void enterFullscreen(); } });
document.addEventListener('fullscreenchange', () => { layout(); if (!document.fullscreenElement) void enterFullscreen(); });
frame.addEventListener('load', () => {
  layout();
  try {
    const shellURL = new URL(location.href);
    shellURL.searchParams.set('page', frame.contentWindow.location.href);
    history.replaceState(null, '', shellURL);
    frame.contentDocument.addEventListener('click', enterFullscreen, { passive: true });
    frame.contentDocument.addEventListener('keydown', enterFullscreen, { capture: true });
  } catch { /* The only supported child pages are local, same-origin pages. */ }
});

const requested = new URLSearchParams(location.search).get('page');
let page = new URL('landing/', root);
if (requested) {
  try {
    const candidate = new URL(requested, root);
    const allowed = ['landing/', 'landing/index.html', 'game/', 'game/index.html'];
    if (candidate.protocol === root.protocol && candidate.host === root.host &&
        allowed.some(path => candidate.pathname === new URL(path, root).pathname)) page = candidate;
  } catch { /* Invalid destinations return to the landing page. */ }
}
layout();
frame.src = page.href;
