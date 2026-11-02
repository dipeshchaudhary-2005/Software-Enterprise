<?php
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

$username = validateSession($_SERVER['HTTP_X_SESSION_TOKEN'] ?? '');
if (!$username || !isAdminUser($username)) {
    http_response_code(403);
    jsonResponse(false, 'Administrator access is required.');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handleAdminAction($username);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$users = readJson(USERS_FILE);
$guests = readJson(GUESTS_FILE);
$scores = readJson(SCORES_FILE);
$friendMatches = readJson(FRIEND_MATCHES_FILE);
usort($scores, fn($a, $b) => ($b['score'] ?? 0) - ($a['score'] ?? 0));
usort($friendMatches, fn($a, $b) => ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0));

$publicUsers = array_map(fn($user) => [
    'username' => $user['username'],
    'display_name' => $user['display_name'] ?? $user['username'],
    'role' => isAdminUser($user['username']) ? 'admin' : 'user',
    'games_played' => (int) ($user['games_played'] ?? 0),
    'best_score' => (int) ($user['best_score'] ?? 0),
    'created_at' => $user['created_at'] ?? '',
    'blocked' => !empty($user['blocked'])
], $users);
$publicGuests = array_map(fn($guest) => [
    'player_name' => $guest['player_name'],
    'games_played' => (int) ($guest['games_played'] ?? 0),
    'last_played' => $guest['last_played'] ?? ''
], $guests);

jsonResponse(true, 'Dashboard data loaded.', [
    'playerCount' => count($publicUsers) + count($publicGuests),
    'gameCount' => array_sum(array_map(fn($user) => (int) ($user['games_played'] ?? 0), $users))
        + array_sum(array_map(fn($guest) => (int) ($guest['games_played'] ?? 0), $publicGuests)),
    'scoreCount' => count($scores),
    'users' => $publicUsers,
    'guests' => $publicGuests,
    'scores' => array_slice($scores, 0, 50),
    'friendMatches' => array_map(fn($match) => [
        'username' => $match['username'] ?? '',
        'player_name' => $match['player_name'] ?? '',
        'friend_name' => $match['friend_name'] ?? '',
        'player_score' => (int) ($match['player_score'] ?? 0),
        'friend_score' => (int) ($match['friend_score'] ?? 0),
        'player_correct' => (int) ($match['player_correct'] ?? 0),
        'friend_correct' => (int) ($match['friend_correct'] ?? 0),
        'winner' => $match['winner'] ?? '',
        'date' => $match['date'] ?? ''
    ], array_slice($friendMatches, 0, 50))
]);

function handleAdminAction($adminUsername) {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        http_response_code(400);
        jsonResponse(false, 'Invalid request body.');
    }

    $action = $body['action'] ?? '';
    $requestedUsername = $body['username'] ?? null;
    if (!is_string($action) || !is_string($requestedUsername)) {
        http_response_code(400);
        jsonResponse(false, 'Invalid account action or username.');
    }
    $targetUsername = trim($requestedUsername);
    if (!in_array($action, ['block', 'unblock', 'delete'], true)
        || !preg_match('/^[a-zA-Z0-9_]{3,20}$/', $targetUsername)) {
        http_response_code(400);
        jsonResponse(false, 'Invalid account action or username.');
    }
    if (strcasecmp($adminUsername, $targetUsername) === 0) {
        http_response_code(400);
        jsonResponse(false, 'You cannot manage your own administrator account.');
    }

    $users = readJson(USERS_FILE);
    $originalUsers = $users;
    $userIndex = null;
    foreach ($users as $index => $user) {
        if (strcasecmp($user['username'] ?? '', $targetUsername) === 0) {
            $userIndex = $index;
            break;
        }
    }
    if ($userIndex === null) {
        http_response_code(404);
        jsonResponse(false, 'Account not found.');
    }

    $targetUser = $users[$userIndex];
    if (isAdminUser($targetUser['username'])) {
        http_response_code(403);
        jsonResponse(false, 'Administrator accounts cannot be blocked or deleted.');
    }

    if ($action === 'block' || $action === 'unblock') {
        $users[$userIndex]['blocked'] = $action === 'block';
        if (!writeJson(USERS_FILE, $users)) {
            http_response_code(500);
            jsonResponse(false, 'Could not save the account status.');
        }
        jsonResponse(true, $action === 'block' ? 'Account blocked from playing.' : 'Account unblocked.');
    }

    $scores = readJson(SCORES_FILE);
    $sessions = readJson(SESSIONS_FILE);
    $friendMatches = readJson(FRIEND_MATCHES_FILE);
    $usernameToDelete = $targetUser['username'];
    $updatedScores = array_values(array_filter(
        $scores,
        fn($score) => strcasecmp($score['username'] ?? '', $usernameToDelete) !== 0
    ));
    $updatedSessions = array_values(array_filter(
        $sessions,
        fn($session) => strcasecmp($session['username'] ?? '', $usernameToDelete) !== 0
    ));
    $updatedFriendMatches = array_values(array_filter(
        $friendMatches,
        fn($match) => strcasecmp($match['username'] ?? '', $usernameToDelete) !== 0
    ));
    array_splice($users, $userIndex, 1);

    $scoresSaved = writeJson(SCORES_FILE, $updatedScores);
    $sessionsSaved = writeJson(SESSIONS_FILE, $updatedSessions);
    $friendMatchesSaved = writeJson(FRIEND_MATCHES_FILE, $updatedFriendMatches);
    $usersSaved = writeJson(USERS_FILE, $users);
    if (!$scoresSaved || !$sessionsSaved || !$friendMatchesSaved || !$usersSaved) {
        $scoresRestored = writeJson(SCORES_FILE, $scores);
        $sessionsRestored = writeJson(SESSIONS_FILE, $sessions);
        $friendMatchesRestored = writeJson(FRIEND_MATCHES_FILE, $friendMatches);
        $usersRestored = writeJson(USERS_FILE, $originalUsers);
        $rollbackSucceeded = $scoresRestored && $sessionsRestored
            && $friendMatchesRestored && $usersRestored;
        if (!$rollbackSucceeded) {
            error_log('[admin] Account deletion rollback could not restore all data files.');
        }
        http_response_code(500);
        jsonResponse(false, 'Could not delete the account and its related data.');
    }

    $avatarFile = $targetUser['avatar_file'] ?? '';
    if (preg_match('/^[a-f0-9]{24}\.(jpg|png|webp)$/', $avatarFile) === 1) {
        $avatarPath = DATA_DIR . '/avatars/' . $avatarFile;
        if (is_file($avatarPath) && !@unlink($avatarPath)) {
            error_log('[admin] Could not remove deleted account avatar: ' . $avatarFile);
        }
    }

    jsonResponse(true, 'Account, saved scores, friend matches, and sessions deleted.');
}
