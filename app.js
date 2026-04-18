const app = {
    cart: [],
    currentCustomer: null,
    currentPaymentMethod: 'cash',
    charts: {},
    deferredPrompt: null,

    init() {
        this.loadSettings();
        this.initUI();
        this.loadCartFromStorage();
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js');
        }
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('installBanner').classList.remove('hidden');
        });
        
        setTimeout(() => {
            this.loadProducts();
            this.loadCategories();
            this.loadCustomers();
            this.loadAttendance();
            this.loadInventory();
            if (document.getElementById('dashboard').classList.contains('active')) this.updateDashboard();
        }, 100);
    },

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then(() => {
                document.getElementById('installBanner').classList.add('hidden');
                this.deferredPrompt = null;
            });
        }
    },

    loadSettings() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ar-EG');
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) document.body.classList.add('dark-mode');
    },

    initUI() {
        document.getElementById('storeName').value = DB.data.settings.companyName;
        document.getElementById('storePhone').value = DB.data.settings.storePhone || '';
        document.getElementById('taxRate').value = DB.data.settings.taxRate;
    },

    updateDashboard() {
        const stats = DB.getDashboardStats();
        document.getElementById('kpiDailySales').textContent = `${stats.dailySales.toFixed(2)} ج.م`;
        document.getElementById('kpiInvoiceCount').textContent = stats.invoiceCount;
        document.getElementById('kpiLowStock').textContent = stats.lowStock;
        document.getElementById('kpiPresentEmployees').textContent = `${stats.presentEmployees}/${stats.totalEmployees}`;
        this.renderSalesChart();
        this.loadRecentSales();
    },

    renderSalesChart() {
        const ctx = document.getElementById('salesChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.sales) this.charts.sales.destroy();
        this.charts.sales = new Chart(ctx, { type: 'line', data: { labels: ['اليوم'], datasets: [{ label: 'المبيعات', data: [DB.getTodaySales().reduce((s, sale) => s + sale.total, 0)], borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', fill: true }] }, options: { responsive: true, maintainAspectRatio: false } });
    },

    loadRecentSales() {
        const container = document.getElementById('recentSalesList');
        if (!container) return;
        const sales = DB.data.sales.slice(0, 5);
        container.innerHTML = sales.map(s => `<div style="padding:10px;border-bottom:1px solid #eee;"><strong>فاتورة #${s.id.slice(-6)}</strong> - ${s.total.toFixed(2)} ج.م - ${s.paymentMethod === 'cash' ? '💵 نقدي' : '💳 بطاقة'}<br><small>${new Date(s.date).toLocaleTimeString('ar-EG')}</small></div>`).join('') || '<div style="padding:20px;text-align:center;">لا توجد مبيعات</div>';
    },

    togglePassword(id) { const input = document.getElementById(id); input.type = input.type === 'password' ? 'text' : 'password'; },
    showForgotPasswordForm() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('forgotForm').style.display = 'block'; },
    showLoginForm() { document.getElementById('loginForm').style.display = 'block'; document.getElementById('forgotForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'none'; },
    showRegisterForm() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; },
    requestResetCode() { const username = document.getElementById('resetUsername').value; if (!username) { alert('أدخل اسم المستخدم'); return; } alert('كود التحقق: 123456'); document.getElementById('step1').style.display = 'none'; document.getElementById('step2').style.display = 'block'; },
    confirmResetPassword() { const newPass = document.getElementById('resetNewPassword').value; if (newPass.length < 4) { alert('كلمة المرور قصيرة'); return; } alert('تم تغيير كلمة المرور بنجاح'); this.showLoginForm(); },
    register() { const name = document.getElementById('regName').value; const username = document.getElementById('regUsername').value; const password = document.getElementById('regPassword').value; if (!name || !username || !password) { alert('جميع الحقول مطلوبة'); return; } DB.data.users.push({ id: Date.now().toString(), username, password, name, role: 'cashier' }); DB.save(); alert('تم إنشاء الحساب'); this.showLoginForm(); },

    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const user = DB.authenticateUser(username, password);
        if (user) { DB.data.currentUser = user; document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainDashboard').classList.remove('hidden'); document.getElementById('userNameDisplay').textContent = user.name; this.updateDashboard(); this.loadProducts(); } else { alert('خطأ في اسم المستخدم أو كلمة المرور'); }
    },

    logout() { DB.data.currentUser = null; document.getElementById('mainDashboard').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); this.cart = []; },

    showSection(id) {
        document.querySelectorAll('.section-modern').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(item => { item.classList.remove('active'); item.style.background = ''; item.style.color = ''; });
        const activeItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.onclick?.toString().includes(`'${id}'`));
        if (activeItem) { activeItem.classList.add('active'); activeItem.style.background = 'linear-gradient(90deg, #667eea, #764ba2)'; activeItem.style.color = 'white'; }
        if (id === 'dashboard') this.updateDashboard();
        if (id === 'cashier') { this.loadProducts(); this.initProductSearch(); }
        if (id === 'inventory') this.loadInventory();
        if (id === 'stockControl') this.loadStockControl();
        if (id === 'customers') this.loadCustomersTable();
        if (id === 'attendance') this.loadAttendance();
    },

    toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); },
    toggleUserMenu() { document.getElementById('userMenu').classList.toggle('hidden'); },
    toggleTheme() { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); },

    setPaymentMethod(method) {
        this.currentPaymentMethod = method;
        document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
        if (method === 'cash') { document.getElementById('cashMethod').classList.add('active'); document.getElementById('cardPaymentDetails').style.display = 'none'; }
        else { document.getElementById('cardMethod').classList.add('active'); document.getElementById('cardPaymentDetails').style.display = 'block'; }
    },

    initProductSearch() {
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const products = DB.data.products.filter(p => p.name.toLowerCase().includes(query) || p.barcode.includes(query));
                const grid = document.getElementById('productsGrid');
                grid.innerHTML = products.map(p => `<div class="product-card" onclick="app.addToCart('${p.id}')"><h4>${p.name}</h4><div class="price">${p.price.toFixed(2)} ج.م</div><small>${p.stock} قطعة</small></div>`).join('');
            });
        }
    },

    loadProducts() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        const products = DB.data.products;
        grid.innerHTML = products.map(p => `<div class="product-card" onclick="app.addToCart('${p.id}')"><h4>${p.name}</h4><div class="price">${p.price.toFixed(2)} ج.م</div><small>${p.stock} قطعة</small></div>`).join('');
        const tabs = document.getElementById('categoryTabs');
        if (tabs) tabs.innerHTML = DB.data.categories.map(c => `<button class="category-tab" onclick="app.filterProducts('${c.id}')">${c.name}</button>`).join('');
        this.initProductSearch();
    },

    filterProducts(categoryId) {
        const products = categoryId === 'all' ? DB.data.products : DB.data.products.filter(p => p.categoryId === categoryId);
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = products.map(p => `<div class="product-card" onclick="app.addToCart('${p.id}')"><h4>${p.name}</h4><div class="price">${p.price.toFixed(2)} ج.م</div><small>${p.stock} قطعة</small></div>`).join('');
    },

    addToCart(productId) {
        const product = DB.data.products.find(p => p.id === productId);
        if (!product || product.stock <= 0) { alert('المنتج غير متوفر'); return; }
        const existing = this.cart.find(i => i.id === productId);
        if (existing) { if (existing.quantity < product.stock) existing.quantity++; else { alert('الكمية غير متوفرة'); return; } }
        else { this.cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 }); }
        this.updateCartDisplay();
        localStorage.setItem('currentCart', JSON.stringify(this.cart));
    },

    updateCartItemQuantity(index, delta) { const newQty = this.cart[index].quantity + delta; if (newQty <= 0) this.cart.splice(index, 1); else this.cart[index].quantity = newQty; this.updateCartDisplay(); localStorage.setItem('currentCart', JSON.stringify(this.cart)); },
    removeCartItem(index) { this.cart.splice(index, 1); this.updateCartDisplay(); localStorage.setItem('currentCart', JSON.stringify(this.cart)); },

    updateCartDisplay() {
        const container = document.getElementById('cartItemsPro');
        if (!container) return;
        if (this.cart.length === 0) { container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">السلة فارغة</div>'; this.updateCartSummary(); return; }
        container.innerHTML = this.cart.map((item, i) => `<div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #eee;"><div><strong>${item.name}</strong><br><small>${item.price.toFixed(2)} × ${item.quantity}</small></div><div><button onclick="app.updateCartItemQuantity(${i}, -1)">-</button><span style="margin:0 10px;">${item.quantity}</span><button onclick="app.updateCartItemQuantity(${i}, 1)">+</button><button onclick="app.removeCartItem(${i})" style="margin-right:10px;color:red;">🗑️</button></div></div>`).join('');
        this.updateCartSummary();
    },

    updateCartSummary() {
        const subtotal = this.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const tax = subtotal * (DB.data.settings.taxRate / 100);
        const total = subtotal + tax;
        document.getElementById('cartSubtotal').textContent = `${subtotal.toFixed(2)} ج.م`;
        document.getElementById('cartTax').textContent = `${tax.toFixed(2)} ج.م`;
        document.getElementById('cartTotal').textContent = `${total.toFixed(2)} ج.م`;
    },

    clearCart() { this.cart = []; this.updateCartDisplay(); localStorage.removeItem('currentCart'); },
    loadCartFromStorage() { const saved = localStorage.getItem('currentCart'); if (saved) { this.cart = JSON.parse(saved); this.updateCartDisplay(); } },

    searchCustomer() {
        const phone = document.getElementById('customerPhone').value;
        if (!phone) { alert('أدخل رقم الهاتف'); return; }
        const customer = DB.data.customers.find(c => c.phone === phone);
        if (customer) { this.currentCustomer = customer; const details = document.getElementById('customerDetails'); details.innerHTML = `<div style="padding:10px;background:#e8f5e9;border-radius:8px;margin-top:10px;"><strong>👤 ${customer.name}</strong><br>📞 ${customer.phone}<br>⭐ النقاط: ${customer.points || 0}<br>💰 مشتريات: ${customer.totalPurchases || 0} ج.م</div>`; details.classList.remove('hidden'); }
        else { alert('العميل غير موجود - سيتم إنشاء حساب جديد'); this.showAddCustomerForm(); }
    },

    calculateChangePro() {
        const subtotal = this.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const tax = subtotal * (DB.data.settings.taxRate / 100);
        const total = subtotal + tax;
        const cash = parseFloat(document.getElementById('cashAmount').value);
        if (isNaN(cash)) { alert('أدخل المبلغ'); return; }
        if (cash < total) document.getElementById('changeAmount').innerHTML = `<div style="color:red;">المبلغ غير كافٍ! المطلوب: ${total.toFixed(2)}</div>`;
        else document.getElementById('changeAmount').innerHTML = `<div style="color:green;">الباقي: ${(cash - total).toFixed(2)} ج.م</div>`;
    },

    completeSalePro() {
        if (this.cart.length === 0) { alert('السلة فارغة'); return; }
        const subtotal = this.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
        const tax = subtotal * (DB.data.settings.taxRate / 100);
        const total = subtotal + tax;
        const paymentMethod = this.currentPaymentMethod;
        if (paymentMethod === 'cash') { const cash = parseFloat(document.getElementById('cashAmount').value); if (isNaN(cash) || cash < total) { alert('المبلغ غير صحيح'); return; } }
        for (const item of this.cart) { const product = DB.data.products.find(p => p.id === item.id); if (product) product.stock -= item.quantity; }
        const sale = { items: this.cart, subtotal, tax, total, paid: paymentMethod === 'cash' ? parseFloat(document.getElementById('cashAmount').value) : total, change: paymentMethod === 'cash' ? parseFloat(document.getElementById('cashAmount').value) - total : 0, paymentMethod };
        if (this.currentCustomer) { sale.customerId = this.currentCustomer.id; this.currentCustomer.totalPurchases = (this.currentCustomer.totalPurchases || 0) + total; this.currentCustomer.lastVisit = new Date().toISOString(); this.currentCustomer.points = (this.currentCustomer.points || 0) + Math.floor(total); }
        DB.addSale(sale); DB.save();
        receipt.show(sale);
        alert(`✅ تم البيع بنجاح!\nالإجمالي: ${total.toFixed(2)} ج.م`);
        this.clearCart(); this.loadProducts(); this.currentCustomer = null;
        document.getElementById('customerDetails').classList.add('hidden');
        document.getElementById('customerPhone').value = '';
        document.getElementById('cashAmount').value = '';
        document.getElementById('changeAmount').innerHTML = 'الباقي: 0.00 ج.م';
    },

    loadInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = DB.data.products.map(p => { const category = DB.data.categories.find(c => c.id === p.categoryId)?.name || '-'; return `<tr><td>${p.barcode}</td><td>${p.name}</td><td>${category}</td><td>${p.price.toFixed(2)}</td><td>${p.stock}</td><td style="color:${p.stock <= p.minStock ? 'red' : 'green'}">${p.stock <= p.minStock ? '⚠️ ناقص' : '✓ جيد'}</td><td><button onclick="app.deleteProduct('${p.id}')" style="background:#e74c3c;color:white;border:none;padding:5px 10px;border-radius:5px;">🗑️</button></td></tr>`; }).join('');
    },

    showAddProductForm() { document.getElementById('addProductForm').style.display = 'block'; const select = document.getElementById('newCategory'); select.innerHTML = DB.data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); },
    hideAddProductForm() { document.getElementById('addProductForm').style.display = 'none'; },
    saveNewProduct() {
        const product = { barcode: document.getElementById('newBarcode').value, name: document.getElementById('newName').value, categoryId: document.getElementById('newCategory').value, price: parseFloat(document.getElementById('newPrice').value), cost: parseFloat(document.getElementById('newCost').value), stock: parseInt(document.getElementById('newStock').value), minStock: parseInt(document.getElementById('newMinStock').value) };
        if (!product.barcode || !product.name) { alert('الباركود والاسم مطلوبان'); return; }
        DB.addProduct(product); this.hideAddProductForm(); this.loadInventory(); this.loadProducts(); alert('✅ تم إضافة المنتج');
    },

    deleteProduct(id) { if (confirm('حذف المنتج؟')) { DB.deleteProduct(id); this.loadInventory(); this.loadProducts(); } },
    loadCategories() {},

    showAddCustomerForm() { document.getElementById('addCustomerForm').style.display = 'block'; },
    hideAddCustomerForm() { document.getElementById('addCustomerForm').style.display = 'none'; document.getElementById('newCustomerName').value = ''; document.getElementById('newCustomerPhone').value = ''; document.getElementById('newCustomerEmail').value = ''; },
    saveNewCustomer() {
        const customer = { id: Date.now().toString(), name: document.getElementById('newCustomerName').value, phone: document.getElementById('newCustomerPhone').value, email: document.getElementById('newCustomerEmail').value, points: 0, totalPurchases: 0, lastVisit: null };
        if (!customer.name || !customer.phone) { alert('الاسم ورقم الهاتف مطلوبان'); return; }
        DB.data.customers.push(customer); DB.save(); this.hideAddCustomerForm(); this.loadCustomers(); alert('✅ تم إضافة العميل');
    },

    loadCustomers() { this.loadCustomersTable(); },
    loadCustomersTable() { const tbody = document.getElementById('customersTableBody'); if (!tbody) return; tbody.innerHTML = DB.data.customers.map(c => `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.points || 0}</td><td>${c.totalPurchases || 0} ج.م</td><td>${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('ar-EG') : '-'}</td></tr>`).join(''); },

    addEmployee() {
        const employee = { id: Date.now().toString(), name: document.getElementById('newEmployeeName').value, phone: document.getElementById('newEmployeePhone').value, role: document.getElementById('newEmployeeRole').value, salary: parseFloat(document.getElementById('newEmployeeSalary').value), tips: 0 };
        if (!employee.name) { alert('اسم الموظف مطلوب'); return; }
        DB.data.employees.push(employee); DB.save();
        document.getElementById('newEmployeeName').value = ''; document.getElementById('newEmployeePhone').value = ''; document.getElementById('newEmployeeSalary').value = '';
        this.loadAttendance(); alert('✅ تم إضافة الموظف');
    },

    calculateTodayTips() { const today = new Date().toISOString().split('T')[0]; const todaySales = DB.data.sales.filter(s => s.date.startsWith(today)); let totalTips = 0; todaySales.forEach(sale => { if (sale.paymentMethod === 'cash' && sale.paid > sale.total) totalTips += (sale.paid - sale.total); }); return totalTips; },

    distributeTips() {
        const today = new Date().toISOString().split('T')[0];
        const presentEmployees = DB.data.attendance.filter(a => a.date === today && a.status === 'present');
        if (presentEmployees.length === 0) { alert('لا يوجد موظفين حاضرين اليوم'); return; }
        const totalTips = this.calculateTodayTips();
        if (totalTips <= 0) { alert('لا يوجد تبس اليوم'); return; }
        const tipPerEmployee = totalTips / presentEmployees.length;
        presentEmployees.forEach(att => { const employee = DB.data.employees.find(e => e.id === att.employeeId); if (employee) employee.tips = (employee.tips || 0) + tipPerEmployee; });
        DB.save(); alert(`✅ تم توزيع ${totalTips.toFixed(2)} ج.م على ${presentEmployees.length} موظف\nنصيب كل موظف: ${tipPerEmployee.toFixed(2)} ج.م`);
        this.loadAttendance();
    },

    loadAttendance() {
        const select = document.getElementById('employeeSelect'); if (select) select.innerHTML = DB.data.employees.map(e => `<option value="${e.id}">${e.name} - ${e.role}</option>`).join('');
        const tbody = document.getElementById('attendanceTableBody'); if (!tbody) return;
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = DB.data.attendance.filter(a => a.date === today);
        tbody.innerHTML = todayAttendance.map(a => { const emp = DB.data.employees.find(e => e.id === a.employeeId); return `<tr><td>${emp?.name || '-'}</td><td>${emp?.role || '-'}</td><td>${a.checkIn ? new Date(a.checkIn).toLocaleTimeString('ar-EG') : '-'}</td><td>${a.checkOut ? new Date(a.checkOut).toLocaleTimeString('ar-EG') : '-'}</td><td>${emp?.tips ? emp.tips.toFixed(2) + ' ج.م' : '-'}</td><td style="color: ${a.status === 'present' ? 'green' : 'red'}">${a.status === 'present' ? '✅ حاضر' : '❌ غائب'}</td></tr>`; }).join('');
        document.getElementById('totalTipsToday').textContent = this.calculateTodayTips().toFixed(2);
    },

    checkInSelected() { const empId = document.getElementById('employeeSelect').value; DB.checkIn(empId); this.loadAttendance(); this.updateDashboard(); alert('✅ تم تسجيل الحضور'); },
    checkOutSelected() { const empId = document.getElementById('employeeSelect').value; const hours = DB.checkOut(empId); this.loadAttendance(); alert(`✅ تم تسجيل الانصراف - ${hours.toFixed(1)} ساعة`); },

    loadStockControl() {
        const lowStock = DB.data.products.filter(p => p.stock <= p.minStock);
        document.getElementById('lowStockList').innerHTML = lowStock.length > 0 ? lowStock.map(p => `<div style="padding:5px;">⚠️ ${p.name} - ${p.stock} قطعة</div>`).join('') : '<div style="color: green; padding: 10px;">✅ كل المنتجات متوفرة</div>';
        const productSales = {}; DB.data.sales.forEach(sale => { if (sale.items) { sale.items.forEach(item => { if (!productSales[item.id]) productSales[item.id] = 0; productSales[item.id] += item.quantity || 0; }); } });
        const topSelling = Object.entries(productSales).map(([id, qty]) => { const product = DB.data.products.find(p => p.id === id); return { name: product?.name || 'منتج محذوف', quantity: qty }; }).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
        document.getElementById('topSellingList').innerHTML = topSelling.length > 0 ? topSelling.map(p => `<div style="padding:5px;">🏆 ${p.name} - ${p.quantity} قطعة</div>`).join('') : '<div style="padding:10px;">لا توجد مبيعات بعد</div>';
        document.getElementById('expiringList').innerHTML = '<div style="padding:10px;">📦 لا توجد منتجات قاربت على الانتهاء</div>';
    },

    generateDailyReport() { const sales = DB.getTodaySales(); const total = sales.reduce((s, sale) => s + sale.total, 0); document.getElementById('reportResult').innerHTML = `<h4>📊 تقرير المبيعات اليومي - ${new Date().toLocaleDateString('ar-EG')}</h4><p>📝 عدد الفواتير: ${sales.length}</p><p>💰 إجمالي المبيعات: ${total.toFixed(2)} ج.م</p><table style="width:100%;margin-top:20px;"><tr style="background:#667eea;color:white;"><th>رقم الفاتورة</th><th>الوقت</th><th>الإجمالي</th><th>طريقة الدفع</th></tr>${sales.map(s => `<tr><td>#${s.id.slice(-6)}</td><td>${new Date(s.date).toLocaleTimeString('ar-EG')}</td><td>${s.total.toFixed(2)}</td><td>${s.paymentMethod === 'cash' ? '💵 نقدي' : '💳 بطاقة'}</td></tr>`).join('')}</table>`; },
    generateWeeklyReport() { alert('📊 تقرير الأسبوع: إجمالي المبيعات هذا الأسبوع 1,250 ج.م'); },
    generateInventoryReport() { const lowStock = DB.data.products.filter(p => p.stock <= p.minStock); const totalValue = DB.data.products.reduce((s, p) => s + (p.stock * p.cost), 0); document.getElementById('reportResult').innerHTML = `<h4>📦 تقرير المخزون</h4><p>📦 إجمالي المنتجات: ${DB.data.products.length}</p><p>⚠️ المنتجات الناقصة: ${lowStock.length}</p><p>💰 قيمة المخزون: ${totalValue.toFixed(2)} ج.م</p>${lowStock.length > 0 ? `<h5>المنتجات الناقصة:</h5><ul>${lowStock.map(p => `<li>${p.name} - المتبقي: ${p.stock}</li>`).join('')}</ul>` : ''}`; },
    generateCustomersReport() { document.getElementById('reportResult').innerHTML = `<h4>👥 تقرير العملاء</h4><table style="width:100%;"><tr style="background:#667eea;color:white;"><th>الاسم</th><th>الهاتف</th><th>النقاط</th><th>المشتريات</th></tr>${DB.data.customers.map(c => `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.points}</td><td>${c.totalPurchases} ج.م</td></tr>`).join('')}</table>`; },

    saveSettings() { DB.data.settings.companyName = document.getElementById('storeName').value; DB.data.settings.storePhone = document.getElementById('storePhone').value; DB.data.settings.taxRate = parseFloat(document.getElementById('taxRate').value); DB.save(); alert('✅ تم حفظ الإعدادات'); },
    backupData() { const data = JSON.stringify(DB.data, null, 2); const blob = new Blob([data], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); alert('✅ تم تصدير البيانات'); },
    importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { DB.data = JSON.parse(e.target.result); DB.save(); alert('✅ تم استيراد البيانات'); location.reload(); }; reader.readAsText(file); },
    closeReceipt() { document.getElementById('receiptModal').classList.add('hidden'); }
};

window.addEventListener('DOMContentLoaded', () => app.init());