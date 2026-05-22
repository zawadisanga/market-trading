// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('MarketHub Started');
    
    // Check if user is logged in
    checkAuth();
    
    // Load products
    loadProducts();
    
    // Setup all event listeners
    setupEventListeners();
});

// Global variables
let currentUser = null;
let currentSocket = null;
let API_URL = window.location.origin;

// ============= CHECK AUTH =============
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
            }
        } catch (error) {
            console.log('Auth error:', error);
        }
    }
}

function showUserMenu() {
    document.getElementById('authLinks').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.fullName;
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    location.reload();
}

// ============= SOCKET CONNECTION =============
function connectSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    currentSocket = io(API_URL, { auth: { token } });
    currentSocket.on('connect', () => console.log('Socket connected'));
}

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    // Navigation
    document.getElementById('homeLink').onclick = (e) => {
        e.preventDefault();
        showView('products');
        loadProducts();
    };
    
    document.getElementById('sellLink').onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            showToast('Please login to sell', 'error');
            showLoginModal();
            return;
        }
        showView('sell');
    };
    
    document.getElementById('messagesLink').onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            showLoginModal();
            return;
        }
        showView('messages');
        loadChats();
    };
    
    document.getElementById('myProductsLink').onclick = (e) => {
        e.preventDefault();
        if (!currentUser) {
            showLoginModal();
            return;
        }
        showView('myProducts');
        loadMyProducts();
    };
    
    // Auth buttons
    document.getElementById('loginBtn').onclick = () => showLoginModal();
    document.getElementById('registerBtn').onclick = () => showRegisterModal();
    document.getElementById('logoutBtn').onclick = () => logout();
    
    // Hero buttons
    document.getElementById('heroSellBtn').onclick = () => {
        if (currentUser) showView('sell');
        else showLoginModal();
    };
    
    document.getElementById('heroBrowseBtn').onclick = () => {
        showView('products');
        loadProducts();
    };
    
    // Search
    document.getElementById('searchBtn').onclick = searchProducts;
    document.getElementById('searchInput').onkeypress = (e) => {
        if (e.key === 'Enter') searchProducts();
    };
    
    // Forms
    document.getElementById('loginForm').onsubmit = login;
    document.getElementById('registerForm').onsubmit = register;
    document.getElementById('sellForm').onsubmit = submitProduct;
    document.getElementById('forgotPasswordForm').onsubmit = forgotPassword;
    document.getElementById('sendMessageBtn').onclick = sendMessage;
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').style.display = 'none';
    });
    
    // Modal links
    document.getElementById('switchToRegister').onclick = (e) => {
        e.preventDefault();
        document.getElementById('loginModal').style.display = 'none';
        showRegisterModal();
    };
    
    document.getElementById('switchToLogin').onclick = (e) => {
        e.preventDefault();
        document.getElementById('registerModal').style.display = 'none';
        showLoginModal();
    };
    
    document.getElementById('forgotPasswordLink').onclick = (e) => {
        e.preventDefault();
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('forgotPasswordModal').style.display = 'block';
    };
    
    document.getElementById('backToLogin').onclick = (e) => {
        e.preventDefault();
        document.getElementById('forgotPasswordModal').style.display = 'none';
        showLoginModal();
    };
}

// ============= VIEW FUNCTIONS =============
function showView(view) {
    document.getElementById('productsView').style.display = 'none';
    document.getElementById('sellView').style.display = 'none';
    document.getElementById('messagesView').style.display = 'none';
    document.getElementById('myProductsView').style.display = 'none';
    
    if (view === 'products') document.getElementById('productsView').style.display = 'block';
    else if (view === 'sell') document.getElementById('sellView').style.display = 'block';
    else if (view === 'messages') document.getElementById('messagesView').style.display = 'block';
    else if (view === 'myProducts') document.getElementById('myProductsView').style.display = 'block';
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#EF4444' : '#10B981';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// ============= PRODUCT FUNCTIONS =============
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();
        
        const grid = document.getElementById('productsGrid');
        if (!products.length) {
            grid.innerHTML = '<p>No products found</p>';
            return;
        }
        
        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="showProductDetail('${product.id}')">
                <img src="${product.images[0] || 'https://via.placeholder.com/300'}" class="product-image">
                <h3>${escapeHtml(product.title)}</h3>
                <p>$${product.price}</p>
                <small>By ${escapeHtml(product.seller?.fullName || 'Unknown')}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

window.showProductDetail = async function(productId) {
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const product = await response.json();
        
        alert(`${product.title}\nPrice: $${product.price}\nDescription: ${product.description}`);
    } catch (error) {
        console.error('Error:', error);
    }
};

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value;
    // Implement search
    loadProducts();
}

// ============= AUTH FUNCTIONS =============
async function login(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
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
            showToast('Login successful!');
            loadProducts();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

async function register(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('regFullName').value;
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, email, password })
        });
        
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserMenu();
            document.getElementById('registerModal').style.display = 'none';
            showToast('Registration successful!');
            loadProducts();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

async function forgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    
    try {
        const response = await fetch(`${API_URL}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        showToast(data.message, 'success');
        document.getElementById('forgotPasswordModal').style.display = 'none';
    } catch (error) {
        showToast('Network error', 'error');
    }
}

// ============= PRODUCT SUBMISSION =============
async function submitProduct(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            showToast('Product listed!');
            showView('products');
            loadProducts();
            e.target.reset();
        } else {
            showToast('Error listing product', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

// ============= CHAT FUNCTIONS =============
async function loadChats() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/api/chats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const chats = await response.json();
        
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = chats.map(chat => `
            <div onclick="openChat('${chat.id}')">
                <strong>${escapeHtml(chat.otherUser?.fullName || 'User')}</strong>
                <p>${chat.productTitle}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

window.openChat = async function(chatId) {
    try {
        const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const messages = await response.json();
        
        const container = document.getElementById('chatMessages');
        container.innerHTML = messages.map(msg => `
            <div class="${msg.senderId === currentUser?.id ? 'sent' : 'received'}">
                ${escapeHtml(msg.message)}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
};

function sendMessage() {
    const message = document.getElementById('messageInput').value;
    if (!message || !currentSocket) return;
    
    // Send message logic here
    document.getElementById('messageInput').value = '';
}

// ============= MY PRODUCTS =============
async function loadMyProducts() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/api/my-products`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const products = await response.json();
        
        const grid = document.getElementById('myProductsGrid');
        if (!products.length) {
            grid.innerHTML = '<p>No products listed yet</p>';
            return;
        }
        
        grid.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${product.images[0] || 'https://via.placeholder.com/300'}">
                <h3>${escapeHtml(product.title)}</h3>
                <p>$${product.price}</p>
                <button onclick="deleteProduct('${product.id}')">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

window.deleteProduct = async function(productId) {
    if (!confirm('Delete this product?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showToast('Product deleted');
            loadMyProducts();
            loadProducts();
        }
    } catch (error) {
        showToast('Error deleting', 'error');
    }
};

// ============= HELPER =============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
