// ===== auth.js - Firebase Authentication =====

// Get Firebase Auth reference
const auth = firebase.auth();

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is logged in - show dashboard
        console.log('User logged in:', user.email);
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        
        // Show user email in header
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
        
        // Trigger event to load dashboard data
        window.dispatchEvent(new Event('userLoggedIn'));
    } else {
        // User is logged out - show login screen
        console.log('User logged out');
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainDashboard').classList.add('hidden');
    }
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    // Show loading state
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    errorDiv.classList.add('hidden');
    
    try {
        // Sign in with Firebase
        await auth.signInWithEmailAndPassword(email, password);
        // Success! auth.onAuthStateChanged will handle the rest
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Show appropriate error message
        errorDiv.classList.remove('hidden');
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorDiv.textContent = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorDiv.textContent = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorDiv.textContent = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                errorDiv.textContent = 'This account has been disabled.';
                break;
            case 'auth/too-many-requests':
                errorDiv.textContent = 'Too many failed login attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorDiv.textContent = 'Network error. Please check your internet connection.';
                break;
            default:
                errorDiv.textContent = 'Login failed. Please try again.';
        }
        
        // Reset button state
        loginBtn.textContent = 'Sign In';
        loginBtn.disabled = false;
    }
});

// Handle logout button click
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const logoutBtn = document.getElementById('logoutBtn');
    
    try {
        // Show loading state
        logoutBtn.textContent = 'Logging out...';
        logoutBtn.disabled = true;
        
        await auth.signOut();
        // Success! auth.onAuthStateChanged will handle showing login screen
        
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
        
        // Reset button state
        logoutBtn.textContent = 'Logout';
        logoutBtn.disabled = false;
    }
});

// Optional: Add "Enter" key support for login
document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});
