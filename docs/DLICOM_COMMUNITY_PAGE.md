# Dlicom community page

The landing menu DLICOM button opens an in-page community panel, preserving the existing presentation shell, menu music, fullscreen session and close/back flow. No game systems were changed.

Ten social accounts use the exact user-supplied URLs: X, Telegram, Discord, YouTube, LinkedIn, TikTok, Instagram, Reddit, Facebook and Medium. App Store and Google Play download links and a whitepaper link are included. Google Play intentionally retains the supplied search URL rather than inventing a direct listing. HTTPS account URLs let the operating system decide whether to open a platform app or browser; native-app opening cannot be guaranteed.

Icons are local, unmodified Simple Icons v11 SVGs. See assets/ui/socials/LICENSES.md for CC0 source documentation and trademark caveat. No runtime CDN dependency.

The centered 80%-width layout uses the existing game fonts, blue background and aqua accents. Five-column social icons have names below, with two store buttons underneath. Compact screens omit the decorative introduction but retain all links. Existing fit-content scales the complete panel when necessary. Keyboard focus indicators and descriptive link names are provided. External destinations open separately with noopener/noreferrer.

Validation: menu-to-panel navigation, all 13 link targets, SVG loading, close-to-menu behavior, and viewport bounds/no-scroll checks on desktop and mobile landscape. Third-party account availability or native-app deep-link behavior is not guaranteed by these tests.
