// js/api-client.js - Frontend API Client
// Configuration
const API_BASE_URL = 'http://localhost/freshmart/api'; // Change this to your actual API URL

// API Helper Functions
const API = {
    // Generic request handler
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Products
    products: {
        getAll: () => API.request('/products.php'),
        getByCategory: (categorySlug) => API.request(`/products.php?category_slug=${categorySlug}`),
        getById: (productId) => API.request(`/products.php?product_id=${productId}`)
    },

    // Orders
    orders: {
        create: (orderData) => API.request('/orders.php', {
            method: 'POST',
            body: JSON.stringify(orderData)
        }),
        getByUser: (userId) => API.request(`/orders.php?user_id=${userId}`),
        getByOrderNumber: (orderNumber) => API.request(`/orders.php?order_number=${orderNumber}`),
        updateStatus: (orderId, status) => API.request('/orders.php', {
            method: 'PUT',
            body: JSON.stringify({ order_id: orderId, order_status: status })
        })
    },

    // Users
    users: {
        register: (userData) => API.request('/users.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),
        login: (credentials) => API.request('/users.php?action=login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
        logout: () => API.request('/users.php?action=logout'),
        getProfile: () => API.request('/users.php?action=profile'),
        updateProfile: (profileData) => API.request('/users.php?action=profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        }),
        getAddresses: () => API.request('/users.php?action=addresses'),
        addAddress: (addressData) => API.request('/users.php?action=addresses', {
            method: 'POST',
            body: JSON.stringify(addressData)
        }),
        deleteAddress: (addressId) => API.request(`/users.php?action=addresses&address_id=${addressId}`, {
            method: 'DELETE'
        })
    }
};

// Cart Management (using localStorage for now, can be moved to backend later)
const Cart = {
    get: () => JSON.parse(localStorage.getItem('myCart')) || [],
    
    set: (cart) => localStorage.setItem('myCart', JSON.stringify(cart)),
    
    add: (item) => {
        const cart = Cart.get();
        cart.push(item);
        Cart.set(cart);
        Cart.updateUI();
    },
    
    remove: (index) => {
        const cart = Cart.get();
        cart.splice(index, 1);
        Cart.set(cart);
        Cart.updateUI();
    },
    
    clear: () => {
        localStorage.removeItem('myCart');
        Cart.updateUI();
    },
    
    updateUI: () => {
        const cart = Cart.get();
        const countElement = document.getElementById('cart-count');
        if (countElement) {
            countElement.textContent = cart.length;
        }
    },
    
    getTotal: () => {
        const cart = Cart.get();
        return cart.reduce((total, item) => total + parseFloat(item.price), 0);
    }
};

// Session Management
const Session = {
    getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser')),
    
    setCurrentUser: (user) => localStorage.setItem('currentUser', JSON.stringify(user)),
    
    clearCurrentUser: () => localStorage.removeItem('currentUser'),
    
    isLoggedIn: () => !!Session.getCurrentUser()
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Cart.updateUI();
});