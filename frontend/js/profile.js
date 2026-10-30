'use strict';

let profileAvatarUrl = null;
let profilePreviewUrl = null;

function toggleProfileEditor(forceOpen) {
    if (currentRole === 'guest' || !currentUser) return;
    const form = document.getElementById('form-profile');
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : form.classList.contains('hidden');
    form.classList.toggle('hidden', !isOpen);
    if (isOpen) {
        document.getElementById('profile-display-name').value = currentDisplayName || currentUser;
        document.getElementById('profile-error').classList.add('hidden');
        document.getElementById('profile-display-name').focus();
    } else {
        document.getElementById('profile-avatar-input').value = '';
        clearPreviewSelection();
    }
}

async function loadProfile() {
    const username = currentUser;
    const token = localStorage.getItem('bb_token');
    if (!username || !token || !['user', 'admin'].includes(currentRole)) return;

    try {
        const response = await fetch('api/profile.php?action=get', {
            headers: { 'X-Session-Token': token }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Server returned HTTP ${response.status}`);
        }
        if (currentUser !== username || localStorage.getItem('bb_token') !== token
            || !['user', 'admin'].includes(currentRole)) return;

        currentDisplayName = data.displayName;
        document.getElementById('menu-username').textContent = currentDisplayName;
        document.getElementById('profile-display-name').value = currentDisplayName;
        await loadProfileAvatar(data.hasAvatar, username, token);
    } catch (error) {
        console.error('[profile] Could not load profile:', error);
    }
}

async function loadProfileAvatar(hasAvatar, username, token) {
    if (profileAvatarUrl) {
        URL.revokeObjectURL(profileAvatarUrl);
        profileAvatarUrl = null;
    }

    const avatar = document.getElementById('menu-avatar');
    const placeholder = document.getElementById('menu-avatar-placeholder');
    const preview = document.getElementById('profile-preview-image');
    const previewPlaceholder = document.getElementById('profile-preview-placeholder');
    avatar.classList.add('hidden');
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    previewPlaceholder.classList.remove('hidden');
    avatar.removeAttribute('src');
    preview.removeAttribute('src');
    if (!hasAvatar) return;

    const response = await fetch('api/profile.php?action=avatar', {
        headers: { 'X-Session-Token': token }
    });
    if (!response.ok) {
        throw new Error(`Could not load profile picture (HTTP ${response.status}).`);
    }
    const imageUrl = URL.createObjectURL(await response.blob());
    if (currentUser !== username || localStorage.getItem('bb_token') !== token
        || !['user', 'admin'].includes(currentRole)) {
        URL.revokeObjectURL(imageUrl);
        return;
    }

    profileAvatarUrl = imageUrl;
    avatar.src = imageUrl;
    avatar.classList.remove('hidden');
    placeholder.classList.add('hidden');
    preview.src = imageUrl;
    preview.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');
}

function previewProfileAvatar() {
    const input = document.getElementById('profile-avatar-input');
    const file = input.files[0];
    const error = document.getElementById('profile-error');
    error.classList.add('hidden');
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 256 * 1024) {
        input.value = '';
        clearPreviewSelection();
        showErrorMsg(error, 'Choose a PNG, JPEG, or WebP image up to 256 KB.');
        return;
    }

    clearPreviewSelection();
    profilePreviewUrl = URL.createObjectURL(file);
    const preview = document.getElementById('profile-preview-image');
    preview.src = profilePreviewUrl;
    preview.classList.remove('hidden');
    document.getElementById('profile-preview-placeholder').classList.add('hidden');
}

function clearPreviewSelection() {
    if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
        profilePreviewUrl = null;
    }
    const preview = document.getElementById('profile-preview-image');
    const avatar = document.getElementById('menu-avatar');
    const previewPlaceholder = document.getElementById('profile-preview-placeholder');
    const avatarPlaceholder = document.getElementById('menu-avatar-placeholder');
    if (profileAvatarUrl) {
        preview.src = profileAvatarUrl;
        preview.classList.remove('hidden');
        previewPlaceholder.classList.add('hidden');
    } else {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
        previewPlaceholder.classList.remove('hidden');
    }
    if (avatar.src && profileAvatarUrl) {
        avatar.src = profileAvatarUrl;
        avatar.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
    }
}

async function saveProfile(event) {
    event.preventDefault();
    const form = document.getElementById('form-profile');
    const error = document.getElementById('profile-error');
    const button = document.getElementById('btn-save-profile');
    const displayName = document.getElementById('profile-display-name').value.trim();
    if (!displayName || [...displayName].length > 24 || /[\u0000-\u001f\u007f]/.test(displayName)) {
        showErrorMsg(error, 'Enter a display name between 1 and 24 characters.');
        return;
    }

    error.classList.add('hidden');
    button.disabled = true;
    try {
        const response = await fetch('api/profile.php?action=update', {
            method: 'POST',
            headers: { 'X-Session-Token': localStorage.getItem('bb_token') || '' },
            body: new FormData(form)
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Server returned HTTP ${response.status}`);
        }

        currentDisplayName = data.displayName;
        document.getElementById('menu-username').textContent = currentDisplayName;
        clearPreviewSelection();
        await loadProfile();
        toggleProfileEditor(false);
    } catch (saveError) {
        showErrorMsg(error, saveError.message);
        console.error('[profile] Profile update failed:', saveError);
    } finally {
        button.disabled = false;
    }
}

function clearProfileAvatar() {
    if (profileAvatarUrl) URL.revokeObjectURL(profileAvatarUrl);
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    profileAvatarUrl = null;
    profilePreviewUrl = null;
    document.getElementById('menu-avatar').classList.add('hidden');
    document.getElementById('menu-avatar').removeAttribute('src');
    document.getElementById('menu-avatar-placeholder').classList.remove('hidden');
    document.getElementById('profile-preview-image').classList.add('hidden');
    document.getElementById('profile-preview-image').removeAttribute('src');
    document.getElementById('profile-preview-placeholder').classList.remove('hidden');
    document.getElementById('profile-avatar-input').value = '';
    document.getElementById('form-profile').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function initializeProfilePreview() {
    document.getElementById('profile-avatar-input').addEventListener('change', previewProfileAvatar);
});
