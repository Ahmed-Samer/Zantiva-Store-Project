// --- دوال سلة المشتريات والإشعارات ---

let appliedCoupon = null; // متغير لتخزين الكوبون المطبق

// دالة الإشعارات
export function showToast(message, isError = false) { 
    const toastContainer = document.getElementById('toast-container'); 
    if (!toastContainer) return; 
    const toast = document.createElement('div'); 
    toast.classList.add('toast'); 
    if (isError) {
        toast.style.backgroundColor = '#e74c3c';
        toast.style.color = '#ffffff';
    }
    toast.innerHTML = message; 
    toastContainer.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 4000); 
}

// دالة تحديث أيقونة السلة
export function updateCartIcon() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCountElements = document.querySelectorAll('.cart-count');
    let totalItems = 0;
    cart.forEach(item => totalItems += item.quantity);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
    });
}

// دالة لتحديث السلة في الـ localStorage وقاعدة البيانات
async function syncCart(newCart) {
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateCartIcon();

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.token) {
        try {
            await fetch('/api/users/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userInfo.token}`
                },
                body: JSON.stringify({ cart: newCart })
            });
        } catch (error) {
            console.error('Failed to sync cart with DB:', error);
            showToast('حدث خطأ أثناء مزامنة السلة مع حسابك.', true);
        }
    }
}


// دالة إضافة منتج للسلة
export function addToCart(productId, quantity, size, allProducts) {
    if (!size) {
        showToast('من فضلك اختر المقاس أولاً.', true);
        return;
    }

    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    const sizeVariant = product.sizes.find(s => s.name === size);
    if (!sizeVariant) {
        showToast('حدث خطأ: المقاس غير موجود لهذا المنتج.', true);
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProductIndex = cart.findIndex(item => item.id == productId && item.size == size);
    
    let quantityInCart = 0;
    if(existingProductIndex > -1) {
        quantityInCart = cart[existingProductIndex].quantity;
    }

    const remainingStock = sizeVariant.stock - quantityInCart;

    if (quantity > remainingStock) {
        if (remainingStock > 0) {
            showToast(`عفواً، المتاح في المخزون هو ${remainingStock} قطعة فقط. لا يمكنك إضافة المزيد.`, true);
        } else {
            showToast(`عفواً، كل الكمية المتاحة من هذا المقاس موجودة بالفعل في سلتك.`, true);
        }
        return;
    }

    if (existingProductIndex > -1) {
        cart[existingProductIndex].quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity, size: size });
    }
    
    syncCart(cart);
    showToast(`تمت إضافة ${quantity} قطعة للسلة بنجاح ✔️`);
}

// دالة حذف منتج من السلة
function removeFromCart(cartItemId, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => (item.id + '-' + item.size) !== cartItemId);
    
    syncCart(cart);
    displayCartItems(allProducts);
}


// دالة تغيير كمية منتج في السلة
function changeCartItemQuantity(cartItemId, change, allProducts) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const itemIndex = cart.findIndex(item => (item.id + '-' + item.size) === cartItemId);
    
    if (itemIndex > -1) {
        const itemInCart = cart[itemIndex];

        if (change < 0 && itemInCart.quantity <= 1) {
            return;
        }

        const product = allProducts.find(p => p.id == itemInCart.id);
        const sizeVariant = product.sizes.find(s => s.name === itemInCart.size);

        if (change > 0 && (itemInCart.quantity + change > sizeVariant.stock)) {
            showToast(`الكمية المتاحة لهذا المقاس هي ${sizeVariant.stock} قطعة فقط.`, true);
            return;
        }

        itemInCart.quantity += change;
    }

    syncCart(cart);
    displayCartItems(allProducts);
}


// دالة عرض المنتجات في صفحة السلة
export function displayCartItems(allProducts) {
    const cartPageContainer = document.querySelector('.cart-page-container');
    if (!cartPageContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        cartPageContainer.classList.add('cart-is-empty');
    } else {
        cartPageContainer.classList.remove('cart-is-empty');
        const cartItemsContainer = document.querySelector('.cart-items-list');
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;
        cart.forEach(cartItem => {
            const product = allProducts.find(p => p.id == cartItem.id);
            if (product) {
                totalPrice += product.price * cartItem.quantity;
                const cartItemId = `${product.id}-${cartItem.size}`;
                const cartItemHTML = `<div class="cart-item"> <img src="${product.images[0]}" alt="${product.name}" class="cart-item-image"> <div class="cart-item-details"> <h3>${product.name}</h3> <p>المقاس: ${cartItem.size}</p> <div class="cart-item-quantity"> <button class="quantity-btn minus-btn" data-id="${cartItemId}">-</button> <span class="quantity-text">${cartItem.quantity}</span> <button class="quantity-btn plus-btn" data-id="${cartItemId}">+</button> </div> </div> <p class="cart-item-price">${product.price * cartItem.quantity} ج.م</p> <button class="remove-from-cart-btn" data-id="${cartItemId}">🗑️</button> </div>`;
                cartItemsContainer.innerHTML += cartItemHTML;
            }
        });
        document.getElementById('cart-total-price').textContent = `${totalPrice} ج.م`;
        document.querySelectorAll('.remove-from-cart-btn').forEach(button => { button.addEventListener('click', (event) => { removeFromCart(event.target.dataset.id, allProducts); }); });
        document.querySelectorAll('.plus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, 1, allProducts); }); });
        document.querySelectorAll('.minus-btn').forEach(button => { button.addEventListener('click', (event) => { changeCartItemQuantity(event.target.dataset.id, -1, allProducts); }); });
    }
    updateCartIcon();
}

// --- بداية الجزء المعدل ---

// دالة عرض ملخص الطلب في صفحة الدفع (مُعدلة بالكامل)
export function displayCheckoutSummary(allProducts) {
    const summaryContainer = document.getElementById('summary-items-container');
    if (!summaryContainer) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    summaryContainer.innerHTML = '';
    
    if (cart.length === 0) {
        summaryContainer.innerHTML = '<p>لا توجد منتجات في السلة.</p>';
        const confirmBtn = document.querySelector('.confirm-order-btn');
        if (confirmBtn) confirmBtn.disabled = true;
        updatePriceSummary(0); // تحديث الأسعار لتكون صفر
        return;
    }

    let subtotal = 0;
    cart.forEach(cartItem => {
        const product = allProducts.find(p => p.id == cartItem.id);
        if (product) {
            subtotal += product.price * cartItem.quantity;
            const summaryItemHTML = `<div class="summary-item"> <span>${product.name} (x${cartItem.quantity}) - مقاس ${cartItem.size}</span> <span>${product.price * cartItem.quantity} ج.م</span> </div>`;
            summaryContainer.innerHTML += summaryItemHTML;
        }
    });

    updatePriceSummary(subtotal); // حساب وعرض السعر المبدئي

    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', handleApplyCoupon);
    }
}

// دالة جديدة لتحديث عرض الأسعار في الملخص
function updatePriceSummary(subtotal, discount = { amount: 0, code: null }) {
    const subtotalEl = document.getElementById('summary-subtotal-price');
    const discountRow = document.getElementById('summary-discount-row');
    const discountAmountEl = document.getElementById('summary-discount-amount');
    const totalEl = document.getElementById('summary-total-price');
    
    let finalPrice = subtotal - discount.amount;
    if (finalPrice < 0) finalPrice = 0;

    subtotalEl.textContent = `${subtotal.toFixed(2)} ج.م`;
    totalEl.textContent = `${finalPrice.toFixed(2)} ج.م`;

    if (discount.amount > 0) {
        discountAmountEl.textContent = `-${discount.amount.toFixed(2)} ج.م`;
        discountRow.style.display = 'flex';
    } else {
        discountRow.style.display = 'none';
    }
}

// دالة جديدة للتحقق من الكوبون وتطبيقه
async function handleApplyCoupon() {
    const couponInput = document.getElementById('coupon-input');
    const code = couponInput.value.trim();
    const couponMessageEl = document.getElementById('coupon-message');
    
    if (!code) {
        showToast('يرجى إدخال كود الخصم', true);
        return;
    }

    try {
        const response = await fetch('/api/coupons/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }
        
        appliedCoupon = data; // حفظ الكوبون السليم
        couponMessageEl.textContent = `تم تطبيق الخصم بنجاح! (${data.code})`;
        couponMessageEl.style.color = '#2ecc71';
        
        // إعادة حساب السعر بعد تطبيق الكوبون
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const allProducts = await (await fetch('/api/products/search?keyword=')).json();
        let subtotal = 0;
        cart.forEach(item => {
            const product = allProducts.find(p => p.id == item.id);
            if(product) subtotal += product.price * item.quantity;
        });

        let discountAmount = 0;
        if (appliedCoupon.discountType === 'percentage') {
            discountAmount = (subtotal * appliedCoupon.value) / 100;
        } else {
            discountAmount = appliedCoupon.value;
        }
        
        updatePriceSummary(subtotal, { amount: discountAmount, code: appliedCoupon.code });

    } catch (error) {
        appliedCoupon = null;
        couponMessageEl.textContent = error.message;
        couponMessageEl.style.color = '#e74c3c';
        // إعادة السعر لوضعه الأصلي لو الكوبون خطأ
        displayCheckoutSummary(JSON.parse(localStorage.getItem('allProducts')) || []); 
    }
}


// دالة لملء فورم الشحن تلقائياً
export function prefillCheckoutForm() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    if (userInfo && userInfo.shippingDetails) {
        const details = userInfo.shippingDetails;
        if (details.fullName) document.getElementById('full-name').value = details.fullName;
        if (details.phone) document.getElementById('phone').value = details.phone;
        if (details.address) document.getElementById('address').value = details.address;
        if (details.governorate) document.getElementById('governorate').value = details.governorate;
        if (details.city) document.getElementById('city').value = details.city;
    }
}


// دوال التحقق من الفورم
function showFieldError(inputElement, message) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.add('invalid'); if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; } }
function clearFieldError(inputElement) { const formGroup = inputElement.closest('.form-group'); if (!formGroup) return; const errorElement = formGroup.querySelector('.error-message'); if (inputElement) inputElement.classList.remove('invalid'); if(errorElement) errorElement.style.display = 'none'; }
function validateForm() { let isValid = true; const fields = ['full-name', 'phone', 'address', 'governorate', 'city']; fields.forEach(id => { const field = document.getElementById(id); if (field) clearFieldError(field); }); const fullName = document.getElementById('full-name'); const phone = document.getElementById('phone'); const address = document.getElementById('address'); const governorate = document.getElementById('governorate'); const city = document.getElementById('city'); if (fullName.value.trim() === '') { showFieldError(fullName, 'هذا الحقل مطلوب.'); isValid = false; } if (phone.value.trim() === '') { showFieldError(phone, 'هذا الحقل مطلوب.'); isValid = false; } else if (!/^\d{11}$/.test(phone.value.trim())) { showFieldError(phone, 'يجب أن يكون رقم الهاتف 11 رقماً صحيحاً.'); isValid = false; } if (address.value.trim() === '') { showFieldError(address, 'هذا الحقل مطلوب.'); isValid = false; } if (governorate.value.trim() === '') { showFieldError(governorate, 'هذا الحقل مطلوب.'); isValid = false; } if (city.value.trim() === '') { showFieldError(city, 'هذا الحقل مطلوب.'); isValid = false; } return isValid; }


// دالة إرسال الطلب للسيرفر (مُعدلة لإرسال الكوبون)
export async function handleOrderSubmission(event) {
    event.preventDefault();
    if (!validateForm()) {
        showToast('من فضلك املأ كل الحقول المطلوبة بشكل صحيح.', true);
        return;
    }

    const confirmBtn = document.querySelector('.confirm-order-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'جاري تأكيد الطلب...';

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const customerDetails = {
        fullName: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        governorate: document.getElementById('governorate').value,
        city: document.getElementById('city').value,
    };
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    if (cartItems.length === 0) {
        showToast('سلة المشتريات فارغة!', true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الطلب';
        return;
    }
    
    // تجميع كل البيانات لإرسالها
    const orderData = {
        customerDetails,
        cartItems,
        couponCode: appliedCoupon ? appliedCoupon.code : null
    };

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (userInfo && userInfo.token) {
            headers['Authorization'] = `Bearer ${userInfo.token}`;
        }

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData),
        });

        if (response.ok) {
            syncCart([]);
            showToast('تم تأكيد طلبك بنجاح! سيتم تحويلك للصفحة الرئيسية ✔️');
            confirmBtn.textContent = 'تم الطلب بنجاح!';
            if (userInfo) {
                const updatedUserInfo = { ...userInfo, shippingDetails: customerDetails };
                localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
            }
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في إرسال الطلب. حاول مرة أخرى.');
        }
    } catch (error) {
        showToast(error.message, true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الطلب';
    }
}
// --- نهاية الجزء المعدل ---