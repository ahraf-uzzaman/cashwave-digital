let currentUser = null;
let isAdmin = false;

async function initAdminPanel() {
    currentUser = auth.currentUser;
    if (!currentUser) { window.location.href = 'login.html'; return; }
    
    isAdmin = await checkIfAdmin(currentUser.uid);
    if (!isAdmin) { alert('Access denied! Admin only.'); window.location.href = '/'; return; }
    
    loadDashboardData();
    loadProductsForAdmin();
    loadOrdersForAdmin();
    loadUsersForAdmin();
    setupAdminEventListeners();
}

async function loadDashboardData() {
    try {
        const productsSnapshot = await db.collection('products').get();
        document.getElementById('totalProducts').textContent = productsSnapshot.size;
        
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        
        const ordersSnapshot = await db.collection('orders').get();
        document.getElementById('totalOrders').textContent = ordersSnapshot.size;
        
        let revenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'confirmed') revenue += order.total || 0;
        });
        document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;
    } catch (error) { console.error('Load dashboard error:', error); }
}

async function loadProductsForAdmin() {
    try {
        const productsTable = document.getElementById('productsTable');
        if (!productsTable) return;
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        let html = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            html += `<tr><td>${product.title}</td><td>${product.category}</td><td>$${product.price.toFixed(2)}</td><td>${product.badge || '-'}</td><td><button class="edit-btn" onclick="editProduct('${doc.id}')"><i class="fas fa-edit"></i> Edit</button><button class="delete-btn" onclick="deleteProduct('${doc.id}')"><i class="fas fa-trash"></i> Delete</button></td></tr>`;
        });
        productsTable.innerHTML = html || '<tr><td colspan="5">No products</td></tr>';
    } catch (error) { console.error('Load products error:', error); }
}

async function loadOrdersForAdmin() {
    try {
        const ordersTable = document.getElementById('ordersTable');
        if (!ordersTable) return;
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const date = order.createdAt ? order.createdAt.toDate().toLocaleDateString() : '-';
            html += `<tr><td>${doc.id.slice(0,8)}...</td><td>${order.userName}</td><td>${order.userWhatsapp}</td><td>${order.items.length} items</td><td>$${order.total?.toFixed(2)||'0.00'}</td><td><span class="status-badge status-${order.status}">${order.status}</span></td><td>${date}</td><td>${order.status==='pending'?`<button class="btn-confirm" onclick="confirmOrder('${doc.id}')"><i class="fas fa-check"></i> Confirm</button>`:''}<button class="btn-view" onclick="viewOrder('${doc.id}')"><i class="fas fa-eye"></i> View</button></td></tr>`;
        });
        ordersTable.innerHTML = html || '<tr><td colspan="8">No orders</td></tr>';
    } catch (error) { console.error('Load orders error:', error); }
}

async function loadUsersForAdmin() {
    try {
        const usersTable = document.getElementById('usersTable');
        if (!usersTable) return;
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : '-';
            html += `<tr><td>${user.firstName} ${user.lastName}</td><td>${user.email}</td><td>${user.whatsapp||'-'}</td><td>${user.role||'customer'}</td><td>${date}</td><td>${user.role!=='admin'?`<button class="make-admin-btn" onclick="makeUserAdmin('${doc.id}')"><i class="fas fa-crown"></i> Make Admin</button>`:'Admin'}</td></tr>`;
        });
        usersTable.innerHTML = html || '<tr><td colspan="6">No users</td></tr>';
    } catch (error) { console.error('Load users error:', error); }
}

async function confirmOrder(orderId) {
    if (!confirm('Confirm this order?')) return;
    try {
        const result = await window.confirmOrder(orderId);
        if (result.success) { alert('Order confirmed! Products delivered.'); loadOrdersForAdmin(); loadDashboardData(); }
        else alert('Error: ' + result.error);
    } catch (error) { alert('Error: ' + error.message); }
}

async function makeUserAdmin(userId) {
    if (!confirm('Make this user an admin?')) return;
    try {
        await db.collection('users').doc(userId).update({ role: 'admin', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert('User is now admin!'); loadUsersForAdmin();
    } catch (error) { alert('Error: ' + error.message); }
}

async function addNewProduct(productData) {
    try {
        await db.collection('products').add({ ...productData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert('Product added!'); loadProductsForAdmin(); return { success: true };
    } catch (error) { console.error('Add product error:', error); return { success: false, error: error.message }; }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        await db.collection('products').doc(productId).delete();
        alert('Product deleted!'); loadProductsForAdmin();
    } catch (error) { alert('Error: ' + error.message); }
}

function setupAdminEventListeners() {
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productData = {
                title: document.getElementById('productTitle').value,
                description: document.getElementById('productDescription').value,
                price: parseFloat(document.getElementById('productPrice').value),
                originalPrice: parseFloat(document.getElementById('productOriginalPrice').value) || null,
                category: document.getElementById('productCategory').value,
                badge: document.getElementById('productBadge')?.value || null,
                icon: getIconForCategory(document.getElementById('productCategory').value)
            };
            await addNewProduct(productData); addProductForm.reset();
        });
    }
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
}

function getIconForCategory(category) {
    const icons = { 'ebook':'fas fa-book', 'template':'fas fa-palette', 'course':'fas fa-laptop-code', 'pack':'fas fa-film', 'bundle':'fas fa-gift' };
    return icons[category] || 'fas fa-box';
}

if (window.location.pathname.includes('admin-panel.html')) {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
}