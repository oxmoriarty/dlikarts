# Page flow and ready/results presentation

- Ready screen uses the selected racer's existing player-card PNG through `racerCard()`. No duplicate artwork or AI cutout is downloaded. Soft edge masks and the existing blue/cyan typography blend the intact image into a responsive two-column composition.
- Ready screen Back returns directly to the racer picker, carrying the selected racer in the URL. Returning picker routes render before optional module imports complete, with no introductory loading screen.
- Existing close/back controls on racer selection, settings, instructions and Dlicom panels are preserved. Race settings still close in place and resume the race; pause still offers Resume, and the race exit still returns to the menu. The root landing page has no predecessor on a fresh visit, and the brief loading animation remains a transition rather than a navigable destination.
- The asset garage now has a Back control: use same-origin browser history when available, otherwise return to the menu.
- Results offers Play Again (reload the current race/character), Choose Racer (open the picker directly with current selection), and Exit (return directly to the menu).
- No physics, AI, track, power-up or race-rule changes.

Validation includes desktop 1366 × 768 and landscape mobile 844 × 390 ready-screen screenshots and measured bounds inside the screen. Browser flow tests use their own static server because the separate preview server was intermittently unavailable. The results UI test uses the production UI with a completed-race fixture, not a full race simulation. Selection tests and syntax/whitespace checks accompany this change.

Frontend-design guidance was used to retain Dlicom's established color/typographic language while emphasizing the selected racer, restrained edge blending, and clearly separated post-race choices. Physical-device testing is still recommended for browser-specific rendering and touch ergonomics.
