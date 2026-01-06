const ADMIN_USERS = [
    "QtAYicVoOaVYjpmtdVHv9prMvNo1"
];

async function registerUser(email, password, firstName, lastName, whatsapp) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            whatsapp: whatsapp,
            role: 'customer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            purchasedProducts: []
        });
        
        await auth.signInWithEmailAndPassword(email, password);
        
        return { success: true, user: user };
        
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        await auth.signOut();
        localStorage.removeItem('userData');
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

async function checkIfAdmin(uid) {
    try {
        if (ADMIN_USERS.includes(uid)) return true;
        
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return false;
        
        return userDoc.data().role === 'admin';
    } catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
}

async function addProductToUser(userId, productId, productData) {
    try {
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            purchasedProducts: firebase.firestore.FieldValue.arrayUnion({
                productId: productId,
                ...productData,
                purchasedAt: firebase.firestore.FieldValue.serverTimestamp(),
                downloadLink: `https://storage.cashwave.com/products/${productId}/download.zip`
            })
        });
        
        return { success: true };
    } catch (error) {
        console.error('Add product error:', error);
        return { success: false, error: error.message };
    }
}

function generateDownloadLink(productId) {
    return `https://storage.cashwave.com/products/${productId}/download.zip`;
}

function setupAuthStateListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const isAdmin = await checkIfAdmin(user.uid);
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            updateAuthUI(user, isAdmin, userData);
            
            localStorage.setItem('userData', JSON.stringify({
                uid: user.uid,
                email: user.email,
                isAdmin: isAdmin,
                ...userData
            }));
            
        } else {
            updateAuthUI(null, false, null);
            localStorage.removeItem('userData');
        }
    });
}

function updateAuthUI(user, isAdmin, userData) {
    const authLinks = document.getElementById('authLinks');
    const guestLinks = document.getElementById('guestLinks');
    const adminNavLink = document.getElementById('adminNavLink');
    const profileLink = document.getElementById('profileLink');
    const userName = document.getElementById('userName');
    
    if (user && userData) {
        authLinks.style.display = 'flex';
        guestLinks.style.display = 'none';
        
        if (userName) {
            userName.textContent = userData.firstName || user.email.split('@')[0];
        }
        
        if (isAdmin && adminNavLink) {
            adminNavLink.style.display = 'block';
        } else if (adminNavLink) {
            adminNavLink.style.display = 'none';
        }
        
    } else {
        authLinks.style.display = 'none';
        guestLinks.style.display = 'flex';
        
        if (adminNavLink) {
            adminNavLink.style.display = 'none';
        }
    }
}

function checkAuthState() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        const parsedData = JSON.parse(userData);
        updateAuthUI(
            { uid: parsedData.uid, email: parsedData.email },
            parsedData.isAdmin,
            parsedData
        );
    }
}

async function updateUserProfile(uid, updates) {
    try {
        await db.collection('users').doc(uid).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Update error:', error);
        return { success: false, error: error.message };
    }
}

async function getUserPurchasedProducts(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        return userData.purchasedProducts || [];
    } catch (error) {
        console.error('Get purchased products error:', error);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof auth !== 'undefined') {
        setupAuthStateListener();
        checkAuthState();
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await logoutUser();
                window.location.href = '/';
            });
        }
    }
});
