// Global Variables
// Supabase client setup
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_KEY = 'YOUR_ANON_KEY'; // Replace with your Supabase anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ...existing code...
let currentUser = null;
let isAdmin = false;
let batches = [];
let studyMaterials = [];
let galleryImages = [];
let users = []; // Store registered users
let userCounter = 1; // For generating unique user IDs

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    renderContent();
    // Remove local pendingUsers, will fetch from Supabase
    window.pendingUsers = [];

function loadLocalData() {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        if (users.length > 0) {
            userCounter = Math.max(...users.map(u => parseInt(u.id.split('_')[1]))) + 1;
        }
    }
    const savedPending = localStorage.getItem('pendingUsers');
    if (savedPending) {
        pendingUsers = JSON.parse(savedPending);
    }
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = currentUser.role === 'admin';
        updateUIForUser();
    }
}

function saveLocalData() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('pendingUsers', JSON.stringify(pendingUsers));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

document.addEventListener('DOMContentLoaded', function() {
    loadLocalData();
    setupEventListeners();
    loadSampleData();
    renderContent();
});

async function handleLocalSignup(event) {
    event.preventDefault();
    const form = event.target;
    const password = form.signupPassword.value;
    const confirmPassword = form.signupConfirmPassword.value;
    if (password !== confirmPassword) {
        document.getElementById('auth-message').innerText = 'Passwords do not match.';
        return;
    }
    const email = form.signupEmail.value;
    const mobile = form.signupMobile.value;
    // Check if user already exists in Supabase
    const { data: existing, error: existErr } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${email},mobile.eq.${mobile}`);
    if (existing && existing.length > 0) {
        document.getElementById('auth-message').innerText = 'User with this email or mobile already exists.';
        return;
    }
    // Create auth user (but do not allow login until approved)
    const { user, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        document.getElementById('auth-message').innerText = error.message;
        return;
    }
    // Insert profile with status 'pending'
    await supabase.from('profiles').insert([{
        id: user.id,
        studentName: form.signupStudentName.value,
        parentName: form.signupParentName.value,
        email: email,
        mobile: mobile,
        standard: form.signupStandard.value,
        school: form.signupSchool.value,
        subjects: form.signupSubjects.value,
        address: form.signupAddress.value,
        status: 'pending',
        role: 'student',
        registrationDate: new Date().toISOString(),
        lastLogin: null
    }]);
    // Notify admin in notifications table
    await supabase.from('notifications').insert([{
        type: 'signup',
        user_id: user.id,
        studentName: form.signupStudentName.value,
        email: email,
        date: new Date().toISOString(),
        read: false
    }]);
    document.getElementById('auth-message').innerText = 'Your Request is Submitted.';
    closeSignupModal();
}

async function handleLocalLogin(event) {
    event.preventDefault();
    const form = event.target;
    const emailOrMobile = form.studentEmail.value;
    const password = form.studentPassword.value;
    // Find user by email/mobile in Supabase profiles
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${emailOrMobile},mobile.eq.${emailOrMobile}`);
    if (!profiles || profiles.length === 0) {
        document.getElementById('auth-message').innerText = 'Invalid credentials.';
        return;
    }
    const userProfile = profiles[0];
    // Try login via Supabase auth
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: userProfile.email, password });
    if (loginErr) {
        document.getElementById('auth-message').innerText = 'Invalid credentials.';
        return;
    }
    // Check approval
    if (userProfile.status === 'active') {
        currentUser = userProfile;
        isAdmin = userProfile.role === 'admin';
        await supabase.from('profiles').update({ lastLogin: new Date().toISOString() }).eq('id', userProfile.id);
        updateUIForUser();
        closeLoginModal();
        document.getElementById('auth-message').innerText = 'Login successful!';
    } else {
        document.getElementById('auth-message').innerText = 'Your account is pending approval.';
        await supabase.auth.signOut();
    }
}

async function approveUser(userId) {
    // Update user status in Supabase
    await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
    // Mark notification as read
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    renderUsersList();
    renderNotificationsPanel();
    renderPendingUsers();
}

function rejectUser(userId) {
    const idx = pendingUsers.findIndex(u => u.id === userId);
    if (idx > -1) {
        pendingUsers.splice(idx, 1);
        saveLocalData();
        renderUsersList();
    }
}
});

// Initialize the application
function initializeApp() {
    // Load users from localStorage
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
        // Find the highest user ID to set the counter
        if (users.length > 0) {
            userCounter = Math.max(...users.map(u => parseInt(u.id.split('_')[1]))) + 1;
        }
    }
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAdmin = currentUser.role === 'admin';
        updateUIForUser();
    }
}

// Setup event listeners
function setupEventListeners() {
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }

    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('loginModal')) {
            closeLoginModal();
        }
        if (event.target === document.getElementById('adminDashboard')) {
            closeAdminDashboard();
        }
    });

    setupFormSubmissions();
    setupFilters();
}

// Setup form submissions
function setupFormSubmissions() {
    const joinForm = document.getElementById('joinForm');
    if (joinForm) {
        joinForm.addEventListener('submit', handleJoinForm);
    }

    const studentLoginForm = document.getElementById('studentLoginForm');
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', handleStudentLogin);
    }

    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    const batchForm = document.getElementById('batchForm');
    if (batchForm) {
        batchForm.addEventListener('submit', handleBatchForm);
    }

    const materialForm = document.getElementById('materialForm');
    if (materialForm) {
        materialForm.addEventListener('submit', handleMaterialForm);
    }

    const galleryForm = document.getElementById('galleryForm');
    if (galleryForm) {
        galleryForm.addEventListener('submit', handleGalleryForm);
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupForm);
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPasswordForm);
    }

    // User management event listeners
    const userSearch = document.getElementById('userSearch');
    const userStatusFilter = document.getElementById('userStatusFilter');
    
    if (userSearch) {
        userSearch.addEventListener('input', renderUsersList);
    }
    
    if (userStatusFilter) {
        userStatusFilter.addEventListener('change', renderUsersList);
    }
}

// Setup filters
function setupFilters() {
    const subjectFilter = document.getElementById('subjectFilter');
    const gradeFilter = document.getElementById('gradeFilter');

    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterMaterials);
    }
    if (gradeFilter) {
        gradeFilter.addEventListener('change', filterMaterials);
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal functions
function openLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openSignupModal() {
    closeLoginModal();
    const signupModal = document.getElementById('signupModal');
    signupModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSignupModal() {
    const signupModal = document.getElementById('signupModal');
    signupModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openForgotPasswordModal() {
    closeLoginModal();
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    forgotPasswordModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    forgotPasswordModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openAdminDashboard() {
    const adminDashboard = document.getElementById('adminDashboard');
    adminDashboard.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderAdminDashboard();
}

function closeAdminDashboard() {
    const adminDashboard = document.getElementById('adminDashboard');
    adminDashboard.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Tab switching functions
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Login`).classList.add('active');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[onclick="switchAdminTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Form handling functions
function handleJoinForm(event) {
    event.preventDefault();
    
    const formData = {
        studentName: document.getElementById('studentName').value,
        parentName: document.getElementById('parentName').value,
        contact: document.getElementById('contact').value,
        email: document.getElementById('email').value,
        standard: document.getElementById('standard').value,
        subjects: document.getElementById('subjects').value,
        timestamp: new Date().toISOString()
    };

    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    applications.push(formData);
    localStorage.setItem('applications', JSON.stringify(applications));

    showMessage('Application submitted successfully! We will contact you soon.', 'success');
    event.target.reset();
}

function handleStudentLogin(event) {
    event.preventDefault();
    
    const emailOrMobile = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;

    if (emailOrMobile && password) {
        // Find user by email or mobile
        const user = users.find(u => 
            (u.email === emailOrMobile || u.mobile === emailOrMobile) && 
            u.password === password && 
            u.status === 'active'
        );
        
        if (user) {
            currentUser = {
                id: user.id,
                email: user.email,
                mobile: user.mobile,
                role: 'student',
                name: user.studentName,
                standard: user.standard
            };
            
            // Update last login
            user.lastLogin = new Date().toISOString();
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            isAdmin = false;
            
            updateUIForUser();
            closeLoginModal();
            showMessage(`Welcome back, ${user.studentName}!`, 'success');
        } else {
            showMessage('Invalid credentials or account suspended.', 'error');
        }
    } else {
        showMessage('Please enter valid credentials.', 'error');
    }
}

function handleAdminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    if (username === 'admin' && password === 'admin123') {
        currentUser = {
            id: 'admin_001',
            username: username,
            role: 'admin',
            name: 'Administrator'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        isAdmin = true;
        
        updateUIForUser();
        closeLoginModal();
        openAdminDashboard();
        showMessage('Admin login successful!', 'success');
    } else {
        showMessage('Invalid admin credentials.', 'error');
    }
}

function handleBatchForm(event) {
    event.preventDefault();
    
    const batchData = {
        id: 'batch_' + Date.now(),
        subject: document.getElementById('batchSubject').value,
        grade: document.getElementById('batchGrade').value,
        date: document.getElementById('batchDate').value,
        time: document.getElementById('batchTime').value,
        duration: document.getElementById('batchDuration').value,
        capacity: parseInt(document.getElementById('batchCapacity').value),
        teacher: document.getElementById('batchTeacher').value,
        enrolled: 0,
        status: 'available',
        timestamp: new Date().toISOString()
    };

    batches.push(batchData);
    localStorage.setItem('batches', JSON.stringify(batches));
    
    showMessage('Batch created successfully!', 'success');
    event.target.reset();
    renderAdminDashboard();
    renderContent();
}

function handleMaterialForm(event) {
    event.preventDefault();
    
    const materialData = {
        id: 'material_' + Date.now(),
        title: document.getElementById('materialTitle').value,
        subject: document.getElementById('materialSubject').value,
        grade: document.getElementById('materialGrade').value,
        description: document.getElementById('materialDescription').value,
        filename: document.getElementById('materialFile').files[0]?.name || 'document.pdf',
        timestamp: new Date().toISOString()
    };

    studyMaterials.push(materialData);
    localStorage.setItem('studyMaterials', JSON.stringify(studyMaterials));
    
    showMessage('Study material uploaded successfully!', 'success');
    event.target.reset();
    renderAdminDashboard();
    renderContent();
}

function handleSignupForm(event) {
    event.preventDefault();
    
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    // Check if user already exists
    const email = document.getElementById('signupEmail').value;
    const mobile = document.getElementById('signupMobile').value;
    
    const existingUser = users.find(user => 
        user.email === email || user.mobile === mobile
    );
    
    if (existingUser) {
        showMessage('User with this email or mobile number already exists!', 'error');
        return;
    }
    
    const userData = {
        id: 'user_' + userCounter++,
        studentName: document.getElementById('signupStudentName').value,
        parentName: document.getElementById('signupParentName').value,
        email: email,
        mobile: mobile,
        standard: document.getElementById('signupStandard').value,
        school: document.getElementById('signupSchool').value,
        subjects: document.getElementById('signupSubjects').value,
        address: document.getElementById('signupAddress').value,
        password: password, // In production, this should be hashed
        status: 'active',
        registrationDate: new Date().toISOString(),
        lastLogin: null
    };
    
    users.push(userData);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Export to Excel (simulated)
    exportUserToExcel(userData);
    
    showMessage('Account created successfully! You can now login.', 'success');
    event.target.reset();
    closeSignupModal();
    openLoginModal();
}

function handleForgotPasswordForm(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const user = users.find(u => u.email === email);
    
    if (user) {
        // In production, send actual reset email
        showMessage('Password reset link sent to your email!', 'success');
        closeForgotPasswordModal();
        openLoginModal();
    } else {
        showMessage('Email not found in our records.', 'error');
    }
}

function handleGalleryForm(event) {
    event.preventDefault();
    
    const galleryData = {
        id: 'gallery_' + Date.now(),
        title: document.getElementById('galleryTitle').value,
        category: document.getElementById('galleryCategory').value,
        description: document.getElementById('galleryDescription').value,
        imageUrl: URL.createObjectURL(document.getElementById('galleryImage').files[0]),
        timestamp: new Date().toISOString()
    };

    galleryImages.push(galleryData);
    localStorage.setItem('galleryImages', JSON.stringify(galleryImages));
    
    showMessage('Gallery image uploaded successfully!', 'success');
    event.target.reset();
    renderAdminDashboard();
    renderContent();
}

// Content rendering functions
function renderContent() {
    renderClasses();
    renderStudyMaterials();
    renderGallery();
}

function renderClasses() {
    const classesGrid = document.getElementById('classesGrid');
    if (!classesGrid) return;

    if (batches.length === 0) {
        classesGrid.innerHTML = `
            <div class="class-card" style="grid-column: 1 / -1; text-align: center;">
                <h3>No Classes Available</h3>
                <p>Check back later for upcoming classes or contact us for more information.</p>
            </div>
        `;
        return;
    }

    classesGrid.innerHTML = batches.map(batch => `
        <div class="class-card">
            <div class="class-header">
                <div class="class-subject">${batch.subject}</div>
                <div class="class-status ${batch.status}">${batch.status}</div>
            </div>
            <div class="class-details">
                <div class="class-detail">
                    <i class="fas fa-graduation-cap"></i>
                    <span>Grade ${batch.grade}</span>
                </div>
                <div class="class-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(batch.date)}</span>
                </div>
                <div class="class-detail">
                    <i class="fas fa-clock"></i>
                    <span>${batch.time} (${batch.duration} min)</span>
                </div>
                <div class="class-detail">
                    <i class="fas fa-user-tie"></i>
                    <span>${batch.teacher}</span>
                </div>
                <div class="class-detail">
                    <i class="fas fa-users"></i>
                    <span>${batch.enrolled}/${batch.capacity} students</span>
                </div>
            </div>
            <button class="book-btn" onclick="bookBatch('${batch.id}')" 
                    ${batch.enrolled >= batch.capacity ? 'disabled' : ''}>
                ${batch.enrolled >= batch.capacity ? 'Class Full' : 'Book Now'}
            </button>
        </div>
    `).join('');
}

function renderStudyMaterials() {
    const materialsGrid = document.getElementById('materialsGrid');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (!materialsGrid) return;

    if (!currentUser) {
        // Show login prompt if user is not logged in
        materialsGrid.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        return;
    }

    // Hide login prompt and show materials
    if (loginPrompt) loginPrompt.style.display = 'none';
    materialsGrid.style.display = 'grid';

    if (studyMaterials.length === 0) {
        materialsGrid.innerHTML = `
            <div class="material-card" style="grid-column: 1 / -1; text-align: center;">
                <h3>No Study Materials Available</h3>
                <p>Check back later for study materials or contact us for more information.</p>
            </div>
        `;
        return;
    }

    materialsGrid.innerHTML = studyMaterials.map(material => `
        <div class="material-card">
            <div class="material-header">
                <div>
                    <div class="material-title">${material.title}</div>
                    <div class="material-subject">${material.subject}</div>
                </div>
                <div class="material-grade">Grade ${material.grade}</div>
            </div>
            <div class="material-description">${material.description}</div>
            <button class="download-btn" onclick="downloadMaterial('${material.id}')">
                <i class="fas fa-download"></i> Download
            </button>
        </div>
    `).join('');
}

function renderGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;

    if (galleryImages.length === 0) {
        galleryGrid.innerHTML = `
            <div class="gallery-item" style="grid-column: 1 / -1; text-align: center; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border-color);">
                <div>
                    <i class="fas fa-images" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <h3>No Gallery Images</h3>
                    <p>Check back later for gallery images or contact us for more information.</p>
                </div>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = galleryImages.map(image => `
        <div class="gallery-item" onclick="openImageModal('${image.id}')">
            <img src="${image.imageUrl}" alt="${image.title}">
            <div class="gallery-overlay">
                <div class="gallery-title">${image.title}</div>
                <div class="gallery-category">${image.category}</div>
            </div>
        </div>
    `).join('');
}

function renderAdminDashboard() {
    renderBatchesList();
    renderUsersList();
    renderPendingUsers();
    renderNotificationsPanel();
}

function renderBatchesList() {
    const batchesList = document.getElementById('batchesList');
    if (!batchesList) return;

    if (batches.length === 0) {
        batchesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No batches created yet.</p>';
        return;
    }

    batchesList.innerHTML = batches.map(batch => `
        <div class="batch-item">
            <div class="batch-header">
                <div class="batch-title">${batch.subject} - Grade ${batch.grade}</div>
                <div class="batch-status ${batch.status}">${batch.status}</div>
            </div>
            <div class="batch-details">
                Date: ${formatDate(batch.date)} | Time: ${batch.time} | 
                Duration: ${batch.duration} min | Teacher: ${batch.teacher} | 
                Students: ${batch.enrolled}/${batch.capacity}
            </div>
            <button onclick="deleteBatch('${batch.id}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                Delete
            </button>
        </div>
    `).join('');
}

function renderUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    if (users.length === 0) {
        usersList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No users registered yet.</p>';
        return;
    }

    const searchTerm = document.getElementById('userSearch')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';
    
    let filteredUsers = users;
    
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            user.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.mobile.includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
    }

    usersList.innerHTML = filteredUsers.map(user => `
        <div class="user-item">
            <div class="user-header">
                <div class="user-title">${user.studentName}</div>
                <div class="user-status ${user.status}">${user.status}</div>
            </div>
            <div class="user-details">
                <div><strong>Parent:</strong> ${user.parentName}</div>
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Mobile:</strong> ${user.mobile}</div>
                <div><strong>Grade:</strong> ${user.standard}</div>
                <div><strong>School:</strong> ${user.school || 'Not specified'}</div>
                <div><strong>Registration:</strong> ${new Date(user.registrationDate).toLocaleDateString()}</div>
                <div><strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
            </div>
            <div class="user-actions">
                <button onclick="toggleUserStatus('${user.id}')" class="btn-${user.status === 'active' ? 'suspend' : 'activate'}">
                    ${user.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button onclick="deleteUser('${user.id}')" class="btn-delete">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// User management functions
// Render pending users for admin approval
async function renderPendingUsers() {
    const pendingList = document.getElementById('pendingUsersList');
    if (!pendingList) return;
    const { data: pending, error } = await supabase.from('profiles').select('*').eq('status', 'pending');
    if (!pending || pending.length === 0) {
        pendingList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No pending sign-up requests.</p>';
        return;
    }
    pendingList.innerHTML = pending.map(user => `
        <div class="user-item">
            <div class="user-header">
                <div class="user-title">${user.studentName}</div>
                <div class="user-status pending">Pending</div>
            </div>
            <div class="user-details">
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Mobile:</strong> ${user.mobile}</div>
                <div><strong>Grade:</strong> ${user.standard}</div>
                <div><strong>School:</strong> ${user.school || 'Not specified'}</div>
                <div><strong>Registration:</strong> ${new Date(user.registrationDate).toLocaleDateString()}</div>
            </div>
            <div class="user-actions">
                <button onclick="approveUser('${user.id}')" class="btn-activate">Approve</button>
                <button onclick="rejectUser('${user.id}')" class="btn-delete">Reject</button>
            </div>
        </div>
    `).join('');
}

// Render notifications for admin
async function renderNotificationsPanel() {
    const notifPanel = document.getElementById('adminNotifications');
    if (!notifPanel) return;
    const { data: notifications, error } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    if (!notifications || notifications.length === 0) {
        notifPanel.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No notifications.</p>';
        return;
    }
    notifPanel.innerHTML = notifications.map(n => `
        <div class="notification-item${n.read ? ' read' : ''}">
            <div><strong>New Signup:</strong> ${n.studentName} (${n.email})</div>
            <div><small>${new Date(n.date).toLocaleString()}</small></div>
        </div>
    `).join('');
}
function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.status = user.status === 'active' ? 'suspended' : 'active';
        localStorage.setItem('users', JSON.stringify(users));
        renderUsersList();
        showMessage(`User ${user.studentName} ${user.status === 'active' ? 'activated' : 'suspended'} successfully!`, 'success');
    }
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        users = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(users));
        renderUsersList();
        showMessage('User deleted successfully!', 'success');
    }
}

// Utility functions
function bookBatch(batchId) {
    if (!currentUser) {
        showMessage('Please login to book a batch.', 'error');
        openLoginModal();
        return;
    }

    const batch = batches.find(b => b.id === batchId);
    if (batch && batch.enrolled < batch.capacity) {
        batch.enrolled++;
        if (batch.enrolled >= batch.capacity) {
            batch.status = 'full';
        }
        
        localStorage.setItem('batches', JSON.stringify(batches));
        renderContent();
        showMessage(`Successfully booked ${batch.subject} class!`, 'success');
    }
}

function downloadMaterial(materialId) {
    if (!currentUser) {
        showMessage('Please login to download materials.', 'error');
        openLoginModal();
        return;
    }

    const material = studyMaterials.find(m => m.id === materialId);
    if (material) {
        showMessage(`Downloading ${material.title}...`, 'success');
        
        setTimeout(() => {
            showMessage(`${material.title} downloaded successfully!`, 'success');
        }, 2000);
    }
}

function deleteBatch(batchId) {
    if (confirm('Are you sure you want to delete this batch?')) {
        batches = batches.filter(b => b.id !== batchId);
        localStorage.setItem('batches', JSON.stringify(batches));
        renderAdminDashboard();
        renderContent();
        showMessage('Batch deleted successfully!', 'success');
    }
}

function filterMaterials() {
    const subjectFilter = document.getElementById('subjectFilter');
    const gradeFilter = document.getElementById('gradeFilter');
    
    const subject = subjectFilter ? subjectFilter.value : '';
    const grade = gradeFilter ? gradeFilter.value : '';
    
    let filteredMaterials = studyMaterials;
    
    if (subject) {
        filteredMaterials = filteredMaterials.filter(m => m.subject.toLowerCase().includes(subject.toLowerCase()));
    }
    
    if (grade) {
        filteredMaterials = filteredMaterials.filter(m => m.grade === grade);
    }
    
    renderFilteredMaterials(filteredMaterials);
}

function renderFilteredMaterials(materials) {
    const materialsGrid = document.getElementById('materialsGrid');
    if (!materialsGrid) return;

    if (materials.length === 0) {
        materialsGrid.innerHTML = `
            <div class="material-card" style="grid-column: 1 / -1; text-align: center;">
                <h3>No Materials Found</h3>
                <p>Try adjusting your filters or check back later.</p>
            </div>
        `;
        return;
    }

    materialsGrid.innerHTML = materials.map(material => `
        <div class="material-card">
            <div class="material-header">
                <div>
                    <div class="material-title">${material.title}</div>
                    <div class="material-subject">${material.subject}</div>
                </div>
                <div class="material-grade">Grade ${material.grade}</div>
            </div>
            <div class="material-description">${material.description}</div>
            <button class="download-btn" onclick="downloadMaterial('${material.id}')">
                <i class="fas fa-download"></i> Download
            </button>
        </div>
    `).join('');
}

function updateUIForUser() {
    const loginButton = document.getElementById('loginButton');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        // Hide login button, show user menu
        loginButton.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = currentUser.name;
        
        // Update navigation based on user role
        if (isAdmin) {
            // Admin can access admin dashboard
            userName.onclick = openAdminDashboard;
        } else {
            // Regular user can access profile
            userName.onclick = () => showMessage(`Welcome back, ${currentUser.name}!`, 'success');
        }
    } else {
        // Show login button, hide user menu
        loginButton.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function openImageModal(imageId) {
    const image = galleryImages.find(img => img.id === imageId);
    if (image) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; text-align: center;">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <img src="${image.imageUrl}" alt="${image.title}" style="width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;">
                <h3 style="margin-top: 1rem; color: var(--text-primary);">${image.title}</h3>
                <p style="color: var(--text-secondary);">${image.description}</p>
                <div style="margin-top: 1rem;">
                    <span class="gallery-category">${image.category}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }
}

// Load sample data for demonstration
function loadSampleData() {
    const savedBatches = localStorage.getItem('batches');
    const savedMaterials = localStorage.getItem('studyMaterials');
    const savedGallery = localStorage.getItem('galleryImages');

    if (savedBatches) {
        batches = JSON.parse(savedBatches);
    } else {
        batches = [
            {
                id: 'batch_1',
                subject: 'Mathematics',
                grade: '9-10',
                date: '2024-01-15',
                time: '14:00',
                duration: 60,
                capacity: 15,
                teacher: 'Dr. Sarah Johnson',
                enrolled: 8,
                status: 'available',
                timestamp: new Date().toISOString()
            },
            {
                id: 'batch_2',
                subject: 'Science',
                grade: '6-8',
                date: '2024-01-16',
                time: '15:30',
                duration: 90,
                capacity: 12,
                teacher: 'Prof. Michael Chen',
                enrolled: 12,
                status: 'full',
                timestamp: new Date().toISOString()
            }
        ];
        localStorage.setItem('batches', JSON.stringify(batches));
    }

    if (savedMaterials) {
        studyMaterials = JSON.parse(savedMaterials);
    } else {
        studyMaterials = [
            {
                id: 'material_1',
                title: 'Algebra Fundamentals',
                subject: 'Mathematics',
                grade: '9-10',
                description: 'Comprehensive guide to algebraic concepts including equations, inequalities, and functions.',
                filename: 'algebra_fundamentals.pdf',
                timestamp: new Date().toISOString()
            },
            {
                id: 'material_2',
                title: 'Physics Lab Manual',
                subject: 'Science',
                grade: '11-12',
                description: 'Practical experiments and activities for understanding core physics concepts.',
                filename: 'physics_lab_manual.pdf',
                timestamp: new Date().toISOString()
            }
        ];
        localStorage.setItem('studyMaterials', JSON.stringify(studyMaterials));
    }

    if (savedGallery) {
        galleryImages = JSON.parse(savedGallery);
    } else {
        galleryImages = [
            {
                id: 'gallery_1',
                title: 'Modern Classroom',
                category: 'classroom',
                description: 'Our state-of-the-art classroom equipped with modern technology.',
                imageUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%231e293b"/><text x="200" y="150" text-anchor="middle" fill="%236366f1" font-size="24" font-family="Arial">Modern Classroom</text><text x="200" y="180" text-anchor="middle" fill="%23cbd5e1" font-size="16">Click to view</text></svg>',
                timestamp: new Date().toISOString()
            }
        ];
        localStorage.setItem('galleryImages', JSON.stringify(galleryImages));
    }
}

// Logout function
function logout() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    updateUIForUser();
    showMessage('Logged out successfully!', 'success');
}

// Faculty toggle function
function switchFaculty(facultyId, btnEl) {
    // Remove active class from all faculty cards and toggle buttons
    const facultyCards = document.querySelectorAll('.faculty-card');
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    
    facultyCards.forEach(card => card.classList.remove('active'));
    toggleBtns.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected faculty card and toggle button
    const selectedCard = document.getElementById(facultyId + '-card');
    const selectedBtn = btnEl || document.querySelector(`[onclick^="switchFaculty('${facultyId}'"]`);
    
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Google Sign-In function
function signInWithGoogle() {
    // Initialize Google Sign-In
    // Note: You need to get a Google Client ID from Google Cloud Console
    // Go to: https://console.cloud.google.com/
    // Create a project and enable Google+ API
    // Create OAuth 2.0 credentials and replace 'YOUR_GOOGLE_CLIENT_ID' below
    google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your actual Google Client ID
        callback: handleGoogleSignIn
    });
    
    google.accounts.id.prompt();
}

function handleGoogleSignIn(response) {
    // Decode the JWT token to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    // Check if user exists
    let user = users.find(u => u.email === payload.email);
    
    if (!user) {
        // Create new user from Google data
        user = {
            id: 'user_' + userCounter++,
            studentName: payload.name,
            parentName: 'Google User',
            email: payload.email,
            mobile: '',
            standard: '',
            school: '',
            subjects: '',
            address: '',
            password: 'google_auth_' + Date.now(), // Special password for Google users
            status: 'active',
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            googleId: payload.sub
        };
        
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Export to Excel
        exportUserToExcel(user);
    } else {
        // Update last login
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Set current user
    currentUser = {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        role: 'student',
        name: user.studentName,
        standard: user.standard
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    isAdmin = false;
    
    updateUIForUser();
    closeLoginModal();
    showMessage(`Welcome, ${user.studentName}!`, 'success');
}

// Excel export function
function exportUserToExcel(userData) {
    // Create CSV content (Excel can open CSV files)
    const csvContent = [
        ['Student Name', 'Parent Name', 'Email', 'Mobile', 'Standard', 'School', 'Subjects', 'Address', 'Registration Date', 'Status'],
        [
            userData.studentName,
            userData.parentName,
            userData.email,
            userData.mobile,
            userData.standard,
            userData.school,
            userData.subjects,
            userData.address,
            new Date(userData.registrationDate).toLocaleDateString(),
            userData.status
        ]
    ].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user_${userData.id}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export functions for global access
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openSignupModal = openSignupModal;
window.closeSignupModal = closeSignupModal;
window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.openAdminDashboard = openAdminDashboard;
window.closeAdminDashboard = closeAdminDashboard;
window.switchTab = switchTab;
window.switchAdminTab = switchAdminTab;
window.scrollToSection = scrollToSection;
window.bookBatch = bookBatch;
window.downloadMaterial = downloadMaterial;
window.deleteBatch = deleteBatch;
window.openImageModal = openImageModal;
window.logout = logout;
window.switchFaculty = switchFaculty;
window.signInWithGoogle = signInWithGoogle;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
window.openUserProfile = () => showMessage('User profile feature coming soon!', 'info');
window.handleDownload = handleDownload;

// Handle download button clicks - check if user is logged in
function handleDownload(materialName) {
    if (!currentUser) {
        showMessage('Please login to download study materials', 'warning');
        openLoginModal();
        return;
    }
    
    // User is logged in, proceed with download
    showMessage(`Starting download of ${materialName}...`, 'success');
    
    // Simulate download process
    setTimeout(() => {
        showMessage(`Successfully downloaded ${materialName}!`, 'success');
    }, 2000);
}
