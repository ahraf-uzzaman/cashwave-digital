// ADMIN PANEL FUNCTIONS

// Wait for Firebase to be ready
let currentUser = null;
let isAdmin = false;

// Check if user is admin (local function to avoid dependency)
async function checkAdminStatus(uid) {
    console.log("🔍 Checking admin status for:", uid);
    
    try {
        // Method 1: Check hardcoded admin list
        const ADMIN_USERS = JSON.parse(localStorage.getItem('admin_users')) || [
            "pe10B3dJ94gDmwQHlphCIK8fMyr2", 
        ];
        
        if (ADMIN_USERS.includes(uid)) {
            console.log("✅ User is in admin list");
            return true;
        }
        
        // Method 2: Check Firestore
        if (window.db) {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log("📄 User data:", userData);
                
                if (userData.role === 'admin') {
                    console.log("✅ User is admin (Firestore)");
                    return true;
                }
            }
        }
        
        // Method 3: Check by email pattern
        const user = auth.currentUser;
        if (user && (user.email.includes('admin') || user.email === 'admin@cashwave.com')) {
            console.log("✅ User email suggests admin");
            return true;
        }
        
        console.log("❌ User is NOT admin");
        return false;
        
    } catch (error) {
        console.error("Admin check error:", error);
        return false;
    }
}

// Initialize admin panel
async function initAdminPanel() {
    console.log("🚀 Initializing admin panel...");
    
    // Check if Firebase is loaded
    if (typeof auth === 'undefined' || !auth) {
        console.error("Firebase auth not loaded!");
        setTimeout(initAdminPanel, 500);
        return;
    }
    
    currentUser = auth.currentUser;
    console.log("Current user:", currentUser);
    
    if (!currentUser) {
        console.log("No user, redirecting to login");
        window.location.href = 'login.html';
        return;
    }
    
    console.log("Checking admin status for UID:", currentUser.uid);
    isAdmin = await checkAdminStatus(currentUser.uid);
    
    if (!isAdmin) {
        alert('❌ Access denied! Admin only.');
        console.log("User is not admin, redirecting to home");
        window.location.href = '/';
        return;
    }
    
    console.log("✅ Admin access granted!");
    
    // Load admin data
    loadDashboardData();
    loadProductsForAdmin();
    loadOrdersForAdmin();
    loadUsersForAdmin();
    setupAdminEventListeners();
    
    // Show admin panel
    document.body.style.opacity = '1';
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        console.log("Loading dashboard data...");
        const productsSnapshot = await db.collection('products').get();
        if (document.getElementById('totalProducts')) {
            document.getElementById('totalProducts').textContent = productsSnapshot.size;
        }
        
        const usersSnapshot = await db.collection('users').get();
        if (document.getElementById('totalUsers')) {
            document.getElementById('totalUsers').textContent = usersSnapshot.size;
        }
        
        const ordersSnapshot = await db.collection('orders').get();
        if (document.getElementById('totalOrders')) {
            document.getElementById('totalOrders').textContent = ordersSnapshot.size;
        }
        
        let revenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.status === 'confirmed') revenue += order.total || 0;
        });
        
        if (document.getElementById('totalRevenue')) {
            document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;
        }
        
        console.log("✅ Dashboard data loaded");
    } catch (error) {
        console.error('❌ Load dashboard error:', error);
    }
}

// Load products for admin management
async function loadProductsForAdmin() {
    try {
        console.log("Loading products for admin...");
        const productsTable = document.getElementById('productsTable');
        if (!productsTable) return;
        
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        let html = '';
        
        snapshot.forEach(doc => {
            const product = doc.data();
            html += `
                <tr>
                    <td>${product.title}</td>
                    <td>${product.category}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.badge || '-'}</td>
                    <td>
                        <button class="edit-btn" onclick="editProduct('${doc.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" onclick="deleteProduct('${doc.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        
        productsTable.innerHTML = html || '<tr><td colspan="5">No products found</td></tr>';
        console.log("✅ Products loaded:", snapshot.size);
        
    } catch (error) {
        console.error('❌ Load products error:', error);
    }
}

// Load orders for admin management
async function loadOrdersForAdmin() {
    try {
        console.log("Loading orders for admin...");
        const ordersTable = document.getElementById('ordersTable');
        if (!ordersTable) return;
        
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        let html = '';
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const date = order.createdAt ? order.createdAt.toDate().toLocaleDateString() : '-';
            
            html += `
                <tr>
                    <td>${doc.id.slice(0, 8)}...</td>
                    <td>${order.userName || 'N/A'}</td>
                    <td>${order.userWhatsapp || 'N/A'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td>$${order.total?.toFixed(2) || '0.00'}</td>
                    <td>
                        <span class="status-badge status-${order.status || 'pending'}">
                            ${order.status || 'pending'}
                        </span>
                    </td>
                    <td>${date}</td>
                    <td>
                        ${(order.status || 'pending') === 'pending' ? `
                            <button class="btn-confirm" onclick="confirmOrder('${doc.id}')">
                                <i class="fas fa-check"></i> Confirm
                            </button>
                        ` : ''}
                        <button class="btn-view" onclick="viewOrder('${doc.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        ordersTable.innerHTML = html || '<tr><td colspan="8">No orders found</td></tr>';
        console.log("✅ Orders loaded:", snapshot.size);
        
    } catch (error) {
        console.error('❌ Load orders error:', error);
    }
}

// Load users for admin management
async function loadUsersForAdmin() {
    try {
        console.log("Loading users for admin...");
        const usersTable = document.getElementById('usersTable');
        if (!usersTable) return;
        
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        let html = '';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : '-';
            
            html += `
                <tr>
                    <td>${user.firstName || ''} ${user.lastName || ''}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.whatsapp || '-'}</td>
                    <td>${user.role || 'customer'}</td>
                    <td>${date}</td>
                    <td>
                        ${(user.role || 'customer') !== 'admin' ? `
                            <button class="make-admin-btn" onclick="makeUserAdmin('${doc.id}')">
                                <i class="fas fa-crown"></i> Make Admin
                            </button>
                        ` : 'Admin'}
                    </td>
                </tr>
            `;
        });
        
        usersTable.innerHTML = html || '<tr><td colspan="6">No users found</td></tr>';
        console.log("✅ Users loaded:", snapshot.size);
        
    } catch (error) {
        console.error('❌ Load users error:', error);
    }
}

// Confirm order function
async function confirmOrder(orderId) {
    if (!confirm('Are you sure you want to confirm this order?')) return;
    
    try {
        // Check if confirmOrder exists in whatsapp.js
        if (typeof window.confirmOrder === 'function') {
            const result = await window.confirmOrder(orderId);
            if (result.success) {
                alert('✅ Order confirmed successfully! Products delivered to customer.');
                loadOrdersForAdmin();
                loadDashboardData();
            } else {
                alert('❌ Error: ' + (result.error || 'Unknown error'));
            }
        } else {
            // Fallback if whatsapp.js not loaded
            await db.collection('orders').doc(orderId).update({
                status: 'confirmed',
                confirmedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('✅ Order confirmed!');
            loadOrdersForAdmin();
            loadDashboardData();
        }
    } catch (error) {
        alert('❌ Error confirming order: ' + error.message);
        console.error('Confirm order error:', error);
    }
}

// Make user admin
async function makeUserAdmin(userId) {
    if (!confirm('Make this user an admin?')) return;
    
    try {
        await db.collection('users').doc(userId).update({
            role: 'admin',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ User is now an admin!');
        loadUsersForAdmin();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// Add new product
async function addNewProduct(productData) {
    try {
        await db.collection('products').add({
            ...productData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert('✅ Product added successfully!');
        loadProductsForAdmin();
        return { success: true };
    } catch (error) {
        console.error('Add product error:', error);
        alert('❌ Error adding product: ' + error.message);
        return { success: false, error: error.message };
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    
    try {
        await db.collection('products').doc(productId).delete();
        alert('✅ Product deleted!');
        loadProductsForAdmin();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// Edit product (placeholder)
function editProduct(productId) {
    alert('Edit feature coming soon! Product ID: ' + productId);
    // You can implement edit functionality here
}

// View order (placeholder)
function viewOrder(orderId) {
    alert('View order details for: ' + orderId);
    // You can implement order view functionality here
}

// Setup admin event listeners
function setupAdminEventListeners() {
    console.log("Setting up admin event listeners...");
    
    // Add product form
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
            
            await addNewProduct(productData);
            addProductForm.reset();
        });
    }
    
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
}

// Helper function to get icon for category
function getIconForCategory(category) {
    const icons = {
        'ebook': 'fas fa-book',
        'template': 'fas fa-palette',
        'course': 'fas fa-laptop-code',
        'pack': 'fas fa-film',
        'bundle': 'fas fa-gift'
    };
    return icons[category] || 'fas fa-box';
}

// Initialize admin panel when page loads
if (window.location.pathname.includes('admin-panel.html')) {
    console.log("Admin panel detected, initializing...");
    
    // Hide body until auth check is complete
    document.body.style.opacity = '0.5';
    
    // Wait for DOM to load
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOM loaded, starting admin panel init...");
        
        // Wait a bit for Firebase to load
        setTimeout(() => {
            initAdminPanel();
        }, 1000);
    });
    
    // Also try to initialize after a longer delay (fallback)
    setTimeout(() => {
        if (!currentUser && typeof auth !== 'undefined') {
            console.log("Fallback initialization...");
            initAdminPanel();
        }
    }, 3000);
}
