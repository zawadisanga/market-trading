// Global variables
let currentUser = null;
let currentSocket = null;
let currentChatId = null;
let currentCurrency = 'USD';
let availableCurrencies = [];
let currentRegion = 'all';
let currentCategory = 'all';
let currentSearchTerm = '';
let currentSort = 'newest';
let currentMinPrice = '';
let currentMaxPrice = '';
let currentLocation = '';

// API URL
const API_URL = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCurrencies();
    loadStats();
    setupEventListeners();
    loadProducts();
    loadLocations();
});

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const stats = await response.json();
        document.getElementById('statProducts').textContent = `${stats.totalProducts}+`;
        document.getElementById('statUsers').textContent = `${stats.totalUsers}+`;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load locations
async function loadLocations() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        const locations = [...new Set(products.map(p => p.location).filter(l => l))];
        const locationSelect = document.getElementById('locationFilter');
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Load currencies
async function loadCurrencies() {
    try {
        const response = await fetch(`${API_URL}/api/currencies`);
        const data = await response.json();
        availableCurrencies = data.currencies;
        
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency && availableCurrencies.find(c => c.code === savedCurrency)) {
            currentCurrency = savedCurrency;
        }
        
        updateCurrencyDisplay();
        populateCurrencyList();
        loadProducts();
    } catch (error) {
        console.error('Error loading currencies:', error);
    }
}

// Update currency display
function updateCurrencyDisplay() {
    const currency = availableCurrencies.find(c => c.code === currentCurrency);
    if (currency) {
        document.getElementById('currentCurrencySymbol').textContent = currency.symbol;
        document.getElementById('currentCurrencyCode').textContent = currency.code;
    }
}

// Populate currency list
function populateCurrencyList() {
    const currencyList = document.getElementById('currencyList');
    if (!currencyList) return;
    
    let filteredCurrencies = availableCurrencies;
    if (currentRegion !== 'all') {
        filteredCurrencies = availableCurrencies.filter(c => c.region === currentRegion);
    }
    
    currencyList.innerHTML = filteredCurrencies.map(currency => `
        <div class="currency-option ${currency.code === currentCurrency ? 'active' : ''}" 
             data-currency="${currency.code}">
            <div class="currency-symbol">${currency.flag || '💰'} ${currency.symbol}</div>
            <div class="currency-name">${currency.name}</div>
            <div class="currency-code">${currency.code}</div>
            ${currency.code === currentCurrency ? '<i class="fas fa-check"></i>' : ''}
        </div>
    `).join('');
    
    document.querySelectorAll('.currency-option').forEach(option => {
        option.addEventListener('click', () => {
            const newCurrency = option.dataset.currency;
            changeCurrency(newCurrency);
        });
    });
}

// Change currency
function changeCurrency(newCurrency) {
    currentCurrency = newCurrency;
    localStorage.setItem('preferredCurrency', newCurrency);
    updateCurrencyDisplay();
    populateCurrencyList();
    loadProducts(currentCategory, currentSearchTerm);
    showToast(`Currency changed to ${newCurrency}`, 'success');
}

// Setup currency tabs
function setupCurrencyTabs() {
    document.querySelectorAll('.currency-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.currency-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentRegion = tab.dataset.region;
            populateCurrencyList();
        });
    });
}

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            if (!user.error) {
                currentUser = user;
                showUserMenu();
                connectSocket();
                loadUserChats();
            } else {
                logout();
            }
        } catch (error) {
            logout();
        }
    }
}

// Connect socket
function connectSocket() {
    const token = localStorage.getItem('token');
    currentSocket = io(API_URL, { auth: { token } });
    
    currentSocket.on('connect', () => console.log('Socket connected'));
    currentSocket.on('new_message', (message) => {
        if (currentChatId === message.chatId) displayMessage(message);
        loadUserChats();
    });
    currentSocket.on('message_notification', (data) => {
        showNotification(`New message about ${data.productTitle}`);
        loadUserChats();
    });
    currentSocket.on('user_typing', (data) => showTypingIndicator(data.isTyping));
}

// Show user menu
function showUserMenu() {
    document.getElementById('authLinks').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.fullName.split(' ')[0];
    document.getElementById('userAvatar').src = currentUser.avatar;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Admin' : 'Seller';
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        showView('products');
        loadProducts();
    });
    
    document.getElementById('sellLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showToast('Please login to sell products', 'error');
            showLoginModal();
            return;
        }
        showView('sell');
    });
    
    document.getElementById('messagesLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showLoginModal();
            return;
        }
        showView('messages');
        loadUserChats();
    });
    
    document.getElementById('myProductsLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            showLoginModal();
            return;
        }
        showView('myProducts');
        loadMyProducts();
    });
    
    document.getElementById('loginBtn').addEventListener('click', showLoginModal);
    document.getElementById('registerBtn').addEventListener('click', showRegisterModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('searchBtn').addEventListener('click', searchProducts);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchProducts();
    });
    document.getElementById('heroSellBtn').addEventListener('click', () => {
        if (currentUser) showView('sell');
        else showLoginModal();
    });
    document.getElementById('heroBrowseBtn').addEventListener('click', () => {
        showView('products');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    document.getElementById('sellForm').addEventListener('submit', submitProduct);
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('registerForm').addEventListener('submit', register);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    document.getElementById('messageInput').addEventListener('input', handleTyping);
    document.getElementById('cancelSellBtn').addEventListener('click', () => showView('products'));
    document.getElementById('applyFilterBtn').addEventListener('click', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);
    document.getElementById('locationFilter').addEventListener('change', applyFilters);
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
        });
    });
    
    setupFileUpload();
    setupCurrencyTabs();
}

// Setup file upload
function setupFileUpload() {
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.querySelector('input[name="images"]');
    const selectFilesBtn = document.querySelector('.btn-select-files');
    
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = 'var(--primary)';
        });
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.style.borderColor = '#E5E7EB';
        });
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        });
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }
        fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));
    }
}

// Handle files
function handleFiles(files) {
    const previewContainer = document.getElementById('imagePreview');
    const fileInput = document.querySelector('input[name="images"]');
    const dataTransfer = new DataTransfer();
    const validFiles = files.slice(0, 10);
    const existingFiles = Array.from(fileInput.files);
    const allFiles = [...existingFiles, ...validFiles].slice(0, 10);
    
    allFiles.forEach(file => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
    
    previewContainer.innerHTML = '';
    Array.from(fileInput.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewDiv = document.createElement('div');
            previewDiv.style.position = 'relative';
            previewDiv.style.display = 'inline-block';
            previewDiv.innerHTML = `
                <img src="${e.target.result}" class="preview-image">
                <button type="button" class="remove-image" data-index="${index}" 
                    style="position: absolute; top: -8px; right: -8px; background: var(--danger); 
                    color: white; border: none; border-radius: 50%; width: 24px; height: 24px; 
                    cursor: pointer;">×</button>
            `;
            previewContainer.appendChild(previewDiv);
        };
        reader.readAsDataURL(file);
    });
    
    document.querySelectorAll('.remove-image').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(btn.dataset.index);
            const newFiles = Array.from(fileInput.files);
            newFiles.splice(index, 1);
            const newDataTransfer = new DataTransfer();
            newFiles.forEach(file => newDataTransfer.items.add(file));
            fileInput.files = newDataTransfer.files;
            handleFiles([]);
        });
    });
}

// Show view
function showView(view) {
    document.getElementById('productsView').style.display = 'none';
    document.getElementById('sellView').style.display = 'none';
    document.getElementById('messagesView').style.display = 'none';
    document.getElementById('myProductsView').style.display = 'none';
    
    if (view === 'products') document.getElementById('productsView').style.display = 'block';
    else if (view === 'sell') document.getElementById('sellView').style.display = 'block';
    else if (view === 'messages') document.getElementById('messagesView').style.display = 'grid';
    else if (view === 'myProducts') document.getElementById('myProductsView').style.display = 'block';
}

// Load products
async function loadProducts(category = currentCategory, search = currentSearchTerm) {
    currentCategory = category;
    currentSearchTerm = search;
    
    let url = `${API_URL}/api/products?currency=${currentCurrency}&sort=${currentSort}`;
    if (category && category !== 'all') url += `&category=${category}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (currentMinPrice) url += `&minPrice=${currentMinPrice}`;
    if (currentMaxPrice) url += `&maxPrice=${currentMaxPrice}`;
    if (currentLocation) url += `&location=${encodeURIComponent(currentLocation)}`;
    
    try {
        const response = await fetch(url);
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('productsGrid');
    if (!products.length) {
        container.innerHTML = '<p style="text-align: center;">No products found</p>';
        return;
    }
    
    container.innerHTML = products.map(product => {
        const priceFormatted = formatPrice(product.price, product.displayCurrency);
        return `
            <div class="product-card" onclick="showProductDetail('${product.id}')">
                ${product.condition === 'new' ? '<div class="product-badge">New</div>' : ''}
                <img src="${product.images[0] || '/uploads/default.jpg'}" class="product-image">
                <div class="product-info">
                    <div class="product-title">${escapeHtml(product.title)}</div>
                    <div class="product-price">${priceFormatted}</div>
                    <div class="product-seller">
                        <img src="${product.seller.avatar}" class="seller-avatar">
                        <span class="seller-name">${escapeHtml(product.seller.fullName)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Format price
function formatPrice(price, currencyCode) {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    const symbol = currency ? currency.symbol : currencyCode;
    
    if (currencyCode === 'TZS' || currencyCode === 'UGX' || currencyCode === 'IDR' || currencyCode === 'VND') {
        return `${symbol} ${Math.round(price).toLocaleString()}`;
    } else if (currencyCode === 'JPY' || currencyCode === 'KRW') {
        return `${symbol} ${Math.round(price).toLocaleString()}`;
    } else {
        return `${symbol} ${price.toFixed(2).toLocaleString()}`;
    }
}

// Show product detail
window.showProductDetail = async function(productId) {
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}?currency=${currentCurrency}`);
        const product = await response.json();
        
        const modal = document.getElementById('productModal');
        const detailDiv = document.getElementById('productDetail');
        const priceFormatted = formatPrice(product.price, product.displayCurrency);
        
        detailDiv.innerHTML = `
            <h2>${escapeHtml(product.title)}</h2>
            <div style="display: grid; gap: 1rem;">
                ${product.images[0] ? `<img src="${product.images[0]}" style="max-width: 100%; border-radius: 8px;">` : ''}
                <div style="background: var(--light); padding: 1rem; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${priceFormatted}</div>
                    ${product.originalCurrency !== product.displayCurrency ? 
                        `<small>Original: ${formatPrice(product.originalPrice, product.originalCurrency)}</small>` : ''}
                </div>
                <div><strong>Category:</strong> ${product.category}</div>
                <div><strong>Condition:</strong> ${product.condition}</div>
                ${product.location ? `<div><strong>Location:</strong> ${product.location}</div>` : ''}
                ${product.brand ? `<div><strong>Brand:</strong> ${product.brand}</div>` : ''}
                <div><strong>Description:</strong></div>
                <div>${escapeHtml(product.description)}</div>
                <div><strong>Seller:</strong> ${escapeHtml(product.seller.fullName)}</div>
                ${currentUser && currentUser.id !== product.seller.id ? 
                    `<button onclick="startChat('${product.id}')" class="btn-primary" style="margin-top: 1rem; width: 100%;">
                        <i class="fas fa-comment"></i> Contact Seller
                    </button>` : ''}
            </div>
        `;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
    }
};

// Start chat
window.startChat = async function(productId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
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
};

// Load user chats
async function loadUserChats() {
    if (!currentUser) return;
    
    const response = await fetch(`${API_URL}/api/chats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const chats = await response.json();
    
    const chatsList = document.getElementById('chatsList');
    if (!chats.length) {
        chatsList.innerHTML = '<p style="text-align: center;">No conversations yet</p>';
        return;
    }
    
    chatsList.innerHTML = chats.map(chat => `
        <div class="chat-item" onclick="openChat('${chat.id}')">
            <img src="${chat.otherUser.avatar}" class="chat-avatar">
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.otherUser.fullName)}</div>
                <div class="chat-last-message">${chat.lastMessage ? escapeHtml(chat.lastMessage.message.substring(0, 50)) : 'No messages'}</div>
            </div>
            ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
        </div>
    `).join('');
}

// Open chat
window.openChat = async function(chatId) {
    currentChatId = chatId;
    
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const messages = await response.json();
    
    const chats = await fetch(`${API_URL}/api/chats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const allChats = await chats.json();
    const chat = allChats.find(c => c.id === chatId);
    
    document.getElementById('chatHeader').innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${chat.otherUser.avatar}" style="width: 50px; height: 50px; border-radius: 50%;">
            <div>
                <h3>${escapeHtml(chat.otherUser.fullName)}</h3>
                <p style="font-size: 0.9rem; color: var(--gray);">About: ${escapeHtml(chat.productTitle)}</p>
            </div>
        </div>
    `;
    
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.senderId === currentUser.id ? 'message-sent' : 'message-received'}">
            <div>${escapeHtml(msg.message)}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    document.getElementById('chatInput').style.display = 'flex';
    
    if (currentSocket) currentSocket.emit('join_chat', chatId);
};

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (!message || !currentChatId) return;
    
    currentSocket.emit('send_message', { chatId: currentChatId, message });
    messageInput.value = '';
}

// Display message
function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.id ? 'message-sent' : 'message-received'}`;
    messageDiv.innerHTML = `
        <div>${escapeHtml(message.message)}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Submit product
async function submitProduct(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login to sell', 'error');
        showLoginModal();
        return;
    }
    
    const formData = new FormData(e.target);
    const images = document.querySelector('input[name="images"]').files;
    
    if (images.length === 0) {
        showToast('Please upload at least one image', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('.btn-submit');
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
            document.getElementById('imagePreview').innerHTML = '';
            showView('products');
            loadProducts();
        } else {
            const error = await response.json();
            showToast(error.error || 'Error listing product', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Load my products
async function loadMyProducts() {
    const response = await fetch(`${API_URL}/api/my-products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const products = await response.json();
    
    const container = document.getElementById('myProductsGrid');
    if (!products.length) {
        container.innerHTML = '<p>You haven\'t listed any products yet.</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.images[0]}" class="product-image">
            <div class="product-info">
                <div class="product-title">${escapeHtml(product.title)}</div>
                <div class="product-price">${formatPrice(product.price, product.currency)}</div>
                <button onclick="deleteProduct('${product.id}')" class="btn-secondary" style="background: var(--danger); margin-top: 0.5rem;">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Delete product
window.deleteProduct = async function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            showToast('Product deleted', 'success');
            loadMyProducts();
        }
    }
};

// Apply filters
function applyFilters() {
    currentSort = document.getElementById('sortSelect').value;
    currentLocation = document.getElementById('locationFilter').value;
    currentMinPrice = document.getElementById('minPrice').value;
    currentMaxPrice = document.getElementById('maxPrice').value;
    loadProducts();
}

// Search products
function searchProducts() {
    currentSearchTerm = document.getElementById('searchInput').value;
    loadProducts(currentCategory, currentSearchTerm);
    showView('products');
}

// Login
async function login(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
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
}

// Register
// Replace your existing register function with this improved version
async function register(e) {
    e.preventDefault();
    
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    // Password validation
    if (password !== confirmPassword) {
        showToast('Passwords do not match! Please check and try again.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Show loading
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        const userData = {
            fullName: document.getElementById('regFullName').value.trim(),
            username: document.getElementById('regUsername').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: password,
            country: document.getElementById('regCountry')?.value || 'Tanzania',
            phone: document.getElementById('regPhone')?.value || ''
        };
        
        // Basic validation
        if (!userData.fullName || !userData.username || !userData.email) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (!userData.email.includes('@')) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            document.getElementById('registerModal').style.display = 'none';
            connectSocket();
            loadProducts();
            showToast(`Welcome to MarketHub, ${data.user.fullName}! 🎉`, 'success');
            
            // Reset form
            document.getElementById('registerForm').reset();
        } else {
            showToast(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please check your connection.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Add password confirmation checker to register form
document.getElementById('regConfirmPassword')?.addEventListener('input', function() {
    const password = document.getElementById('regPassword').value;
    const confirm = this.value;
    const errorSpan = document.getElementById('regPasswordError');
    
    if (password !== confirm) {
        this.style.borderColor = 'var(--danger)';
        if (!errorSpan) {
            const span = document.createElement('small');
            span.id = 'regPasswordError';
            span.style.color = 'var(--danger)';
            span.style.display = 'block';
            span.style.marginTop = '0.25rem';
            span.textContent = '❌ Passwords do not match';
            this.parentNode.appendChild(span);
        } else {
            errorSpan.textContent = '❌ Passwords do not match';
            errorSpan.style.display = 'block';
        }
    } else {
        this.style.borderColor = 'var(--secondary)';
        if (errorSpan) {
            errorSpan.style.display = 'none';
        }
    }
});

// Forgot Password Function
async function forgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#forgotPasswordForm button[type="submit"]');
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
            
            // If we got a reset token (demo mode), open reset modal
            if (data.resetToken) {
                document.getElementById('resetToken').value = data.resetToken;
                document.getElementById('resetPasswordModal').style.display = 'block';
                showToast('Demo mode: Reset token generated. Please set new password.', 'info');
            }
        } else {
            showToast(data.error || 'Failed to send reset link', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Reset Password Function
async function resetPassword(e) {
    e.preventDefault();
    
    const token = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#resetPasswordForm button[type="submit"]');
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
            showToast('Password reset successful! Please login with your new password.', 'success');
            document.getElementById('resetPasswordModal').style.display = 'none';
            showLoginModal();
            
            // Reset form
            document.getElementById('resetPasswordForm').reset();
        } else {
            showToast(data.error || 'Failed to reset password', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Add these event listeners after your existing setupEventListeners function
function setupEventListeners() {
    // ... your existing event listeners ...
    
    // Add forgot password event listeners
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('forgotPasswordModal').style.display = 'block';
    });
    
    document.getElementById('backToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('forgotPasswordModal').style.display = 'none';
        showLoginModal();
    });
    
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', forgotPassword);
    document.getElementById('resetPasswordForm')?.addEventListener('submit', resetPassword);
    
    // Add real-time password match checking on register form
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
    
    // Add password strength indicator
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            if (password.length >= 6) strength++;
            if (password.match(/[a-z]/)) strength++;
            if (password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            
            const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
            const strengthColor = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'];
            
            let indicator = document.getElementById('passwordStrength');
            if (!indicator) {
                indicator = document.createElement('small');
                indicator.id = 'passwordStrength';
                indicator.style.display = 'block';
                indicator.style.marginTop = '0.25rem';
                this.parentNode.appendChild(indicator);
            }
            
            if (password.length > 0) {
                indicator.textContent = `Password strength: ${strengthText[strength]}`;
                indicator.style.color = strengthColor[strength];
            } else {
                indicator.textContent = '';
            }
        });
    }
}

// Update the register modal HTML to include confirm password field
// Make sure your register modal has this field:
// <div class="form-group">
//     <label><i class="fas fa-check-circle"></i> Confirm Password</label>
//     <input type="password" id="regConfirmPassword" placeholder="Confirm your password" required>
// </div>
// Logout
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    if (currentSocket) currentSocket.disconnect();
    document.getElementById('authLinks').style.display = 'flex';
    document.getElementById('userMenu').style.display = 'none';
    showView('products');
    loadProducts();
    showToast('Logged out successfully', 'success');
}

// Show modals
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

// Show toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--secondary)';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// Show notification
function showNotification(message) {
    if (Notification.permission === 'granted') {
        new Notification('MarketHub', { body: message });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Handle typing
let typingTimeout;
function handleTyping() {
    if (typingTimeout) clearTimeout(typingTimeout);
    currentSocket.emit('typing', { chatId: currentChatId, isTyping: true });
    typingTimeout = setTimeout(() => {
        currentSocket.emit('typing', { chatId: currentChatId, isTyping: false });
    }, 1000);
}

// Show typing indicator
function showTypingIndicator(isTyping) {
    const indicator = document.querySelector('.typing-indicator');
    if (isTyping && !indicator) {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.textContent = 'Someone is typing...';
        document.getElementById('chatMessages').appendChild(div);
    } else if (!isTyping && indicator) {
        indicator.remove();
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Category click handlers
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = category;
        loadProducts(category, currentSearchTerm);
        showView('products');
    });
});

// Switch between login and register
document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').style.display = 'none';
    showRegisterModal();
});

document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerModal').style.display = 'none';
    showLoginModal();
});
