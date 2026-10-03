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

async function requestLandscapeLock() {
  if (!isMobileLayout()) return;
  try {
    await screen.orientation?.lock?.('landscape');
  } catch { /* Browser tabs commonly require fullscreen or an installed PWA. */ }
}

export function prepareMobilePresentation() {
  if (!isMobileLayout()) return;
  // Installed PWAs honour the manifest orientation at launch. Browsers that
  // expose locking outside fullscreen can do the same immediately; all other
  // browsers retry as soon as the player performs their first valid gesture.
  void requestLandscapeLock();
  const activate = () => { void requestMobilePresentation(); };
  window.addEventListener('pointerdown', activate, { capture: true, once: true });
  window.addEventListener('keydown', activate, { capture: true, once: true });
  window.addEventListener('orientationchange', requestLandscapeLock);
}
