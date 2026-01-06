async function loadProducts(category = 'all') {
    try {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;
        
        productGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading products...
            </div>
        `;
        
        let query = db.collection('products');
        
        if (category !== 'all') {
            query = query.where('category', '==', category);
        }
        
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        productGrid.innerHTML = '';
        
        if (snapshot.empty) {
            productGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Check back later for new products</p>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            displayProduct(product, productGrid);
        });
        
    } catch (error) {
        console.error('Load products error:', error);
        document.getElementById('productGrid').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading products</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function displayProduct(product, container) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.dataset.category = product.category;
    productCard.dataset.id = product.id;
    
    productCard.innerHTML = `
        <div class="product-image">
            <i class="${product.icon || 'fas fa-box'}"></i>
            ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        </div>
        <div class="product-content">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-footer">
                <div class="product-price">
                    $${product.price.toFixed(2)}
                    ${product.originalPrice ? `<span>$${product.originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart('${product.id}')">
                    <i class="fas fa-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(productCard);
}

function initCategoryFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const category = this.dataset.category;
            loadProducts(category);
        });
    });
}

async function checkIfPurchased(productId) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const purchasedProducts = await getUserPurchasedProducts(user.uid);
        return purchasedProducts.some(p => p.productId === productId);
    } catch (error) {
        console.error('Check purchased error:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('productGrid')) {
        loadProducts();
        initCategoryFilters();
    }
});