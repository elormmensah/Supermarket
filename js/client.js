// cart-backend.js - Updated Cart with Backend Integration
// Include api-client.js before this file

function displayCart() {
    const cart = Cart.get();
    const container = document.getElementById('cart-list');
    const subtotalEl = document.getElementById('subtotal');
    const deliveryEl = document.getElementById('delivery-fee');
    const totalEl = document.getElementById('final-total');
    
    if (cart.length === 0) {
        if (container) container.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 20px; color: #666;">Your cart is empty.</p>';
        if (subtotalEl) subtotalEl.innerText = 'GH₵0.00';
        if (deliveryEl) deliveryEl.innerText = 'GH₵0.00';
        if (totalEl) totalEl.innerText = 'GH₵0.00';
        return;
    }

    let subtotal = 0;
    const itemsHTML = cart.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        subtotal += itemTotal;
        
        return `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="color: #27ae60; font-weight: bold;">GH₵${price.toFixed(2)} × ${quantity}</span>
                </div>
                <div style="text-align: right;">
                    <div style="color: #27ae60; font-weight: bold; margin-bottom: 5px;">GH₵${itemTotal.toFixed(2)}</div>
                    <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
        `;
    }).join('');

    if (container) container.innerHTML = itemsHTML;

    const deliveryFee = subtotal * 0.07;
    const finalTotal = subtotal + deliveryFee;

    if (subtotalEl) subtotalEl.innerText = `GH₵${subtotal.toFixed(2)}`;
    if (deliveryEl) deliveryEl.innerText = `GH₵${deliveryFee.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `GH₵${finalTotal.toFixed(2)}`;
}

function removeItem(index) {
    Cart.remove(index);
    displayCart();
}

// Updated checkout logic with backend integration
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const cart = Cart.get();
        if (cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        // Disable submit button to prevent double submission
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Prepare order data
            const orderData = {
                customer_name: document.getElementById('cust-name').value,
                customer_email: document.getElementById('cust-email').value,
                customer_phone: document.getElementById('cust-phone').value,
                delivery_address: document.getElementById('cust-address').value,
                payment_method: document.getElementById('payment-method').value,
                items: cart.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1,
                    product_id: item.product_id || null
                })),
                total_amount: parseFloat(document.getElementById('final-total').innerText.replace('GH₵', ''))
            };

            // Add user_id if logged in
            const currentUser = Session.getCurrentUser();
            if (currentUser) {
                orderData.user_id = currentUser.user_id;
            }

            // Submit order to backend
            const response = await API.orders.create(orderData);

            if (response.success) {
                // Save last order info for the order details page
                const lastOrder = {
                    orderID: response.order_number,
                    date: new Date().toLocaleString(),
                    customer: orderData.customer_name,
                    phone: orderData.customer_phone,
                    address: orderData.delivery_address,
                    items: cart,
                    total: `GH₵${response.total_amount.toFixed(2)}`,
                    status: 'Pending'
                };
                localStorage.setItem('lastOrder', JSON.stringify(lastOrder));

                // Also save to order history
                let allOrders = JSON.parse(localStorage.getItem('allOrders')) || [];
                allOrders.unshift(lastOrder);
                localStorage.setItem('allOrders', JSON.stringify(allOrders));

                // Clear cart
                Cart.clear();

                // Show success message
                alert(`Order placed successfully! Your order number is ${response.order_number}`);

                // Redirect to order details
                window.location.href = 'order-details.html';
            } else {
                throw new Error(response.error || 'Failed to place order');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to place order: ' + error.message + '. Please try again.');
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

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