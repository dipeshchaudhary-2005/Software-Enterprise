<?php
/**
 * auth.php - Virtual Identity: Registration, Login, Logout & Session Check
 *
 * This is the authentication backend for BananaBrain.
 * It demonstrates the concept of "Virtual Identity" from CIS046-3:
 *
 *   - Registration: Creates a new digital identity (username + BCRYPT hashed password)
 *   - Login:        Verifies identity via password_verify(), issues a session token
 *   - Logout:       Destroys the session token (invalidates identity claim)
 *   - Check:        Allows the client to verify a stored token is still valid
 *
 * Interoperability: Receives and responds with JSON over HTTP.
 *                   The JavaScript frontend communicates via fetch() API.
 *
 * Security features used:
 *   - password_hash(PASSWORD_BCRYPT) — industry-standard password hashing
 *   - random_bytes(32)               — cryptographically secure session tokens
 *   - Constant-time comparison in password_verify() (prevents timing attacks)
 *
 * Reference: OWASP Authentication Cheat Sheet
 *            https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 */

// ---- CORS & Content-Type headers ----
// Interoperability: these headers allow the JavaScript frontend (different origin
// during development) to communicate with this PHP backend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token');

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---- Include shared utilities ----
require_once __DIR__ . '/helpers.php';
ensureDataFiles();

// ---- Route by action parameter ----
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register': handleRegister(); break;
    case 'login':    handleLogin();    break;
    case 'logout':   handleLogout();   break;
    case 'check':    handleCheck();    break;
    default:
        http_response_code(400);
        jsonResponse(false, 'Invalid or missing action parameter.');
}

// ============================================================
// REGISTER — Create a new user (new Virtual Identity)
// ============================================================
function handleRegister() {
    // Decode JSON body sent by the JavaScript frontend (interoperability: JSON over HTTP)
    $body     = json_decode(file_get_contents('php://input'), true);
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    // ---- Input validation ----
    if (strlen($username) < 3 || strlen($username) > 20) {
        jsonResponse(false, 'Username must be between 3 and 20 characters.');
    }
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        jsonResponse(false, 'Username may only contain letters, numbers, and underscores.');
    }
    if (strlen($password) < 6) {
        jsonResponse(false, 'Password must be at least 6 characters.');
    }

    // ---- Check username uniqueness ----
    $users = readJson(USERS_FILE);
    foreach ($users as $user) {
        if (strtolower($user['username']) === strtolower($username)) {
            jsonResponse(false, 'That username is already taken. Please choose another.');
        }
    }

    // ---- Hash the password (Virtual Identity security) ----
    // password_hash() with PASSWORD_BCRYPT:
    //  - Automatically generates and stores a unique salt per password
    //  - Makes brute-force attacks computationally expensive
    //  - NEVER store plain-text passwords!
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // ---- Store new user record ----
    $users[] = [
        'username'      => $username,
        'password_hash' => $passwordHash,        // Securely hashed — not the plain password
        'created_at'    => date('c'),            // ISO 8601 timestamp
        'games_played'  => 0,
        'best_score'    => 0
    ];
    writeJson(USERS_FILE, $users);

    // ---- Issue session token (virtual identity token) ----
    $token = createSession($username);
    jsonResponse(true, 'Account created successfully!', [
        'token'    => $token,
        'username' => $username,
        'role'     => isAdminUser($username) ? 'admin' : 'user'
    ]);
}

// ============================================================
// LOGIN — Verify identity and issue session token
// ============================================================
function handleLogin() {
    $body     = json_decode(file_get_contents('php://input'), true);
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    $users     = readJson(USERS_FILE);
    $foundUser = null;

    // Find matching user record (case-insensitive username lookup)
    foreach ($users as $user) {
        if (strtolower($user['username']) === strtolower($username)) {
            $foundUser = $user;
            break;
        }
    }

    // Use a generic error message — don't reveal whether username exists (security)
    if (!$foundUser) {
        jsonResponse(false, 'Invalid username or password.');
    }

    // ---- Verify password against stored hash (Virtual Identity authentication) ----
    // password_verify() performs a constant-time comparison to prevent timing attacks
    if (!password_verify($password, $foundUser['password_hash'])) {
        jsonResponse(false, 'Invalid username or password.');
    }

    // ---- Issue new session token ----
    $token = createSession($foundUser['username']);
    jsonResponse(true, 'Login successful!', [
        'token'    => $token,
        'username' => $foundUser['username'],
        'role'     => isAdminUser($foundUser['username']) ? 'admin' : 'user'
    ]);
}

// ============================================================
// LOGOUT — Invalidate session (destroy virtual identity claim)
// ============================================================
function handleLogout() {
    // Token is sent in the X-Session-Token custom header
    $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
    if ($token) {
        destroySession($token); // Remove token from sessions store
    }
    jsonResponse(true, 'You have been logged out.');
}

// ============================================================
// CHECK — Validate existing session token (identity restoration)
// Used on page load to restore session without re-login
// ============================================================
function handleCheck() {
    $token    = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
    $username = validateSession($token);

    if ($username) {
        // Token is valid — restore the user's virtual identity
        jsonResponse(true, 'Session is valid.', [
            'username' => $username,
            'role' => isAdminUser($username) ? 'admin' : 'user'
        ]);
    } else {
        // Token expired or does not exist
        http_response_code(401);
        jsonResponse(false, 'Session expired. Please log in again.');
    }
}
