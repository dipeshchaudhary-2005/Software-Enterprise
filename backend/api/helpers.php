<?php
/**
 * helpers.php - Shared Utility Functions
 *
 * Provides reusable functions for JSON file I/O and session management
 * (Virtual Identity). Included by all PHP API endpoints.
 *
 * Virtual Identity: Sessions are tracked via cryptographically secure tokens
 * stored in a JSON file. The client holds the token in localStorage.
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 * Reference: PHP password_hash - https://www.php.net/manual/en/function.password-hash.php
 * Reference: PHP random_bytes  - https://www.php.net/manual/en/function.random-bytes.php
 */

// ---- File paths for flat-file storage (no database required) ----
define('DATA_DIR',      __DIR__ . '/../data');
define('USERS_FILE',    __DIR__ . '/../data/users.json');
define('SESSIONS_FILE', __DIR__ . '/../data/sessions.json');
define('SCORES_FILE',   __DIR__ . '/../data/scores.json');
define('GUESTS_FILE',   __DIR__ . '/../data/guests.json');

/**
 * Ensure data directory and JSON files exist on first run
 */
function ensureDataFiles() {
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    foreach ([USERS_FILE, SESSIONS_FILE, SCORES_FILE, GUESTS_FILE] as $file) {
        if (!file_exists($file)) {
            file_put_contents($file, '[]');
        }
    }
    bootstrapAdminAccount();
}

function configuredAdminCredentials() {
    $username = trim((string) getenv('BB_ADMIN_USERNAME'));
    $password = (string) getenv('BB_ADMIN_PASSWORD');
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username) || strlen($password) < 8) {
        return null;
    }
    return ['username' => $username, 'password' => $password];
}

function bootstrapAdminAccount() {
    $credentials = configuredAdminCredentials();
    if (!$credentials) {
        return;
    }

    $users = readJson(USERS_FILE);
    foreach ($users as &$user) {
        if (strtolower($user['username']) === strtolower($credentials['username'])) {
            if (($user['role'] ?? '') !== 'admin'
                && password_verify($credentials['password'], $user['password_hash'] ?? '')) {
                $user['role'] = 'admin';
                writeJson(USERS_FILE, $users);
            }
            unset($user);
            return;
        }
    }
    unset($user);

    $users[] = [
        'username' => $credentials['username'],
        'password_hash' => password_hash($credentials['password'], PASSWORD_BCRYPT),
        'created_at' => date('c'),
        'games_played' => 0,
        'best_score' => 0,
        'role' => 'admin'
    ];
    writeJson(USERS_FILE, $users);
}

function isAdminUser($username) {
    $credentials = configuredAdminCredentials();
    if (!$credentials || strcasecmp($credentials['username'], (string) $username) !== 0) {
        return false;
    }
    foreach (readJson(USERS_FILE) as $user) {
        if (strcasecmp($user['username'], $credentials['username']) === 0) {
            return ($user['role'] ?? '') === 'admin'
                && password_verify($credentials['password'], $user['password_hash'] ?? '');
        }
    }
    return false;
}

/**
 * Read a JSON file and decode to PHP array
 * @param  string $file Absolute file path
 * @return array        Decoded data or empty array
 */
function readJson($file) {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

/**
 * Encode PHP array to JSON and write to file
 * @param string $file  Absolute file path
 * @param array  $data  Data to serialize
 */
function writeJson($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

/**
 * Output a JSON API response and terminate
 * Interoperability: all endpoints return JSON so any client (JS, PHP, mobile) can consume them
 *
 * @param bool   $success Whether the operation succeeded
 * @param string $message Human-readable message
 * @param array  $extra   Additional data to merge into response
 */
function jsonResponse($success, $message, $extra = []) {
    echo json_encode(array_merge(
        ['success' => $success, 'message' => $message],
        $extra
    ));
    exit;
}

// ============================================================
// SESSION / VIRTUAL IDENTITY FUNCTIONS
// ============================================================

/**
 * Create and store a new session token for a user.
 *
 * Virtual Identity: The token is the client's proof of identity.
 * It is generated using random_bytes() for cryptographic security,
 * ensuring tokens cannot be guessed or brute-forced.
 *
 * @param  string $username
 * @return string 64-character hex token
 */
function createSession($username) {
    // Generate 32 random bytes → 64 hex chars (512-bit token)
    $token = bin2hex(random_bytes(32));

    $sessions = readJson(SESSIONS_FILE);

    // Enforce single active session per user (security best practice)
    $sessions = array_filter($sessions, fn($s) => $s['username'] !== $username);

    // Store session with 24-hour expiry
    $sessions[] = [
        'token'      => $token,
        'username'   => $username,
        'created_at' => time(),
        'expires_at' => time() + (24 * 60 * 60)   // 24 hours
    ];

    writeJson(SESSIONS_FILE, array_values($sessions));
    return $token;
}

/**
 * Validate a session token and return the associated username.
 *
 * Virtual Identity: Checks that the token exists and has not expired.
 * Expired sessions are skipped (lazy cleanup).
 *
 * @param  string      $token Session token from client
 * @return string|null Username on success, null if invalid/expired
 */
function validateSession($token) {
    if (empty($token)) return null;

    ensureDataFiles();
    $sessions = readJson(SESSIONS_FILE);
    $now      = time();

    foreach ($sessions as $session) {
        if ($session['token'] === $token && $session['expires_at'] > $now) {
            return $session['username'];
        }
    }
    return null;
}

/**
 * Destroy a session token (logout / invalidation).
 * After calling this, the token is permanently invalid.
 *
 * @param string $token Session token to invalidate
 */
function destroySession($token) {
    $sessions = readJson(SESSIONS_FILE);
    $sessions = array_filter($sessions, fn($s) => $s['token'] !== $token);
    writeJson(SESSIONS_FILE, array_values($sessions));
}
