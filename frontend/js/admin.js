'use strict';

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
                <td>${Number(user.games_played)}</td>
                <td>${Number(user.best_score).toLocaleString()}</td>
                <td>${escapeHtml(user.created_at)}</td>
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

        container.innerHTML = `
            <div class="admin-summary">
                <span class="info-chip">👥 ${Number(data.userCount)} users</span>
                <span class="info-chip">🎮 ${Number(data.gameCount)} games played</span>
                <span class="info-chip">🏆 ${Number(data.scoreCount)} saved scores</span>
            </div>
            <h3 class="admin-section-title">Registered users</h3>
            <table class="admin-table">
                <thead><tr><th>Username</th><th>Display name</th><th>Role</th><th>Games</th><th>Best score</th><th>Created</th></tr></thead>
                <tbody>${userRows || '<tr><td colspan="6">No users found.</td></tr>'}</tbody>
            </table>
            <h3 class="admin-section-title">Recent top scores</h3>
            <table class="admin-table">
                <thead><tr><th>Player</th><th>Score</th><th>Correct</th><th>Date</th></tr></thead>
                <tbody>${scoreRows || '<tr><td colspan="4">No saved scores yet.</td></tr>'}</tbody>
            </table>
        `;
    } catch (error) {
        container.innerHTML = `<p class="admin-error">${escapeHtml(error.message)}</p>`;
        console.error('[admin] Dashboard load failed:', error);
    }
}
