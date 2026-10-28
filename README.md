# Software-Enterprise

A browser-based Banana Breakout game with an arcade mode and puzzle challenges powered by the [Banana Game API](https://marcconrad.com/uob/banana/api.php).

See the [development roadmap](./DEVELOPMENT-ROADMAP.md) for the session-by-session plan, folder layout, GitHub workflow, and test checklist.

See [VIDEO-REFLECTION.md](./VIDEO-REFLECTION.md) for the reflection on version control, interoperability, event-driven programming, and virtual identity, along with the complete source-code inventory and attribution notes.

## Project structure

```text
Software-Enterprise/
├── Backend/
│   └── server.js               # Local Node.js server for frontend assets
├── Frontend/
│   └── public/
│       ├── index.html          # Page markup and module entry point
│       ├── styles.css          # Layout and visual styles
│       └── js/
│           ├── main.js         # Starts the app and coordinates page views
│           ├── arcade.js       # Canvas Breakout controls, rendering, and game states
│           ├── breakout-engine.mjs # Testable paddle, ball, collision, and level rules
│           ├── authentication.js # Demo accounts, guests, sessions, browser storage
│           ├── auth-ui.js      # Login, registration, guest, and logout UI events
│           ├── login.js        # Login form behavior
│           ├── registration.js # Registration form behavior
│           ├── game.js         # Banana API puzzles, answers, and timer
│           ├── leaderboard.js  # Save scores and render leaderboards
│           ├── admin-users.js  # Admin actions for users and guests
│           └── theme.js        # Light/dark color-mode toggle
├── Middleware/
│   └── read-only.js            # Allows static GET/HEAD requests; rejects writes
├── Tests/
│   ├── backend/server.test.js  # HTTP smoke tests, including POST rejection
│   └── frontend/breakout-engine.test.mjs # Arcade physics and game-state tests
├── README.md
├── DEVELOPMENT-ROADMAP.md
└── VIDEO-REFLECTION.md
```

Keep browser code and static assets in `Frontend/public/`. Put a new page in `index.html`, its appearance in `styles.css`, and its behavior in the closest existing JavaScript module. Keep account and identity storage in `authentication.js`, arcade rendering and input in `arcade.js`, physics in `breakout-engine.mjs`, puzzle and timer behavior in `game.js`, and score presentation/storage in `leaderboard.js`. `main.js` should coordinate modules rather than take over their individual responsibilities.

`Backend/server.js` serves the frontend only. There are no server-side account, score, or Banana API endpoints yet, so POST requests return `405 Method Not Allowed`; the tests explicitly verify that boundary. Accounts and scores stay in this browser. Friend mode is a same-device race, not network multiplayer. Add API handlers and persistence only when implementing server-backed features, under `Backend/api/` and `Backend/database/`, and keep secrets out of Git.

## How the four themes appear in this project

| Theme | What it means here | Main files or project area |
|---|---|---|
| Version control | Git records changes; feature branches, focused commits, and pull requests make work reviewable and recoverable. | Git repository; workflow in `DEVELOPMENT-ROADMAP.md` |
| Interoperability | Browser modules load through the local server; the arcade uses browser canvas and the puzzle mode requests JSON and images from the external Banana API. | `Backend/server.js`, `Frontend/public/index.html`, `Frontend/public/js/arcade.js`, `Frontend/public/js/game.js` |
| Event-driven programming | Forms, keyboard/pointer input, canvas animation frames, API responses, image loads, and timer ticks trigger the app's behavior. | `Frontend/public/js/main.js`, `Frontend/public/js/auth-ui.js`, `Frontend/public/js/arcade.js`, `Frontend/public/js/game.js`, `Frontend/public/js/theme.js` |
| Virtual identity | Guest, registered-user, and demo-admin roles have different names, sessions, and UI capabilities. | `Frontend/public/js/authentication.js`, `Frontend/public/js/auth-ui.js`, `Frontend/public/js/admin-users.js`, `Frontend/public/js/leaderboard.js` |

The four themes are concepts demonstrated by the app; they are not four folders to create. Also, `theme.js` refers only to the visual light/dark color setting, not to the four assignment themes. The reflection in [VIDEO-REFLECTION.md](./VIDEO-REFLECTION.md) explains each theme and its limitations in more detail.

## Run the game

From the repository root, start the included local server:

```powershell
node Backend/server.js
```

Then open `http://127.0.0.1:4173` in your browser. Keep the server terminal open while playing. JavaScript ES modules do not load when the HTML is opened directly as a `file://` URL.

Run the backend and arcade-engine tests with Node.js (no package install required):

```powershell
node --test Tests/backend/server.test.js Tests/frontend/breakout-engine.test.mjs
```

The API is provided "as is", may be discontinued without notice, and must not be used for commercial applications. See the [API documentation](https://marcconrad.com/uob/banana/).

Use the header's **Dark mode / Light mode** button to switch color themes. Your choice is saved in this browser.

## Player dashboard, login, and leaderboard

The game has three browser-demo roles:

- **Guest:** enter a name to play without registering. After entering, the dashboard offers arcade and puzzle modes; the guest name and best score are saved in this browser and can be managed by the admin.
- **User:** register with a name, email, and password of at least 8 characters, or log in later. Accounts and each user's best score are saved in this browser; passwords are stored as SHA-256 hashes. After login, the dashboard offers arcade, puzzle, friend, and leaderboard options.
- **Admin:** sign in with the built-in demo account below to open the dashboard, see the top 10 players' best scores, and manage registered users and named guests. Deleting a player removes their account/name and saved score from this browser.

Demo admin login:

- Email: `admin@bananabreakout.demo`
- Password: `banana-admin-demo`

This is for demonstration only, not production authentication: the admin credentials and role checks are visible in client-side code, browser data is local to this browser, and client-side checks can be bypassed. For production use, move account storage, password verification, authorization, and leaderboard data to a secure backend.

## Puzzle modes and Banana API

From the player dashboard, select **Banana API puzzle** or **Puzzle race with a friend**, then choose a difficulty. Easy gives 0:30 per puzzle, Medium gives 0:50, and Hard gives 2:00. In friend mode, both players share the same screen, puzzle, and timer; enter answers in the separate player fields. The first correct answer wins the round and immediately loads the next puzzle for both players. Friend mode is local same-device play, not a network multiplayer room. When the timer reaches 0:00, either player can start the next shared puzzle. In single-player mode, a timed-out or incorrect answer can be followed by **Try next question**.

The game reads `question` as the puzzle image URL and `solution` as the single-digit answer from the Banana API response. If the API request or image fails, the game shows an error and lets you retry with **Try next question**. Play through the local server above to ensure both the modules and API requests are allowed by the browser.

## Arcade Breakout

Choose **Arcade Breakout** from the player dashboard. Move the paddle with the left/right arrow keys or **A/D**, or move the pointer/touch across the game board. Break the banana blocks to earn 10 points each, keep the ball in play, and clear each level; the game ends after three missed balls. Use **Space** to start or resume, or the on-screen controls to pause, restart, and return to the dashboard. Arcade scores update the player's browser-local best score.

The physics and collision rules live in `Frontend/public/js/breakout-engine.mjs`, separate from canvas rendering and input handling in `Frontend/public/js/arcade.js`.
