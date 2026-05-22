// public/js/main.js - Tumeanza upya na kuhakikisha kila kitu kinafanya kazi

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('MarketHub App Started');
    
    // Initialize all features
    initializeApp();
});

function initializeApp() {
    // Check authentication
    checkAuth();
    
    // Load currencies
    loadCurrencies();
    
    // Load stats
    loadStats();
    
    // Setup all event listeners
    setupAllEventListeners();
    
    // Load products
    loadProducts();
    
    // Load locations
    loadLocations();
}

// Global variables
let currentUser = null;
let currentSocket = null;
let currentChatId = null;
let currentCurrency = 'USD';
let availableCurrencies = [];
let currentCategory = 'all';
let currentSearchTerm = '';
let currentSort = 'newest';

// API URL
const API_URL = window.location.origin;

// ============= AUTHENTICATION FUNCTIONS =============

async function checkAuth() {
    const token = localStorage.getItem('token');
    console.log('Checking auth, token exists:', !!token);
    
    if (token) {
        try {
            const response = await fetch(`${API_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            
            if (!user.error) {
                currentUser = user;
                console.log('User logged in:', currentUser.fullName);
                showUserMenu();
                connectSocket();
                loadUserChats();
            } else {
                console.log('Invalid token, logging out');
                logout();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            logout();
        }
    }
}

function showUserMenu() {
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    
    if (authLinks && userMenu) {
        authLinks.style.display = 'none';
        userMenu.style.display = 'flex';
        
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) userName.textContent = currentUser.fullName?.split(' ')[0] || 'User';
        if (userAvatar) userAvatar.src = currentUser.avatar || 'https://ui-avatars.com/api/?name=User';
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    
    if (currentSocket) {
        currentSocket.disconnect();
    }
    
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    
    if (authLinks) authLinks.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    
    showView('products');
    loadProducts();
    showToast('Logged out successfully', 'success');
}

// ============= UI FUNCTIONS =============

function showView(view) {
    console.log('Showing view:', view);
    
    const productsView = document.getElementById('productsView');
    const sellView = document.getElementById('sellView');
    const messagesView = document.getElementById('messagesView');
    const myProductsView = document.getElementById('myProductsView');
    
    // Hide all views
    if (productsView) productsView.style.display = 'none';
    if (sellView) sellView.style.display = 'none';
    if (messagesView) messagesView.style.display = 'none';
    if (myProductsView) myProductsView.style.display = 'none';
    
    // Show selected view
    if (view === 'products' && productsView) productsView.style.display = 'block';
    else if (view === 'sell' && sellView) sellView.style.display = 'block';
    else if (view === 'messages' && messagesView) messagesView.style.display = 'grid';
    else if (view === 'myProducts' && myProductsView) myProductsView.style.display = 'block';
}

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'block';
}

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) modal.style.display = 'block';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#EF4444' : '#10B981';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ============= EVENT LISTENERS =============

function setupAllEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    const homeLink = document.getElementById('homeLink');
    const sellLink = document.getElementById('sellLink');
    const messagesLink = document.getElementById('messagesLink');
    const myProductsLink = document.getElementById('myProductsLink');
    
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            showView('products');
            loadProducts();
        });
    }
    
    if (sellLink) {
        sellLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast('Please login to sell products', 'error');
                showLoginModal();
                return;
            }
            showView('sell');
        });
    }
    
    if (messagesLink) {
        messagesLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showLoginModal();
                return;
            }
            showView('messages');
            loadUserChats();
        });
    }
    
    if (myProductsLink) {
        myProductsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showLoginModal();
                return;
            }
            showView('myProducts');
            loadMyProducts();
        });
    }
    
    // Auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            showLoginModal();
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('Register button clicked');
            showRegisterModal();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('Logout button clicked');
            logout();
        });
    }
    
    // Hero buttons
    const heroSellBtn = document.getElementById('heroSellBtn');
    const heroBrowseBtn = document.getElementById('heroBrowseBtn');
    
    if (heroSellBtn) {
        heroSellBtn.addEventListener('click', () => {
            if (currentUser) {
                showView('sell');
            } else {
                showToast('Please login to sell products', 'error');
                showLoginModal();
            }
        });
    }
    
    if (heroBrowseBtn) {
        heroBrowseBtn.addEventListener('click', () => {
            showView('products');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Search
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchProducts);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchProducts();
        });
    }
    
    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const sellForm = document.getElementById('sellForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', register);
    }
    
    if (sellForm) {
        sellForm.addEventListener('submit', submitProduct);
    }
    
    // Cancel buttons
    const cancelSellBtn = document.getElementById('cancelSellBtn');
    if (cancelSellBtn) {
        cancelSellBtn.addEventListener('click', () => showView('products'));
    }
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = category;
            loadProducts(category);
            showView('products');
        });
    });
    
    // Forgot password links
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const backToLogin = document.getElementById('backToLogin');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('forgotPasswordModal').style.display = 'block';
        });
    }
    
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            showRegisterModal();
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerModal').style.display = 'none';
            showLoginModal();
        });
    }
    
    if (backToLogin) {
        backToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('forgotPasswordModal').style.display = 'none';
            showLoginModal();
        });
    }
    
    // Forgot password form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', forgotPassword);
    }
    
    // Reset password form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', resetPassword);
    }
    
    // Password confirmation on register
    const regPassword = document.getElementById('regPassword');
    const regConfirmPassword = document.getElementById('regConfirmPassword');
    
    if (regConfirmPassword) {
        regConfirmPassword.addEventListener('input', function() {
            if (regPassword.value !== this.value) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    console.log('All event listeners setup complete');
}

// Replace your entire register function with this one

async function register(event) {
    // Prevent form from submitting normally
    if (event) event.preventDefault();
    
    console.log('Register function called');
    
    // Get all form values
    const fullName = document.getElementById('regFullName')?.value.trim();
    const username = document.getElementById('regUsername')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    const country = document.getElementById('regCountry')?.value || 'Tanzania';
    const phone = document.getElementById('regPhone')?.value || '';
    
    // Validation checks
    if (!fullName || !username || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
        console.log('Passwords do not match:', password, confirmPassword);
        showToast('Passwords do not match! Please check and try again.', 'error');
        
        // Highlight the mismatch
        const confirmInput = document.getElementById('regConfirmPassword');
        if (confirmInput) {
            confirmInput.style.borderColor = '#EF4444';
            confirmInput.style.backgroundColor = '#FEF2F2';
        }
        return;
    }
    
    // Check password length
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Check email format
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('registerSubmitBtn');
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        const userData = {
            fullName: fullName,
            username: username,
            email: email,
            password: password,
            country: country,
            phone: phone
        };
        
        console.log('Sending registration data:', { ...userData, password: '***' });
        
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        console.log('Registration response:', data);
        
        if (data.token) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            // Update UI
            showUserMenu();
            
            // Close modal
            const registerModal = document.getElementById('registerModal');
            if (registerModal) registerModal.style.display = 'none';
            
            // Reset form
            document.getElementById('registerForm').reset();
            
            // Connect socket
            connectSocket();
            
            // Reload products
            loadProducts();
            
            // Show success message
            showToast(`Welcome to MarketHub, ${data.user.fullName}! 🎉`, 'success');
            
            console.log('Registration successful!');
        } else {
            showToast(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please check your connection.', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Add real-time password match checking
function setupPasswordMatchCheck() {
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');
    const errorDiv = document.getElementById('passwordMatchError');
    const successDiv = document.getElementById('passwordMatchSuccess');
    
    if (!passwordInput || !confirmInput) {
        console.log('Password fields not found');
        return;
    }
    
    function checkPasswords() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (confirm.length === 0) {
            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            confirmInput.style.borderColor = '#E5E7EB';
            confirmInput.style.backgroundColor = 'white';
            return;
        }
        
        if (password === confirm) {
            // Passwords match
            if (errorDiv) errorDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'block';
            confirmInput.style.borderColor = '#10B981';
            confirmInput.style.backgroundColor = '#F0FDF4';
        } else {
            // Passwords don't match
            if (errorDiv) errorDiv.style.display = 'block';
            if (successDiv) successDiv.style.display = 'none';
            confirmInput.style.borderColor = '#EF4444';
            confirmInput.style.backgroundColor = '#FEF2F2';
        }
    }
    
    passwordInput.addEventListener('input', checkPasswords);
    confirmInput.addEventListener('input', checkPasswords);
}

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up password match...');
    setupPasswordMatchCheck();
    
    // Make sure register form has correct event listener
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Remove any existing listeners
        const newForm = registerForm.cloneNode(true);
        registerForm.parentNode.replaceChild(newForm, registerForm);
        
        // Add new listener
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            register(e);
        });
        console.log('Register form listener attached');
    }
});

// ============= PRODUCT FUNCTIONS =============

async function loadProducts(category = 'all', search = '') {
    console.log('Loading products...');
    
    let url = `${API_URL}/api/products?currency=${currentCurrency}`;
    if (category && category !== 'all') url += `&category=${category}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    try {
        const response = await fetch(url);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products', 'error');
    }
}

function displayProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    if (!products.length) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No products found</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="showProductDetail('${product.id}')">
            ${product.condition === 'new' ? '<div class="product-badge">New</div>' : ''}
            <img src="${product.images[0] || 'https://via.placeholder.com/300'}" class="product-image" onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info">
                <div class="product-title">${escapeHtml(product.title)}</div>
                <div class="product-price">${formatPrice(product.price, product.displayCurrency)}</div>
                <div class="product-seller">
                    <img src="${product.seller?.avatar || 'https://ui-avatars.com/api/?name=User'}" class="seller-avatar">
                    <span class="seller-name">${escapeHtml(product.seller?.fullName || 'Unknown')}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function formatPrice(price, currencyCode) {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${price.toLocaleString()}`;
}

function getCurrencySymbol(currencyCode) {
    const symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'TZS': 'TSh', 
        'KES': 'KSh', 'UGX': 'USh', 'NGN': '₦', 'GHS': '₵',
        'ZAR': 'R', 'INR': '₹', 'CNY': '¥', 'JPY': '¥'
    };
    return symbols[currencyCode] || currencyCode;
}

// ============= AUTH FUNCTIONS =============

async function login(e) {
    e.preventDefault();
    console.log('Login attempt...');
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            document.getElementById('loginModal').style.display = 'none';
            connectSocket();
            loadUserChats();
            loadProducts();
            showToast(`Welcome back, ${data.user.fullName}!`, 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function register(e) {
    e.preventDefault();
    console.log('Register attempt...');
    
    const fullName = document.getElementById('regFullName')?.value;
    const username = document.getElementById('regUsername')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    if (!fullName || !username || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, email, password })
        });
        
        const data = await response.json();
        console.log('Register response:', data);
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            document.getElementById('registerModal').style.display = 'none';
            connectSocket();
            loadProducts();
            showToast(`Welcome to MarketHub, ${data.user.fullName}!`, 'success');
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============= CHAT FUNCTIONS =============

function connectSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    currentSocket = io(API_URL, { auth: { token } });
    
    currentSocket.on('connect', () => {
        console.log('Socket connected');
    });
    
    currentSocket.on('new_message', (message) => {
        if (currentChatId === message.chatId) {
            displayMessage(message);
        }
        loadUserChats();
    });
    
    currentSocket.on('message_notification', (data) => {
        showToast(`New message about ${data.productTitle}`, 'info');
        loadUserChats();
    });
}

async function loadUserChats() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/api/chats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const chats = await response.json();
        
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        if (!chats.length) {
            chatsList.innerHTML = '<p style="text-align: center; padding: 1rem;">No conversations yet</p>';
            return;
        }
        
        chatsList.innerHTML = chats.map(chat => `
            <div class="chat-item" onclick="openChat('${chat.id}')">
                <img src="${chat.otherUser?.avatar || 'https://ui-avatars.com/api/?name=User'}" class="chat-avatar">
                <div class="chat-info">
                    <div class="chat-name">${escapeHtml(chat.otherUser?.fullName || 'User')}</div>
                    <div class="chat-last-message">${chat.lastMessage ? escapeHtml(chat.lastMessage.message.substring(0, 50)) : 'No messages'}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

// ============= PRODUCT SUBMISSION =============

async function submitProduct(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login to sell products', 'error');
        showLoginModal();
        return;
    }
    
    const formData = new FormData(e.target);
    const images = document.querySelector('input[name="images"]')?.files;
    
    if (!images || images.length === 0) {
        showToast('Please upload at least one image', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Listing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            showToast('Product listed successfully!', 'success');
            e.target.reset();
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) imagePreview.innerHTML = '';
            showView('products');
            loadProducts();
        } else {
            const error = await response.json();
            showToast(error.error || 'Error listing product', 'error');
        }
    } catch (error) {
        console.error('Submit product error:', error);
        showToast('Network error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============= FORGOT PASSWORD FUNCTIONS =============

async function forgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail')?.value;
    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('forgotPasswordModal').style.display = 'none';
            
            if (data.resetToken) {
                document.getElementById('resetToken').value = data.resetToken;
                document.getElementById('resetPasswordModal').style.display = 'block';
            }
        } else {
            showToast(data.error || 'Failed to send reset link', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function resetPassword(e) {
    e.preventDefault();
    
    const token = document.getElementById('resetToken')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmNewPassword')?.value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Password reset successful! Please login.', 'success');
            document.getElementById('resetPasswordModal').style.display = 'none';
            showLoginModal();
        } else {
            showToast(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ============= HELPER FUNCTIONS =============

function searchProducts() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    loadProducts(currentCategory, searchTerm);
    showView('products');
}

async function loadMyProducts() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/api/my-products`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const products = await response.json();
        
        const container = document.getElementById('myProductsGrid');
        if (!container) return;
        
        if (!products.length) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">You haven\'t listed any products yet.</p>';
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${product.images[0] || 'https://via.placeholder.com/300'}" class="product-image">
                <div class="product-info">
                    <div class="product-title">${escapeHtml(product.title)}</div>
                    <div class="product-price">${formatPrice(product.price, product.currency)}</div>
                    <button onclick="deleteProduct('${product.id}')" style="background: #EF4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin-top: 0.5rem;">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading my products:', error);
    }
}

window.deleteProduct = async function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const response = await fetch(`${API_URL}/api/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
                showToast('Product deleted', 'success');
                loadMyProducts();
                loadProducts();
            }
        } catch (error) {
            showToast('Error deleting product', 'error');
        }
    }
};

window.showProductDetail = async function(productId) {
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}?currency=${currentCurrency}`);
        const product = await response.json();
        
        const modal = document.getElementById('productModal');
        const detailDiv = document.getElementById('productDetail');
        
        if (!modal || !detailDiv) return;
        
        detailDiv.innerHTML = `
            <h2>${escapeHtml(product.title)}</h2>
            <img src="${product.images[0] || 'https://via.placeholder.com/300'}" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;">
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${formatPrice(product.price, product.displayCurrency)}</div>
            <p><strong>Category:</strong> ${product.category}</p>
            <p><strong>Condition:</strong> ${product.condition}</p>
            <p><strong>Description:</strong> ${escapeHtml(product.description)}</p>
            <p><strong>Seller:</strong> ${escapeHtml(product.seller?.fullName || 'Unknown')}</p>
            ${currentUser && currentUser.id !== product.sellerId ? 
                `<button onclick="startChat('${product.id}')" class="btn-primary" style="margin-top: 1rem; width: 100%; padding: 0.75rem;">
                    <i class="fas fa-comment"></i> Contact Seller
                </button>` : ''
            }
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error showing product detail:', error);
    }
};

window.startChat = async function(productId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ productId, buyerId: currentUser.id })
        });
        
        const chat = await response.json();
        document.getElementById('productModal').style.display = 'none';
        showView('messages');
        loadUserChats();
        setTimeout(() => openChat(chat.id), 500);
    } catch (error) {
        showToast('Error starting chat', 'error');
    }
};

window.openChat = async function(chatId) {
    currentChatId = chatId;
    
    try {
        const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const messages = await response.json();
        
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === currentUser?.id ? 'message-sent' : 'message-received'}">
                <div>${escapeHtml(msg.message)}</div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.style.display = 'flex';
        
        if (currentSocket) {
            currentSocket.emit('join_chat', chatId);
        }
    } catch (error) {
        console.error('Error opening chat:', error);
    }
};

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();
    
    if (!message || !currentChatId || !currentSocket) return;
    
    currentSocket.emit('send_message', {
        chatId: currentChatId,
        message: message
    });
    
    messageInput.value = '';
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser?.id ? 'message-sent' : 'message-received'}`;
    messageDiv.innerHTML = `
        <div>${escapeHtml(message.message)}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============= CURRENCY FUNCTIONS =============

async function loadCurrencies() {
    try {
        const response = await fetch(`${API_URL}/api/currencies`);
        const data = await response.json();
        availableCurrencies = data.currencies || [];
        
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency) {
            currentCurrency = savedCurrency;
        }
        
        updateCurrencyDisplay();
    } catch (error) {
        console.error('Error loading currencies:', error);
    }
}

function updateCurrencyDisplay() {
    const currentCurrencySpan = document.getElementById('currentCurrencyCode');
    if (currentCurrencySpan) {
        currentCurrencySpan.textContent = currentCurrency;
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const stats = await response.json();
        
        const statProducts = document.getElementById('statProducts');
        const statUsers = document.getElementById('statUsers');
        
        if (statProducts) statProducts.textContent = `${stats.totalProducts || 0}+`;
        if (statUsers) statUsers.textContent = `${stats.totalUsers || 0}+`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadLocations() {
    // Optional: Load locations for filter
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.showProductDetail = showProductDetail;
window.startChat = startChat;
window.openChat = openChat;
window.deleteProduct = deleteProduct;
window.sendMessage = sendMessage;
