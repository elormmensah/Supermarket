function displayCart() {
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    const deliveryEl = document.getElementById('delivery-fee');
    const totalEl = document.getElementById('final-total');
    
    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 20px; color: #666;">Your cart is empty.</p>';
        if (subtotalEl) subtotalEl.innerText = 'GH¢0.00';
        if (deliveryEl) deliveryEl.innerText = 'GH¢0.00';
        if (totalEl) totalEl.innerText = 'GH¢0.00';
        return;
    }

    let subtotal = 0;
    const itemsHTML = cart.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        subtotal += price;
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="color: #27ae60; font-weight: bold;">GH¢${price.toFixed(2)}</span>
                </div>
                <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
            </div>
        `;
    }).join('');

    if (container) container.innerHTML = itemsHTML;

    const deliveryFee = subtotal * 0.07;
    const finalTotal = subtotal + deliveryFee;

    if (subtotalEl) subtotalEl.innerText = `GH¢${subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = `GH¢${deliveryFee.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `GH¢${finalTotal.toFixed(2)}`;
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('myCart', JSON.stringify(cart));
    displayCart();
}

// --- NEW CHECKOUT LOGIC STARTS HERE ---
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const cart = JSON.parse(localStorage.getItem('myCart')) || [];
        if (cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        // 1. Capture Order Details from the input IDs we added to cart.html
        const orderData = {
            orderID: "#FM-" + Math.floor(Math.random() * 10000),
            date: new Date().toLocaleString(),
            customer: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value, 
            address: document.getElementById('cust-address').value,
            items: cart,
            total: document.getElementById('final-total').innerText
        };

        // 2. Save Order to localStorage
        localStorage.setItem('lastOrder', JSON.stringify(orderData));

        // 3. Success and Redirect
        alert('Order placed successfully!');
        localStorage.removeItem('myCart');
        window.location.href = 'order-details.html'; 
    });
}
// --- NEW CHECKOUT LOGIC ENDS HERE ---

// Run display logic
try {
    displayCart();
} catch (error) {
    console.error("Cart display error:", error);
}

// Loader Logic
window.addEventListener('load', function() {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500); 
    }
});