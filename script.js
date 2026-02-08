// Read videos database from external file `videos-data.js`
let videosDatabase = window.videosDatabase || {
    'basics': [],
    'tajweed-rules': []
};

const subjects = {
    'basics': 'أساسيات التجويد',
    'tajweed-rules': 'أحكام التجويد'
};

// DOM Elements
const videoPlayerModal = document.getElementById('videoPlayerModal');
const subjectCards = document.querySelectorAll('.subject-card');
const videosSection = document.getElementById('videosSection');
const backBtn = document.getElementById('backBtn');
const closeButtons = document.querySelectorAll('.close-btn');

// Currently playing iframe URL
let currentVideoSource = null;

// Event Listeners
backBtn.addEventListener('click', goBack);
subjectCards.forEach(card => card.addEventListener('click', viewSubject));
closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === videoPlayerModal) hideSpecificModal(videoPlayerModal);
});

// Hide a specific modal element
function hideSpecificModal(modalEl) {
    if (!modalEl) return;
    // Clear iframe when closing
    if (modalEl === videoPlayerModal) {
        const videoFrame = document.getElementById('videoFrame');
        if (videoFrame && videoFrame.tagName.toLowerCase() === 'iframe') {
            videoFrame.src = '';
        }
        currentVideoSource = null;
    }
    modalEl.style.display = 'none';
}

// Generic close handler (used by close buttons)
function closeModal(e) {
    if (e && e.currentTarget) {
        const btn = e.currentTarget;
        const modal = btn.closest('.modal');
        if (modal) hideSpecificModal(modal);
        return;
    }
    hideSpecificModal(videoPlayerModal);
}

// View Subject
function viewSubject(e) {
    const subject = e.currentTarget.getAttribute('data-subject');
    const subjectTitle = subjects[subject];

    document.body.setAttribute('data-current-subject', subject);
    document.getElementById('sectionVideoTitle').textContent = subjectTitle;
    
    // Hide subjects grid, show videos
    document.querySelector('.subjects-grid').style.display = 'none';
    document.querySelector('.hero').style.display = 'none';
    videosSection.style.display = 'block';

    renderVideos(subject);
    window.scrollTo(0, 0);
}

// Load persisted database on page load
document.addEventListener('DOMContentLoaded', () => {
    // Keep using external videosDatabase from videos-data.js
});

// Render Videos
function renderVideos(subject) {
    const videosGrid = document.getElementById('videosGrid');
    const videos = videosDatabase[subject] || [];
    const sectionTitle = document.getElementById('sectionVideoTitle');
    
    sectionTitle.textContent = subjects[subject];

    if (videos.length === 0) {
        videosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <p style="font-size: 18px;">لا توجد فيديوهات في هذا القسم حالياً</p>
                <p style="margin-top: 10px;">تحقق من الفيديوهات المتاحة قريباً</p>
            </div>
        `;
        return;
    }

    videosGrid.innerHTML = videos.map(video => {
        const youtubeId = video.youtubeId;
        const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        return `
            <div class="youtube-video-card">
                <div class="video-thumbnail-container" onclick="playVideo(${video.id}, '${subject}')">
                    <img src="${thumbnailUrl}" alt="${video.title}" class="video-thumbnail">
                    <div class="play-button">▶</div>
                </div>
                <div class="video-details">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-description">${video.description}</p>
                    <div class="video-metadata">
                        <span class="duration">⏱️ ${video.duration || '--'} دقيقة</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Play Video
function playVideo(videoId, subject) {
    const video = videosDatabase[subject].find(v => v.id === videoId);
    if (!video) {
        showNotification('الفيديو غير موجود');
        return;
    }

    if (!video.youtubeId) {
        showNotification('خطأ: رقم ID الفيديو غير صحيح');
        return;
    }

    const videoFrame = document.getElementById('videoFrame');
    const playerVideoTitle = document.getElementById('playerVideoTitle');
    const playerVideoDescription = document.getElementById('playerVideoDescription');

    playerVideoTitle.textContent = video.title;
    playerVideoDescription.textContent = video.description;

    // بناء embed URL باستخدام video ID مباشرة
    const youtubeId = video.youtubeId.trim();
    const embeddedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?modestbranding=1&rel=0&controls=1&enablejsapi=0`;
    
    console.log('فيديو ID:', youtubeId);
    console.log('embed URL:', embeddedUrl);
    
    videoFrame.src = embeddedUrl;
    
    // معالجة أخطاء iframe
    videoFrame.onerror = function() {
        console.error('فشل تحميل الفيديو');
        showNotification('⚠️ الفيديو لا يدعم التضمين أو رم ID غير صاح');
    };

    currentVideoSource = embeddedUrl;
    videoPlayerModal.style.display = 'block';
}

// استخدام YouTube Video ID مباشرة فقط
// لا نحتاج لاستخراج ID - يتم تخزينها في youtubeId بشكل مباشر

// Go Back
function goBack() {
    document.querySelector('.subjects-grid').style.display = 'grid';
    document.querySelector('.hero').style.display = 'block';
    videosSection.style.display = 'none';
    document.body.removeAttribute('data-current-subject');
    window.scrollTo(0, 0);
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        if (videosSection.style.display === 'block') {
            goBack();
        }
    }
});

// ==================== ADMIN PANEL ====================
const ADMIN_PASSWORD = 'omar4664664664';

// فتح Admin Panel - إظهار نموذج تسجيل الدخول
function openAdminPanel() {
    const loginModal = document.getElementById('adminLoginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
        const passwordInput = document.getElementById('adminPasswordInput');
        if (passwordInput) {
            passwordInput.focus();
            passwordInput.value = '';
        }
    }
}

// إغلاق نموذج تسجيل الدخول
function closeAdminLoginModal() {
    const loginModal = document.getElementById('adminLoginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
        const passwordInput = document.getElementById('adminPasswordInput');
        if (passwordInput) {
            passwordInput.value = '';
        }
    }
}

// تسجيل دخول الـ Admin
function loginToAdmin() {
    const passwordInput = document.getElementById('adminPasswordInput');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
        closeAdminLoginModal();
        openFullAdminPanel();
    } else {
        passwordInput.value = '';
        showNotification('❌ كلمة المرور غير صحيحة');
    }
}

// فتح لوحة التحكم الكاملة
function openFullAdminPanel() {
    const adminPanel = document.getElementById('adminPanelModal');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        loadSavedDatabase();
        updateStats();
        loadAllVideos();
    }
}

// إغلاق لوحة التحكم
function closeAdminPanel() {
    const adminPanel = document.getElementById('adminPanelModal');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

// تحميل البيانات المحفوظة من localStorage
function loadSavedDatabase() {
    const savedDatabase = localStorage.getItem('videosDatabase');
    if (savedDatabase) {
        try {
            videosDatabase = JSON.parse(savedDatabase);
            window.videosDatabase = videosDatabase;
        } catch(e) {
            console.log('خطأ في تحميل البيانات المحفوظة');
        }
    }
}

// تحديث الإحصائيات
function updateStats() {
    const basicsCount = videosDatabase['basics'] ? videosDatabase['basics'].length : 0;
    const tajweedCount = videosDatabase['tajweed-rules'] ? videosDatabase['tajweed-rules'].length : 0;
    
    document.getElementById('statsBasics').textContent = basicsCount;
    document.getElementById('statsTajweed').textContent = tajweedCount;
    document.getElementById('statsTotal').textContent = basicsCount + tajweedCount;
}

// إضافة فيديو جديد
function addNewVideo() {
    try {
        console.log('=== بدء محاولة إضافة فيديو ===');
        
        // الحصول على العناصر بعناية
        let category = document.getElementById('videoCategory');
        let title = document.getElementById('videoTitle');
        let description = document.getElementById('videoDescription');
        let youtubeLink = document.getElementById('youtubeLink');
        let duration = document.getElementById('videoDuration');

        // إذا لم تكن موجودة، جرب البحث عنها بطريقة أخرى
        if (!category) category = document.querySelector('[id*="videoCategory"]');
        if (!title) title = document.querySelector('[id*="videoTitle"]');
        if (!description) description = document.querySelector('[id*="videoDescription"]');
        if (!youtubeLink) youtubeLink = document.querySelector('[id*="youtubeLink"]');
        if (!duration) duration = document.querySelector('[id*="videoDuration"]');

        console.log('العناصر المُكتشفة:', { 
            category: !!category, 
            title: !!title, 
            description: !!description, 
            youtubeLink: !!youtubeLink, 
            duration: !!duration 
        });

        if (!title || !description || !youtubeLink || !category) {
            console.error('لم تُعثر على بعض العناصر:');
            console.error('title:', title);
            console.error('description:', description);
            console.error('youtubeLink:', youtubeLink);
            console.error('category:', category);
            alert('❌ خطأ: العناصر المطلوبة غير موجودة');
            return;
        }

        const categoryValue = category.value || 'basics';
        const titleValue = title.value ? title.value.trim() : '';
        const descriptionValue = description.value ? description.value.trim() : '';
        let youtubeId = youtubeLink.value ? youtubeLink.value.trim() : '';
        const durationValue = duration.value ? duration.value.trim() : '';

        console.log('البيانات المدخلة:', { categoryValue, titleValue, descriptionValue, youtubeId, durationValue });

        if (!titleValue || !descriptionValue || !youtubeId) {
            alert('❌ يرجى ملء جميع الحقول المطلوبة');
            showNotification('❌ يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        // استخراج YouTube ID من الرابط الكامل إذا لزم الأمر
        if (youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')) {
            const match = youtubeId.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
            if (match && match[1]) {
                youtubeId = match[1];
                console.log('تم استخراج الـ ID:', youtubeId);
            }
        }

        console.log('الـ ID النهائي:', youtubeId);

        if (!youtubeId || youtubeId.length < 10) {
            console.error('YouTube ID غير صحيح:', youtubeId);
            alert('❌ YouTube ID غير صحيح. يجب أن يكون 11 حرف على الأقل');
            showNotification('❌ YouTube ID غير صحيح');
            return;
        }

        const newVideo = {
            id: getNextVideoId(),
            title: titleValue,
            description: descriptionValue,
            youtubeId: youtubeId,
            duration: durationValue || '--'
        };

        console.log('الفيديو الجديد:', newVideo);

        if (!videosDatabase[categoryValue]) {
            videosDatabase[categoryValue] = [];
        }
        videosDatabase[categoryValue].push(newVideo);
        
        // حفظ في localStorage
        const dataToSave = JSON.stringify(videosDatabase);
        localStorage.setItem('videosDatabase', dataToSave);

        console.log('تم حفظ الفيديو في localStorage');
        console.log('البيانات المحفوظة:', localStorage.getItem('videosDatabase'));

        // مسح النموذج
        title.value = '';
        description.value = '';
        youtubeLink.value = '';
        if (duration) duration.value = '';

        alert('✅ تم إضافة الفيديو بنجاح!');
        showNotification('✅ تم إضافة الفيديو بنجاح');
        
        // تحديث الإحصائيات والقائمة
        updateStats();
        loadAllVideos();
        
        // تحديث الفيديوهات في الصفحة الرئيسية إذا كانت مفتوحة
        const currentSubject = document.body.getAttribute('data-current-subject');
        console.log('الموضوع الحالي:', currentSubject);
        if (currentSubject) {
            renderVideos(currentSubject);
        }
        
        console.log('=== اكتمل إضافة الفيديو بنجاح ===');
    } catch (error) {
        console.error('خطأ في addNewVideo:', error);
        console.error('Stack:', error.stack);
        alert('❌ حدث خطأ: ' + error.message);
    }
}

// حذف فيديو
function deleteVideo(videoId, category) {
    if (!confirm('هل تريد حذف هذا الفيديو؟')) return;

    videosDatabase[category] = videosDatabase[category].filter(v => v.id !== videoId);
    localStorage.setItem('videosDatabase', JSON.stringify(videosDatabase));
    
    showNotification('✅ تم حذف الفيديو بنجاح');
    updateStats();
    loadAllVideos();
    
    // تحديث الفيديوهات في الصفحة الرئيسية
    const currentSubject = document.body.getAttribute('data-current-subject');
    if (currentSubject) {
        renderVideos(currentSubject);
    }
}

// تحميل جميع الفيديوهات
function loadAllVideos() {
    const videosList = document.getElementById('allVideosList');
    let html = '';

    for (let category in videosDatabase) {
        const videos = videosDatabase[category];
        
        if (videos.length > 0) {
            html += `<h3 style="color: #667eea; margin-top: 20px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">${subjects[category]}</h3>`;
            html += '<div class="videos-grid-admin">';
            
            videos.forEach(video => {
                html += `
                    <div class="video-card-admin">
                        <h4>${video.title}</h4>
                        <div class="category">${subjects[category]}</div>
                        <div class="description">${video.description}</div>
                        <div style="font-size: 12px; color: #999; margin-bottom: 10px;">⏱️ ${video.duration} دقيقة</div>
                        <button class="btn-delete-admin" onclick="deleteVideo(${video.id}, '${category}')">🗑️ حذف الفيديو</button>
                    </div>
                `;
            });
            
            html += '</div>';
        }
    }

    if (html === '') {
        html = '<div class="empty-message">📭 لا توجد فيديوهات حالياً - ابدأ بإضافة فيديو جديد</div>';
    }

    videosList.innerHTML = html;
}

// حساب ID جديد
function getNextVideoId() {
    let maxId = 0;
    for (let category in videosDatabase) {
        videosDatabase[category].forEach(video => {
            if (video.id > maxId) maxId = video.id;
        });
    }
    return maxId + 1;
}

// إغلاق modal بالضغط خارجه
window.addEventListener('click', (e) => {
    const loginModal = document.getElementById('adminLoginModal');
    const adminPanel = document.getElementById('adminPanelModal');
    
    if (loginModal && e.target === loginModal) {
        closeAdminLoginModal();
    }
    if (adminPanel && e.target === adminPanel) {
        closeAdminPanel();
    }
});

// Enter لتسجيل الدخول
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('adminPasswordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginToAdmin();
            }
        });
    }
    
    // تحميل البيانات المحفوظة
    loadSavedDatabase();
});
