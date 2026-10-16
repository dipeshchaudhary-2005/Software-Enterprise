# Software-Enterprise

A simple browser-based Banana Breakout demo game powered by the [Banana Game API](https://marcconrad.com/uob/banana/api.php).

See the [development roadmap](./DEVELOPMENT-ROADMAP.md) for the session-by-session plan, folder layout, GitHub workflow, and test checklist.

## Frontend structure

Frontend behavior is organized into ES modules under `Frontend/js/`: `main.js` coordinates the page, `authentication.js` manages demo account/session storage, `auth-ui.js` wires the auth screens, `login.js` and `registration.js` handle their respective forms, `game.js` owns the puzzle and timer, `leaderboard.js` renders and saves scores, and `theme.js` handles color mode.

## Run the game

From the repository root, start the included local server:

```powershell
node Frontend/server.js
```

Then open `http://127.0.0.1:4173` in your browser. Keep the server terminal open while playing. JavaScript ES modules do not load when the HTML is opened directly as a `file://` URL; in that case the app cannot request or display puzzles. The game fetches one puzzle at a time from the API, displays its image, and checks the submitted digit.

The API is provided "as is", may be discontinued without notice, and must not be used for commercial applications. See the [API documentation](https://marcconrad.com/uob/banana/).

Use the header's **Dark mode / Light mode** button to switch color themes. Your choice is saved in this browser.

## Demo roles, login, and leaderboard

The game has three browser-demo roles:

- **Guest:** enter a name to play without registering. The guest name and best score are saved in this browser, appear on the leaderboard, and can be managed by the admin.
- **User:** register with a name, email, and password of at least 8 characters, or log in later. Accounts and each user's best score are saved in this browser; passwords are stored as SHA-256 hashes. The user game page shows the top 10 players by best score and updates after a correct answer.
- **Admin:** sign in with the built-in demo account below to open the dashboard, see the top 10 players' best scores, and manage registered users and named guests. Deleting a player removes their account/name and saved score from this browser.

Demo admin login:

- Email: `admin@bananabreakout.demo`
- Password: `banana-admin-demo`

This is for demonstration only, not production authentication: the admin credentials and role checks are visible in client-side code, browser data is local to this browser, and client-side checks can be bypassed. For production use, move account storage, password verification, authorization, and leaderboard data to a secure backend.

## Puzzle modes and Banana API

After signing in or continuing as a guest, choose a difficulty. The countdown displays minutes and seconds: Easy gives 0:30 per puzzle, Medium gives 0:50, and Hard gives 2:00. The timer starts after the API response and puzzle image have loaded. When it reaches 0:00, the game says **Time's up!** and enables **Try next question**; the next puzzle only loads when you click it.

The game reads `question` as the puzzle image URL and `solution` as the single-digit answer from the Banana API response. If the API request or image fails, the game shows an error and lets you retry with **Try next question**. Play through the local server above to ensure both the modules and API requests are allowed by the browser.
