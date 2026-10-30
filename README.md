# BananaBrain 🍌

A browser-based math puzzle game built for CIS046-3 Software For Enterprise.

Built with: **HTML5 · CSS3 · Vanilla JavaScript · PHP 8**

---

## How to Run

1. Make sure **PHP** is installed (php.net/downloads)
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

The admin account is bootstrapped from private server environment variables. In PowerShell, set a unique username and a long password (at least 12 characters) before starting PHP:

```powershell
$env:BB_ADMIN_USERNAME = "your_admin_name"
$env:BB_ADMIN_PASSWORD = "use-a-long-unique-password"
.\start-server.bat
```

The account is created automatically on the first API request. Keep these values private; there is no public admin signup or role toggle. If the configured username already exists, its password must match the configured password before it receives admin access.

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
│   │   ├── profile.php     # Registered-user profile and avatar operations
│   │   ├── leaderboard.php # Score saving and statistics
│   │   └── admin.php       # Admin-only account and score overview
│   └── data/               # Private storage, created automatically by PHP
│       ├── users.json      # User accounts and password hashes
│       ├── sessions.json   # Active login sessions
│       ├── scores.json     # Saved scores
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
- **Players:** Single-player or alternating two-player turns on the same device. Each friend has separate lives, streaks, and score for the round.
- **Guest:** Enter a display name to play without registering. Guest sessions and scores stay in the current browser session and are not submitted to the leaderboard.
- **Profile:** Registered users can edit their display name and upload a JPEG, PNG, or WebP profile picture (up to 256 KB). Login usernames remain fixed; guest profiles are not editable.
- **Appearance:** Use the theme button to switch between dark and light mode; the choice is saved in the browser.
- **Admin dashboard:** Shows registered accounts and score summaries. The PHP API checks the server-side admin account configuration before returning this data.

## Four Themes Addressed

### 1. Version Control
- Code is organised into separate modules (`auth.js`, `game.js`, `leaderboard.js`, `app.js` on the frontend; `auth.php`, `banana.php`, `leaderboard.php`, `helpers.php` on the backend)
- Each module has a **single responsibility** — this is analogous to components in a version-controlled repository
- Git branches were used during development: `main`, `dev`, `feature/auth`, `feature/game`, `feature/leaderboard`

### 2. Event-Driven Programming
Events used in this project:
| Event | Source | Handler |
|---|---|---|
| `DOMContentLoaded` | Browser | `checkExistingSession()` |
| `submit` (form) | Login/Register form | `handleLogin()`, `handleRegister()` |
| `keydown` (Enter) | Document | `submitAnswer()` |
| `input` | Answer field | Digit sanitiser |
| `setInterval` tick | Timer | `onTimerTick()` |
| `img.onload` | Puzzle image | `onPuzzleImageLoaded()` |
| `img.onerror` | Puzzle image | `onPuzzleImageError()` |
| `requestAnimationFrame` | Browser | Confetti animation loop |
| `click` | All buttons | Various handlers |
| `resize` | Window | Canvas resize |
| `keydown` (Escape) | Document | `closeModal()` |

### 3. Interoperability
```
[Browser JS]
     │  fetch() — HTTPS/HTTP GET — JSON
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

**Protocols used:** HTTPS · JSON · cURL · Fetch API
**External API:** Banana API by Marc Conrad — https://marcconrad.com/uob/banana/doc.php

The PHP proxy requests the API's base64 image response and returns it as an image data URI, avoiding broken or inaccessible third-party image-host URLs. When PHP is unavailable (for example, in a static preview), the browser tries the official HTTPS API directly.

### 4. Virtual Identity
- **Registration:** Username + BCRYPT-hashed password stored in `backend/data/users.json`
- **Login:** `password_verify()` checks the submitted password against the stored hash
- **Session token:** Generated using `random_bytes(32)` (64-char hex, 512-bit entropy)
- **Client storage:** Token stored in `localStorage` (analogous to a persistent cookie)
- **Authenticated requests:** Token sent in `X-Session-Token` HTTP header
- **Logout:** Token removed from both `localStorage` (client) and `sessions.json` (server)
- **Session expiry:** 24-hour TTL enforced server-side

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

All AI-generated code (generated with assistance from an AI coding assistant) is clearly marked with comments in each file.

---

## Academic Declaration

This project was produced for CIS046-3 Software For Enterprise at the University of Bedfordshire.

- The Banana API is provided by Marc Conrad (University of Bedfordshire)
- PHP, JavaScript, HTML and CSS examples from MDN Web Docs were referenced
- Code structure assistance provided by AI coding tools (as permitted by the assignment brief)
- All external sources are referenced in comments within the source code
