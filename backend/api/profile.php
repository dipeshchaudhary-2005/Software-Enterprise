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
if (!$username) {
    http_response_code(401);
    jsonResponse(false, 'Log in to manage your profile.');
}

$users = readJson(USERS_FILE);
$userIndex = null;
foreach ($users as $index => $user) {
    if (strcasecmp($user['username'] ?? '', $username) === 0) {
        $userIndex = $index;
        break;
    }
}
if ($userIndex === null) {
    http_response_code(404);
    jsonResponse(false, 'Account not found.');
}

$avatarDirectory = DATA_DIR . '/avatars';
$avatarFile = $users[$userIndex]['avatar_file'] ?? '';
$validAvatarFile = preg_match('/^[a-f0-9]{24}\.(jpg|png|webp)$/', $avatarFile) === 1;
$avatarPath = $validAvatarFile ? $avatarDirectory . '/' . $avatarFile : '';
$action = $_GET['action'] ?? '';

if ($action === 'get' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse(true, 'Profile loaded.', [
        'username' => $users[$userIndex]['username'],
        'displayName' => $users[$userIndex]['display_name'] ?? $users[$userIndex]['username'],
        'hasAvatar' => $avatarPath !== '' && is_file($avatarPath)
    ]);
}

if ($action === 'avatar' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($avatarPath === '' || !is_file($avatarPath) || !is_readable($avatarPath)) {
        http_response_code(404);
        jsonResponse(false, 'Profile picture not found.');
    }
    $mimeTypes = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $extension = pathinfo($avatarFile, PATHINFO_EXTENSION);
    header('Content-Type: ' . $mimeTypes[$extension]);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store');
    readfile($avatarPath);
    exit;
}

if ($action !== 'update' || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(400);
    jsonResponse(false, 'Invalid profile action or request method.');
}

$displayName = trim($_POST['displayName'] ?? '');
$displayNameLength = preg_match_all('/./us', $displayName);
if ($displayName === '' || $displayNameLength === false || $displayNameLength > 24
    || preg_match('/[\x00-\x1F\x7F]/u', $displayName)) {
    http_response_code(400);
    jsonResponse(false, 'Display name must be between 1 and 24 characters.');
}

$oldAvatarFile = $avatarFile;
$newAvatarFile = $oldAvatarFile;
$newAvatarPath = '';
if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
    $upload = $_FILES['avatar'];
    if ($upload['error'] !== UPLOAD_ERR_OK || $upload['size'] > 256 * 1024) {
        http_response_code(400);
        jsonResponse(false, 'Profile picture upload failed or exceeds 256 KB.');
    }

    $imageInfo = @getimagesize($upload['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mimeType = $imageInfo['mime'] ?? '';
    if (!$imageInfo || !isset($extensions[$mimeType])
        || $imageInfo[0] < 1 || $imageInfo[1] < 1
        || $imageInfo[0] > 1024 || $imageInfo[1] > 1024) {
        http_response_code(400);
        jsonResponse(false, 'Use a valid JPEG, PNG, or WebP image no larger than 1024 × 1024.');
    }

    if (!is_dir($avatarDirectory) && !@mkdir($avatarDirectory, 0755, true)) {
        http_response_code(500);
        jsonResponse(false, 'Could not create profile picture storage.');
    }
    $newAvatarFile = bin2hex(random_bytes(12)) . '.' . $extensions[$mimeType];
    $newAvatarPath = $avatarDirectory . '/' . $newAvatarFile;
    if (!@move_uploaded_file($upload['tmp_name'], $newAvatarPath)) {
        http_response_code(500);
        jsonResponse(false, 'Could not save profile picture.');
    }
}

$users[$userIndex]['display_name'] = $displayName;
if ($newAvatarPath !== '') {
    $users[$userIndex]['avatar_file'] = $newAvatarFile;
}
$encodedUsers = json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($encodedUsers === false || @file_put_contents(USERS_FILE, $encodedUsers, LOCK_EX) === false) {
    if ($newAvatarPath !== '' && is_file($newAvatarPath)) {
        @unlink($newAvatarPath);
    }
    http_response_code(500);
    jsonResponse(false, 'Could not save profile changes.');
}

if ($newAvatarPath !== '' && preg_match('/^[a-f0-9]{24}\.(jpg|png|webp)$/', $oldAvatarFile) === 1) {
    $oldAvatarPath = $avatarDirectory . '/' . $oldAvatarFile;
    if (is_file($oldAvatarPath) && !@unlink($oldAvatarPath)) {
        error_log('[profile] Could not remove replaced profile picture.');
    }
}

jsonResponse(true, 'Profile updated.', [
    'displayName' => $displayName,
    'hasAvatar' => $newAvatarFile !== ''
]);
