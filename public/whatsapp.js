async function sendOrderViaWhatsApp(orderData) {
    const user = auth.currentUser;
    if (!user) { alert('Please login to place order'); return false; }
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (!userData.whatsapp) { alert('Please update your WhatsApp number in profile'); return false; }
        const orderRef = await db.collection('orders').add({
            ...orderData, userId: user.uid, userEmail: user.email,
            userName: `${userData.firstName} ${userData.lastName}`, userWhatsapp: userData.whatsapp,
            status: 'pending', items: orderData.items, total: orderData.total,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            paymentMethod: orderData.paymentMethod || 'whatsapp_confirmation'
        });
        const whatsappMessage = createOrderMessage(orderData, orderRef.id, userData);
        const whatsappLink = `https://wa.me/${userData.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappLink, '_blank');
        clearCart(); return { success: true, orderId: orderRef.id };
    } catch (error) { console.error('Order error:', error); alert('Order failed: ' + error.message); return { success: false, error: error.message }; }
}

function createOrderMessage(orderData, orderId, userData) {
    let message = `Hello ${userData.firstName},\n\nThank you for your order at CashWave!\nOrder ID: ${orderId}\nDate: ${new Date().toLocaleDateString()}\n\nItems Ordered:\n`;
    let total = 0; orderData.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity; total += itemTotal;
        message += `${index + 1}. ${item.title} - $${item.price} x ${item.quantity} = $${itemTotal.toFixed(2)}\n`;
    });
    message += `\nTotal: $${total.toFixed(2)}\n\nPayment Method: WhatsApp Confirmation\n\nPlease send payment to one of these:\n• Bkash: 01XXXXXXXXX\n• Nagad: 01XXXXXXXXX\n• Rocket: 01XXXXXXXXX\n\nAfter payment, please send:\n1. Transaction ID\n2. Payment Method\n3. Sender Phone Number\n\nOnce verified, products will be added to your account automatically!\n\nThank you,\nCashWave Team`;
    return message;
}

async function confirmOrder(orderId) {
    try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) throw new Error('Order not found');
        const order = orderDoc.data();
        await orderRef.update({ status: 'confirmed', confirmedAt: firebase.firestore.FieldValue.serverTimestamp(), confirmedBy: auth.currentUser.uid });
        for (const item of order.items) {
            const productDoc = await db.collection('products').doc(item.id).get();
            const productData = productDoc.data();
            await addProductToUser(order.userId, item.id, { title: item.title, price: item.price, quantity: item.quantity, purchasedAt: firebase.firestore.FieldValue.serverTimestamp(), orderId: orderId });
        }
        await sendOrderConfirmedMessage(order); return { success: true };
    } catch (error) { console.error('Confirm order error:', error); return { success: false, error: error.message }; }
}

async function sendOrderConfirmedMessage(order) {
    const message = `Hello ${order.userName.split(' ')[0]},\n\nYour order #${order.orderId} has been confirmed!\n\nAll products have been added to your account.\nYou can now download them from "My Purchases" section.\n\nThank you for shopping with CashWave!\nFor any issues, contact us on WhatsApp.\n\nBest regards,\nCashWave Team`;
    console.log('WhatsApp message to send:', message); console.log('To:', order.userWhatsapp); return true;
}

function setupCheckout() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            const cart = JSON.parse(localStorage.getItem('cashwave_cart')) || [];
            if (cart.length === 0) { alert('Your cart is empty!'); return; }
            const orderData = { items: cart, total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), paymentMethod: 'whatsapp_confirmation' };
            const result = await sendOrderViaWhatsApp(orderData);
            if (result.success) { setTimeout(() => { window.location.href = 'success.html?order=' + result.orderId; }, 1000); }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setupCheckout();
    const supportBtn = document.getElementById('whatsappSupport');
    if (supportBtn) {
        supportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const message = "Hello CashWave Support, I need help with:";
            window.open(`https://wa.me/+8801705261186?text=${encodeURIComponent(message)}`, '_blank');
        });
    }
});