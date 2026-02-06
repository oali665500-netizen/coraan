// Read videos database from external file `videos-data.js` (defined as window.videosDatabase)
// If not present, initialize an empty structure so app still works when the file is missing.
let videosDatabase = window.videosDatabase || {
    'basics': [],
    'letters': [],
    'tajweed-rules': [],
    'stopping': [],
    'practice': [],
    'advanced': []
};

// Persistence for deleted videos using localStorage
const DELETED_KEY = 'deletedVideoIds';

function getDeletedIds() {
    try {
        const raw = localStorage.getItem(DELETED_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        return new Set(arr);
    } catch (err) {
        return new Set();
    }
}

function saveDeletedIds(set) {
    try {
        localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
    } catch (err) {
        // ignore
    }
}

function applyDeletedFilter() {
    const deleted = getDeletedIds();
    for (const subjectKey in videosDatabase) {
        if (!Array.isArray(videosDatabase[subjectKey])) continue;
        videosDatabase[subjectKey] = videosDatabase[subjectKey].filter(v => !deleted.has(v.id));
    }
}

// Persistence for full videos database so uploads/edits survive reload
const VIDEOS_KEY = 'videosDatabase_v1';

function saveDatabase() {
    try {
        localStorage.setItem(VIDEOS_KEY, JSON.stringify(videosDatabase));
        return true;
    } catch (err) {
        // fallback: try to save a light-weight copy without large data URLs
        try {
            const light = JSON.parse(JSON.stringify(videosDatabase));
            for (const subj in light) {
                if (!Array.isArray(light[subj])) continue;
                light[subj] = light[subj].map(v => {
                    const copy = Object.assign({}, v);
                    if (copy.isLocal && copy.url) {
                        delete copy.url; // remove large data
                        copy._localStored = false; // mark that media blob not stored
                    }
                    return copy;
                });
            }
            localStorage.setItem(VIDEOS_KEY, JSON.stringify(light));
            showNotification('تم حفظ بيانات الفيديو (بدون ملفات الوسائط الكبيرة بسبب حد التخزين).');
            return true;
        } catch (err2) {
            console.error('Failed to save videos database:', err, err2);
            showNotification('فشل حفظ البيانات في التخزين المحلي (مساحة التخزين ممتلئة).');
            return false;
        }
    }
}

function loadPersistedDatabase() {
    try {
        const raw = localStorage.getItem(VIDEOS_KEY);
        if (!raw) {
            // if there's an external DB defined, keep it
            if (window.videosDatabase) videosDatabase = window.videosDatabase;
            return;
        }
        const parsed = JSON.parse(raw);
        // ensure all expected subject keys exist
        const expected = ['basics','letters','tajweed-rules','stopping','practice','advanced'];
        for (const k of expected) if (!Array.isArray(parsed[k])) parsed[k] = [];
        videosDatabase = parsed;
    } catch (err) {
        // fallback: keep current videosDatabase
    }
}

// IndexedDB helpers for storing video blobs
const IDB_NAME = 'myVideosDB';
const IDB_STORE = 'videoBlobs';

function openIDB() {
    return new Promise((res, rej) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = e => res(e.target.result);
        req.onerror = e => rej(e.target.error);
    });
}

function putBlob(key, blob) {
    return openIDB().then(db => new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const r = store.put(blob, key);
        r.onsuccess = () => { db.close(); res(true); };
        r.onerror = (e) => { db.close(); rej(e.target.error); };
    }));
}

function getBlob(key) {
    return openIDB().then(db => new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const r = store.get(key);
        r.onsuccess = () => { db.close(); res(r.result); };
        r.onerror = (e) => { db.close(); rej(e.target.error); };
    }));
}

function deleteBlob(key) {
    return openIDB().then(db => new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const r = store.delete(key);
        r.onsuccess = () => { db.close(); res(true); };
        r.onerror = (e) => { db.close(); rej(e.target.error); };
    }));
}

// Initialize subjects if not exists
const subjects = {
    'basics': 'أساسيات التجويد',
    'letters': 'أحكام الحروف',
    'tajweed-rules': 'أحكام التجويد',
    'stopping': 'أحكام الوقف',
    'practice': 'تطبيقات عملية',
    'advanced': 'مستويات متقدمة'
};

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const videoPlayerModal = document.getElementById('videoPlayerModal');
const uploadForm = document.getElementById('uploadForm');
const subjectCards = document.querySelectorAll('.subject-card');
const videosSection = document.getElementById('videosSection');
const backBtn = document.getElementById('backBtn');
const closeButtons = document.querySelectorAll('.close-btn');
const logoutBtn = document.getElementById('logoutBtn');

// DOM elements for auth
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const adminPasswordInput = document.getElementById('adminPassword');

// Admin password (change as needed)
const ADMIN_PASSWORD = 'omar4664664664';

// Admin state
let isAdmin = false;

// Editing state
let editingVideoId = null;
let editingVideoSubject = null;
// Currently playing blob URL (revoked on modal close)
let currentBlobUrl = null;

// Event Listeners
uploadBtn.addEventListener('click', openAuthModal);
backBtn.addEventListener('click', goBack);
subjectCards.forEach(card => card.addEventListener('click', viewSubject));
uploadForm.addEventListener('submit', handleFormSubmit);
authForm.addEventListener('submit', handleAuthSubmit);
closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

// Update admin UI (show/hide admin controls)
function updateAdminUI() {
    const logoutEl = document.getElementById('logoutBtn');
    if (logoutEl) logoutEl.style.display = isAdmin ? 'inline-block' : 'none';

    // re-render current subject to add/remove admin buttons
    const cur = document.body.getAttribute('data-current-subject');
    if (cur) renderVideos(cur);
}

// Close modal when clicking outside (handle upload, video player, auth)
window.addEventListener('click', (e) => {
    if (e.target === uploadModal) hideSpecificModal(uploadModal);
    if (e.target === videoPlayerModal) hideSpecificModal(videoPlayerModal);
    if (e.target === authModal) hideSpecificModal(authModal);
});

// Open Upload Modal (kept for backward compatibility but auth gate is used)
function openUploadModal() {
    uploadModal.style.display = 'block';
}

// Hide a specific modal element
function hideSpecificModal(modalEl) {
    if (!modalEl) return;
    // revoke any created blob URL when closing the video player
    if (modalEl === videoPlayerModal && currentBlobUrl) {
        try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
        currentBlobUrl = null;
        // restore an empty placeholder element if the player was a <video>
        const existing = document.getElementById('videoFrame');
        if (existing && existing.tagName.toLowerCase() === 'video') {
            // replace with a placeholder iframe element used elsewhere in the app
            const placeholder = document.createElement('div');
            placeholder.id = 'videoFrame';
            existing.replaceWith(placeholder);
        }
    }
    modalEl.style.display = 'none';
}

// Generic close handler (used by close buttons) - hides the modal that contains the clicked button
function closeModal(e) {
    // If called as event handler, e is the event
    if (e && e.currentTarget) {
        // The close button itself
        const btn = e.currentTarget;
        const modal = btn.closest('.modal');
        if (modal) hideSpecificModal(modal);
        return;
    }

    // If called without event, hide known modals
    hideSpecificModal(uploadModal);
    hideSpecificModal(videoPlayerModal);
    hideSpecificModal(authModal);
}

// Open Auth Modal (before upload)
function openAuthModal() {
    adminPasswordInput.value = '';
    authModal.style.display = 'block';
}

// Handle Auth Submit
function handleAuthSubmit(e) {
    e.preventDefault();
    const val = adminPasswordInput.value;
    if (val === ADMIN_PASSWORD) {
        authModal.style.display = 'none';
        // open upload modal for admin
        uploadModal.style.display = 'block';
        isAdmin = true;
        updateAdminUI();
        showNotification('مرحباً، تم التحقق. أنت الآن كأدمن.');
    } else {
        showNotification('كلمة المرور خاطئة');
        adminPasswordInput.value = '';
    }
}

function handleLogout() {
    isAdmin = false;
    updateAdminUI();
    showNotification('تم تسجيل الخروج');
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const subject = document.getElementById('subjectSelect').value;
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];

    // If editing an existing video
    if (editingVideoId && editingVideoSubject) {
        const videos = videosDatabase[editingVideoSubject] || [];
        const idx = videos.findIndex(v => v.id === editingVideoId);
        if (idx === -1) {
            showNotification('خطأ: الفيديو غير موجود');
            return;
        }

        // update fields
        videos[idx].title = title;
        videos[idx].description = description;

        // If a new file chosen, store it in IndexedDB and update blobKey
        if (file) {
            try {
                const blobKey = videos[idx].blobKey || videos[idx].id || Date.now();
                await putBlob(blobKey, file);
                videos[idx].blobKey = blobKey;
                videos[idx].fileName = file.name;
                videos[idx].isLocal = true;
            } catch (err) {
                showNotification('فشل حفظ ملف الفيديو محلياً');
                return;
            }
        }

        saveDatabase();
        finishEdit(subject);
        return;
    }

    // New video flow
    if (!file) {
        showNotification('اختر ملف فيديو أولاً');
        return;
    }

    const id = Date.now();
    try {
        await putBlob(id, file);
    } catch (err) {
        showNotification('فشل حفظ ملف الفيديو محلياً: ' + (err && err.message ? err.message : 'خطأ'));
        return;
    }

    const video = {
        id,
        title,
        description,
        isLocal: true,
        fileName: file.name,
        blobKey: id,
        duration: '0',
        uploadDate: new Date().toLocaleDateString('ar-SA')
    };

    // Add to database
    videosDatabase[subject].push(video);
    // persist new video
    saveDatabase();

    // Reset form
    uploadForm.reset();
    document.getElementById('currentFileInfo').style.display = 'none';
    closeModal();

    // Show success message
    showNotification('✅ تم إضافة الفيديو بنجاح!');

    // If viewing this subject, refresh
    const currentSubject = document.body.getAttribute('data-current-subject');
    if (currentSubject === subject) renderVideos(subject);
}

function finishEdit(subject) {
    // Reset editing state and UI
    editingVideoId = null;
    editingVideoSubject = null;
    uploadForm.reset();
    document.getElementById('currentFileInfo').style.display = 'none';
    closeModal();
    showNotification('✅ تم تحديث بيانات الفيديو');
    // persist edits
    saveDatabase();
    if (document.body.getAttribute('data-current-subject') === subject) renderVideos(subject);
}

// View Subject
function viewSubject(e) {
    const subject = e.currentTarget.getAttribute('data-subject');
    const subjectTitle = subjects[subject];

    document.body.setAttribute('data-current-subject', subject);
    document.getElementById('videoTitle').textContent = subjectTitle;
    
    // Hide subjects grid, show videos
    document.querySelector('.subjects-grid').style.display = 'none';
    document.querySelector('.hero').style.display = 'none';
    videosSection.style.display = 'block';

    renderVideos(subject);
    window.scrollTo(0, 0);
}

// Ensure admin UI is correct on load
document.addEventListener('DOMContentLoaded', () => {
    // load any previously persisted videos, then apply deleted filter
    loadPersistedDatabase();
    applyDeletedFilter();
    updateAdminUI();
});

// Render Videos
function renderVideos(subject) {
    const videosGrid = document.getElementById('videosGrid');
    const videos = videosDatabase[subject] || [];
    const videoTitle = document.getElementById('videoTitle');
    
    videoTitle.textContent = subjects[subject];

    if (videos.length === 0) {
        videosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <p style="font-size: 18px;">لا توجد فيديوهات في هذا القسم حالياً</p>
                <p style="margin-top: 10px;">انقر على "🎬 إضافة فيديو" لإضافة محتوى جديد</p>
            </div>
        `;
        return;
    }

    videosGrid.innerHTML = videos.map(video => `
        <div class="video-card" onclick="playVideo(${video.id}, '${subject}')">
            <div class="video-poster" style="background-image: url('${video.isLocal ? '' : video.poster}'); background-size: cover;">
                🎥
            </div>
            <div class="video-card-content">
                <div class="video-card-title">${video.title}</div>
                <div class="video-card-description">${video.description.substring(0, 80)}...</div>
                <div class="video-meta">
                    <span>${video.isLocal ? '💾 محلي' : '🌐 أونلاين'}</span>
                    <span>📅 ${video.uploadDate}</span>
                </div>
                ${isAdmin ? `
                <div style="margin-top:12px; display:flex; gap:8px;">
                    <button onclick="event.stopPropagation(); editVideo(${video.id}, '${subject}')" style="padding:8px 12px;border-radius:6px;border:none;background:#ffb2b2;cursor:pointer;">تعديل</button>
                    <button onclick="event.stopPropagation(); deleteVideo(${video.id}, '${subject}')" style="padding:8px 12px;border-radius:6px;border:none;background:#ff6b6b;color:#fff;cursor:pointer;">حذف</button>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Play Video
function playVideo(videoId, subject) {
    const video = videosDatabase[subject].find(v => v.id === videoId);
    if (!video) return;

    const videoFrame = document.getElementById('videoFrame');
    const playerVideoTitle = document.getElementById('playerVideoTitle');
    const playerVideoDescription = document.getElementById('playerVideoDescription');

    playerVideoTitle.textContent = video.title;
    playerVideoDescription.textContent = video.description;

    // Check if it's a local file
    if (video.isLocal) {
        // If stored in IndexedDB use blobKey, otherwise fall back to data URL
        if (video.blobKey) {
            // show modal first, then fetch blob and set source
            videoPlayerModal.style.display = 'block';
            getBlob(video.blobKey).then(blob => {
                if (!blob) { showNotification('ملف الفيديو غير موجود محلياً'); return; }
                try { if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; } } catch (e) {}
                currentBlobUrl = URL.createObjectURL(blob);
                // create video element
                const html = `<video id="videoFrame" width="100%" height="600" controls style="border-radius: 10px;">
                    <source src="${currentBlobUrl}" type="${getMimeType(video.fileName)}">
                    المتصفح الخاص بك لا يدعم عرض الفيديو
                </video>`;
                const placeholder = document.getElementById('videoFrame');
                placeholder.outerHTML = html;
                const vEl = document.getElementById('videoFrame');
                vEl.addEventListener('ended', () => { if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; } });
            }).catch(() => showNotification('خطأ في قراءة ملف الفيديو'));
            return;
        }
        if (video.url) {
            // fallback to old dataURL behavior
            videoFrame.outerHTML = `<video id="videoFrame" width="100%" height="600" controls style="border-radius: 10px;">
            <source src="${video.url}" type="${getMimeType(video.fileName)}">
            المتصفح الخاص بك لا يدعم عرض الفيديو
        </video>`;
        } else {
            showNotification('لا يوجد ملف محلي محفوظ لهذا الفيديو');
            return;
        }
    } else {
        // Convert URL to embedded format for online videos
        const embeddedUrl = convertToEmbedded(video.url);
        videoFrame.src = embeddedUrl;
    }

    videoPlayerModal.style.display = 'block';
}

// Delete video (admin only)
function deleteVideo(videoId, subject) {
    if (!isAdmin) {
        showNotification('ممنوع: تحتاج تسجيل دخول الأدمن');
        return;
    }
    const list = videosDatabase[subject] || [];
    const idx = list.findIndex(v => v.id === videoId);
    if (idx === -1) return;
    // simple confirm
    if (!confirm('هل متأكد أنك تريد حذف هذا الفيديو؟')) return;
    const removed = list.splice(idx, 1)[0];
    // persist deletion so it stays deleted after page reload
    try {
        const deleted = getDeletedIds();
        deleted.add(videoId);
        saveDeletedIds(deleted);
    } catch (err) {
        // ignore storage errors
    }
    // remove blob from IndexedDB if exists, then persist the updated videos database
    try {
        if (removed && removed.blobKey) {
            deleteBlob(removed.blobKey).catch(() => {});
        }
    } catch (e) {}
    try { saveDatabase(); } catch (e) {}
    renderVideos(subject);
    showNotification('تم حذف الفيديو');
}

// Edit video (admin only) - prefill upload modal for editing
function editVideo(videoId, subject) {
    if (!isAdmin) {
        showNotification('ممنوع: تحتاج تسجيل دخول الأدمن');
        return;
    }
    const list = videosDatabase[subject] || [];
    const video = list.find(v => v.id === videoId);
    if (!video) return;

    // set editing state
    editingVideoId = videoId;
    editingVideoSubject = subject;

    // Prefill form fields
    document.getElementById('subjectSelect').value = subject;
    document.getElementById('videoTitle').value = video.title;
    document.getElementById('videoDescription').value = video.description;
    const currentInfo = document.getElementById('currentFileInfo');
    if (video.isLocal && video.fileName) {
        currentInfo.textContent = 'ملف حالي: ' + video.fileName + ' (لا يمكن تغيير الملف تلقائياً، اختر ملفاً جديداً إذا أردت استبداله)';
        currentInfo.style.display = 'block';
    } else {
        currentInfo.textContent = 'الفيديو أونلاين أو لا يوجد ملف محلي';
        currentInfo.style.display = 'block';
    }

    // open upload modal
    uploadModal.style.display = 'block';
}

// Get MIME type from file extension
function getMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime'
    };
    return mimeTypes[ext] || 'video/mp4';
}

// Convert URL to embedded format
function convertToEmbedded(url) {
    // YouTube
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    // Vimeo
    if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1].split('?')[0];
        return `https://player.vimeo.com/video/${videoId}`;
    }
    // Direct video file
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
        return `<video width="100%" height="600" controls><source src="${url}" type="video/mp4"></video>`;
    }
    return url;
}

// Go Back
function goBack() {
    document.querySelector('.subjects-grid').style.display = 'grid';
    document.querySelector('.hero').style.display = 'block';
    videosSection.style.display = 'none';
    document.body.removeAttribute('data-current-subject');
    window.scrollTo(0, 0);
}

// Generate Default Poster
function generateDefaultPoster() {
    const colors = ['#FF6B6B', '#FF5252', '#FF6B6B', '#FF4444'];
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='250'%3E%3Crect fill='%23FF6B6B' width='400' height='250'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='white' font-size='48' font-family='Arial'%3E🎥%3C/text%3E%3C/svg%3E`;
}

// Show Notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        z-index: 2000;
        animation: slideUp 0.3s ease;
        font-weight: bold;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add some sample videos for demo
function addSampleVideos() {
    // البيانات موجودة بالفعل في videosDatabase
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        if (videosSection.style.display === 'block') {
            goBack();
        }
    }
});
