// Fit the complete menu content as one group. Measuring its natural height
// avoids merely hiding overflowing settings or cards behind a scrollbar.
let pendingFit = false;
function fitScreens() {
  pendingFit = false;
  document.querySelectorAll('.panel-frame, .ready-frame, .splash-content, .race-settings-card, .results-frame').forEach(frame => {
    if (!frame.getClientRects().length) return;
    frame.style.setProperty('height', 'auto', 'important');
    frame.style.setProperty('max-height', 'none', 'important');
    frame.style.setProperty('overflow', 'visible', 'important');
    frame.style.transform = 'none';
    const height = Math.max(frame.scrollHeight, frame.offsetHeight);
    const width = Math.max(frame.scrollWidth, frame.offsetWidth);
    const scale = Math.min(1, innerHeight * .80 / Math.max(1, height), innerWidth * .88 / Math.max(1, width));
    frame.style.transformOrigin = 'center';
    frame.style.transform = `scale(${scale})`;
  });
}
function scheduleFit() {
  if (pendingFit) return;
  pendingFit = true;
  requestAnimationFrame(fitScreens);
}
addEventListener('resize', scheduleFit);
addEventListener('load', scheduleFit);
document.fonts?.ready.then(scheduleFit);
const observer = new MutationObserver(scheduleFit);
document.querySelectorAll('.panel, .splash, #start, #race-settings-panel, #results').forEach(screen => {
  observer.observe(screen, { attributes: true, attributeFilter: ['hidden', 'class'] });
});
scheduleFit();
