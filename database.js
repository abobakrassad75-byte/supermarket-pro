const DB = {
    data: {
        products: [],
        categories: [],
        customers: [],
        employees: [],
        sales: [],
        attendance: [],
        users: [],
        settings: {
            companyName: 'سوبر ماركت برو',
            storePhone: '01234567890',
            taxRate: 14,
            currency: 'ج.م'
        },
        currentUser: null
    },

    init() {
        const saved = localStorage.getItem('supermarketDB');
        if (saved) {
            this.data = JSON.parse(saved);
        } else {
            this.initDefaultData();
            this.save();
        }
    },

    initDefaultData() {
        this.data.categories = [
            { id: '1', name: 'مخبوزات' },
            { id: '2', name: 'ألبان وأجبان' },
            { id: '3', name: 'مواد تموينية' },
            { id: '4', name: 'مشروبات' },
            { id: '5', name: 'منظفات' }
        ];
        
        this.data.products = [
            { id: '1', barcode: '111', name: 'خبز', categoryId: '1', price: 5, cost: 3, stock: 50, minStock: 10 },
            { id: '2', barcode: '222', name: 'حليب', categoryId: '2', price: 12, cost: 8, stock: 30, minStock: 5 },
            { id: '3', barcode: '333', name: 'سكر', categoryId: '3', price: 15, cost: 10, stock: 20, minStock: 8 },
            { id: '4', barcode: '444', name: 'أرز', categoryId: '3', price: 25, cost: 18, stock: 40, minStock: 10 },
            { id: '5', barcode: '555', name: 'زيت', categoryId: '3', price: 45, cost: 35, stock: 25, minStock: 5 },
            { id: '6', barcode: '666', name: 'شاي', categoryId: '4', price: 20, cost: 14, stock: 60, minStock: 10 },
            { id: '7', barcode: '777', name: 'قهوة', categoryId: '4', price: 35, cost: 25, stock: 30, minStock: 8 },
            { id: '8', barcode: '888', name: 'جبنة', categoryId: '2', price: 30, cost: 22, stock: 15, minStock: 5 }
        ];
        
        this.data.customers = [
            { id: '1', name: 'أحمد محمد', phone: '01001234567', email: 'ahmed@email.com', points: 150, totalPurchases: 2500, lastVisit: new Date().toISOString() },
            { id: '2', name: 'سارة علي', phone: '01011234568', email: 'sara@email.com', points: 80, totalPurchases: 1200, lastVisit: new Date().toISOString() },
            { id: '3', name: 'محمد محمود', phone: '01021234569', email: 'mohamed@email.com', points: 200, totalPurchases: 3500, lastVisit: new Date().toISOString() }
        ];
        
        this.data.employees = [
            { id: '1', name: 'محمد عبدالله', role: 'كاشير', phone: '01012345678', salary: 3000, tips: 0 },
            { id: '2', name: 'فاطمة محمود', role: 'كاشير', phone: '01012345679', salary: 3000, tips: 0 },
            { id: '3', name: 'عمر خالد', role: 'مدير', phone: '01012345680', salary: 5000, tips: 0 }
        ];
        
        this.data.users = [
            { id: '1', username: 'admin', password: '123456', role: 'admin', name: 'مدير النظام' },
            { id: '2', username: 'cashier1', password: '123456', role: 'cashier', name: 'محمد عبدالله' }
        ];
        
        const today = new Date().toISOString().split('T')[0];
        this.data.attendance = [
            { id: '1', employeeId: '1', date: today, checkIn: new Date().toISOString(), status: 'present' },
            { id: '2', employeeId: '2', date: today, checkIn: new Date().toISOString(), status: 'present' }
        ];
        
        this.data.sales = [
            { id: '1', date: new Date().toISOString(), total: 150, items: [], paymentMethod: 'cash' },
            { id: '2', date: new Date().toISOString(), total: 85, items: [], paymentMethod: 'card' },
            { id: '3', date: new Date().toISOString(), total: 220, items: [], paymentMethod: 'cash' }
        ];
    },

    save() {
        localStorage.setItem('supermarketDB', JSON.stringify(this.data));
    },

    getProducts() { return this.data.products; },
    addProduct(product) { product.id = Date.now().toString(); this.data.products.push(product); this.save(); return product; },
    updateProduct(id, updates) { const index = this.data.products.findIndex(p => p.id === id); if (index !== -1) { this.data.products[index] = { ...this.data.products[index], ...updates }; this.save(); } },
    deleteProduct(id) { this.data.products = this.data.products.filter(p => p.id !== id); this.save(); },
    addCategory(name) { const category = { id: Date.now().toString(), name }; this.data.categories.push(category); this.save(); return category; },
    addSale(sale) { sale.id = Date.now().toString(); sale.date = new Date().toISOString(); this.data.sales.unshift(sale); this.save(); return sale; },
    getTodaySales() { const today = new Date().toISOString().split('T')[0]; return this.data.sales.filter(s => s.date.startsWith(today)); },
    getDashboardStats() { const todaySales = this.getTodaySales(); const today = new Date().toISOString().split('T')[0]; return { dailySales: todaySales.reduce((sum, s) => sum + (s.total || 0), 0), invoiceCount: todaySales.length, lowStock: this.data.products.filter(p => p.stock <= p.minStock).length, presentEmployees: this.data.attendance.filter(a => a.date === today && a.status === 'present').length, totalEmployees: this.data.employees.length }; },
    authenticateUser(username, password) { return this.data.users.find(u => u.username === username && u.password === password); },
    checkIn(employeeId) { const today = new Date().toISOString().split('T')[0]; let attendance = this.data.attendance.find(a => a.employeeId === employeeId && a.date === today); if (!attendance) { attendance = { id: Date.now().toString(), employeeId, date: today, checkIn: new Date().toISOString(), status: 'present' }; this.data.attendance.push(attendance); } else { attendance.checkIn = new Date().toISOString(); attendance.status = 'present'; } this.save(); return true; },
    checkOut(employeeId) { const today = new Date().toISOString().split('T')[0]; const attendance = this.data.attendance.find(a => a.employeeId === employeeId && a.date === today); if (attendance && attendance.checkIn) { attendance.checkOut = new Date().toISOString(); const checkIn = new Date(attendance.checkIn); const checkOut = new Date(attendance.checkOut); attendance.workHours = (checkOut - checkIn) / (1000 * 60 * 60); this.save(); return attendance.workHours; } return 0; }
};

DB.init();