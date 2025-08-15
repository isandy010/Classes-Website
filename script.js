// Global Variables
// Supabase client setup
const SUPABASE_URL = 'https://mxslavxuooljrdrolext.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2xhdnh1b29sanJkcm9sZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDkyMDcsImV4cCI6MjA3MDgyNTIwN30.xJE-R0ZjhHYznRKLPuQr6qT-C5oJBuTfyGiS7SpgBU0'; // Replace with your Supabase anon key
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

// ...rest of your script.js code...