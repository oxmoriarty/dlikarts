# Landscape and single-screen presentation

## Implementation

- `presentation.html` owns a persistent fullscreen container. Landing and game navigation occurs inside its same-origin iframe, preserving the fullscreen owner rather than navigating it away.
- A synchronous entry script redirects direct landing/game links before their content paints.
- The iframe always has landscape dimensions. Upright screens rotate that landscape viewport 90 degrees. This does not depend on browser orientation-lock support.
- Very short screens scale a minimum 640 × 360 landscape canvas to the available area; desktop viewports retain their normal resolution.
- Menus, loading content, racer selection, ready content, in-race settings, and results are measured and scaled as complete groups. Existing document overflow restrictions remain in effect.
- Fullscreen/orientation requests are retried after interaction, visibility return, focus return, and fullscreen loss. Navigation, pause and settings do not intentionally exit fullscreen.
- Menu and race UI no longer waits for audio-context initialization. Race exit returns directly to the menu without another splash.

## Validation

- Browser viewport checks: 390 × 844 upright, 320 × 568 upright, 844 × 390 landscape, 1280 × 720 desktop.
- Confirmed child landscape dimensions, content bounds inside the viewport, and document scroll dimensions equal the viewport for settings, racer selection, ready and race settings.
- Confirmed menu → racer selection → ready → countdown/race navigation remains inside the same outer document.
- Race settings paused the race clock at 0:37.57 during viewport rotation. Closing settings resumed the existing race at 0:37.67 and subsequent times.
- Existing 12 gameplay logic and 3 audio tests passed. JavaScript syntax checks and `git diff --check` passed.

## Browser limitations / remaining device checks

Native fullscreen requires browser permission and typically a real user gesture. A browser or operating system can remove fullscreen on app switching; script cannot guarantee restoration without another gesture. Installed-web-app manifest requests fullscreen and landscape where supported, but platform support differs. Landscape visual rendering remains independent of native fullscreen.

The in-app test browser does not provide a reliable native-fullscreen lifecycle test and showed inconsistent screenshots after fullscreen requests. Actual Android Chrome and iOS Safari/PWA app-switching and touch-coordinate behavior on the rotated viewport still require physical-device testing. No universal native-fullscreen guarantee is claimed.
