function displayCart() {
    const cart = JSON.parse(localStorage.getItem('myCart')) || [];
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    
    if (cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        subtotalEl.innerText = '$0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <span>$${item.price.toFixed(2)}</span>
                </div>
                <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
            </div>
        `;
    }).join('');

    subtotalEl.innerText = `$${total.toFixed(2)}`;
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('myCart'));
    cart.splice(index, 1);
    localStorage.setItem('myCart', JSON.stringify(cart));
    displayCart();
}

// Initialize
displayCart();