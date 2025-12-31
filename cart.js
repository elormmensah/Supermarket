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
displayCart();
window.addEventListener('load', function() {
    const loader = document.getElementById('loader-wrapper');
    
    // Smoothly fade out
    loader.classList.add('loader-hidden');
    
    // Remove from DOM after fade so it doesn't block clicks
    setTimeout(() => {
        loader.style.display = 'none';
    }, 500); 
});