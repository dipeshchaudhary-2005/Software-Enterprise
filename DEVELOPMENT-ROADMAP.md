# Banana Breakout — Development Roadmap

Use this note to plan each development session and keep the project moving toward the assignment demo. Treat each “day” as a work session; it is fine to spread a step over multiple days.

## Project goal

Build a web-based Breakout-style game with a paddle, bouncing ball, banana blocks, score, lives, and levels. Use the Banana API as a bonus puzzle feature. Add PHP, MySQL, player accounts, saved scores, and a leaderboard after the core game works.

The current API demo is a starting point. The API returns both a puzzle image and its solution, so use it as a bonus/demo feature rather than as secure score validation.

## Suggested folder structure

```text
Banana Breakout/
├── Frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── assets/                 # Images and sounds, if needed
├── Backend/
│   ├── api/                    # PHP endpoints: login, scores, leaderboard
│   ├── config/                 # Database connection; no real credentials in Git
│   └── database/
│       └── schema.sql
├── Middleware/                 # Optional; leave unused unless it is needed
├── README.md
└── DEVELOPMENT-ROADMAP.md
```

Git does not track empty folders. Add a real project file when you start using a folder. The browser can call the Banana API directly for this demo; add a PHP proxy only if you discover a specific need.

## Session-by-session plan

| Session | Work | Suggested commit |
|---|---|---|
| 1 | Document the goal, controls, and run instructions. Sketch the game screen and check the starter project. | `Document project setup` |
| 2 | Build the home screen and game-board layout: start button, score, lives, and game area. | `Build game screen layout` |
| 3 | Add the paddle and keyboard controls. Test moving left and right. | `Add paddle controls` |
| 4 | Add the ball, movement, and wall and paddle bounces. | `Add ball movement and bouncing` |
| 5 | Add banana blocks, collision detection, scoring, and lives. Test hitting blocks and missing the ball. | `Add block collisions and lives` |
| 6 | Add game-over and level-complete states. Add another level if the core game is stable. | `Add game states and levels` |
| 7 | Integrate the Banana API as a bonus puzzle. Test puzzle and image loading and handle service failures. | `Add Banana API bonus challenge` |
| 8 | Create the MySQL schema and PHP database connection. Keep real credentials out of Git. | `Add player and score schema` |
| 9 | Add registration and login using PHP sessions and hashed passwords. Save and display player scores. | `Add player accounts and scores` |
| 10 | Add the leaderboard, test the complete game, fix issues, and document the setup and demo. | `Add leaderboard and document demo` |

Prioritize a playable core game and testing before optional power-ups or extra levels. Leave time to prepare the tutor demonstration before Week 8, as specified in the project plan.

## GitHub workflow for each feature

Start each feature from the latest `main` branch:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/game-board
```

Use a descriptive branch name for the feature, such as `feature/paddle-controls`, `feature/banana-api`, or `feature/login`.

After implementing and testing the feature, review and push it:

```powershell
git status
git add Frontend/index.html Frontend/styles.css Frontend/app.js
git commit -m "Build game screen layout"
git push -u origin feature/game-board
```

For backend work, stage only the files you intend to commit, for example:

```powershell
git add Backend/api Backend/database
```

Open a Pull Request on GitHub from the feature branch into `main`. Review the changes and merge when the feature works. For the next feature, start a new branch from the updated `main`. After the first push of a branch, use `git push` for later updates to that branch.

Before ending a work session:

```powershell
git status
git push
```

Make focused commits that describe what changed. Do not commit passwords, API secrets, or personal database credentials. If you have not pushed a branch yet, use the first-push command above with `-u origin <branch-name>`.

## Test checklist

- The game loads without console errors.
- The paddle moves left and right and stays inside the board.
- The ball bounces off walls and the paddle.
- Hitting a banana removes it and increases the score.
- Missing the ball removes a life; zero lives shows Game Over.
- Clearing a level advances the game.
- The API puzzle and image load; an API failure gives a useful message.
- Valid login works; invalid login shows an error.
- Passwords are stored as hashes, not plain text.
- A completed score is saved and appears in the leaderboard.

## API terms reminder

The Banana API is provided “as is,” may be discontinued without notice, and must not be used for commercial applications. See the [API documentation](https://marcconrad.com/uob/banana/).
