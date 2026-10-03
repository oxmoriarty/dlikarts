# Competitive CPU driving

Player handling and the track are unchanged. Each CPU makes independent traffic and item decisions; CPU rivals are valid attack targets.

## Changes

- CPU top speed 22 m/s (79.2 km/h), acceleration 15.5 m/s². Player remains 20 m/s and 13.5 m/s². No teleport-based overtaking or position-based rubberbanding.
- Meter-based, interpolated steering preview and turn-curvature/braking-distance planning replace the large lap-fraction lookahead/slowdown. Steering accounts for actual speed-dependent turning response.
- Six adaptive lane candidates evaluate predicted rival positions and swept lane-change space. Reachable obstacle radius proxies and incoming missile avoidance contribute to lane cost.
- Pickups may attract a lane change when sufficient approach distance exists; traffic avoidance can veto unsafe dives.
- Battle Pod checks predicted straight-line interception and avoids shielded targets. Halo Guard is reserved for an incoming projectile. Zipcap is used on clear straights even by the leader.
- Ready/countdown do not advance CPU stuck timers. Pause continues to freeze the existing simulation.

## Tests

`game/tests/ai-simulation.mjs` uses production track sampling/query/constrain, kart controller, collision resolver and PowerupSystem. Rendering alone is omitted. Run with the Three.js version in the browser import map and the test loader; set `DLICOM_THREE_MODULE` to its local file URL.

120-second simulation: five karts each covered 3.67–3.81 circuits; mean speed 16.60–16.94 m/s; normal maximum 22 m/s, boost maximum 31 m/s. Zero road-edge impacts, off-road frames or recoveries in that run. Fourteen pickups and nine activations (five Zipcap, three Battle Pod, one Halo Guard).

Additional checks cover independent CPU attacks, shield timing, withholding an attack on a shielded rival, boost use while leading, passing-lane selection around a stopped rival, obstacle avoidance and legal three-lap completion with RaceSystem. Existing gameplay/audio regression tests are retained.

Scenery remains outside playable road space; decorative objects are not inventively turned into new obstacles. AI uses simple optional obstacle proxies for reachable gameplay obstacles. These are lightweight tactical drivers, not a guarantee of collision-free behavior in every adversarial situation.

Full RaceSystem simulation: four CPUs finished legally in 93.57–97.23 seconds; unchanged player tuning driven by the smoke-test AI finished in 120.90 seconds. Existing 15 logic/audio regressions passed. Live browser started and loaded Ready, but repeated automation calls timed out before a reliable rendered race inspection. Browser/per-device performance is not certified by the headless tests.
