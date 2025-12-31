function displayCart() {
    // 1. Get the cart data
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    
    // NEW: Get the new fee and total elements
    const deliveryEl = document.getElementById('delivery-fee');
    const totalEl = document.getElementById('final-total');
    
    // 2. If no items, show empty message
    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 20px; color: #666;">Your cart is empty.</p>';
        if (subtotalEl) subtotalEl.innerText = 'GH¢0.00';
        if (deliveryEl) deliveryEl.innerText = 'GH¢0.00';
        if (totalEl) totalEl.innerText = 'GH¢0.00';
        return;
    }

    // 3. Generate HTML for items
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

    // 4. MATH LOGIC (7% Fee)
    const deliveryFee = subtotal * 0.07;
    const finalTotal = subtotal + deliveryFee;

    // 5. Update UI (with safety checks to prevent crashes)
    if (subtotalEl) subtotalEl.innerText = `GH¢${subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = `GH¢${deliveryFee.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `GH¢${finalTotal.toFixed(2)}`;
}

// Function to remove an item
function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('myCart', JSON.stringify(cart));
    displayCart();
}

// Handle the Checkout Form Submission
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const cart = JSON.parse(localStorage.getItem('myCart')) || [];
        if (cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }
        alert('Order placed successfully! Thank you for shopping at FreshMart.');
        localStorage.removeItem('myCart');
        window.location.href = 'supermercado.html';
    });
}

// INITIALIZE PAGE
// We wrap displayCart in a try/catch so if it fails, the loader still hides
try {
    displayCart();
} catch (error) {
    console.error("Cart display error:", error);
}

// HIDE LOADER (This must run even if there's an error above)
window.addEventListener('load', function() {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500); 
    }
});