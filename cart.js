function displayCart() {
    // 1. Get the cart data
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    
    // 2. If no items, show empty message
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 20px; color: #666;">Your cart is empty.</p>';
        subtotalEl.innerText = 'GH¢0.00';
        return;
    }

    // 3. Generate HTML for items
    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        // Ensure price is a number for calculation
        const price = parseFloat(item.price);
        total += price;

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

    // 4. Update the subtotal in the summary card
    subtotalEl.innerText = `GH¢${total.toFixed(2)}`;
}

// Function to remove an item
function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('myCart', JSON.stringify(cart));
    displayCart();
}

// 5. Handle the Checkout Form Submission
document.getElementById('checkout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert('Order placed successfully! Thank you for shopping at FreshMart.');
    localStorage.removeItem('myCart'); // Clear the cart
    window.location.href = 'supermercado.html'; // Redirect to home
});

// Run display function on page load
function displayCart() {
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    // New Elements
    const deliveryEl = document.getElementById('delivery-fee');
    const totalEl = document.getElementById('final-total');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 20px; color: #666;">Your cart is empty.</p>';
        subtotalEl.innerText = 'GH¢0.00';
        deliveryEl.innerText = 'GH¢0.00';
        totalEl.innerText = 'GH¢0.00';
        return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map((item, index) => {
        const price = parseFloat(item.price);
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

    // --- MATH LOGIC ---
    const deliveryFee = subtotal * 0.07; // Calculate 7%
    const finalTotal = subtotal + deliveryFee;

    // Update the display
    subtotalEl.innerText = `GH¢${subtotal.toFixed(2)}`;
    deliveryEl.innerText = `GH¢${deliveryFee.toFixed(2)}`;
    totalEl.innerText = `GH¢${finalTotal.toFixed(2)}`;
}