'use strict';

let adminActionMessage = '';

async function loadAdminDashboard() {
    const container = document.getElementById('admin-content');
    if (!container) return;
    container.innerHTML = '<div class="lb-loading">⏳ Loading dashboard...</div>';

    try {
        const response = await fetch('api/admin.php', {
            headers: { 'X-Session-Token': localStorage.getItem('bb_token') || '' }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Server returned HTTP ${response.status}`);
        }

        const userRows = data.users.map(user => `
            <tr>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.display_name || user.username)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td>${user.blocked ? 'Blocked' : 'Active'}</td>
                <td>${Number(user.games_played)}</td>
                <td>${Number(user.best_score).toLocaleString()}</td>
                <td>${escapeHtml(user.created_at)}</td>
                <td><div class="admin-actions">
                    ${user.role === 'admin'
                        ? '<span>Protected</span>'
                        : `<button class="admin-action-button" type="button" data-admin-action="${user.blocked ? 'unblock' : 'block'}" data-username="${escapeHtml(user.username)}">${user.blocked ? 'Unblock' : 'Block'}</button>
                           <button class="admin-action-button admin-danger" type="button" data-admin-action="delete" data-username="${escapeHtml(user.username)}">Delete</button>`}
                </div></td>
            </tr>
        `).join('');
        const guestRows = data.guests.map(guest => `
            <tr>
                <td>Guest (no login)</td>
                <td>${escapeHtml(guest.player_name)}</td>
                <td>${Number(guest.games_played)}</td>
                <td>${escapeHtml(guest.last_played)}</td>
            </tr>
        `).join('');
        const scoreRows = data.scores.map(score => `
            <tr>
                <td>${escapeHtml(score.username)}</td>
                <td>${Number(score.score).toLocaleString()}</td>
                <td>${Number(score.correct)}</td>
                <td>${escapeHtml(score.date || '')}</td>
            </tr>
        `).join('');
        const friendMatchRows = (data.friendMatches || []).map(match => `
            <tr>
                <td>${escapeHtml(match.player_name)} (${escapeHtml(match.username)})</td>
                <td>${escapeHtml(match.friend_name)}</td>
                <td>${Number(match.player_score).toLocaleString()} (${Number(match.player_correct)}/10) – ${Number(match.friend_score).toLocaleString()} (${Number(match.friend_correct)}/10)</td>
                <td>${escapeHtml(match.winner === 'Draw' ? 'Draw' : `${match.winner} won`)}</td>
                <td>${escapeHtml(match.date || '')}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <p class="admin-message" id="admin-message" role="status">${escapeHtml(adminActionMessage)}</p>
            <div class="admin-summary">
                <span class="info-chip">👥 ${Number(data.playerCount)} players</span>
                <span class="info-chip">🎮 ${Number(data.gameCount)} games played</span>
                <span class="info-chip">🏆 ${Number(data.scoreCount)} saved scores</span>
            </div>
            <h3 class="admin-section-title">Registered players</h3>
            <table class="admin-table">
                <thead><tr><th>Login</th><th>Player name</th><th>Role</th><th>Status</th><th>Games</th><th>Best score</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>${userRows || '<tr><td colspan="8">No registered accounts.</td></tr>'}</tbody>
            </table>
            <h3 class="admin-section-title">Guest / test players</h3>
            <table class="admin-table">
                <thead><tr><th>Login</th><th>Player name</th><th>Games</th><th>Last played</th></tr></thead>
                <tbody>${guestRows || '<tr><td colspan="4">No guest players have completed a game.</td></tr>'}</tbody>
            </table>
            <h3 class="admin-section-title">Recent top scores</h3>
            <table class="admin-table">
                <thead><tr><th>Player</th><th>Score</th><th>Correct</th><th>Date</th></tr></thead>
                <tbody>${scoreRows || '<tr><td colspan="4">No saved scores yet.</td></tr>'}</tbody>
            </table>
            <h3 class="admin-section-title">Play with a friend results</h3>
            <table class="admin-table">
                <thead><tr><th>Registered player</th><th>Friend</th><th>Final scores</th><th>Result</th><th>Date</th></tr></thead>
                <tbody>${friendMatchRows || '<tr><td colspan="5">No friend matches recorded yet.</td></tr>'}</tbody>
            </table>
        `;
        container.onclick = handleAdminActionClick;
    } catch (error) {
        container.innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
        console.error('[admin] Dashboard load failed:', error);
    }
}

async function handleAdminActionClick(event) {
    const button = event.target.closest('[data-admin-action]');
    if (!button) return;

    const action = button.dataset.adminAction;
    const username = button.dataset.username;
    if (action === 'delete'
        && !window.confirm(`Permanently delete ${username} and their saved scores?`)) {
        return;
    }

    button.disabled = true;
    try {
        const response = await fetch('api/admin.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': localStorage.getItem('bb_token') || ''
            },
            body: JSON.stringify({ action, username })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Server returned HTTP ${response.status}`);
        }

        adminActionMessage = data.message;
        await loadAdminDashboard();
    } catch (error) {
        adminActionMessage = error.message;
        await loadAdminDashboard();
        console.error('[admin] Account action failed:', error);
    }
}
