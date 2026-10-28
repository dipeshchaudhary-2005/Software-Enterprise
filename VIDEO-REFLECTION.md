# Banana Breakout: video reflection and source material

## Reflection on the four themes

### Version control

The project is stored in Git, so the implementation and its documentation can be reviewed as a sequence of changes rather than as one untraceable final copy. The development roadmap describes using a separate feature branch for each task, making focused commits, and reviewing changes through pull requests. This makes it easier to identify when a behavior changed, discuss work with collaborators, and restore an earlier version if a change breaks the game.

Version control also has limits: it tracks files, not the player accounts and scores saved in a browser's local storage. Those records are tied to the browser and are not backed up or shared by Git. The roadmap is a workflow guide, not proof that every suggested branch, pull request, or review step was used for every change.

### Interoperability

The app brings together browser technologies and an external puzzle service. The HTML page loads JavaScript ES modules, which use standard browser APIs such as the DOM, canvas, `fetch`, `localStorage`, `sessionStorage`, and Web Crypto. Arcade physics run in the browser, while the Banana API returns JSON containing a puzzle image URL in `question` and a single-digit `solution`; the puzzle module validates that shape before showing the image. A small Node.js HTTP server in `Backend/` serves the page and modules from `Frontend/public/`, allowing the browser to load ES modules from `localhost`.

This integration depends on the external API and a network connection. If the service or image is unavailable, the game reports the problem and allows a retry. The API's solution is also sent to the browser, so it is suitable as a demonstration puzzle, not as secure score verification. Since account and score data are stored locally, two browsers do not share a common leaderboard.

### Event-driven programming

The interface responds to user and system events rather than running through one fixed sequence. Form submissions handle login, registration, guest sign-in, and puzzle answers. Button clicks switch between the player dashboard, arcade and puzzle modes, open leaderboards and the admin dashboard, change the theme, and log out. In the arcade, keyboard and pointer events control the paddle while animation-frame callbacks advance ball movement and collision checks. In same-device friend mode, either player's correct answer advances the shared puzzle. The puzzle game also reacts asynchronously to API responses and image-load events, and uses a timer interval to update the countdown.

Separating these handlers into modules keeps responsibilities clearer: `main.js` coordinates the application, `auth-ui.js` and the form modules handle account interactions, `arcade.js` handles canvas rendering and input, `breakout-engine.mjs` owns arcade physics, and `game.js` owns puzzle and timer behavior. The puzzle game assigns each request an ID so that an older, slower API response cannot overwrite a newer game state. Event-driven code makes the page responsive, but it also means that loading, timeout, answer, and navigation states must be coordinated carefully.

### Virtual identity

Players can use a registered account, a named guest identity, or the built-in demo administrator. Each identity gets a different interface and capabilities: users can play and view the leaderboard, guests can play under a chosen name, and the admin can view and remove locally stored players. Users and guests can play arcade and puzzle modes or share a same-device puzzle race; it is not online multiplayer. Registered accounts are stored in `localStorage`, the active session in `sessionStorage`, and guest identities have generated IDs so that guests with the same display name can still be managed separately.

These identities are only browser-level demonstrations, not verified real-world identities. Data can be edited or deleted by the browser user, it does not follow a player to another device, and the admin credentials and role checks are visible in client-side code. Hashing a password in the browser does not turn this design into secure authentication. A production service would need server-side account storage, password hashing and verification, authorization, and shared score storage.

## Additional material and complete source code

The complete source code for the working implementation is included in this repository. The frontend is under [`Frontend/public/`](Frontend/public/), with these files:

- [`Backend/server.js`](Backend/server.js) — dependency-free local HTTP server.
- [`Middleware/read-only.js`](Middleware/read-only.js) — rejects unsupported write requests.
- [`Frontend/public/index.html`](Frontend/public/index.html) — page structure, forms, game views, and dashboards.
- [`Frontend/public/styles.css`](Frontend/public/styles.css) — layout and light/dark theme styles.
- [`Frontend/public/js/main.js`](Frontend/public/js/main.js) — application startup, session views, and module coordination.
- [`Frontend/public/js/authentication.js`](Frontend/public/js/authentication.js) — demo account, guest, session, and browser-storage functions.
- [`Frontend/public/js/auth-ui.js`](Frontend/public/js/auth-ui.js) — authentication screen and guest/logout event handlers.
- [`Frontend/public/js/login.js`](Frontend/public/js/login.js) — login form handling.
- [`Frontend/public/js/registration.js`](Frontend/public/js/registration.js) — account registration form handling.
- [`Frontend/public/js/arcade.js`](Frontend/public/js/arcade.js) — canvas rendering, keyboard/pointer controls, game loop, and arcade UI states.
- [`Frontend/public/js/breakout-engine.mjs`](Frontend/public/js/breakout-engine.mjs) — Breakout state, paddle/ball physics, collisions, lives, scoring, and level progression.
- [`Frontend/public/js/game.js`](Frontend/public/js/game.js) — puzzle API integration, modes, timer, and answer handling.
- [`Frontend/public/js/leaderboard.js`](Frontend/public/js/leaderboard.js) — score storage and leaderboard rendering.
- [`Frontend/public/js/admin-users.js`](Frontend/public/js/admin-users.js) — admin user and guest management.
- [`Frontend/public/js/theme.js`](Frontend/public/js/theme.js) — theme selection and persistence.
- [`Tests/backend/server.test.js`](Tests/backend/server.test.js) — static-server and rejected-POST tests.
- [`Tests/frontend/breakout-engine.test.mjs`](Tests/frontend/breakout-engine.test.mjs) — focused tests for paddle bounds, ball collisions, scoring, lives, and levels.

No separate build step or package installation is required; Node.js is needed to run the included server. From the repository root, run:

```powershell
node Backend/server.js
```

Then open <http://127.0.0.1:4173>. Arcade Breakout works without the external service; puzzle modes need an internet connection to retrieve Banana API data. The demo administrator can sign in with `admin@bananabreakout.demo` and `banana-admin-demo`. This demo credential is intentionally public and must not be used as a real account.

The backend currently serves static assets only; it has no server-side account, score, or multiplayer service, and POST API requests are not implemented. See [`README.md`](README.md) for the run instructions, demo limitations, and feature overview.

## Attribution and dependencies

The puzzle service is the University of Brighton Banana API: <https://marcconrad.com/uob/banana/api.php>. Its documentation and terms are at <https://marcconrad.com/uob/banana/>. The API supplies puzzle data; it is not source code included in this repository, and its availability and terms are controlled by its provider.

GitHub Copilot (AI assistance) was used to prepare this reflection and source-material documentation and to generate the initial arcade engine, canvas interface, and focused engine tests in this version. The AI-assisted code is marked at the top of the new arcade modules and test file. The existing code was present in the project before this change; its prior provenance cannot be established from the repository alone. Before submission, the student should review and understand the implementation, confirm the provenance of any earlier code, and accurately disclose any further external or AI assistance.
