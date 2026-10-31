# BananaBrain 🍌

A browser-based math puzzle game built for CIS046-3 Software For Enterprise.

Built with: **HTML5 · CSS3 · Vanilla JavaScript · PHP 8**

---

## How to Run

1. Install **PHP 8 or later** with the cURL extension enabled. The browser also needs an internet connection to retrieve puzzles from the external Banana API.
2. Double-click **`start-server.bat`**. It starts the PHP server and opens the game in your browser automatically. If you prefer to run the server yourself:
   ```
   php -S localhost:8000 backend/router.php
   ```
3. Open your browser and visit: **http://localhost:8000**

### Where things go

- **`frontend/`** contains everything that makes up the part you see and use in your browser: the page, styles, and game scripts.
- **`backend/`** contains the PHP server, API endpoints, and private player data. The backend handles accounts, scores, profiles, and puzzle requests.
- **`README.md`**, **`start-server.bat`**, and **`.gitignore`** stay at the project root. The launcher starts PHP using the backend router, which connects the frontend to the backend.

### Admin account setup

There is no default admin account. The admin account is bootstrapped from server environment variables. In PowerShell, choose a unique username and a strong password of at least 8 characters before starting PHP:

```powershell
$env:BB_ADMIN_USERNAME = "your_admin_name"
$env:BB_ADMIN_PASSWORD = "use-a-long-unique-password"
.\start-server.bat
```

The account is created automatically on the first API request. Keep these values private and do not commit them. There is no public admin signup or role toggle. If the configured username already exists, its password must match the configured password before it receives admin access. Administrators can use the dashboard but cannot play or submit scores.

---

## Project Structure

```
Banana Api/
├── frontend/               # Browser interface (what players see and use)
│   ├── index.html          # Main game page
│   ├── css/
│   │   └── style.css       # Colors, layout, and themes
│   └── js/
│       ├── auth.js         # Login, registration, and sessions
│       ├── profile.js      # Player profile and avatar
│       ├── game.js         # Game rules, timer, and puzzle display
│       ├── leaderboard.js  # Scores and player statistics
│       ├── admin.js        # Admin dashboard interface
│       └── app.js          # Page navigation and shared UI
│
├── backend/                # Server functionality (runs with PHP)
│   ├── router.php          # Connects browser pages/assets to PHP API; protects private data
│   ├── api/
│   │   ├── helpers.php     # Shared utilities: JSON storage and sessions
│   │   ├── auth.php        # Registration, login, logout, and session checks
│   │   ├── banana.php      # Puzzle API proxy and validation
│   │   ├── guests.php      # Records names and completed games for guest players
│   │   ├── profile.php     # Registered-user profile and avatar operations
│   │   ├── leaderboard.php # Score saving and statistics
│   │   └── admin.php       # Admin-only account and score overview
│   └── data/               # Private storage, created automatically by PHP
│       ├── users.json      # User accounts and password hashes
│       ├── sessions.json   # Active login sessions
│       ├── scores.json     # Saved scores
│       ├── guests.json     # Guest player names and completed game counts
│       ├── avatars/        # Uploaded profile pictures
│       └── .htaccess       # Additional protection for Apache hosting
│
├── start-server.bat        # One-click PHP server launcher
├── README.md               # Project guide
└── .gitignore              # Files Git should not save
```

---

## Game modes

- **Difficulty:** Choose Easy (30 seconds per puzzle), Medium (45 seconds), or Hard (60 seconds) after selecting Play. You can also change difficulty during a puzzle; the timer resets to the new level's full duration. The countdown begins after the puzzle image loads; a timeout shows the answer and advances to the next puzzle.
- **Players:** Registered players can choose single-player or alternating two-player turns on the same device. Each player has separate lives, streaks, and score for the round. Guests are restricted to single-player.
- **Guest:** Enter a display name to play without registering. Guest scores are not submitted to the leaderboard. After a round completes, guest names and completed-game counts appear separately in the admin dashboard; friend-mode participants are recorded there as guests too.
- **Profile:** Registered users can edit their display name and upload a JPEG, PNG, or WebP profile picture (up to 256 KB). Login usernames remain fixed; guest profiles are not editable.
- **Appearance:** Use the theme button to switch between dark and light mode; the choice is saved in the browser.
- **Admin dashboard:** Shows registered players who have completed a game, guest/test player names and game counts, and score summaries. Accounts with no completed games are omitted from the player list. Guest logins are shown as "Guest (no login)." Dashboard data and score/puzzle restrictions are enforced by the PHP API.

## Four Themes Addressed

### 1. Version Control
- Code is organised into separate modules (`auth.js`, `game.js`, `leaderboard.js`, `app.js` on the frontend; `auth.php`, `banana.php`, `leaderboard.php`, `helpers.php` on the backend)
- Each module has a **single responsibility** — this is analogous to components in a version-controlled repository
- The repository has `main` and `feature/play-with-friend` branches. The feature branch contains the same-device alternating two-player mode; guests are restricted to single-player.

### 2. Event-Driven Programming
Events used in this project:
| Event | Source | Handler |
|---|---|---|
| `DOMContentLoaded` | Browser | `checkExistingSession()` |
| `submit` (form) | Login/Register form | `handleLogin()`, `handleRegister()` |
| `keydown` (Enter) | Document | `submitAnswer()` |
| `input` | Answer field | Digit sanitiser |
| `change` | Player mode/difficulty selectors | Friend-name visibility and difficulty update |
| `setInterval` tick | Timer | `onTimerTick()` |
| `setTimeout` | Feedback and image retry | Continue round or retry puzzle |
| `img.onload` | Puzzle image | `onPuzzleImageLoaded()` |
| `img.onerror` | Puzzle image | `onPuzzleImageError()` |
| `requestAnimationFrame` | Browser | Confetti animation loop |
| `click` | All buttons | Various handlers |
| `resize` | Window | Canvas resize |
| `keydown` (Escape) | Document | `closeModal()` |

### 3. Interoperability
```
[Browser JS]
     │  Fetch API — HTTP GET — JSON
     ▼
[backend/api/banana.php]  ←── Server-side proxy and validation
     │  cURL — HTTPS GET
     ▼
[Banana API]  (https://marcconrad.com/uob/banana/)
     │  JSON: { question: "<base64 image>", solution: <int> }
     ▼
[backend/api/banana.php]  ←── Parses and validates response
     │  JSON response
     ▼
[Browser JS]  ←── Renders puzzle image + stores solution
```

**Protocols used:** HTTP between the local browser and PHP server; HTTPS from PHP to the external API; JSON for API messages; cURL and Fetch API as HTTP clients.
**External API:** Banana API by Marc Conrad — https://marcconrad.com/uob/banana/doc.php

The PHP proxy requests the API's base64 image response and returns it as an image data URI, avoiding broken or inaccessible third-party image-host URLs. When PHP is unavailable (for example, in a static preview), the browser tries the official HTTPS API directly.

### 4. Virtual Identity
- **Registration:** Username + BCRYPT-hashed password stored in `backend/data/users.json`
- **Login:** `password_verify()` checks the submitted password against the stored hash
- **Session token:** Generated using `random_bytes(32)` (64-character hex representation of 256 bits of random data)
- **Client storage:** Token stored in `localStorage` (analogous to a persistent cookie)
- **Authenticated requests:** Token sent in `X-Session-Token` HTTP header
- **Logout:** Token removed from both `localStorage` (client) and `sessions.json` (server)
- **Session expiry:** 24-hour TTL enforced server-side
- **Guest identity:** Display name stored in browser `sessionStorage`; guests do not receive an account or leaderboard score.
- **Admin identity:** Provisioned from private server environment variables; the API verifies the admin role for dashboard access.

The prototype uses JSON files rather than a database. Session tokens are stored in browser `localStorage`, not in cookies; a production deployment should use HTTPS and review its session-storage and deployment security.

---

## External Resources & References

| Source | Used For | Reference in Code |
|---|---|---|
| Banana API by Marc Conrad | Puzzle images and solutions | `backend/api/banana.php`, `frontend/js/game.js` |
| PHP password_hash docs | BCRYPT password hashing | `backend/api/auth.php` |
| PHP random_bytes docs | Secure session token generation | `backend/api/helpers.php` |
| Google Fonts — Outfit | Typography | `frontend/index.html` |
| OWASP Authentication Cheat Sheet | Security practices | `backend/api/auth.php` (comment) |
| MDN Web Docs — Fetch API | HTTP requests from JavaScript | `frontend/js/auth.js`, `frontend/js/game.js`, `frontend/js/leaderboard.js` |

---

## Academic Declaration

This project was produced for CIS046-3 Software For Enterprise at the University of Bedfordshire.

- The Banana API is provided by Marc Conrad (University of Bedfordshire)
- PHP, JavaScript, HTML and CSS examples from MDN Web Docs were referenced
- AI coding tools were used for code-structure assistance, as permitted by the assignment brief; disclose tool use in the format required by the module.
- All external sources are referenced in comments within the source code
