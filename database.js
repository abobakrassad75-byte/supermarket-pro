// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyA294DaRM4VRfZsNxv2XVzdwo9E9XPG2Q",
  authDomain: "supermarket-pro-89304.firebaseapp.com",
  databaseURL: "https://supermarket-pro-89304-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "supermarket-pro-89304",
  storageBucket: "supermarket-pro-89304.firebasestorage.app",
  messagingSenderId: "134777493810",
  appId: "1:134777493810:web:dce2d17ab87fef5ba35f2b"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const fbDB = firebase.database();

const DB = {
    data: {
        products: [], categories: [], customers: [], employees: [], sales: [], attendance: [], users: [], branches: [], notifications: [], registrationRequests: [],
        settings: { companyName: 'سوبر ماركت برو', storePhone: '01234567890', taxRate: 14, currency: 'ج.م', currentBranch: 'main', adminPasswordChanged: false, requireApproval: true },
        currentUser: null
    },
    
    async init() {
        const saved = localStorage.getItem('supermarketDB');
        if (saved) { this.data = JSON.parse(saved); this.ensureDeveloperUser(); this.syncEmployeesWithUsers(); }
        else { this.initDefaultData(); this.save(); }
        
        await this.syncWithFirebase();
        this.listenToRealtimeUpdates();
        this.checkAndResetDaily();
        setInterval(() => this.checkAndResetDaily(), 60 * 60 * 1000);
        
        window.addEventListener('online', () => { if (window.app) window.app.updateConnectionStatus(true); this.syncWithFirebase(); });
        window.addEventListener('offline', () => { if (window.app) window.app.updateConnectionStatus(false); });
    },
    
    async syncWithFirebase() {
        try {
            const snapshot = await fbDB.ref('store/main').get();
            if (snapshot.exists()) {
                this.data = { ...snapshot.val(), ...this.data };
            } else {
                await this.pushToFirebase();
            }
            this.save();
        } catch (error) {
            console.log('⚠️ Firebase sync error:', error);
        }
    },
    
    async pushToFirebase() {
        try {
            await fbDB.ref('store/main').set(this.data);
        } catch (error) {
            console.log('⚠️ Firebase push error:', error);
        }
    },
    
    listenToRealtimeUpdates() {
        fbDB.ref('store/main').on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.data = { ...this.data, ...snapshot.val() };
                this.save();
                if (window.app) window.app.onDataUpdated();
            }
        });
        
        fbDB.ref('store/main/sales').orderByChild('date').limitToLast(5).on('child_added', (snapshot) => {
            if (window.app) window.app.onNewSale(snapshot.val());
        });
    },
    
    ensureDeveloperUser() {
        if (!this.data.users.find(u => u.role === 'developer')) {
            const devUser = { id: 'dev_' + Date.now(), username: 'developer', password: 'Abobakr2024@', role: 'developer', name: 'Abobakr Assad Mohammed', email: 'abobakr@supermarket.com', branchId: 'main', approved: true, lastLogin: null, createdAt: new Date().toISOString() };
            this.data.users.push(devUser);
            this.addUserAsEmployee(devUser);
            this.save();
        }
    },
    
    syncEmployeesWithUsers() {
        this.data.users.forEach(user => { if (user.approved) this.addUserAsEmployee(user); });
    },
    
    addUserAsEmployee(user) {
        const existingEmployee = this.data.employees.find(e => e.userId === user.id || e.name === user.name);
        if (!existingEmployee) {
            const employee = {
                id: 'emp_' + Date.now() + Math.random().toString(36).substr(2, 5),
                userId: user.id, name: user.name, username: user.username,
                role: user.role === 'admin' ? 'مدير' : (user.role === 'developer' ? 'مطور' : 'كاشير'),
                phone: user.phone || '', salary: user.role === 'admin' ? 5000 : 3000,
                dailyTips: 0, totalTips: 0, branchId: user.branchId || this.data.settings.currentBranch,
                createdAt: new Date().toISOString()
            };
            this.data.employees.push(employee);
            this.save();
            return employee;
        }
        return existingEmployee;
    },
    
    initDefaultData() {
        this.data.branches = [{ id: 'main', name: 'الفرع الرئيسي', address: 'القاهرة', phone: '01234567890' }];
        this.data.categories = [{ id: '1', name: 'مخبوزات' }, { id: '2', name: 'ألبان وأجبان' }, { id: '3', name: 'مواد تموينية' }, { id: '4', name: 'مشروبات' }, { id: '5', name: 'منظفات' }];
        this.data.products = [
            { id: '1', barcode: '111', name: 'خبز', categoryId: '1', price: 5, cost: 3, stock: 50, minStock: 10, branchId: 'main' },
            { id: '2', barcode: '222', name: 'حليب', categoryId: '2', price: 12, cost: 8, stock: 30, minStock: 5, branchId: 'main' },
            { id: '3', barcode: '333', name: 'سكر', categoryId: '3', price: 15, cost: 10, stock: 20, minStock: 8, branchId: 'main' },
            { id: '4', barcode: '444', name: 'أرز', categoryId: '3', price: 25, cost: 18, stock: 40, minStock: 10, branchId: 'main' },
            { id: '5', barcode: '555', name: 'زيت', categoryId: '3', price: 45, cost: 35, stock: 25, minStock: 5, branchId: 'main' }
        ];
        this.data.customers = [{ id: '1', name: 'أحمد محمد', phone: '01001234567', points: 150, totalPurchases: 2500, branchId: 'main' }];
        this.data.users = [
            { id: 'admin1', username: 'admin', password: 'admin123', role: 'admin', name: 'مدير النظام', mustChangePassword: true, approved: true, lastLogin: null },
            { id: 'dev1', username: 'developer', password: 'Abobakr2024@', role: 'developer', name: 'Abobakr Assad Mohammed', approved: true, lastLogin: null }
        ];
        this.data.users.forEach(u => this.addUserAsEmployee(u));
        this.data.attendance = [];
        this.data.sales = [];
        this.data.registrationRequests = [];
    },
    
    save() { localStorage.setItem('supermarketDB', JSON.stringify(this.data)); },
    
    requestRegistration(userData) {
        if (this.data.users.find(u => u.username === userData.username)) return { success: false, message: 'اسم المستخدم موجود' };
        if (this.data.registrationRequests.find(r => r.username === userData.username)) return { success: false, message: 'يوجد طلب قيد المراجعة' };
        this.data.registrationRequests.push({ id: 'req_' + Date.now(), ...userData, status: 'pending', createdAt: new Date().toISOString() });
        this.save(); this.pushToFirebase();
        return { success: true, message: 'تم إرسال الطلب' };
    },
    
    approveRegistration(requestId) {
        const req = this.data.registrationRequests.find(r => r.id === requestId);
        if (!req) return false;
        const user = { id: 'usr_' + Date.now(), username: req.username, password: req.password, role: req.role || 'cashier', name: req.name, email: req.email, phone: req.phone, branchId: req.branchId || this.data.settings.currentBranch, approved: true, lastLogin: null, createdAt: new Date().toISOString() };
        this.data.users.push(user);
        this.addUserAsEmployee(user);
        req.status = 'approved';
        this.save(); this.pushToFirebase();
        return true;
    },
    
    rejectRegistration(requestId) { const req = this.data.registrationRequests.find(r => r.id === requestId); if (req) { req.status = 'rejected'; this.save(); this.pushToFirebase(); } return true; },
    getPendingRegistrations() { return this.data.registrationRequests.filter(r => r.status === 'pending'); },
    
    authenticateUser(username, password) {
        const user = this.data.users.find(u => u.username === username && u.password === password);
        if (!user) return null;
        if (user.approved === false) return { error: 'pending', message: 'الحساب قيد المراجعة' };
        if (user.role === 'admin' && user.mustChangePassword) return { error: 'must_change_password', user };
        user.lastLogin = new Date().toISOString();
        this.save(); this.pushToFirebase();
        return { success: true, user };
    },
    
    forceAdminPasswordChange(newPassword) {
        const admin = this.data.users.find(u => u.role === 'admin');
        if (admin) { admin.password = newPassword; admin.mustChangePassword = false; this.save(); this.pushToFirebase(); return true; }
        return false;
    },
    
    changePassword(userId, oldPass, newPass) {
        const user = this.data.users.find(u => u.id === userId);
        if (user && user.password === oldPass) { user.password = newPass; if (user.role === 'admin') user.mustChangePassword = false; this.save(); this.pushToFirebase(); return true; }
        return false;
    },
    
    isDeveloper(user) { return user?.role === 'developer'; },
    
    deleteUser(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user || user.role === 'developer') return false;
        this.data.users = this.data.users.filter(u => u.id !== userId);
        this.data.employees = this.data.employees.filter(e => e.userId !== userId);
        this.save(); this.pushToFirebase();
        return true;
    },
    
    getAllUsers() { return this.data.users; },
    
    checkAndResetDaily() {
        const today = new Date().toISOString().split('T')[0];
        if (localStorage.getItem('lastResetDate') !== today) {
            this.resetAttendanceForNewDay(); this.resetDailyTips();
            localStorage.setItem('lastResetDate', today);
            this.pushToFirebase();
            return true;
        }
        return false;
    },
    
    resetAttendanceForNewDay() {
        const today = new Date().toISOString().split('T')[0];
        this.data.employees.forEach(emp => {
            if (!this.data.attendance.find(a => a.employeeId === emp.id && a.date === today)) {
                this.data.attendance.push({ id: Date.now() + Math.random(), employeeId: emp.id, date: today, checkIn: null, checkOut: null, status: 'absent' });
            }
        });
        this.save();
    },
    
    resetDailyTips() { this.data.employees.forEach(emp => { emp.totalTips = (emp.totalTips || 0) + (emp.dailyTips || 0); emp.dailyTips = 0; }); this.save(); },
    
    getProducts() { return this.data.products.filter(p => p.branchId === this.data.settings.currentBranch); },
    getTodaySales() { const today = new Date().toISOString().split('T')[0]; return this.data.sales.filter(s => s.date?.startsWith(today)); },
    getWeekSales() { const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); return this.data.sales.filter(s => new Date(s.date) >= weekAgo); },
    getLowStockProducts() { return this.getProducts().filter(p => p.stock <= p.minStock); },
    
    getDashboardStats() {
        const todaySales = this.getTodaySales(); const today = new Date().toISOString().split('T')[0];
        return {
            dailySales: todaySales.reduce((s, sale) => s + (sale.total || 0), 0),
            invoiceCount: todaySales.length,
            lowStock: this.getLowStockProducts().length,
            presentEmployees: this.data.attendance.filter(a => a.date === today && a.status === 'present').length,
            totalEmployees: this.data.employees.length
        };
    },
    
    async addSale(sale) {
        sale.id = 'sale_' + Date.now() + Math.random().toString(36).substr(2, 5);
        sale.date = new Date().toISOString();
        sale.invoiceNumber = this.generateInvoiceNumber();
        sale.branchId = this.data.settings.currentBranch;
        sale.userId = this.data.currentUser?.id;
        sale.userName = this.data.currentUser?.name;
        this.data.sales.unshift(sale);
        this.save();
        await this.pushToFirebase();
        await fbDB.ref('store/main/sales').push(sale);
        return sale;
    },
    
    generateInvoiceNumber() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const count = this.data.sales.filter(s => s.date?.startsWith(today.toISOString().split('T')[0])).length + 1;
        return `INV-${year}${month}${day}-${count.toString().padStart(4, '0')}`;
    },
    
    getSaleById(saleId) { return this.data.sales.find(s => s.id === saleId); },
    addProduct(product) { product.id = Date.now().toString(); product.branchId = this.data.settings.currentBranch; this.data.products.push(product); this.save(); this.pushToFirebase(); return product; },
    deleteProduct(id) { this.data.products = this.data.products.filter(p => p.id !== id); this.save(); this.pushToFirebase(); },
    
    checkIn(employeeId) {
        const today = new Date().toISOString().split('T')[0];
        let att = this.data.attendance.find(a => a.employeeId === employeeId && a.date === today);
        if (!att) { att = { id: Date.now(), employeeId, date: today, checkIn: new Date().toISOString(), status: 'present' }; this.data.attendance.push(att); }
        else { att.checkIn = new Date().toISOString(); att.status = 'present'; }
        this.save(); this.pushToFirebase();
        return true;
    },
    
    checkOut(employeeId) {
        const today = new Date().toISOString().split('T')[0];
        const att = this.data.attendance.find(a => a.employeeId === employeeId && a.date === today);
        if (att?.checkIn) { att.checkOut = new Date().toISOString(); this.save(); this.pushToFirebase(); return true; }
        return false;
    },
    
    deleteAttendance(id) { this.data.attendance = this.data.attendance.filter(a => a.id !== id); this.save(); this.pushToFirebase(); },
    addCustomer(customer) { customer.id = Date.now().toString(); customer.branchId = this.data.settings.currentBranch; this.data.customers.push(customer); this.save(); this.pushToFirebase(); return customer; },
    getCustomerByPhone(phone) { return this.data.customers.find(c => c.phone === phone); },
    addEmployee(employee) { employee.id = Date.now().toString(); employee.branchId = this.data.settings.currentBranch; this.data.employees.push(employee); this.save(); this.pushToFirebase(); return employee; },
    
    calculateTodayTips() { return this.getTodaySales().reduce((sum, s) => s.paymentMethod === 'cash' && s.paid > s.total ? sum + (s.paid - s.total) : sum, 0); },
    
    distributeTips() {
        const today = new Date().toISOString().split('T')[0];
        const present = this.data.attendance.filter(a => a.date === today && a.status === 'present');
        if (!present.length) return 0;
        const total = this.calculateTodayTips();
        const perPerson = total / present.length;
        present.forEach(a => { const emp = this.data.employees.find(e => e.id === a.employeeId); if (emp) emp.dailyTips = (emp.dailyTips || 0) + perPerson; });
        this.save(); this.pushToFirebase();
        return { total, perPerson, count: present.length };
    },
    
    addBranch(branch) { branch.id = Date.now().toString(); this.data.branches.push(branch); this.save(); this.pushToFirebase(); return branch; },
    switchBranch(id) { this.data.settings.currentBranch = id; this.save(); this.pushToFirebase(); },
    
    getLateEmployees() {
        const today = new Date().toISOString().split('T')[0];
        const expected = 9 * 60;
        return this.data.attendance.filter(a => a.date === today && a.checkIn).map(a => {
            const emp = this.data.employees.find(e => e.id === a.employeeId);
            const mins = new Date(a.checkIn).getHours() * 60 + new Date(a.checkIn).getMinutes();
            return mins > expected ? { name: emp?.name, lateMinutes: mins - expected } : null;
        }).filter(l => l);
    },
    
    getAbsentEmployees() {
        const today = new Date().toISOString().split('T')[0];
        return this.data.attendance.filter(a => a.date === today && a.status === 'absent').map(a => this.data.employees.find(e => e.id === a.employeeId)?.name).filter(n => n);
    },
    
    getPresentEmployees() {
        const today = new Date().toISOString().split('T')[0];
        return this.data.attendance.filter(a => a.date === today && a.status === 'present').map(a => ({ name: this.data.employees.find(e => e.id === a.employeeId)?.name, checkIn: a.checkIn }));
    }
};

DB.init();
