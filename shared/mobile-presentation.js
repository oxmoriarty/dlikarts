function isMobileLayout() {
  return matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
}

/**
 * Browsers only permit fullscreen and orientation requests from a real user
 * gesture. This keeps the first interaction lightweight, then uses that
 * gesture to enter the best available immersive landscape presentation.
 */
export async function requestMobilePresentation() {
  if (!isMobileLayout()) return false;

  const target = document.documentElement;
  const requestFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
  try {
    if (!document.fullscreenElement && requestFullscreen) await requestFullscreen.call(target);
  } catch { /* Some mobile browsers reserve fullscreen for installed apps. */ }

  try {
    await screen.orientation?.lock?.('landscape');
  } catch { /* iOS and some browsers do not expose orientation locking. */ }

  return Boolean(document.fullscreenElement);
}

export function prepareMobilePresentation() {
  if (!isMobileLayout()) return;
  const activate = () => { void requestMobilePresentation(); };
  window.addEventListener('pointerdown', activate, { capture: true, once: true });
  window.addEventListener('keydown', activate, { capture: true, once: true });
}
