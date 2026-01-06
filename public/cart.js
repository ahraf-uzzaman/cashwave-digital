// Shopping cart functionality

// Add product to cart
function addToCart(productId) {
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html';
        return;
    }
    
    // Get product from Firestore
    db.collection('products').doc(productId).get()
        .then(doc => {
            if (doc.exists) {
                const product = { id: doc.id, ...doc.data() };
                addToCartStorage(product);
                showNotification(`${product.title} added to cart!`);
                updateCartUI();
            }
        })
        .catch(error => {
            console.error('Add to cart error:', error);
            alert('Error adding product to cart');
        });
}

// Add product to localStorage cart
function addToCartStorage(product) {
    let cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
        // Update quantity
        cart[existingIndex].quantity += 1;
    } else {
        // Add new item
        cart.push({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            icon: product.icon,
            quantity: 1
        });
    }
    
    localStorage.setItem('cashwave_cart', JSON.stringify(cart));
}

// Remove item from cart
function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cashwave_cart', JSON.stringify(cart));
    updateCartUI();
    loadCartItems();
    showNotification('Item removed from cart');
}

// Update item quantity
function updateQuantity(productId, change) {
    let cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        localStorage.setItem('cashwave_cart', JSON.stringify(cart));
        updateCartUI();
        loadCartItems();
    }
}

// Update cart UI (cart count)
function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update cart count badge
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        el.textContent = totalCount;
    });
    
    return totalCount;
}

// Load cart items in sidebar
function loadCartItems() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartItems || !cartTotal) return;
    
    const cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h4>Your cart is empty</h4>
                <p>Add some products to get started</p>
            </div>
        `;
        cartTotal.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <i class="${item.icon || 'fas fa-box'}"></i>
            </div>
            <div class="cart-item-details">
                <h4>${item.title}</h4>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button onclick="updateQuantity('${item.id}', -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="cart-item-price">
                        $${item.price.toFixed(2)} × ${item.quantity} = $${itemTotal.toFixed(2)}
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Clear cart
function clearCart() {
    localStorage.removeItem('cashwave_cart');
    updateCartUI();
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Toggle cart sidebar
function setupCartToggle() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.querySelector('.close-cart');
    
    if (cartBtn && cartSidebar && cartOverlay) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            loadCartItems();
        });
        
        closeCart.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
        });
        
        cartOverlay.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
        });
    }
}

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateCartUI();
    setupCartToggle();
});