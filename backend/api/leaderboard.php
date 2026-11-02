<?php
/**
 * leaderboard.php - Score Tracking & Global Leaderboard
 *
 * Manages persistent score storage and leaderboard retrieval.
 *
 * Interoperability:
 *   - Receives HTTP POST/GET requests from the JavaScript frontend
 *   - Responds with JSON data consumed by the browser
 *   - Scores are stored in a flat JSON file (scores.json)
 *
 * Virtual Identity:
 *   - All score submissions are tied to an authenticated session
 *   - Users can view their own score history or the global leaderboard
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/helpers.php';
ensureDataFiles();

// ---- Determine authenticated user from session token ----
$token    = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
$username = validateSession($token);  // null if not logged in

// ---- Route to action handler ----
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'save':
        // Must be authenticated to save a score (Virtual Identity guard)
        if (!$username) {
            http_response_code(401);
            jsonResponse(false, 'Unauthorized. Please log in.');
        }
        if (isAdminUser($username)) {
            http_response_code(403);
            jsonResponse(false, 'Administrators cannot submit game scores.');
        }
        if (isUserBlocked($username)) {
            http_response_code(403);
            jsonResponse(false, 'This account is blocked from playing.');
        }
        handleSaveScore($username);
        break;

    case 'save-friend':
        if (!$username) {
            http_response_code(401);
            jsonResponse(false, 'Unauthorized. Please log in.');
        }
        if (isAdminUser($username)) {
            http_response_code(403);
            jsonResponse(false, 'Administrators cannot save game results.');
        }
        if (isUserBlocked($username)) {
            http_response_code(403);
            jsonResponse(false, 'This account is blocked from playing.');
        }
        handleSaveFriendMatch($username);
        break;

    case 'get':
        // Public or private leaderboard — auth optional
        handleGetScores($username, $_GET['mode'] ?? 'global');
        break;

    case 'stats':
        // Personal stats require authentication
        if (!$username) {
            http_response_code(401);
            jsonResponse(false, 'Unauthorized.');
        }
        handleGetStats($username);
        break;

    default:
        http_response_code(400);
        jsonResponse(false, 'Invalid or missing action parameter.');
}

// ============================================================
// SAVE SCORE — Persist a completed game result
// ============================================================
function handleSaveScore($username) {
    // Decode JSON body from JavaScript frontend
    $body   = json_decode(file_get_contents('php://input'), true);
    $score  = max(0, intval($body['score']   ?? 0));
    $correct = max(0, intval($body['correct'] ?? 0));
    $streak = max(0, intval($body['streak']  ?? 0));

    // Append new score entry to scores file
    $scores   = readJson(SCORES_FILE);
    $scores[] = [
        'username' => $username,
        'score'    => $score,
        'correct'  => $correct,
        'streak'   => $streak,
        'date'     => date('d M Y'),          // e.g. "30 Oct 2026"
        'timestamp'=> time()
    ];
    writeJson(SCORES_FILE, $scores);

    // ---- Update user's aggregate stats ----
    $users = readJson(USERS_FILE);
    foreach ($users as &$user) {
        if ($user['username'] === $username) {
            $user['games_played'] = ($user['games_played'] ?? 0) + 1;
            $user['best_score']   = max($user['best_score'] ?? 0, $score);
            break;
        }
    }
    unset($user); // Break reference
    writeJson(USERS_FILE, $users);

    jsonResponse(true, 'Score saved successfully.', ['score' => $score]);
}

function handleSaveFriendMatch($username) {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        jsonResponse(false, 'Invalid friend match data.');
    }

    $friendName = $body['friendName'] ?? null;
    $playerScore = filter_var($body['playerScore'] ?? null, FILTER_VALIDATE_INT);
    $friendScore = filter_var($body['friendScore'] ?? null, FILTER_VALIDATE_INT);
    $playerCorrect = filter_var($body['playerCorrect'] ?? null, FILTER_VALIDATE_INT);
    $friendCorrect = filter_var($body['friendCorrect'] ?? null, FILTER_VALIDATE_INT);
    $friendNameLength = is_string($friendName) ? preg_match_all('/./us', trim($friendName)) : false;
    if (!is_string($friendName) || trim($friendName) === ''
        || $friendNameLength === false || $friendNameLength > 24
        || preg_match('/[\x00-\x1F\x7F]/u', $friendName)
        || $playerScore === false || $friendScore === false
        || $playerScore < 0 || $friendScore < 0
        || $playerCorrect === false || $friendCorrect === false
        || $playerCorrect < 0 || $playerCorrect > 10
        || $friendCorrect < 0 || $friendCorrect > 10) {
        http_response_code(400);
        jsonResponse(false, 'Invalid friend match details.');
    }

    $playerName = $username;
    foreach (readJson(USERS_FILE) as $user) {
        if (strcasecmp($user['username'] ?? '', $username) === 0) {
            $playerName = $user['display_name'] ?? $user['username'];
            break;
        }
    }
    $winner = $playerScore === $friendScore
        ? 'Draw'
        : ($playerScore > $friendScore ? $playerName : trim($friendName));

    $matches = readJson(FRIEND_MATCHES_FILE);
    $matches[] = [
        'username' => $username,
        'player_name' => $playerName,
        'friend_name' => trim($friendName),
        'player_score' => $playerScore,
        'friend_score' => $friendScore,
        'player_correct' => $playerCorrect,
        'friend_correct' => $friendCorrect,
        'winner' => $winner,
        'date' => date('d M Y'),
        'timestamp' => time()
    ];
    if (!writeJson(FRIEND_MATCHES_FILE, $matches)) {
        http_response_code(500);
        jsonResponse(false, 'Could not save the friend match.');
    }

    jsonResponse(true, 'Friend match saved.', ['winner' => $winner]);
}

// ============================================================
// GET SCORES — Retrieve leaderboard entries
// ============================================================
function handleGetScores($currentUser, $mode) {
    $scores = readJson(SCORES_FILE);

    if ($mode === 'mine') {
        // Filter to only the authenticated user's scores (Virtual Identity: personal data)
        if (!$currentUser) {
            jsonResponse(false, 'Login required to view your scores.');
        }
        $scores = array_values(array_filter(
            $scores,
            fn($s) => $s['username'] === $currentUser
        ));
    } else {
        // Global leaderboard: deduplicate to keep only each user's best score
        $bestPerUser = [];
        foreach ($scores as $s) {
            $u = $s['username'];
            if (!isset($bestPerUser[$u]) || $s['score'] > $bestPerUser[$u]['score']) {
                $bestPerUser[$u] = $s;
            }
        }
        $scores = array_values($bestPerUser);
    }

    // Sort by score descending
    usort($scores, fn($a, $b) => $b['score'] - $a['score']);

    // Return top 50 entries
    $entries = array_slice($scores, 0, 50);
    $usersByName = [];
    foreach (readJson(USERS_FILE) as $user) {
        $usersByName[strtolower($user['username'])] = $user['display_name'] ?? $user['username'];
    }
    foreach ($entries as &$entry) {
        $entry['display_name'] = $usersByName[strtolower($entry['username'])] ?? $entry['username'];
    }
    unset($entry);

    $friendMatches = [];
    if ($mode === 'mine' && $currentUser) {
        $friendMatches = array_values(array_filter(
            readJson(FRIEND_MATCHES_FILE),
            fn($match) => strcasecmp($match['username'] ?? '', $currentUser) === 0
        ));
        usort($friendMatches, fn($a, $b) => ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0));
        $friendMatches = array_slice($friendMatches, 0, 50);
    }

    jsonResponse(true, 'OK', ['entries' => $entries, 'friendMatches' => $friendMatches]);
}

// ============================================================
// GET STATS — Personal stats for the menu screen
// ============================================================
function handleGetStats($username) {
    // Get user record for games_played and best_score
    $users    = readJson(USERS_FILE);
    $userData = null;
    foreach ($users as $u) {
        if ($u['username'] === $username) {
            $userData = $u;
            break;
        }
    }

    // Calculate global rank (position on leaderboard by best score)
    $scores      = readJson(SCORES_FILE);
    $bestPerUser = [];
    foreach ($scores as $s) {
        $u = $s['username'];
        $bestPerUser[$u] = max($bestPerUser[$u] ?? 0, $s['score']);
    }
    arsort($bestPerUser); // Sort highest score first

    $rank = null;
    $pos  = 1;
    foreach ($bestPerUser as $user => $score) {
        if ($user === $username) {
            $rank = $pos;
            break;
        }
        $pos++;
    }

    jsonResponse(true, 'OK', [
        'bestScore'   => $userData['best_score']   ?? 0,
        'gamesPlayed' => $userData['games_played'] ?? 0,
        'rank'        => $rank   // null if no scores yet
    ]);
}
