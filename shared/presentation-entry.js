// Run synchronously in the head, before any player-facing page paints.
// A persistent top-level document owns fullscreen; the child viewport always
// has landscape dimensions, including when the physical phone is upright.
if (window === window.top) {
  document.documentElement.style.visibility = 'hidden';
  const shell = new URL('../presentation.html', document.currentScript.src);
  shell.searchParams.set('page', location.href);
  location.replace(shell.href);
}
