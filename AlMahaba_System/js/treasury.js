/**
 * ============================================================
 *  الخزنة واليومية - Treasury Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 */

window.Treasury = (function () {
    'use strict';

    function init() {
        render();
    }

    function render() {
        const container = document.getElementById('page-treasury');
        if (!container) return;

        const suppliers = window.DB.getSuppliers();
        const suppliersOptions = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        container.innerHTML = `
            <div class="treasury-page">
                <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2><i class="fas fa-wallet"></i> الخزنة والعمليات اليومية</h2>
                    <button class="btn btn-warning print-hidden" id="btnTreasuryReport">
                        <i class="fas fa-file-invoice-dollar"></i> استخراج تقرير مالي
                    </button>
                </div>

                <!-- إحصائيات الخزنة الحالية -->
                <div class="stats-grid" id="treasuryStats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:20px;">
                    <!-- سيتم تعبئتها ديناميكياً -->
                </div>

                <div class="split-layout">
                    <!-- نموذج إدخال حركة جديدة -->
                    <div class="form-section glass-card">
                        <h3><i class="fas fa-plus-circle"></i> إضافة حركة جديدة</h3>
                        <form id="treasuryForm">
                            <div class="form-group">
                                <label>نوع الحركة</label>
                                <select id="trType" required>
                                    <option value="sales">مبيعات</option>
                                    <option value="purchase">مشتريات</option>
                                    <option value="sales_return">مرتجعات مبيعات</option>
                                    <option value="expense">مصروفات</option>
                                    <option value="supplier_payment">سداد دفعة لمورد</option>
                                    <option value="cash_in">إيراد آخر / إيداع نقدية</option>
                                </select>
                            </div>

                            <div class="form-group" id="supplierRow" style="display:none;">
                                <label>المورد</label>
                                <select id="trSupplier">
                                    <option value="" disabled selected>اختر المورد...</option>
                                    ${suppliersOptions}
                                </select>
                            </div>

                            <div class="form-group">
                                <label>التاريخ</label>
                                <input type="date" id="trDate" required value="${new Date().toISOString().split('T')[0]}">
                            </div>

                            <div id="salesAmountsRow" style="display:flex; flex-wrap:wrap; gap:10px;">
                                <div class="form-group" style="flex:1; min-width:100px;">
                                    <label>كاش</label>
                                    <input type="number" id="trCash" min="0" value="0">
                                </div>
                                <div class="form-group" style="flex:1; min-width:100px;">
                                    <label>فيزا</label>
                                    <input type="number" id="trVisa" min="0" value="0">
                                </div>
                                <div class="form-group" style="flex:1; min-width:100px;">
                                    <label>انستا باي</label>
                                    <input type="number" id="trInsta" min="0" value="0">
                                </div>
                                <div class="form-group" style="flex:1; min-width:100px;">
                                    <label>فودافون 73</label>
                                    <input type="number" id="trVF73" min="0" value="0">
                                </div>
                                <div class="form-group" style="flex:1; min-width:100px;">
                                    <label>فودافون 88</label>
                                    <input type="number" id="trVF88" min="0" value="0">
                                </div>
                            </div>

                            <div id="singleAmountRow" style="display:none; flex-wrap:wrap; gap:10px;">
                                <div class="form-group" style="flex:1; min-width:120px;">
                                    <label>المبلغ الإجمالي</label>
                                    <input type="number" id="trAmount" min="0" value="0">
                                </div>
                                <div class="form-group" style="flex:1; min-width:120px;">
                                    <label>طريقة الدفع</label>
                                    <select id="trPaymentMethod">
                                        <option value="cash">كاش</option>
                                        <option value="visa">فيزا / بنك</option>
                                        <option value="instapay">انستا باي</option>
                                        <option value="vf73">فودافون كاش 73</option>
                                        <option value="vf88">فودافون كاش 88</option>
                                        <option value="deferred" id="optDeferred" style="display:none;">آجل (تسجل على الحساب)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>رقم الفاتورة / مرجع (اختياري)</label>
                                <input type="text" id="trInvoice">
                            </div>
                            <div class="form-group">
                                <label>البيان / ملاحظات</label>
                                <textarea id="trNotes" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label>إرفاق صورة / إيصال (اختياري)</label>
                                <input type="file" id="trImage" class="input-field" accept="image/*" style="width:100%; padding: 5px;">
                            </div>
                            <button type="submit" class="btn btn-success w-100">حفظ العملية</button>
                        </form>
                    </div>

                    <!-- سجل الحركات -->
                    <div class="table-section glass-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                            <h3 style="margin: 0;"><i class="fas fa-history"></i> سجل العمليات المجمعة</h3>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                                <label style="margin:0; font-size: 0.9em;">من:</label>
                                <input type="date" id="filterTrFrom" class="input-field" style="padding: 5px; width: 130px;">
                                <label style="margin:0; font-size: 0.9em;">إلى:</label>
                                <input type="date" id="filterTrTo" class="input-field" style="padding: 5px; width: 130px;">
                                <select id="filterTrType" class="input-field" style="padding: 5px; width: 130px;">
                                    <option value="all">كل العمليات</option>
                                    <option value="sales">مبيعات</option>
                                    <option value="purchase">مشتريات</option>
                                    <option value="payment">دفعات موردين</option>
                                    <option value="expense">مصروفات</option>
                                </select>
                                <button class="btn btn-secondary btn-sm" id="btnApplyTrFilter">تصفية</button>
                            </div>
                        </div>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>النوع</th>
                                        <th>الإجمالي</th>
                                        <th>طريقة الدفع</th>
                                        <th>البيان</th>
                                        <th>بواسطة</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody id="treasuryTableBody">
                                    <!-- سيتم التعبئة ديناميكياً -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        `;

        attachEvents();
        updateStats();
        renderTable();
    }

    function attachEvents() {
        const form = document.getElementById('treasuryForm');
        const typeSelect = document.getElementById('trType');
        const supplierRow = document.getElementById('supplierRow');
        const salesAmountsRow = document.getElementById('salesAmountsRow');
        const singleAmountRow = document.getElementById('singleAmountRow');
        const optDeferred = document.getElementById('optDeferred');
        
        typeSelect.addEventListener('change', function() {
            const type = this.value;
            
            // Show/Hide Supplier Dropdown
            if (type === 'purchase' || type === 'supplier_payment') {
                supplierRow.style.display = 'block';
                document.getElementById('trSupplier').required = true;
            } else {
                supplierRow.style.display = 'none';
                document.getElementById('trSupplier').required = false;
            }

            // Show/Hide Amounts
            if (type === 'sales' || type === 'sales_return') {
                salesAmountsRow.style.display = 'flex';
                singleAmountRow.style.display = 'none';
            } else {
                salesAmountsRow.style.display = 'none';
                singleAmountRow.style.display = 'flex';
            }

            // Deferred Option (Only for Purchase)
            if (type === 'purchase') {
                optDeferred.style.display = 'block';
            } else {
                optDeferred.style.display = 'none';
                if (document.getElementById('trPaymentMethod').value === 'deferred') {
                    document.getElementById('trPaymentMethod').value = 'cash';
                }
            }
        });

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const type = typeSelect.value;
            const date = document.getElementById('trDate').value;
            const invoiceNo = document.getElementById('trInvoice').value;
            const notes = document.getElementById('trNotes').value;
            const paymentMethod = document.getElementById('trPaymentMethod').value;
            const supplierId = document.getElementById('trSupplier').value;
            let txId = null;

            if (type === 'sales' || type === 'sales_return') {
                const cash = parseFloat(document.getElementById('trCash').value) || 0;
                const visa = parseFloat(document.getElementById('trVisa').value) || 0;
                const instapay = parseFloat(document.getElementById('trInsta').value) || 0;
                const vf73 = parseFloat(document.getElementById('trVF73').value) || 0;
                const vf88 = parseFloat(document.getElementById('trVF88').value) || 0;
                
                const amount = cash + visa + instapay + vf73 + vf88;
                if (amount === 0) {
                    window.showToast('يجب إدخال مبلغ صحيح', 'error');
                    return;
                }

                txId = window.DB.addTreasuryTx({
                    type, date, invoiceNo, notes,
                    cash, visa, instapay, vf73, vf88, amount
                });
            } 
            else if (type === 'purchase') {
                const amount = parseFloat(document.getElementById('trAmount').value) || 0;
                if (!supplierId || amount <= 0) {
                    window.showToast('الرجاء اختيار المورد وإدخال المبلغ', 'error');
                    return;
                }

                // إضافة المشتريات على حساب المورد (آجل مبدئياً)
                window.DB.addSupplierTx({
                    supplierId: parseInt(supplierId),
                    type: 'purchase',
                    date, amount, paymentMethod: 'deferred', invoiceNo, notes
                });

                // إذا لم تكن آجل، نضيف دفعة سداد فورية وتخصم من الخزنة
                if (paymentMethod !== 'deferred') {
                    txId = window.DB.addSupplierTx({
                        supplierId: parseInt(supplierId),
                        type: 'payment',
                        date, amount, paymentMethod, invoiceNo, notes: 'سداد فوري لفاتورة المشتريات'
                    });
                }
            }
            else if (type === 'supplier_payment') {
                const amount = parseFloat(document.getElementById('trAmount').value) || 0;
                if (!supplierId || amount <= 0) {
                    window.showToast('الرجاء اختيار المورد وإدخال المبلغ', 'error');
                    return;
                }

                txId = window.DB.addSupplierTx({
                    supplierId: parseInt(supplierId),
                    type: 'payment',
                    date, amount, paymentMethod, invoiceNo, notes
                });
            }
            else {
                // expense, cash_in
                const amount = parseFloat(document.getElementById('trAmount').value) || 0;
                if (amount <= 0) {
                    window.showToast('يجب إدخال مبلغ صحيح', 'error');
                    return;
                }

                txId = window.DB.addTreasuryTx({
                    type, date, amount, paymentMethod, invoiceNo, notes
                });
            }

            const imageInput = document.getElementById('trImage');
            if (imageInput && imageInput.files.length > 0 && txId) {
                const file = imageInput.files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    let img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX = 800;
                        if (width > height && width > MAX) {
                            height *= MAX / width; width = MAX;
                        } else if (height > MAX) {
                            width *= MAX / height; height = MAX;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        window.DB.saveImage(txId, canvas.toDataURL('image/jpeg', 0.6))
                            .then(() => render())
                            .catch(console.error);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }

            window.showToast('تم تسجيل العملية بنجاح', 'success');
            
            // Reset fields
            document.getElementById('trCash').value = '0';
            document.getElementById('trVisa').value = '0';
            document.getElementById('trInsta').value = '0';
            document.getElementById('trVF73').value = '0';
            document.getElementById('trVF88').value = '0';
            document.getElementById('trAmount').value = '0';
            document.getElementById('trInvoice').value = '';
            document.getElementById('trNotes').value = '';
            
            updateStats();
            renderTable();
        });

        const btnTreasuryReport = document.getElementById('btnTreasuryReport');
        if (btnTreasuryReport) {
            btnTreasuryReport.addEventListener('click', () => {
                const mod = document.getElementById('treasuryReportModal');
                mod.classList.remove('hidden');
                mod.classList.add('show');
            });
        }

        const btnApplyTrFilter = document.getElementById('btnApplyTrFilter');
        if (btnApplyTrFilter) {
            btnApplyTrFilter.addEventListener('click', () => {
                renderTable();
            });
        }
    }

    function calculateBalances() {
        const trTxs = window.DB.getTreasuryTxs();
        const supTxs = window.DB.getSupplierTxs();

        let cash = 0, visa = 0, instapay = 0, vf73 = 0, vf88 = 0;
        let sales = 0, purchases = 0, expenses = 0;

        // حساب حركات الخزنة
        trTxs.forEach(tx => {
            if (tx.type === 'sales') {
                cash += tx.cash || 0;
                visa += tx.visa || 0;
                instapay += tx.instapay || 0;
                vf73 += tx.vf73 || 0;
                vf88 += tx.vf88 || 0;
                sales += tx.amount || 0;
            } else if (tx.type === 'sales_return') {
                cash -= tx.cash || 0;
                visa -= tx.visa || 0;
                instapay -= tx.instapay || 0;
                vf73 -= tx.vf73 || 0;
                vf88 -= tx.vf88 || 0;
                sales -= tx.amount || 0;
            } else if (tx.type === 'expense' || tx.type === 'cash_out') {
                if (tx.paymentMethod === 'visa') visa -= tx.amount || 0;
                else if (tx.paymentMethod === 'instapay') instapay -= tx.amount || 0;
                else if (tx.paymentMethod === 'vf73') vf73 -= tx.amount || 0;
                else if (tx.paymentMethod === 'vf88') vf88 -= tx.amount || 0;
                else cash -= tx.amount || 0; 
                
                if (tx.type === 'expense') expenses += tx.amount || 0;
            } else if (tx.type === 'cash_in') {
                if (tx.paymentMethod === 'visa') visa += tx.amount || 0;
                else if (tx.paymentMethod === 'instapay') instapay += tx.amount || 0;
                else if (tx.paymentMethod === 'vf73') vf73 += tx.amount || 0;
                else if (tx.paymentMethod === 'vf88') vf88 += tx.amount || 0;
                else cash += tx.amount || 0;
            }
        });

        // خصم المدفوعات للموردين
        supTxs.forEach(tx => {
            if (tx.historical) return; // تجاهل الحركات التاريخية
            
            if (tx.type === 'payment') {
                if (tx.paymentMethod === 'visa') visa -= tx.amount || 0;
                else if (tx.paymentMethod === 'instapay') instapay -= tx.amount || 0;
                else if (tx.paymentMethod === 'vf73' || tx.paymentMethod === 'vodafone_73') vf73 -= tx.amount || 0;
                else if (tx.paymentMethod === 'vf88' || tx.paymentMethod === 'vodafone_88') vf88 -= tx.amount || 0;
                else if (tx.paymentMethod === 'cash') cash -= tx.amount || 0;
            } else if (tx.type === 'purchase') {
                purchases += tx.amount || 0;
            } else if (tx.type === 'sales_to_supplier') {
                sales += tx.amount || 0;
            }
        });

        return { cash, visa, instapay, vf73, vf88, sales, purchases, expenses };
    }

    function updateStats() {
        const stats = calculateBalances();
        const container = document.getElementById('treasuryStats');
        
        container.innerHTML = `
            <div class="stat-card" style="padding:15px;">
                <div class="stat-info">
                    <h3 style="font-size:1rem; margin-bottom:5px;">💰 كاش</h3>
                    <p class="stat-value" style="color: #10b981; font-size:1.3rem;">${window.formatCurrency(stats.cash)}</p>
                </div>
            </div>
            <div class="stat-card" style="padding:15px;">
                <div class="stat-info">
                    <h3 style="font-size:1rem; margin-bottom:5px;">💳 فيزا / بنك</h3>
                    <p class="stat-value" style="color: #3b82f6; font-size:1.3rem;">${window.formatCurrency(stats.visa)}</p>
                </div>
            </div>
            <div class="stat-card" style="padding:15px;">
                <div class="stat-info">
                    <h3 style="font-size:1rem; margin-bottom:5px;">⚡ انستا باي</h3>
                    <p class="stat-value" style="color: #8b5cf6; font-size:1.3rem;">${window.formatCurrency(stats.instapay)}</p>
                </div>
            </div>
            <div class="stat-card" style="padding:15px;">
                <div class="stat-info">
                    <h3 style="font-size:1rem; margin-bottom:5px;">📱 فودافون كاش</h3>
                    <p class="stat-value" style="color: #ef4444; font-size:1.3rem;">${window.formatCurrency(stats.vf73 + stats.vf88)}</p>
                </div>
            </div>
        `;
    }

    function renderTable() {
        const trTxs = window.DB.getTreasuryTxs();
        const supTxs = window.DB.getSupplierTxs();
        const suppliers = window.DB.getSuppliers();

        // تجميع الحركات من الخزنة والموردين للعرض معاً
        let allTxs = [];
        
        trTxs.forEach(t => allTxs.push({...t, sortDate: new Date(t.date).getTime()}));
        
        supTxs.forEach(t => {
            if (t.historical) return; // تجاهل الحركات التاريخية
            const supName = suppliers.find(s => s.id == t.supplierId)?.name || 'غير معروف';
            if (t.type === 'purchase') {
                allTxs.push({
                    ...t,
                    sortDate: new Date(t.date).getTime(),
                    type_override: 'مشتريات',
                    badge_color: '#ef4444',
                    notes: `مورد: ${supName} ${t.notes ? ' - '+t.notes : ''}`
                });
            } else if (t.type === 'payment') {
                allTxs.push({
                    ...t,
                    sortDate: new Date(t.date).getTime(),
                    type_override: 'دفعة مورد',
                    badge_color: '#f59e0b',
                    notes: `مورد: ${supName} ${t.notes ? ' - '+t.notes : ''}`
                });
            }
        });

        // ترتيب تنازلي
        allTxs.sort((a, b) => b.sortDate - a.sortDate);

        // تطبيق الفلاتر
        const filterFrom = document.getElementById('filterTrFrom')?.value;
        const filterTo = document.getElementById('filterTrTo')?.value;
        const filterType = document.getElementById('filterTrType')?.value;

        if (filterFrom) allTxs = allTxs.filter(t => t.date >= filterFrom);
        if (filterTo) allTxs = allTxs.filter(t => t.date <= filterTo);
        if (filterType && filterType !== 'all') {
            allTxs = allTxs.filter(t => t.type === filterType);
        }

        const tbody = document.getElementById('treasuryTableBody');
        
        const typeLabels = {
            sales: '<span class="badge" style="background:#10b981">مبيعات</span>',
            sales_return: '<span class="badge" style="background:#f59e0b">مرتجع مبيعات</span>',
            expense: '<span class="badge" style="background:#ef4444">مصروفات</span>',
            cash_in: '<span class="badge" style="background:#3b82f6">إيداع / إيراد</span>',
            cash_out: '<span class="badge" style="background:#6b7280">سحب نقدي</span>'
        };

        const paymentMethodNames = {
            cash: 'كاش',
            visa: 'فيزا',
            instapay: 'انستا باي',
            vf73: 'فودافون 73',
            vodafone_73: 'فودافون 73',
            vf88: 'فودافون 88',
            vodafone_88: 'فودافون 88',
            deferred: 'آجل'
        };

        if (allTxs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد عمليات مسجلة</td></tr>';
            return;
        }

        tbody.innerHTML = allTxs.map(tx => {
            let typeHtml = tx.type_override ? `<span class="badge" style="background:${tx.badge_color}">${tx.type_override}</span>` : (typeLabels[tx.type] || tx.type);
            
            let details = '';
            if (tx.type === 'sales' || tx.type === 'sales_return') {
                let parts = [];
                if (tx.cash) parts.push(`كاش: ${tx.cash}`);
                if (tx.visa) parts.push(`فيزا: ${tx.visa}`);
                if (tx.instapay) parts.push(`انستا: ${tx.instapay}`);
                if (tx.vf73) parts.push(`V73: ${tx.vf73}`);
                if (tx.vf88) parts.push(`V88: ${tx.vf88}`);
                details = parts.join(' | ');
            } else {
                details = paymentMethodNames[tx.paymentMethod] || 'كاش';
            }

            return `
            <tr>
                <td>${tx.date}</td>
                <td>${typeHtml}</td>
                <td><strong>${window.formatCurrency(tx.amount)}</strong></td>
                <td><small>${details}</small></td>
                <td>${tx.invoiceNo ? '<strong>رقم: </strong>' + tx.invoiceNo + '<br>' : ''}${tx.notes || '-'}</td>
                <td><span class="text-muted" style="font-size:0.85em;">${tx.createdBy || '-'}</span></td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-sm btn-info" onclick="window.Treasury.viewAttachment('${tx.id}')" title="عرض المرفق" style="padding: 4px 8px; margin-left: 5px;"><i class="fas fa-image"></i></button>
                    <button class="btn btn-sm btn-warning" onclick="window.Treasury.editTx('${tx.id}')" title="تعديل" style="padding: 4px 8px; margin-left: 5px;"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.Treasury.deleteTx('${tx.id}')" title="حذف" style="padding: 4px 8px;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    }

    function generateAndPrintReport(fromDate, toDate) {
        const trTxs = window.DB.getTreasuryTxs();
        const supTxs = window.DB.getSupplierTxs();
        const suppliers = window.DB.getSuppliers();

        // تجميع كل الحركات
        let allTxs = [];
        trTxs.forEach(t => allTxs.push({...t, sortDate: new Date(t.date).getTime()}));
        supTxs.forEach(t => {
            if (t.historical) return; // تجاهل الحركات التاريخية
            const supName = suppliers.find(s => s.id == t.supplierId)?.name || 'غير معروف';
            if (t.type === 'purchase') {
                allTxs.push({...t, sortDate: new Date(t.date).getTime(), type_override: 'مشتريات', notes: `مورد: ${supName} ${t.notes ? ' - '+t.notes : ''}`});
            } else if (t.type === 'payment') {
                allTxs.push({...t, sortDate: new Date(t.date).getTime(), type_override: 'دفعة مورد', notes: `مورد: ${supName} ${t.notes ? ' - '+t.notes : ''}`});
            }
        });

        // تصفية حسب التاريخ
        const fromTime = new Date(fromDate).getTime();
        const toTime = new Date(toDate).getTime();
        const filteredTxs = allTxs.filter(t => t.sortDate >= fromTime && t.sortDate <= toTime);
        filteredTxs.sort((a, b) => a.sortDate - b.sortDate);

        // حساب الملخص للفترة
        let totalSales = 0, totalPurchases = 0, totalExpenses = 0, totalPayments = 0;
        filteredTxs.forEach(tx => {
            if (tx.type === 'sales') totalSales += tx.amount || 0;
            else if (tx.type === 'purchase') totalPurchases += tx.amount || 0;
            else if (tx.type === 'expense') totalExpenses += tx.amount || 0;
            else if (tx.type === 'payment') totalPayments += tx.amount || 0;
        });

        const currentStats = calculateBalances();

        const typeLabels = {
            sales: 'مبيعات', sales_return: 'مرتجع مبيعات', expense: 'مصروفات', cash_in: 'إيداع / إيراد', cash_out: 'سحب نقدي'
        };

        const paymentMethodNames = {
            cash: 'كاش', visa: 'فيزا', instapay: 'انستا باي', vf73: 'فودافون 73', vodafone_73: 'فودافون 73', vf88: 'فودافون 88', vodafone_88: 'فودافون 88', deferred: 'آجل'
        };

        const printHtml = `
            <style>
                .treasury-print-wrapper {
                    direction: rtl;
                    text-align: right;
                    width: 100%;
                    margin: 0 auto;
                    font-family: 'Cairo', sans-serif;
                    color: #111;
                    background: #fff;
                    font-size: 14px;
                }
                .treasury-print-wrapper .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px; }
                .treasury-print-wrapper .header h1 { margin: 0; font-size: 26px; color: #0f172a; }
                .treasury-print-wrapper .header h2 { margin: 5px 0; font-size: 18px; color: #475569; }
                .treasury-print-wrapper .header .meta { display: flex; justify-content: space-between; margin-top: 15px; font-weight: 600; font-size: 14px; }
                
                .treasury-print-wrapper .summary-container { display: flex; gap: 20px; margin-bottom: 25px; }
                .treasury-print-wrapper .summary-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
                .treasury-print-wrapper .summary-box h3 { margin: 0; padding: 10px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 15px; text-align: center; }
                .treasury-print-wrapper .summary-content { padding: 10px 15px; }
                .treasury-print-wrapper .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
                .treasury-print-wrapper .summary-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
                
                .treasury-print-wrapper table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
                .treasury-print-wrapper th, .treasury-print-wrapper td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: right; word-wrap: break-word; }
                .treasury-print-wrapper th { background-color: #f8fafc; font-weight: 700; color: #0f172a; }
                .treasury-print-wrapper th:nth-child(1) { width: 12%; }
                .treasury-print-wrapper th:nth-child(2) { width: 14%; }
                .treasury-print-wrapper th:nth-child(3) { width: 12%; }
                .treasury-print-wrapper th:nth-child(4) { width: 20%; }
                .treasury-print-wrapper th:nth-child(5) { width: 30%; }
                .treasury-print-wrapper th:nth-child(6) { width: 12%; }
                
                .treasury-print-wrapper tr:nth-child(even) { background-color: #f8fafc; }
                .treasury-print-wrapper .amount { font-weight: bold; }
            </style>
            <div class="treasury-print-wrapper">
                <div class="header">
                    <h1>شركة المحبة لقطع الغيار</h1>
                    <h2>تقرير الحركة المالية والخزينة</h2>
                    <div class="meta">
                        <div>الفترة: ${fromDate} إلى ${toDate}</div>
                        <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
                    </div>
                </div>
                
                <div class="summary-container">
                    <div class="summary-box">
                        <h3>الأرصدة الحالية بالخزنة (الآن)</h3>
                        <div class="summary-content">
                            <div class="summary-row"><span>كاش:</span> <strong style="color: #0f172a;">${window.formatCurrency(currentStats.cash)}</strong></div>
                            <div class="summary-row"><span>فيزا / بنك:</span> <strong style="color: #0f172a;">${window.formatCurrency(currentStats.visa)}</strong></div>
                            <div class="summary-row"><span>انستا باي:</span> <strong style="color: #0f172a;">${window.formatCurrency(currentStats.instapay)}</strong></div>
                            <div class="summary-row"><span>فودافون كاش:</span> <strong style="color: #0f172a;">${window.formatCurrency(currentStats.vf73 + currentStats.vf88)}</strong></div>
                        </div>
                    </div>
                    <div class="summary-box">
                        <h3>ملخص حركة الفترة المحددة</h3>
                        <div class="summary-content">
                            <div class="summary-row"><span>إجمالي المبيعات:</span> <strong style="color: #10b981;">${window.formatCurrency(totalSales)}</strong></div>
                            <div class="summary-row"><span>إجمالي المشتريات:</span> <strong style="color: #ef4444;">${window.formatCurrency(totalPurchases)}</strong></div>
                            <div class="summary-row"><span>إجمالي المصروفات:</span> <strong style="color: #ef4444;">${window.formatCurrency(totalExpenses)}</strong></div>
                            <div class="summary-row"><span>مدفوعات للموردين:</span> <strong style="color: #ef4444;">${window.formatCurrency(totalPayments)}</strong></div>
                        </div>
                    </div>
                </div>

                <h3 style="margin-bottom: 10px; color: #0f172a;">تفاصيل الحركة المالية</h3>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>النوع</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                            <th>البيان / الملاحظات</th>
                            <th>بواسطة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTxs.length === 0 ? '<tr><td colspan="6" style="text-align:center;">لا توجد حركات في هذه الفترة</td></tr>' : ''}
                        ${filteredTxs.map(t => {
                            let typeTxt = t.type_override || typeLabels[t.type] || t.type;
                            let details = '';
                            if (t.type === 'sales' || t.type === 'sales_return') {
                                let parts = [];
                                if (t.cash) parts.push('كاش');
                                if (t.visa) parts.push('فيزا');
                                if (t.instapay) parts.push('انستا');
                                if (t.vf73 || t.vf88) parts.push('فودافون');
                                details = parts.join(' | ');
                            } else {
                                details = paymentMethodNames[t.paymentMethod] || 'كاش';
                            }
                            return `
                            <tr>
                                <td>${t.date}</td>
                                <td>${typeTxt}</td>
                                <td class="amount">${window.formatCurrency(t.amount)}</td>
                                <td>${details}</td>
                                <td>${t.notes || ''}</td>
                                <td>${t.createdBy || '-'}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const printArea = document.getElementById('treasuryPrintArea');
        if (printArea) {
            printArea.innerHTML = printHtml;
            document.body.classList.add('printing-treasury');
            
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.classList.remove('printing-treasury');
                    printArea.innerHTML = '';
                }, 1000);
            }, 300);
        } else {
            alert('خطأ: لم يتم العثور على منطقة الطباعة');
        }
    }

    function editTx(id) {
        let isSupplier = false;
        let tx = window.DB.getTreasuryTxs().find(t => t.id == id);
        if (!tx) {
            tx = window.DB.getSupplierTxs().find(t => t.id == id);
            isSupplier = true;
        }
        if (!tx) return;

        document.getElementById('editTxId').value = tx.id;
        document.getElementById('editTxIsSupplier').value = isSupplier ? 'true' : 'false';
        document.getElementById('editTxDate').value = tx.date;
        document.getElementById('editTxAmount').value = tx.amount;
        document.getElementById('editTxInvoice').value = tx.invoiceNo || '';
        document.getElementById('editTxNotes').value = tx.notes || '';
        document.getElementById('editTxImage').value = '';

        document.getElementById('editTxModalOverlay').classList.add('show');
    }

    function saveEditTx(e) {
        e.preventDefault();
        const id = document.getElementById('editTxId').value;
        const isSupplier = document.getElementById('editTxIsSupplier').value === 'true';
        const date = document.getElementById('editTxDate').value;
        const amount = parseFloat(document.getElementById('editTxAmount').value) || 0;
        const invoiceNo = document.getElementById('editTxInvoice').value;
        const notes = document.getElementById('editTxNotes').value;
        const imageInput = document.getElementById('editTxImage');

        if (amount <= 0) {
            window.showToast('المبلغ غير صالح', 'error');
            return;
        }

        const newData = { date, amount, invoiceNo, notes };

        if (isSupplier) {
            window.DB.updateSupplierTx(id, newData);
        } else {
            // For treasury sales, we need to adjust cash vs other if amount changed.
            // For simplicity, we assign the entire new amount to the original payment method, or just cash if it was split.
            // Let's just update the amount and let the user handle splits properly by deleting and recreating if it's complex sales.
            window.DB.updateTreasuryTx(id, newData);
        }

        if (imageInput && imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            reader.onload = function(event) {
                let img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width; let height = img.height; const MAX = 800;
                    if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
                    else if (height > MAX) { width *= MAX / height; height = MAX; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    window.DB.saveImage(id, canvas.toDataURL('image/jpeg', 0.6))
                        .then(() => render())
                        .catch(console.error);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }

        document.getElementById('editTxModalOverlay').classList.remove('show');
        window.showToast('تم تعديل العملية بنجاح', 'success');
        render();
        
        if (window.Suppliers && document.getElementById('page-suppliers').classList.contains('active')) {
            window.Suppliers.init();
            // Try to keep the supplier details open by simulating click
            if (isSupplier) {
                const tx = window.DB.getSupplierTxs().find(t => t.id == id);
                if (tx) {
                    const supBtn = document.querySelector(`.view-supplier[data-id="${tx.supplierId}"]`);
                    if(supBtn) supBtn.click();
                }
            }
        }
    }

    function deleteTx(id) {
        window.showConfirm('تأكيد الحذف', 'هل أنت متأكد من حذف هذه العملية نهائياً؟', () => {
            // Try delete from both, doesn't matter which one matches
            window.DB.deleteTreasuryTx(id);
            window.DB.deleteSupplierTx(id);
            window.showToast('تم الحذف بنجاح', 'success');
            render();
            // Also re-render suppliers if we are on suppliers page
            if (window.Suppliers && document.getElementById('page-suppliers').classList.contains('active')) {
                window.Suppliers.init();
            }
        });
    }

    // Attach global listener for editTxForm and report form
    document.addEventListener('DOMContentLoaded', () => {
        const editForm = document.getElementById('editTxForm');
        if (editForm) {
            editForm.addEventListener('submit', saveEditTx);
        }
        
        const repBtn = document.getElementById('reportModalClose');
        if (repBtn) repBtn.addEventListener('click', () => {
            const mod = document.getElementById('treasuryReportModal');
            mod.classList.add('hidden');
            mod.classList.remove('show');
        });
        
        const repForm = document.getElementById('treasuryReportForm');
        if (repForm) repForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const from = document.getElementById('repFromDate').value;
            const to = document.getElementById('repToDate').value;
            const mod = document.getElementById('treasuryReportModal');
            mod.classList.add('hidden');
            mod.classList.remove('show');
            generateAndPrintReport(from, to);
        });
    });



    return {
        init,
        editTx,
        deleteTx,
        calculateBalances,
        viewAttachment: function(id) {
            window.DB.getImage(id).then(imgData => {
                if (imgData) {
                    document.getElementById('attachedImagePreview').src = imgData;
                    document.getElementById('imageModalOverlay').classList.add('show');
                }
            });
        }
    };
})();






