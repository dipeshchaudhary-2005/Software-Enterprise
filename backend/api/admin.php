<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/helpers.php';
ensureDataFiles();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$username = validateSession($_SERVER['HTTP_X_SESSION_TOKEN'] ?? '');
if (!$username || !isAdminUser($username)) {
    http_response_code(403);
    jsonResponse(false, 'Administrator access is required.');
}

$users = readJson(USERS_FILE);
$users = array_values(array_filter(
    $users,
    fn($user) => (int) ($user['games_played'] ?? 0) > 0
));
$guests = readJson(GUESTS_FILE);
$scores = readJson(SCORES_FILE);
usort($scores, fn($a, $b) => ($b['score'] ?? 0) - ($a['score'] ?? 0));

$publicUsers = array_map(fn($user) => [
    'username' => $user['username'],
    'display_name' => $user['display_name'] ?? $user['username'],
    'role' => isAdminUser($user['username']) ? 'admin' : 'user',
    'games_played' => (int) ($user['games_played'] ?? 0),
    'best_score' => (int) ($user['best_score'] ?? 0),
    'created_at' => $user['created_at'] ?? ''
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
    'scores' => array_slice($scores, 0, 50)
]);
