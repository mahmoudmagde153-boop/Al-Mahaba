/**
 * ============================================================
 *  الموردين - Suppliers Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 */

window.Suppliers = (function () {
    'use strict';

    let currentSupplierId = null;

    function init() {
        render();
    }

    function render() {
        const container = document.getElementById('page-suppliers');
        if (!container) return;

        if (currentSupplierId) {
            renderSupplierDetails(container);
        } else {
            renderSuppliersList(container);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       1. قائمة الموردين
       ═══════════════════════════════════════════════════════════════════════ */
    function renderSuppliersList(container) {
        const suppliers = window.DB.getSuppliers();
        const txs = window.DB.getSupplierTxs();

        // حساب رصيد كل مورد
        const balances = {};
        suppliers.forEach(s => balances[s.id] = parseFloat(s.initialBalance || 0));
        
        txs.forEach(tx => {
            if (tx.type === 'purchase') {
                balances[tx.supplierId] += parseFloat(tx.amount || 0);
            } else if (tx.type === 'payment' || tx.type === 'return' || tx.type === 'sales_to_supplier') {
                balances[tx.supplierId] -= parseFloat(tx.amount || 0);
            }
        });

        container.innerHTML = `
            <div class="suppliers-page">
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h2><i class="fas fa-truck-loading"></i> الموردين</h2>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
                        <input type="text" id="supSearch" placeholder="بحث باسم المورد..." class="input-field" style="max-width: 250px; width: 100%;">
                        <button class="btn btn-primary" id="addSupplierBtn">
                            <i class="fas fa-plus"></i> إضافة مورد جديد
                        </button>
                    </div>
                </div>

                <div class="suppliers-grid">
                    ${suppliers.map(sup => `
                        <div class="employee-card glass-card">
                            <div class="emp-header">
                                <div class="emp-avatar">${sup.name.charAt(0)}</div>
                                <div class="emp-title">
                                    <h3>${sup.name}</h3>
                                    <span>${sup.phone || 'بدون رقم'}</span>
                                </div>
                            </div>
                            <div class="emp-stats">
                                <div class="stat-box">
                                    <span class="label">الرصيد الحالي</span>
                                    <span class="val ${balances[sup.id] > 0 ? 'text-danger' : 'text-success'}" style="font-size:1.1rem; font-weight:bold;">
                                        ${window.formatCurrency(balances[sup.id])} 
                                        <small style="font-size:0.7rem;">${balances[sup.id] > 0 ? '(علينا)' : '(لنا)'}</small>
                                    </span>
                                </div>
                            </div>
                            <div class="emp-actions" style="margin-top: 1rem;">
                                <button class="btn btn-primary btn-sm view-supplier" data-id="${sup.id}">كشف الحساب</button>
                                <button class="btn btn-warning btn-sm edit-supplier" data-id="${sup.id}">تعديل</button>
                            </div>
                        </div>
                    `).join('')}
                    ${suppliers.length === 0 ? '<p style="grid-column: 1/-1; text-align:center;">لا يوجد موردين مسجلين</p>' : ''}
                </div>
            </div>

            <!-- Modal إضافة مورد -->
            <div id="supplierModal" class="modal-overlay hidden">
                <div class="modal-content glass-card" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 id="supplierModalTitle">إضافة مورد جديد</h3>
                        <button class="modal-close" id="supplierModalClose">✕</button>
                    </div>
                    <div class="modal-body">
                        <form id="supplierForm">
                            <input type="hidden" id="supId">
                            <div class="form-group">
                                <label>اسم المورد</label>
                                <input type="text" id="supName" required>
                            </div>
                            <div class="form-group">
                                <label>رقم التليفون</label>
                                <input type="tel" id="supPhone">
                            </div>
                            <div class="form-group">
                                <label>الرصيد الافتتاحي (علينا)</label>
                                <input type="number" id="supInitial" value="0">
                            </div>
                            <button type="submit" class="btn btn-success w-100">حفظ المورد</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // أحداث الأزرار
        const supSearch = document.getElementById('supSearch');
        if (supSearch) {
            supSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.suppliers-grid .employee-card').forEach(card => {
                    const name = card.querySelector('h3').textContent.toLowerCase();
                    card.style.display = name.includes(term) ? 'block' : 'none';
                });
            });
        }

        document.getElementById('addSupplierBtn').addEventListener('click', () => {
            document.getElementById('supplierForm').reset();
            document.getElementById('supId').value = '';
            document.getElementById('supplierModalTitle').textContent = 'إضافة مورد جديد';
            document.getElementById('supplierModal').classList.add('show');
        });

        document.getElementById('supplierModalClose').addEventListener('click', () => {
            document.getElementById('supplierModal').classList.remove('show');
        });

        document.getElementById('supplierForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('supId').value;
            const supplier = {
                id: id ? parseInt(id) : null,
                name: document.getElementById('supName').value,
                phone: document.getElementById('supPhone').value,
                initialBalance: parseFloat(document.getElementById('supInitial').value) || 0
            };
            window.DB.saveSupplier(supplier);
            window.showToast('تم الحفظ بنجاح', 'success');
            render();
        });

        document.querySelectorAll('.edit-supplier').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                const sup = suppliers.find(s => s.id === id);
                if (sup) {
                    document.getElementById('supId').value = sup.id;
                    document.getElementById('supName').value = sup.name;
                    document.getElementById('supPhone').value = sup.phone || '';
                    document.getElementById('supInitial').value = sup.initialBalance || 0;
                    document.getElementById('supplierModalTitle').textContent = 'تعديل بيانات المورد';
                    document.getElementById('supplierModal').classList.add('show');
                }
            });
        });

        document.querySelectorAll('.view-supplier').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentSupplierId = parseInt(e.target.dataset.id);
                render();
            });
        });
    }

    /* ═══════════════════════════════════════════════════════════════════════
       2. كشف حساب المورد (Transactions)
       ═══════════════════════════════════════════════════════════════════════ */
    function renderSupplierDetails(container) {
        const suppliers = window.DB.getSuppliers();
        const sup = suppliers.find(s => s.id === currentSupplierId);
        if (!sup) {
            currentSupplierId = null;
            render();
            return;
        }

        const allTxs = window.DB.getSupplierTxs().filter(t => t.supplierId === currentSupplierId);
        
        // حساب الرصيد المتراكم
        let runningBalance = parseFloat(sup.initialBalance || 0);
        const processedTxs = allTxs.map(tx => {
            if (tx.type === 'purchase') runningBalance += parseFloat(tx.amount || 0);
            else if (tx.type === 'payment' || tx.type === 'return' || tx.type === 'sales_to_supplier') runningBalance -= parseFloat(tx.amount || 0);
            return { ...tx, runningBalance };
        });

        const typeLabels = {
            purchase: '<span class="badge" style="background:#ef4444">فاتورة مشتريات (+)</span>',
            payment: '<span class="badge" style="background:#10b981">دفعة مسددة (-)</span>',
            return: '<span class="badge" style="background:#f59e0b">مرتجع بضاعة (-)</span>',
            sales_to_supplier: '<span class="badge" style="background:#3b82f6">مبيعات للمورد (-)</span>'
        };

        const paymentMethods = {
            cash: 'كاش',
            visa: 'فيزا',
            instapay: 'إنستا باي',
            vf73: 'فودافون 73',
            vf88: 'فودافون 88',
            deferred: 'آجل',
            none: '-'
        };

        container.innerHTML = `
            <div class="supplier-details-page">
                <div class="print-header" style="display:none;">
                    <h1>شركة المحبة لقطع الغيار</h1>
                    <p>كشف حساب مورد: ${sup.name}</p>
                    <p>الرصيد الحالي: ${window.formatCurrency(runningBalance)} ${runningBalance > 0 ? '(مستحق للمورد)' : '(مستحق لنا)'}</p>
                    <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <button class="btn btn-secondary btn-sm" id="backToSuppliers" style="margin-bottom: 10px;">
                            <i class="fas fa-arrow-right"></i> رجوع
                        </button>
                        <button class="btn btn-success btn-sm print-hidden" id="printLedgerBtn" style="margin-bottom: 10px; margin-right: 10px;">
                            <i class="fas fa-print"></i> طباعة كشف الحساب
                        </button>
                        <h2>كشف حساب: ${sup.name}</h2>
                    </div>
                    <div style="text-align: left;">
                        <span class="label">الرصيد الحالي: </span>
                        <h3 class="${runningBalance > 0 ? 'text-danger' : 'text-success'}">${window.formatCurrency(runningBalance)}</h3>
                    </div>
                </div>

                <div class="split-layout">
                    <!-- إضافة حركة للمورد -->
                    <div class="form-section glass-card">
                        <h3><i class="fas fa-file-invoice-dollar"></i> تسجيل معاملة</h3>
                        <form id="supTxForm">
                            <div class="form-group">
                                <label>نوع الحركة</label>
                                <select id="txType" required>
                                    <option value="purchase">فاتورة مشتريات (حساب علينا)</option>
                                    <option value="payment">سداد دفعة (دفعنا للمورد)</option>
                                    <option value="return">مرتجع بضاعة (يقلل حسابنا)</option>
                                    <option value="sales_to_supplier">مبيعات للمورد (يقلل حسابنا)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>التاريخ</label>
                                <input type="date" id="txDate" required value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label>المبلغ</label>
                                <input type="number" id="txAmount" min="1" required>
                            </div>
                            <div class="form-group" id="paymentMethodGroup" style="display:none;">
                                <label>طريقة الدفع</label>
                                <select id="txPaymentMethod">
                                    <option value="cash">كاش (من الخزنة)</option>
                                    <option value="visa">فيزا / بنك</option>
                                    <option value="instapay">إنستا باي (من الفيزا)</option>
                                    <option value="vf73">فودافون كاش (73)</option>
                                    <option value="vf88">فودافون كاش (88)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>رقم الفاتورة / مرجع التحويل</label>
                                <input type="text" id="txInvoiceNo">
                            </div>
                            <div class="form-group">
                                <label>صورة الفاتورة / التحويل (اختياري)</label>
                                <input type="file" id="txImage" accept="image/*">
                                <small style="color:var(--text-muted)">سيتم حفظ الصورة محلياً</small>
                            </div>
                            <div class="form-group">
                                <label>ملاحظات</label>
                                <textarea id="txNotes" rows="2"></textarea>
                            </div>
                            <div class="form-group" style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" id="txHistorical" style="width:auto;">
                                <label for="txHistorical" style="margin:0; font-weight:normal; cursor:pointer;">معاملة تاريخية (رصيد سابق لا يؤثر على إجمالي الخزنة الحالية)</label>
                            </div>
                            <button type="submit" class="btn btn-primary w-100" style="margin-top:15px;">حفظ المعاملة</button>
                        </form>
                    </div>

                    <!-- سجل الحركات للمورد -->
                    <div class="table-section glass-card">
                        <h3>سجل العمليات</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>النوع</th>
                                        <th>المبلغ</th>
                                        <th>طريقة الدفع</th>
                                        <th>الرصيد المتراكم</th>
                                        <th class="print-hidden">المرفق والملاحظات</th>
                                        <th class="print-hidden">بواسطة</th>
                                        <th class="print-hidden">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>-</td>
                                        <td><span class="badge" style="background:#6b7280">رصيد افتتاحي</span></td>
                                        <td>-</td>
                                        <td>-</td>
                                        <td><strong>${window.formatCurrency(sup.initialBalance)}</strong></td>
                                        <td class="print-hidden">-</td>
                                        <td class="print-hidden">-</td>
                                        <td class="print-hidden">-</td>
                                    </tr>
                                    ${processedTxs.map(tx => `
                                        <tr>
                                            <td>${tx.date}</td>
                                            <td>${typeLabels[tx.type]}</td>
                                            <td>${window.formatCurrency(tx.amount)}</td>
                                            <td>${paymentMethods[tx.paymentMethod] || '-'}</td>
                                            <td><strong>${window.formatCurrency(tx.runningBalance)}</strong></td>
                                            <td class="print-hidden">
                                                ${tx.invoiceNo ? `رقم: ${tx.invoiceNo}<br>` : ''}
                                                ${tx.notes ? `<small>${tx.notes}</small><br>` : ''}
                                            </td>
                                            <td class="print-hidden"><span class="text-muted" style="font-size:0.85em;">${tx.createdBy || '-'}</span></td>
                                            <td class="print-hidden" style="text-align:center; white-space:nowrap;">
                                                <button class="btn btn-sm btn-info" onclick="window.Treasury.viewAttachment('${tx.id}')" title="عرض المرفق" style="padding: 4px 8px; margin-left: 5px;"><i class="fas fa-image"></i></button>
                                                <button class="btn btn-sm btn-warning" onclick="window.Treasury.editTx('${tx.id}')" title="تعديل" style="padding: 4px 8px; margin-left: 5px;"><i class="fas fa-edit"></i></button>
                                                <button class="btn btn-sm btn-danger" onclick="window.Treasury.deleteTx('${tx.id}')" title="حذف" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // أحداث الواجهة
        document.getElementById('backToSuppliers').addEventListener('click', () => {
            currentSupplierId = null;
            render();
        });

        const printBtn = document.getElementById('printLedgerBtn');
        if(printBtn) {
            printBtn.addEventListener('click', () => {
                const printHtml = `
                <!DOCTYPE html>
                <html lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>كشف حساب مورد</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                        @page { size: A4 portrait; margin: 15mm; }
                        * { box-sizing: border-box; }
                        body { 
                            font-family: 'Cairo', sans-serif; 
                            margin: 0; 
                            padding: 0; 
                            color: #111; 
                            background: #fff; 
                            font-size: 14px; 
                            direction: ltr; 
                        }
                        .rtl-wrapper {
                            direction: rtl;
                            text-align: right;
                            width: 100%;
                            margin: 0 auto;
                        }
                        .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px; }
                        .header h1 { margin: 0; font-size: 26px; color: #0f172a; }
                        .header h2 { margin: 5px 0; font-size: 18px; color: #475569; }
                        .header .meta { display: flex; justify-content: space-between; margin-top: 15px; font-weight: 600; font-size: 14px; }
                        .summary-box { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 25px; }
                        .summary-box h3 { margin: 0; padding: 10px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 16px; text-align: center; }
                        .summary-content { padding: 15px; display: flex; justify-content: space-around; font-size: 16px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: right; word-wrap: break-word; }
                        th { background-color: #f8fafc; font-weight: 700; color: #0f172a; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .amount { font-weight: bold; }
                    </style>
                </head>
                <body>
                  <div class="rtl-wrapper">
                    <div class="header">
                        <h1>شركة المحبة لقطع الغيار</h1>
                        <h2>كشف حساب مورد: ${sup.name}</h2>
                        <div class="meta">
                            <div>رقم الهاتف: ${sup.phone || 'غير مسجل'}</div>
                            <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
                        </div>
                    </div>
                    
                    <div class="summary-box">
                        <h3>ملخص الحساب الحالي</h3>
                        <div class="summary-content">
                            <div>الرصيد الافتتاحي: <span style="color:#0f172a">${window.formatCurrency(sup.initialBalance || 0)}</span></div>
                            <div>إجمالي المستحق للمورد: <span style="color:#ef4444">${window.formatCurrency(runningBalance)}</span></div>
                        </div>
                    </div>

                    <h3 style="margin-bottom: 10px; color: #0f172a;">تفاصيل المعاملات</h3>
                    <table>
                        <thead>
                                <th>التاريخ</th>
                                <th>نوع العملية</th>
                                <th>المبلغ</th>
                                <th>طريقة الدفع</th>
                                <th>الرصيد وقتها</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${processedTxs.length === 0 ? '<tr><td colspan="5" style="text-align:center;">لا توجد معاملات مسجلة</td></tr>' : ''}
                            ${processedTxs.map(tx => `
                                <tr>
                                    <td>${tx.date}</td>
                                    <td>${tx.type === 'purchase' ? 'مشتريات' : tx.type === 'payment' ? 'دفعة' : tx.type === 'return' ? 'مرتجع' : 'مبيعات'}</td>
                                    <td class="amount">${window.formatCurrency(tx.amount)}</td>
                                    <td>${paymentMethods[tx.paymentMethod] || '-'}</td>
                                    <td class="amount" style="color: #0f172a">${window.formatCurrency(tx.runningBalance)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                  </div>
                </body>
                </html>
                `;

                const win = window.open('', '_blank', 'width=900,height=700');
                if (!win) {
                    alert('يرجى السماح بالنوافذ المنبثقة (Popups) للطباعة.');
                    return;
                }
                win.document.open();
                win.document.write(printHtml);
                win.document.close();

                setTimeout(() => {
                    win.focus();
                    win.print();
                    setTimeout(() => { win.close(); }, 500);
                }, 500);
            });
        }

        const txType = document.getElementById('txType');
        const paymentMethodGroup = document.getElementById('paymentMethodGroup');
        
        txType.addEventListener('change', () => {
            if (txType.value === 'payment') {
                paymentMethodGroup.style.display = 'block';
            } else {
                paymentMethodGroup.style.display = 'none';
            }
        });

        document.getElementById('supTxForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            // قراءة الصورة كـ Base64 إذا وُجدت
            const fileInput = document.getElementById('txImage');
            let imageBase64 = null;
            if (fileInput.files.length > 0) {
                try {
                    imageBase64 = await readFileAsDataURL(fileInput.files[0]);
                } catch (err) {
                    window.showToast('فشل في قراءة الصورة', 'error');
                    return;
                }
            }

            const tx = {
                supplierId: currentSupplierId,
                type: txType.value,
                date: document.getElementById('txDate').value,
                amount: parseFloat(document.getElementById('txAmount').value),
                paymentMethod: txType.value === 'payment' ? document.getElementById('txPaymentMethod').value : 'none',
                invoiceNo: document.getElementById('txInvoiceNo').value,
                notes: document.getElementById('txNotes').value,
                image: imageBase64,
                historical: document.getElementById('txHistorical').checked
            };

            window.DB.addSupplierTx(tx);
            window.showToast('تم تسجيل المعاملة', 'success');
            render();
        });
    }

    // دالة مساعدة لقراءة الصورة
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    return {
        init
    };
})();



