const app = {
    cart: [], currentCustomer: null, currentPaymentMethod: 'cash', charts: {}, deferredPrompt: null,
    init() {
        this.loadSettings(); this.initUI(); this.loadCartFromStorage();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.deferredPrompt = e; document.getElementById('installBanner').classList.remove('hidden'); });
        setTimeout(() => { this.loadProducts(); this.loadCategories(); this.loadBranches(); if (document.getElementById('dashboard').classList.contains('active')) this.updateDashboard(); if (DB.checkAndResetDaily()) document.getElementById('newDayAlert').style.display = 'block'; }, 100);
        this.scheduleMidnightReset();
    },
    scheduleMidnightReset() { const now = new Date(), midnight = new Date(); midnight.setHours(24,0,0,0); setTimeout(() => { DB.checkAndResetDaily(); this.updateDashboard(); document.getElementById('newDayAlert').style.display = 'block'; this.scheduleMidnightReset(); }, midnight - now); },
    closeNewDayAlert() { document.getElementById('newDayAlert').style.display = 'none'; },
    installPWA() { if (this.deferredPrompt) { this.deferredPrompt.prompt(); this.deferredPrompt = null; document.getElementById('installBanner').classList.add('hidden'); } },
    loadSettings() { document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ar-EG'); },
    initUI() { document.getElementById('storeName').value = DB.data.settings.companyName; document.getElementById('storePhone').value = DB.data.settings.storePhone; document.getElementById('taxRate').value = DB.data.settings.taxRate; },
    updateDashboard() { const s = DB.getDashboardStats(); document.getElementById('kpiDailySales').textContent = `${s.dailySales.toFixed(2)} ج.م`; document.getElementById('kpiInvoiceCount').textContent = s.invoiceCount; document.getElementById('kpiLowStock').textContent = s.lowStock; document.getElementById('kpiPresentEmployees').textContent = `${s.presentEmployees}/${s.totalEmployees}`; this.renderSalesChart(); this.loadRecentSales(); },
    renderSalesChart() { const ctx = document.getElementById('salesChart')?.getContext('2d'); if (!ctx) return; if (this.charts.sales) this.charts.sales.destroy(); this.charts.sales = new Chart(ctx, { type: 'line', data: { labels: ['اليوم'], datasets: [{ label: 'المبيعات', data: [DB.getTodaySales().reduce((s, sale) => s + sale.total, 0)], borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', fill: true }] }, options: { responsive: true } }); },
    loadRecentSales() { const c = document.getElementById('recentSalesList'); if (!c) return; const sales = DB.data.sales.slice(0,5); c.innerHTML = sales.map(s => `<div><strong>#${s.id.slice(-6)}</strong> - ${s.total.toFixed(2)} ج.م</div>`).join('') || '<div>لا توجد مبيعات</div>'; },
    showSalesDetails() { const sales = DB.getTodaySales(); let h = `<h4>فواتير اليوم</h4><table>`; sales.forEach(s => { const u = DB.data.users.find(u => u.id === s.userId); h += `<tr><td>${new Date(s.date).toLocaleTimeString('ar-EG')}</td><td>${s.total.toFixed(2)}</td><td>${u?.name || '-'}</td></tr>`; }); h += `</table><p><strong>الإجمالي: ${sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)} ج.م</strong></p>`; this.showDetailModal('تفاصيل المبيعات', h); },
    showInvoicesDetails() { const sales = DB.getTodaySales(); let h = `<h4>فواتير اليوم (${sales.length})</h4>`; if (sales.length) { h += `<table><tr><th>الفاتورة</th><th>الوقت</th><th>الإجمالي</th></tr>`; sales.forEach(s => h += `<tr><td>#${s.id.slice(-6)}</td><td>${new Date(s.date).toLocaleTimeString('ar-EG')}</td><td>${s.total.toFixed(2)}</td></tr>`); h += `</table>`; } else h += `<p>لا توجد فواتير</p>`; this.showDetailModal('الفواتير', h); },
    showLowStockDetails() { const low = DB.getLowStockProducts(); let h = `<h4>المنتجات الناقصة</h4>`; if (low.length) { h += `<ul>`; low.forEach(p => h += `<li>${p.name} - ${p.stock} (الحد: ${p.minStock})</li>`); h += `</ul>`; } else h += `<p style="color:green;">✅ جميع المنتجات متوفرة</p>`; this.showDetailModal('المنتجات الناقصة', h); },
    showAttendanceDetails() { const present = DB.getPresentEmployees(); const late = DB.getLateEmployees(); const absent = DB.getAbsentEmployees(); let h = `<h4>الحاضرين (${present.length})</h4>`; present.forEach(p => h += `<p>✅ ${p.name} - ${new Date(p.checkIn).toLocaleTimeString('ar-EG')}</p>`); h += `<h4>المتأخرين (${late.length})</h4>`; late.forEach(l => h += `<p>⚠️ ${l.name} - متأخر ${l.lateMinutes} دقيقة</p>`); h += `<h4>الغائبين (${absent.length})</h4>`; absent.forEach(a => h += `<p>❌ ${a}</p>`); this.showDetailModal('تفاصيل الحضور', h); },
    showDetailModal(t, b) { document.getElementById('detailTitle').textContent = t; document.getElementById('detailBody').innerHTML = b; document.getElementById('detailModal').classList.remove('hidden'); },
    closeDetailModal() { document.getElementById('detailModal').classList.add('hidden'); },
    
    // Toast Notification
    showToast(message, type = 'error') {
        const toast = document.getElementById('toast');
        const msg = document.getElementById('toastMessage');
        const icon = toast.querySelector('i');
        
        toast.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        toast.style.display = 'flex';
        msg.textContent = message;
        
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    },
    
    togglePassword(id) { const i = document.getElementById(id); i.type = i.type === 'password' ? 'text' : 'password'; },
    showForgotPasswordForm() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('forgotForm').style.display = 'block'; },
    showLoginForm() { document.getElementById('loginForm').style.display = 'block'; document.getElementById('forgotForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'none'; },
    showRegisterForm() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; },
    requestResetCode() { this.showToast('كود التحقق: 123456', 'success'); document.getElementById('step1').style.display = 'none'; document.getElementById('step2').style.display = 'block'; },
    confirmResetPassword() { this.showToast('تم تغيير كلمة المرور', 'success'); this.showLoginForm(); },
    register() {
        const name = document.getElementById('regName').value, username = document.getElementById('regUsername').value, password = document.getElementById('regPassword').value, phone = document.getElementById('regPhone').value, email = document.getElementById('regEmail').value;
        if (!name || !username || !password) { this.showToast('جميع الحقول مطلوبة', 'error'); return; }
        if (password.length < 4) { this.showToast('كلمة المرور 4 أحرف على الأقل', 'error'); return; }
        const r = DB.requestRegistration({ name, username, password, phone, email, role: 'cashier' });
        if (r.success) { this.showToast(r.message, 'success'); this.showLoginForm(); } else { this.showToast(r.message, 'error'); }
    },
    login() {
        const username = document.getElementById('username').value, password = document.getElementById('password').value;
        if (!username || !password) { this.showToast('أدخل اسم المستخدم وكلمة المرور', 'error'); return; }
        const result = DB.authenticateUser(username, password);
        if (!result) { this.showToast('خطأ في اسم المستخدم أو كلمة المرور', 'error'); return; }
        if (result.error === 'pending') { this.showToast('الحساب قيد المراجعة', 'error'); return; }
        if (result.error === 'must_change_password') { this.showForcePasswordChange(result.user); return; }
        if (result.success) {
            DB.data.currentUser = result.user;
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('mainDashboard').classList.remove('hidden');
            document.getElementById('userNameDisplay').textContent = result.user.name;
            this.renderSidebar(); this.updateDashboard(); this.loadProducts(); this.loadBranches();
            if (DB.isDeveloper(result.user)) setTimeout(() => this.showToast('👨‍💻 مرحباً بك يا مطور النظام!', 'success'), 500);
        }
    },
    showForcePasswordChange(user) {
        const newPass = prompt('⚠️ يجب تغيير كلمة المرور الافتراضية.\nأدخل كلمة مرور جديدة (6 أحرف على الأقل):');
        if (!newPass || newPass.length < 6) { alert('كلمة المرور قصيرة'); this.showForcePasswordChange(user); return; }
        const confirm = prompt('أعد كتابة كلمة المرور:');
        if (newPass !== confirm) { alert('غير متطابقة'); this.showForcePasswordChange(user); return; }
        if (DB.forceAdminPasswordChange(newPass)) {
            this.showToast('تم تغيير كلمة المرور بنجاح', 'success');
            const r = DB.authenticateUser(user.username, newPass);
            if (r.success) { DB.data.currentUser = r.user; document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainDashboard').classList.remove('hidden'); this.renderSidebar(); this.updateDashboard(); }
        }
    },
    logout() { DB.data.currentUser = null; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); this.cart = []; },
    renderSidebar() {
        const nav = document.getElementById('sidebarNav');
        let h = `<a class="nav-item active" onclick="app.showSection('dashboard')"><i class="fas fa-chart-pie"></i><span>لوحة التحكم</span></a>
                 <a class="nav-item" onclick="app.showSection('cashier')"><i class="fas fa-cash-register"></i><span>الكاشير</span></a>`;
        if (!DB.data.currentUser || DB.data.currentUser.role !== 'cashier') {
            h += `<div class="nav-group"><div class="nav-group-title">إدارة المخزون</div><a class="nav-item" onclick="app.showSection('inventory')"><i class="fas fa-boxes"></i><span>الجرد والمنتجات</span></a><a class="nav-item" onclick="app.showSection('stockControl')"><i class="fas fa-chart-line"></i><span>مراقبة المخزون</span></a></div>
                  <div class="nav-group"><div class="nav-group-title">العملاء</div><a class="nav-item" onclick="app.showSection('customers')"><i class="fas fa-users"></i><span>العملاء والولاء</span></a></div>
                  <div class="nav-group"><div class="nav-group-title">الموظفين</div><a class="nav-item" onclick="app.showSection('attendance')"><i class="fas fa-clock"></i><span>الحضور والتبس</span></a></div>
                  <div class="nav-group"><div class="nav-group-title">التقارير</div><a class="nav-item" onclick="app.showSection('reports')"><i class="fas fa-chart-bar"></i><span>التقارير</span></a></div>
                  <div class="nav-group"><div class="nav-group-title">الإعدادات</div><a class="nav-item" onclick="app.showSection('settings')"><i class="fas fa-cog"></i><span>الإعدادات</span></a></div>`;
        }
        nav.innerHTML = h;
    },
    showSection(id) {
        document.querySelectorAll('.section-modern').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        if (id === 'dashboard') this.updateDashboard();
        if (id === 'cashier') this.loadProducts();
        if (id === 'inventory') this.loadInventory();
        if (id === 'customers') this.loadCustomersTable();
        if (id === 'attendance') this.loadAttendance();
        if (id === 'settings') { this.loadRegistrationRequests(); this.loadUsersManagement(); }
    },
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); },
    toggleUserMenu() { document.getElementById('userMenu').classList.toggle('hidden'); },
    toggleTheme() { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); },
    setPaymentMethod(m) {
        this.currentPaymentMethod = m;
        document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
        document.getElementById(m === 'cash' ? 'cashMethod' : 'cardMethod').classList.add('active');
        document.getElementById('cardPaymentDetails').style.display = m === 'card' ? 'block' : 'none';
    },
    loadProducts() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        const products = DB.getProducts();
        grid.innerHTML = products.map(p => `<div class="product-card" onclick="app.addToCart('${p.id}')"><h4>${p.name}</h4><div class="price">${p.price.toFixed(2)} ج.م</div><small>${p.stock} قطعة</small></div>`).join('');
        document.getElementById('categoryTabs').innerHTML = DB.data.categories.map(c => `<button class="category-tab" onclick="app.filterProducts('${c.id}')">${c.name}</button>`).join('');
    },
    filterProducts(catId) {
        const products = catId === 'all' ? DB.getProducts() : DB.getProducts().filter(p => p.categoryId === catId);
        document.getElementById('productsGrid').innerHTML = products.map(p => `<div class="product-card" onclick="app.addToCart('${p.id}')"><h4>${p.name}</h4><div class="price">${p.price.toFixed(2)} ج.م</div><small>${p.stock} قطعة</small></div>`).join('');
    },
    addToCart(pid) {
        const p = DB.getProducts().find(p => p.id === pid);
        if (!p) { this.showToast('المنتج غير موجود', 'error'); return; }
        if (p.stock <= 0) { this.showToast(`المنتج "${p.name}" غير متوفر حالياً`, 'error'); return; }
        const ex = this.cart.find(i => i.id === pid);
        const currentQty = ex ? ex.quantity : 0;
        if (currentQty + 1 > p.stock) { this.showToast(`الكمية غير متوفرة!\n${p.name}\nالمطلوب: ${currentQty + 1}\nالمتاح: ${p.stock}`, 'error'); return; }
        if (ex) { ex.quantity++; } else { this.cart.push({ id: p.id, name: p.name, price: p.price, quantity: 1 }); }
        this.updateCartDisplay(); localStorage.setItem('currentCart', JSON.stringify(this.cart));
    },
    updateCartItemQuantity(idx, delta) {
        const item = this.cart[idx];
        const p = DB.getProducts().find(p => p.id === item.id);
        const newQty = item.quantity + delta;
        if (newQty <= 0) { this.cart.splice(idx, 1); }
        else if (newQty > p.stock) { this.showToast(`الكمية غير متوفرة!\n${p.name}\nالمطلوب: ${newQty}\nالمتاح: ${p.stock}`, 'error'); return; }
        else { this.cart[idx].quantity = newQty; }
        this.updateCartDisplay(); localStorage.setItem('currentCart', JSON.stringify(this.cart));
    },
    removeCartItem(idx) { this.cart.splice(idx, 1); this.updateCartDisplay(); localStorage.setItem('currentCart', JSON.stringify(this.cart)); },
    updateCartDisplay() {
        const c = document.getElementById('cartItemsPro');
        if (!c) return;
        if (!this.cart.length) { c.innerHTML = '<div style="padding:20px;text-align:center;">السلة فارغة</div>'; this.updateCartSummary(); return; }
        c.innerHTML = this.cart.map((item, i) => `<div style="display:flex;justify-content:space-between;padding:10px;"><div><strong>${item.name}</strong><br><small>${item.price.toFixed(2)} × ${item.quantity}</small></div><div><button onclick="app.updateCartItemQuantity(${i},-1)">-</button><span style="margin:0 10px;">${item.quantity}</span><button onclick="app.updateCartItemQuantity(${i},1)">+</button><button onclick="app.removeCartItem(${i})" style="margin-right:10px;color:red;">🗑️</button></div></div>`).join('');
        this.updateCartSummary();
    },
    updateCartSummary() { const sub = this.cart.reduce((s, i) => s + i.price * i.quantity, 0), tax = sub * (DB.data.settings.taxRate / 100), total = sub + tax; document.getElementById('cartSubtotal').textContent = `${sub.toFixed(2)} ج.م`; document.getElementById('cartTax').textContent = `${tax.toFixed(2)} ج.م`; document.getElementById('cartTotal').textContent = `${total.toFixed(2)} ج.م`; },
    clearCart() { this.cart = []; this.updateCartDisplay(); localStorage.removeItem('currentCart'); },
    loadCartFromStorage() { const saved = localStorage.getItem('currentCart'); if (saved) { this.cart = JSON.parse(saved); this.updateCartDisplay(); } },
    searchCustomer() { const phone = document.getElementById('customerPhone').value; if (!phone) return; const c = DB.getCustomerByPhone(phone); if (c) { this.currentCustomer = c; document.getElementById('customerDetails').innerHTML = `<div style="padding:10px;background:#e8f5e9;border-radius:8px;"><strong>${c.name}</strong><br>📞 ${c.phone}<br>⭐ ${c.points} نقطة</div>`; document.getElementById('customerDetails').classList.remove('hidden'); } else { this.showToast('عميل جديد - سيتم إضافته عند البيع', 'success'); } },
    calculateChangePro() { const sub = this.cart.reduce((s, i) => s + i.price * i.quantity, 0), tax = sub * (DB.data.settings.taxRate / 100), total = sub + tax, cash = parseFloat(document.getElementById('cashAmount').value); if (isNaN(cash)) { this.showToast('أدخل المبلغ', 'error'); return; } document.getElementById('changeAmount').innerHTML = cash < total ? `<div style="color:red;">المبلغ غير كافٍ! المطلوب: ${total.toFixed(2)}</div>` : `<div style="color:green;">الباقي: ${(cash - total).toFixed(2)} ج.م</div>`; },
    completeSalePro() {
        if (!this.cart.length) { this.showToast('السلة فارغة', 'error'); return; }
        for (const item of this.cart) {
            const p = DB.getProducts().find(p => p.id === item.id);
            if (!p) { this.showToast(`المنتج ${item.name} غير موجود`, 'error'); return; }
            if (p.stock < item.quantity) { this.showToast(`❌ الكمية غير متوفرة: ${item.name}\nالمطلوب: ${item.quantity}\nالمتاح: ${p.stock}`, 'error'); return; }
        }
        const sub = this.cart.reduce((s, i) => s + i.price * i.quantity, 0), tax = sub * (DB.data.settings.taxRate / 100), total = sub + tax;
        if (this.currentPaymentMethod === 'cash') { const cash = parseFloat(document.getElementById('cashAmount').value); if (isNaN(cash) || cash < total) { this.showToast('المبلغ المدفوع غير صحيح', 'error'); return; } }
        this.cart.forEach(i => { const p = DB.getProducts().find(p => p.id === i.id); if (p) p.stock -= i.quantity; });
        const sale = { items: this.cart, subtotal: sub, tax, total, paid: this.currentPaymentMethod === 'cash' ? parseFloat(document.getElementById('cashAmount').value) : total, change: this.currentPaymentMethod === 'cash' ? parseFloat(document.getElementById('cashAmount').value) - total : 0, paymentMethod: this.currentPaymentMethod };
        if (this.currentCustomer) { sale.customerId = this.currentCustomer.id; this.currentCustomer.totalPurchases = (this.currentCustomer.totalPurchases || 0) + total; this.currentCustomer.points = (this.currentCustomer.points || 0) + Math.floor(total); this.currentCustomer.lastVisit = new Date().toISOString(); }
        DB.addSale(sale); DB.save();
        receipt.show(sale);
        this.showToast(`✅ تم البيع بنجاح! الإجمالي: ${total.toFixed(2)} ج.م`, 'success');
        this.clearCart(); this.loadProducts(); this.currentCustomer = null;
        document.getElementById('customerDetails').classList.add('hidden');
        document.getElementById('customerPhone').value = '';
        document.getElementById('cashAmount').value = ''; document.getElementById('changeAmount').innerHTML = 'الباقي: 0.00 ج.م';
    },
    loadInventory() { const t = document.getElementById('inventoryTableBody'); if (!t) return; t.innerHTML = DB.getProducts().map(p => `<tr><td>${p.barcode}</td><td>${p.name}</td><td>${DB.data.categories.find(c => c.id === p.categoryId)?.name || '-'}</td><td>${p.price.toFixed(2)}</td><td>${p.stock}</td><td style="color:${p.stock <= p.minStock ? 'red' : 'green'}">${p.stock <= p.minStock ? '⚠️ ناقص' : '✓ جيد'}</td><td><button onclick="app.deleteProduct('${p.id}')" style="background:#e74c3c;color:white;border:none;padding:5px 10px;">🗑️</button></td></tr>`).join(''); },
    showAddProductForm() { document.getElementById('addProductForm').style.display = 'block'; document.getElementById('newCategory').innerHTML = DB.data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); },
    hideAddProductForm() { document.getElementById('addProductForm').style.display = 'none'; },
    saveNewProduct() { const p = { barcode: document.getElementById('newBarcode').value, name: document.getElementById('newName').value, categoryId: document.getElementById('newCategory').value, price: parseFloat(document.getElementById('newPrice').value), cost: parseFloat(document.getElementById('newCost').value), stock: parseInt(document.getElementById('newStock').value), minStock: parseInt(document.getElementById('newMinStock').value) }; if (!p.barcode || !p.name) { this.showToast('الباركود والاسم مطلوبان', 'error'); return; } DB.addProduct(p); this.hideAddProductForm(); this.loadInventory(); this.loadProducts(); this.showToast('✅ تم إضافة المنتج', 'success'); },
    deleteProduct(id) { if (confirm('حذف المنتج؟')) { DB.deleteProduct(id); this.loadInventory(); this.loadProducts(); } },
    showAddCustomerForm() { document.getElementById('addCustomerForm').style.display = 'block'; },
    hideAddCustomerForm() { document.getElementById('addCustomerForm').style.display = 'none'; },
    saveNewCustomer() { const c = { name: document.getElementById('newCustomerName').value, phone: document.getElementById('newCustomerPhone').value, email: document.getElementById('newCustomerEmail').value }; if (!c.name || !c.phone) { this.showToast('الاسم والهاتف مطلوبان', 'error'); return; } DB.addCustomer(c); this.hideAddCustomerForm(); this.loadCustomersTable(); this.showToast('✅ تم إضافة العميل', 'success'); },
    loadCustomersTable() { const t = document.getElementById('customersTableBody'); if (!t) return; t.innerHTML = DB.data.customers.filter(c => c.branchId === DB.data.settings.currentBranch).map(c => `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.points}</td><td>${c.totalPurchases} ج.م</td><td>${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('ar-EG') : '-'}</td></tr>`).join(''); },
    addEmployee() { const e = { name: document.getElementById('newEmployeeName').value, phone: document.getElementById('newEmployeePhone').value, role: document.getElementById('newEmployeeRole').value, salary: parseFloat(document.getElementById('newEmployeeSalary').value) }; if (!e.name) { this.showToast('اسم الموظف مطلوب', 'error'); return; } DB.addEmployee(e); this.loadAttendance(); this.showToast('✅ تم إضافة الموظف', 'success'); },
    loadAttendance() {
        document.getElementById('employeeSelect').innerHTML = DB.data.employees.map(e => `<option value="${e.id}">${e.name} (${e.username || e.role})</option>`).join('');
        const t = document.getElementById('attendanceTableBody'); if (!t) return;
        const today = new Date().toISOString().split('T')[0];
        t.innerHTML = DB.data.attendance.filter(a => a.date === today).map(a => { const e = DB.data.employees.find(emp => emp.id === a.employeeId); return `<tr><td>${e?.name || '-'} ${e?.username ? '(' + e.username + ')' : ''}</td><td>${e?.role || '-'}</td><td>${a.checkIn ? new Date(a.checkIn).toLocaleTimeString('ar-EG') : '-'}</td><td>${a.checkOut ? new Date(a.checkOut).toLocaleTimeString('ar-EG') : '-'}</td><td>${e?.dailyTips?.toFixed(2) || '0.00'} ج.م</td><td>${a.status === 'present' ? '✅ حاضر' : '❌ غائب'}</td><td><button onclick="app.deleteAttendance('${a.id}')">🗑️</button></td></tr>`; }).join('');
        document.getElementById('totalTipsToday').textContent = DB.calculateTodayTips().toFixed(2);
    },
    checkInSelected() { DB.checkIn(document.getElementById('employeeSelect').value); this.loadAttendance(); this.updateDashboard(); this.showToast('✅ تم تسجيل الحضور', 'success'); },
    checkOutSelected() { DB.checkOut(document.getElementById('employeeSelect').value); this.loadAttendance(); this.showToast('✅ تم تسجيل الانصراف', 'success'); },
    deleteAttendance(id) { if (confirm('حذف سجل الحضور؟')) { DB.deleteAttendance(id); this.loadAttendance(); } },
    distributeTips() { const r = DB.distributeTips(); if (r) { this.showToast(`✅ تم توزيع ${r.total.toFixed(2)} ج.م على ${r.count} موظف`, 'success'); } else { this.showToast('لا يوجد تبس اليوم', 'error'); } this.loadAttendance(); },
    loadBranches() {
        const sel = document.getElementById('branchSelect'); const branches = DB.data.branches;
        if (sel) sel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        document.getElementById('branchSelectLogin').innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        const curr = branches.find(b => b.id === DB.data.settings.currentBranch);
        if (curr) document.getElementById('currentBranchName').textContent = curr.name;
    },
    showBranchModal() { document.getElementById('branchModal').classList.remove('hidden'); },
    closeBranchModal() { document.getElementById('branchModal').classList.add('hidden'); },
    toggleAddBranchForm() { const f = document.getElementById('addBranchForm'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; },
    saveNewBranch() { const name = document.getElementById('newBranchName').value; if (name) { DB.addBranch({ name, address: document.getElementById('newBranchAddress').value, phone: document.getElementById('newBranchPhone').value }); this.loadBranches(); this.closeBranchModal(); } },
    switchBranch() { DB.switchBranch(document.getElementById('branchSelect').value); this.loadBranches(); this.updateDashboard(); this.loadProducts(); this.closeBranchModal(); },
    generateDailyReport() { const sales = DB.getTodaySales(); document.getElementById('reportResult').innerHTML = `<h4>تقرير اليوم</h4><p>فواتير: ${sales.length}</p><p>إجمالي: ${sales.reduce((s, sale) => s + sale.total, 0).toFixed(2)} ج.م</p>`; },
    generateWeeklyReport() { const sales = DB.data.sales.filter(s => new Date(s.date) >= new Date(Date.now() - 7*24*60*60*1000)); document.getElementById('reportResult').innerHTML = `<h4>تقرير الأسبوع</h4><p>فواتير: ${sales.length}</p><p>إجمالي: ${sales.reduce((s, sale) => s + sale.total, 0).toFixed(2)} ج.م</p>`; },
    generateInventoryReport() { const p = DB.getProducts(); document.getElementById('reportResult').innerHTML = `<h4>المخزون</h4><p>منتجات: ${p.length}</p><p>قيمة: ${p.reduce((s, p) => s + p.stock * p.cost, 0).toFixed(2)} ج.م</p>`; },
    generateCustomersReport() { const c = DB.data.customers.filter(c => c.branchId === DB.data.settings.currentBranch); document.getElementById('reportResult').innerHTML = `<h4>العملاء (${c.length})</h4>` + c.map(c => `<p>${c.name} - ${c.phone} - ${c.points} نقطة</p>`).join(''); },
    changePassword() { const curr = document.getElementById('currentPassword').value, newP = document.getElementById('newPassword').value, conf = document.getElementById('confirmPassword').value; if (!curr || !newP || !conf) { this.showToast('كل الحقول مطلوبة', 'error'); return; } if (newP !== conf) { this.showToast('كلمة المرور غير متطابقة', 'error'); return; } if (DB.changePassword(DB.data.currentUser.id, curr, newP)) { this.showToast('✅ تم تغيير كلمة المرور', 'success'); } else { this.showToast('❌ كلمة المرور الحالية خطأ', 'error'); } },
    loadRegistrationRequests() { const c = document.getElementById('registrationRequestsList'); if (!c) return; const reqs = DB.getPendingRegistrations(); if (!reqs.length) { c.innerHTML = '<p>✅ لا توجد طلبات</p>'; return; } c.innerHTML = '<table>' + reqs.map(r => `<tr><td>${r.name}</td><td>${r.username}</td><td><button onclick="app.approveRegistration(\'${r.id}\')">✅ قبول</button><button onclick="app.rejectRegistration(\'${r.id}\')">❌ رفض</button></td></tr>`).join('') + '</table>'; },
    approveRegistration(id) { DB.approveRegistration(id); this.loadRegistrationRequests(); this.loadUsersManagement(); this.showToast('✅ تمت الموافقة على التسجيل', 'success'); },
    rejectRegistration(id) { DB.rejectRegistration(id); this.loadRegistrationRequests(); },
    saveSettings() { DB.data.settings.companyName = document.getElementById('storeName').value; DB.data.settings.storePhone = document.getElementById('storePhone').value; DB.data.settings.taxRate = parseFloat(document.getElementById('taxRate').value); DB.save(); this.showToast('✅ تم حفظ الإعدادات', 'success'); },
    backupData() { const a = document.createElement('a'); a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(DB.data)); a.download = 'backup.json'; a.click(); },
    importData(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { DB.data = JSON.parse(ev.target.result); DB.save(); location.reload(); }; r.readAsText(f); },
    showDeveloperInfo() { if (DB.isDeveloper(DB.data.currentUser)) this.showToast('👨‍💻 المطور: Abobakr Assad Mohammed\n🔧 الصلاحيات: كاملة', 'success'); },
    closeReceipt() { document.getElementById('receiptModal').classList.add('hidden'); },
    toggleNotifications() { this.showToast('الإشعارات قيد التطوير', 'success'); },
    
    // ========== إدارة المستخدمين (للمطور فقط) ==========
    loadUsersManagement() {
        const container = document.getElementById('usersManagementList');
        const section = document.getElementById('userManagementSection');
        if (DB.isDeveloper(DB.data.currentUser)) { section.style.display = 'block'; }
        else { section.style.display = 'none'; return; }
        const users = DB.getAllUsers();
        if (!users.length) { container.innerHTML = '<p>لا يوجد مستخدمين</p>'; return; }
        let html = '<table style="width:100%"><tr style="background:#667eea;color:white;"><th>المستخدم</th><th>الاسم</th><th>الدور</th><th>آخر دخول</th><th>حذف</th></tr>';
        users.forEach(user => {
            const isDeveloper = user.role === 'developer';
            html += `<tr><td>${user.username}</td><td>${user.name || '-'}</td><td>${user.role === 'admin' ? '👑 مدير' : user.role === 'developer' ? '👨‍💻 مطور' : '💰 كاشير'}</td><td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG') : 'لم يسجل بعد'}</td>
                <td>${!isDeveloper ? `<button onclick="app.deleteUser('${user.id}')" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;">🗑️</button>` : '<span>محمي</span>'}</td></tr>`;
        });
        html += '</table>'; container.innerHTML = html;
    },
    deleteUser(userId) {
        const user = DB.getAllUsers().find(u => u.id === userId);
        if (!user) { this.showToast('المستخدم غير موجود', 'error'); return; }
        if (user.role === 'developer') { this.showToast('❌ لا يمكن حذف حساب المطور', 'error'); return; }
        if (userId === DB.data.currentUser?.id) { this.showToast('❌ لا يمكنك حذف حسابك الحالي', 'error'); return; }
        if (!confirm(`⚠️ حذف المستخدم "${user.username}"؟`)) return;
        if (DB.deleteUser(userId)) { this.showToast('✅ تم حذف المستخدم', 'success'); this.loadUsersManagement(); this.loadAttendance(); }
    },
    kickAllUsers() {
        if (!DB.isDeveloper(DB.data.currentUser)) { this.showToast('❌ للمطور فقط', 'error'); return; }
        if (!confirm('⚠️ طرد جميع المستخدمين؟')) return;
        const currentUserId = DB.data.currentUser?.id;
        const sessions = JSON.parse(localStorage.getItem('activeSessions') || '[]');
        const currentSession = sessions.find(s => s.userId === currentUserId);
        localStorage.setItem('activeSessions', JSON.stringify(currentSession ? [currentSession] : []));
        this.showToast('✅ تم طرد جميع المستخدمين', 'success');
    },
    resetEverything() {
        if (!confirm('⚠️ تحذير نهائي!\n\nهذا الإجراء سيحذف جميع البيانات!\nهل أنت متأكد؟')) return;
        if (!confirm('آخر تأكيد: هل تريد فعلاً مسح كل شيء؟')) return;
        localStorage.removeItem('supermarketDB'); localStorage.removeItem('currentCart'); localStorage.removeItem('lastResetDate'); localStorage.removeItem('activeSessions');
        this.showToast('✅ تم مسح جميع البيانات!', 'success');
        setTimeout(() => location.reload(), 1500);
    }
};
window.addEventListener('DOMContentLoaded', () => app.init());
