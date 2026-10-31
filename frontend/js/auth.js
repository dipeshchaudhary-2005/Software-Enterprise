/**
 * auth.js — Virtual Identity Module (Client-Side)
 *
 * Manages the user's digital identity from the browser's perspective:
 *   - Registration: sends user credentials to PHP backend → receives session token
 *   - Login:        verifies identity → receives session token
 *   - Logout:       invalidates token on both client and server
 *   - Session check: on page load, restores identity from localStorage token
 *
 * Virtual Identity implementation:
 *   The session token is stored in localStorage (client-side persistence).
 *   localStorage is analogous to a persistent cookie: it survives page reloads
 *   but lives only in the user's browser. On every API request, the token is
 *   sent in the 'X-Session-Token' HTTP header.
 *
 * Interoperability:
 *   All communication with the PHP backend is via the Fetch API using HTTP
 *   with JSON payloads. This allows any client (browser, mobile, Postman) to
 *   communicate with the same PHP endpoints.
 *
 * Event-driven:
 *   - 'DOMContentLoaded' event triggers session restoration on page load
 *   - Form 'submit' events trigger handleLogin() and handleRegister()
 *   - Button 'click' event triggers togglePassword()
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 * PHP Backend: api/auth.php
 */

'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
// currentUser holds the username of the authenticated user, or null if not logged in.
// This is set after a successful login/register/session-check.
let currentUser = null;
let currentRole = null;
let currentDisplayName = null;

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_KEY = 'bb_token'; // localStorage key for the session token
const GUEST_KEY = 'bb_guest_name';

// ── Event: DOMContentLoaded ───────────────────────────────────────────────────
// This event fires once the HTML document is fully parsed.
// We use it to check if the user already has a stored session (persistent identity).
// Event-driven programming: the browser fires this event; our handler responds.
document.addEventListener('DOMContentLoaded', checkExistingSession);

/**
 * On page load: check if a valid session token exists in localStorage.
 * If valid → restore the registered identity and go to the menu.
 * Otherwise restore an active guest session or show the login screen.
 *
 * This is the entry point for session persistence (Virtual Identity).
 */
async function checkExistingSession() {
    const token = localStorage.getItem(SESSION_KEY);

    if (!token) {
        restoreGuestOrShowAuth();
        return;
    }

    try {
        // Interoperability: HTTP GET to PHP backend with token in custom header
        const response = await fetch('api/auth.php?action=check', {
            headers: { 'X-Session-Token': token }
        });

        const data = await response.json();

        if (data.success) {
            // Token is valid — restore virtual identity
            currentUser = data.username;
            currentRole = data.role || 'user';
            currentDisplayName = data.displayName || data.username;
            showAuthenticatedHome();
        } else {
            // Token expired or invalid — clean up and show login
            localStorage.removeItem(SESSION_KEY);
            restoreGuestOrShowAuth();
        }
    } catch (error) {
        // Network error or PHP server not running
        console.warn('[auth] Session check failed:', error.message);
        showView('auth');
    }
}

function restoreGuestOrShowAuth() {
    const guestName = sessionStorage.getItem(GUEST_KEY);
    if (guestName) {
        currentUser = guestName;
        currentRole = 'guest';
        currentDisplayName = guestName;
        updateMenuIdentity();
        showView('menu');
        return;
    }
    currentUser = null;
    currentRole = null;
    currentDisplayName = null;
    clearProfileAvatar();
    showView('auth');
}

function updateMenuIdentity() {
    const isGuest = currentRole === 'guest';
    const usernameEl = document.getElementById('menu-username');
    const logoutButton = document.getElementById('btn-logout');
    const stats = document.querySelector('.menu-stats');
    const adminButton = document.getElementById('btn-admin-nav');
    const leaderboardButton = document.getElementById('btn-leaderboard-nav');
    const profileButton = document.getElementById('btn-edit-profile');
    const playButton = document.getElementById('btn-play');
    const playerModeSelect = document.getElementById('player-mode-select');
    const isAdmin = currentRole === 'admin';
    const isRegistered = currentRole === 'user' || currentRole === 'admin';
    const friendModeOption = playerModeSelect?.querySelector('option[value="friend"]');
    if (usernameEl) usernameEl.textContent = `${currentDisplayName || currentUser || 'Player'}${isGuest ? ' (Guest)' : ''}`;
    if (logoutButton) logoutButton.textContent = isGuest ? '↩ Exit' : '⏏ Logout';
    if (logoutButton) logoutButton.setAttribute('aria-label', isGuest ? 'Exit guest session' : 'Logout');
    if (stats) stats.classList.toggle('hidden', isGuest);
    if (adminButton) adminButton.classList.toggle('hidden', currentRole !== 'admin');
    if (leaderboardButton) leaderboardButton.classList.toggle('hidden', isGuest);
    if (playButton) playButton.classList.toggle('hidden', isAdmin);
    if (friendModeOption) friendModeOption.disabled = isGuest;
    if (isGuest && playerModeSelect) playerModeSelect.value = 'single';
    toggleFriendName();
    document.querySelectorAll('.menu-hero, .game-options').forEach(element => {
        element.classList.toggle('hidden', isAdmin);
    });
    if (profileButton) profileButton.classList.toggle('hidden', !isRegistered);
    const profileForm = document.getElementById('form-profile');
    if (profileForm && !isRegistered) profileForm.classList.add('hidden');
    const gameoverLeaderboard = document.getElementById('btn-go-leaderboard');
    if (gameoverLeaderboard) gameoverLeaderboard.classList.toggle('hidden', isGuest);
    if (isRegistered) loadProfile();
    else clearProfileAvatar();
}

function showAuthenticatedHome() {
    updateMenuIdentity();
    showView(currentRole === 'admin' ? 'admin' : 'menu');
}

function toggleGuestForm() {
    const form = document.getElementById('form-guest');
    const input = document.getElementById('guest-name');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) input.focus();
}

function startGuest(event) {
    event.preventDefault();
    const name = document.getElementById('guest-name').value.trim();
    const errorEl = document.getElementById('guest-error');
    if (!name || name.length > 24) {
        showErrorMsg(errorEl, 'Enter a name between 1 and 24 characters.');
        return;
    }
    if (/[\u0000-\u001f\u007f]/.test(name)) {
        showErrorMsg(errorEl, 'Please use a name without control characters.');
        return;
    }

    sessionStorage.setItem(GUEST_KEY, name);
    localStorage.removeItem(SESSION_KEY);
    currentUser = name;
    currentRole = 'guest';
    currentDisplayName = name;
    updateMenuIdentity();
    showView('menu');
}

function toggleFriendName() {
    const playerModeSelect = document.getElementById('player-mode-select');
    if (currentRole === 'guest' && playerModeSelect.value === 'friend') {
        playerModeSelect.value = 'single';
    }
    const isFriendMode = currentRole !== 'guest' && playerModeSelect.value === 'friend';
    const nameGroup = document.getElementById('friend-name-group');
    nameGroup.classList.toggle('hidden', !isFriendMode);
}

/**
 * Switch between Login and Register tabs.
 *
 * Event-driven: called by the tab button onclick handlers.
 * @param {'login' | 'register'} tab
 */
function switchTab(tab) {
    const loginForm    = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const tabLogin     = document.getElementById('tab-login');
    const tabRegister  = document.getElementById('tab-register');

    const isLogin = tab === 'login';

    // Toggle form visibility
    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);

    // Toggle active tab button
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);

    // Update ARIA attributes for accessibility
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabRegister.setAttribute('aria-selected', String(!isLogin));

    clearAllErrors();
}

/**
 * Handle the login form submission.
 *
 * Event-driven: triggered by the form's 'submit' event.
 * Interoperability: sends JSON to api/auth.php via HTTP POST.
 * Virtual Identity: stores the returned session token in localStorage.
 *
 * @param {SubmitEvent} event
 */
async function handleLogin(event) {
    event.preventDefault(); // Stop default form submission behaviour
    clearAllErrors();

    const username  = document.getElementById('login-username').value.trim();
    const password  = document.getElementById('login-password').value;
    const errorEl   = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-login');

    // Basic client-side validation
    if (!username || !password) {
        showErrorMsg(errorEl, 'Please enter your username and password.');
        return;
    }

    setLoading(submitBtn, true);

    try {
        // Interoperability: HTTP POST with JSON body to PHP auth endpoint
        const response = await fetch('api/auth.php?action=login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // ── Virtual Identity: store session token in localStorage ──
            // The token acts like a cookie — it persists across page loads
            // and is sent with every subsequent API request.
            localStorage.setItem(SESSION_KEY, data.token);
            sessionStorage.removeItem(GUEST_KEY);
            currentUser = data.username;
            currentRole = data.role || 'user';
            currentDisplayName = data.displayName || data.username;

            showAuthenticatedHome();
        } else {
            showErrorMsg(errorEl, data.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        showErrorMsg(errorEl, 'Could not connect to the server. Is PHP running? (Run start-server.bat)');
        console.error('[auth] Login error:', error);
    } finally {
        setLoading(submitBtn, false);
    }
}

/**
 * Handle the registration form submission.
 *
 * Event-driven: triggered by the form's 'submit' event.
 * Virtual Identity: creates a new digital identity on the server.
 *
 * @param {SubmitEvent} event
 */
async function handleRegister(event) {
    event.preventDefault();
    clearAllErrors();

    const username  = document.getElementById('reg-username').value.trim();
    const password  = document.getElementById('reg-password').value;
    const confirm   = document.getElementById('reg-confirm').value;
    const errorEl   = document.getElementById('reg-error');
    const submitBtn = document.getElementById('btn-register');

    // Client-side validation before hitting the server
    if (!username || !password) {
        showErrorMsg(errorEl, 'Please fill in all fields.');
        return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showErrorMsg(errorEl, 'Username must be 3–20 characters (letters, numbers, underscores).');
        return;
    }
    if (password.length < 6) {
        showErrorMsg(errorEl, 'Password must be at least 6 characters.');
        return;
    }
    if (password !== confirm) {
        showErrorMsg(errorEl, 'Passwords do not match.');
        return;
    }

    setLoading(submitBtn, true);

    try {
        // Interoperability: HTTP POST to PHP registration endpoint
        const response = await fetch('api/auth.php?action=register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store session token (Virtual Identity established)
            localStorage.setItem(SESSION_KEY, data.token);
            sessionStorage.removeItem(GUEST_KEY);
            currentUser = data.username;
            currentRole = data.role || 'user';
            currentDisplayName = data.displayName || data.username;

            showAuthenticatedHome();
        } else {
            showErrorMsg(errorEl, data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        showErrorMsg(errorEl, 'Could not connect to the server. Is PHP running? (Run start-server.bat)');
        console.error('[auth] Register error:', error);
    } finally {
        setLoading(submitBtn, false);
    }
}

/**
 * Log the user out.
 *
 * Event-driven: triggered by the logout button's click event.
 * Virtual Identity: destroys the client-side token AND notifies the PHP server
 * to invalidate the server-side session record.
 */
async function handleLogout() {
    const token = localStorage.getItem(SESSION_KEY);

    if (token) {
        try {
            // Notify PHP server to destroy the session record
            // Interoperability: HTTP GET with token in custom header
            await fetch('api/auth.php?action=logout', {
                headers: { 'X-Session-Token': token }
            });
        } catch (e) {
            // If the server is unreachable, still log out client-side
            console.warn('[auth] Server logout failed (offline?), clearing local session.');
        }

        // Destroy client-side virtual identity
        localStorage.removeItem(SESSION_KEY);
    }

    currentUser = null;
    currentRole = null;
    currentDisplayName = null;
    clearProfileAvatar();
    sessionStorage.removeItem(GUEST_KEY);
    showView('auth');
}

// ── Helper: Toggle password field visibility ───────────────────────────────────
/**
 * Toggle the type of a password input between 'password' and 'text'.
 * Event-driven: called by the eye button's onclick.
 * @param {string} inputId
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

// ── Helper: Show error messages ────────────────────────────────────────────────
function showErrorMsg(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
}

function clearAllErrors() {
    ['login-error', 'reg-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.classList.add('hidden');
        }
    });
}

// ── Helper: Button loading state ───────────────────────────────────────────────
function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    const textEl   = button.querySelector('.btn-text');
    const loaderEl = button.querySelector('.btn-loader');
    if (textEl)   textEl.style.opacity   = isLoading ? '0.5' : '1';
    if (loaderEl) loaderEl.classList.toggle('hidden', !isLoading);
}
