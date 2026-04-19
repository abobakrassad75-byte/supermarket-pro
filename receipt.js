const receipt = {
    currentSale: null,
    show(sale) {
        this.currentSale = sale;
        const content = document.getElementById('receiptContent');
        if (!content) return;
        const storeName = DB.data.settings.companyName || 'سوبر ماركت برو';
        const storePhone = DB.data.settings.storePhone || '';
        const taxRate = DB.data.settings.taxRate || 14;
        let itemsHtml = '', subtotal = 0;
        if (sale.items?.length) {
            sale.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                itemsHtml += `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ddd;"><div><strong>${item.name}</strong><br><small>${item.quantity} × ${item.price.toFixed(2)}</small></div><div><strong>${itemTotal.toFixed(2)} ج.م</strong></div></div>`;
            });
        }
        const tax = sale.tax || (subtotal * (taxRate / 100));
        const total = sale.total || (subtotal + tax);
        const paid = sale.paid || total;
        const change = sale.change || (paid - total);
        content.innerHTML = `<div style="font-family:Cairo;padding:15px;"><div style="text-align:center;margin-bottom:20px;"><h2 style="color:#667eea;">🏪 ${storeName}</h2>${storePhone ? `<p>📞 ${storePhone}</p>` : ''}<p>📅 ${new Date(sale.date).toLocaleString('ar-EG')}</p><p>🧾 فاتورة #${sale.invoiceNumber || sale.id.slice(-8)}</p><hr style="border:1px dashed #667eea;"></div><div style="margin-bottom:20px;">${itemsHtml}</div><div style="background:#f5f5f5;padding:15px;border-radius:10px;"><div style="display:flex;justify-content:space-between;"><span>المجموع:</span><span>${subtotal.toFixed(2)} ج.م</span></div><div style="display:flex;justify-content:space-between;"><span>الضريبة (${taxRate}%):</span><span>${tax.toFixed(2)} ج.م</span></div><div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.2em;margin-top:10px;padding-top:10px;border-top:2px solid #667eea;"><span>الإجمالي:</span><span>${total.toFixed(2)} ج.م</span></div></div><div style="margin-top:20px;padding:15px;background:#e8f5e9;border-radius:10px;"><div style="display:flex;justify-content:space-between;"><span>طريقة الدفع:</span><span>${sale.paymentMethod === 'cash' ? '💵 نقدي' : '💳 بطاقة'}</span></div><div style="display:flex;justify-content:space-between;"><span>المدفوع:</span><span>${paid.toFixed(2)} ج.م</span></div><div style="display:flex;justify-content:space-between;font-weight:bold;color:#27ae60;"><span>الباقي:</span><span>${change.toFixed(2)} ج.م</span></div></div><div style="text-align:center;margin-top:30px;color:#999;"><p>🙏 شكراً لتسوقكم معنا</p><div style="font-family:monospace;font-size:18px;">* ${sale.id.slice(-6)} *</div></div></div>`;
        document.getElementById('receiptModal').classList.remove('hidden');
    },
    print() {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>فاتورة</title><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo&display=swap" rel="stylesheet"><style>body{font-family:Cairo;padding:15px;max-width:350px;}</style></head><body>${document.getElementById('receiptContent').innerHTML}<div style="text-align:center;margin-top:20px;"><button onclick="window.print()" style="padding:10px 30px;background:#667eea;color:white;border:none;border-radius:8px;">🖨️ طباعة</button></div></body></html>`);
        printWindow.document.close();
    }
};
