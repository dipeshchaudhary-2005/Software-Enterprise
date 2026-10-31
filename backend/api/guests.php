<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/helpers.php';
ensureDataFiles();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$body = json_decode(file_get_contents('php://input'), true);
$playerNames = $body['players'] ?? null;
if (!is_array($playerNames) || count($playerNames) < 1 || count($playerNames) > 2) {
    http_response_code(400);
    jsonResponse(false, 'Provide one or two guest player names.');
}

$validatedNames = [];
foreach ($playerNames as $name) {
    if (!is_string($name)) {
        http_response_code(400);
        jsonResponse(false, 'Guest player names must be text.');
    }

    $name = trim($name);
    $length = preg_match_all('/./us', $name);
    if ($name === '' || $length === false || $length > 24
        || preg_match('/[\x00-\x1F\x7F]/', $name)) {
        http_response_code(400);
        jsonResponse(false, 'Guest names must be 1 to 24 characters without control characters.');
    }

    $validatedNames[strtolower($name)] = $name;
}

$guests = readJson(GUESTS_FILE);
$now = date('c');
foreach ($validatedNames as $key => $name) {
    $found = false;
    foreach ($guests as &$guest) {
        if (strtolower($guest['player_name']) === $key) {
            $guest['games_played'] = (int) ($guest['games_played'] ?? 0) + 1;
            $guest['last_played'] = $now;
            $found = true;
            break;
        }
    }
    unset($guest);

    if (!$found) {
        $guests[] = [
            'player_name' => $name,
            'games_played' => 1,
            'last_played' => $now
        ];
    }
}

writeJson(GUESTS_FILE, $guests);
jsonResponse(true, 'Guest players recorded.');
