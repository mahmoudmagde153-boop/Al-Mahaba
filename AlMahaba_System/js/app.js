/* ╔══════════════════════════════════════════════════════════════════════════════╗
   ║  شركة المحبة لقطع الغيار - وحدة التحكم الرئيسية                           ║
   ║  Main Application Controller                                               ║
   ╚══════════════════════════════════════════════════════════════════════════════╝ */

/* ═══════════════════════════════════════════════════════════════════════════════
   1. المتغيرات العامة والثوابت
   ═══════════════════════════════════════════════════════════════════════════════ */

/** أسماء الأشهر بالعربية */
const ARABIC_MONTHS = [
    '', // الفهرس 0 فارغ
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/** أسماء أيام الأسبوع بالعربية */
const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** عناوين الصفحات */
const PAGE_TITLES = {
    dashboard: 'لوحة التحكم',
    treasury: 'الخزنة واليومية',
    suppliers: 'الموردين',
    attendance: 'الحضور والغياب',
    salaries: 'المرتبات',
    employees: 'الموظفين',
    payslip: 'قسيمة الراتب',
    archive: 'الأرشيف',
    users: 'إدارة المستخدمين',
    settings: 'الإعدادات'
};

/** رموز أنواع الحضور */
const ATTENDANCE_ICONS = {
    present: '✅',
    absent: '❌',
    leave: '🏖️',
    official_holiday: '🎉',
    errand: '📋',
    half_day: '🕐',
    late_1: '⏰1',
    late_2: '⏰2',
    late_3: '⏰3',
    late_4: '⏰4',
    late_5: '⏰5'
};

/** أسماء أنواع الحضور */
const ATTENDANCE_NAMES = {
    present: 'حضور',
    absent: 'غياب',
    leave: 'إجازة',
    official_holiday: 'إجازة رسمية',
    errand: 'مأمورية',
    half_day: 'نصف يوم',
    late_1: 'تأخير 1 ساعة',
    late_2: 'تأخير 2 ساعة',
    late_3: 'تأخير 3 ساعات',
    late_4: 'تأخير 4 ساعات',
    late_5: 'تأخير 5 ساعات'
};

/** الصفحة الحالية */
let currentPage = 'dashboard';

/** الشهر المحدد حالياً (للحضور والمرتبات) */
let selectedMonth = '';

/** متغير للحضور المودال */
let attendanceModalData = { month: '', employeeId: null, day: null };


/* ═══════════════════════════════════════════════════════════════════════════════
   2. وظائف مساعدة (Utilities)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * تنسيق العملة بالجنيه المصري
 * @param {number} num - المبلغ
 * @returns {string} المبلغ المنسق
 */
function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '0 ج.م';
    return num.toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + ' ج.م';
}

/**
 * تنسيق رقم عادي
 * @param {number} num - الرقم
 * @returns {string} الرقم المنسق
 */
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * تنسيق التاريخ بالعربية
 * @param {Date|string} date - التاريخ
 * @returns {string} التاريخ المنسق
 */
function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    if (!(date instanceof Date) || isNaN(date)) return '';
    
    const day = date.getDate();
    const month = ARABIC_MONTHS[date.getMonth() + 1];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

/**
 * الحصول على اسم الشهر بالعربية
 * @param {number} monthNum - رقم الشهر (1-12)
 * @returns {string} اسم الشهر
 */
function getArabicMonth(monthNum) {
    return ARABIC_MONTHS[monthNum] || '';
}

/**
 * الحصول على عدد أيام شهر معين
 * @param {number} year - السنة
 * @param {number} month - الشهر (1-12)
 * @returns {number} عدد الأيام
 */
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * الحصول على الشهر الحالي بصيغة 'YYYY-MM'
 * @returns {string} الشهر الحالي
 */
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * تحويل صيغة الشهر إلى نص عربي
 * @param {string} monthStr - الشهر بصيغة 'YYYY-MM'
 * @returns {string} الشهر بالعربية
 */
function monthToArabic(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${ARABIC_MONTHS[parseInt(month)]} ${year}`;
}

/**
 * الحصول على فئة CSS لنوع الحضور
 * @param {string} type - نوع الحضور
 * @returns {string} اسم الفئة
 */
function getAttendanceClass(type) {
    if (!type) return '';
    if (type.startsWith('late_')) return 'late';
    return type;
}


/* ═══════════════════════════════════════════════════════════════════════════════
   3. إشعارات التنبيه (Toast Notifications)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * عرض إشعار منبثق
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الإشعار: 'success', 'error', 'warning', 'info'
 * @param {number} duration - مدة الظهور بالمللي ثانية
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300)">✕</button>
    `;

    container.appendChild(toast);

    // إزالة تلقائية بعد المدة المحددة
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}


/* ═══════════════════════════════════════════════════════════════════════════════
   4. مودال التأكيد (Confirm Modal)
   ═══════════════════════════════════════════════════════════════════════════════ */

/** مرجع لدالة التأكيد الحالية */
let _modalConfirmCallback = null;

/**
 * عرض مودال تأكيد
 * @param {string} title - عنوان المودال
 * @param {string} message - نص الرسالة
 * @param {Function} onConfirm - دالة يتم تنفيذها عند التأكيد
 */
function showConfirm(title, message, onConfirm) {
    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.textContent = title;
    modalBody.innerHTML = `<div style="color: var(--text-secondary); line-height: 1.8;">${message}</div>`;

    _modalConfirmCallback = onConfirm;
    overlay.classList.add('show');
}

/**
 * إغلاق المودال
 */
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    _modalConfirmCallback = null;
}

// أحداث المودال
document.getElementById('modalConfirm').addEventListener('click', () => {
    if (_modalConfirmCallback) {
        _modalConfirmCallback();
    }
    closeModal();
});

document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

// إغلاق عند النقر خارج المودال
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});


/* ═══════════════════════════════════════════════════════════════════════════════
   5. نظام التوجيه (Router)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * التنقل إلى صفحة معينة
 * @param {string} page - اسم الصفحة
 */
function navigateTo(page) {
    if (!PAGE_TITLES[page]) return;

    // فحص الصلاحيات قبل التوجيه (RBAC Check)
    if (!window.DB.hasPermission('*') && !window.DB.hasPermission(page)) {
        window.showToast('عفواً، لا تمتلك الصلاحية لدخول هذه الصفحة', 'error');
        return;
    }

    // إخفاء جميع الصفحات
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    // إظهار الصفحة المطلوبة
    const targetSection = document.getElementById(`page-${page}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // تحديث عنصر التنقل النشط
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // تحديث عنوان الصفحة
    document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
    currentPage = page;

    // تحميل بيانات الصفحة
    loadPageData(page);

    // التمرير لأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * تحميل بيانات الصفحة عند التنقل إليها
 * @param {string} page - اسم الصفحة
 */
function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'treasury':
            if (window.Treasury) window.Treasury.init();
            break;
        case 'suppliers':
            if (window.Suppliers) window.Suppliers.init();
            break;
        case 'attendance':
            if (window.Attendance) window.Attendance.init(); else renderAttendance();
            break;
        case 'salaries':
            renderSalaries();
            break;
        case 'employees':
            renderEmployees();
            break;
        case 'payslip':
            renderPayslipSelectors();
            break;
        case 'archive':
            renderArchive();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'users':
            if (window.Users) window.Users.render();
            break;
    }
}

// أحداث التنقل
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});


/* ═══════════════════════════════════════════════════════════════════════════════
   6. إدارة المظهر (Theme Management)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * تبديل المظهر بين الداكن والفاتح
 */
function toggleTheme() {
    const settings = db.getSettings();
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
    db.saveSettings({ theme: newTheme });
    
    // تحديث القائمة المنسدلة في الإعدادات إذا كانت مفتوحة
    const themeSelect = document.getElementById('settingTheme');
    if (themeSelect) themeSelect.value = newTheme;
}

/**
 * تطبيق مظهر معين
 * @param {string} theme - 'dark' أو 'light'
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // تحديث أيقونة ونص زر المظهر
    const themeIcon = document.getElementById('themeIcon');
    const themeToggle = document.getElementById('themeToggle');
    
    if (theme === 'dark') {
        themeIcon.textContent = '🌙';
        themeToggle.querySelector('.nav-text').textContent = 'الوضع الداكن';
    } else {
        themeIcon.textContent = '☀️';
        themeToggle.querySelector('.nav-text').textContent = 'الوضع الفاتح';
    }
}

// حدث زر تبديل المظهر
document.getElementById('themeToggle').addEventListener('click', toggleTheme);


/* ═══════════════════════════════════════════════════════════════════════════════
   7. ملء قوائم الأشهر (Month Selectors)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ملء قائمة منسدلة بالأشهر المتاحة
 * @param {HTMLSelectElement} select - عنصر القائمة
 * @param {string} [defaultValue] - القيمة الافتراضية
 */
function populateMonthSelect(select, defaultValue) {
    if (!select) return;

    const months = db.getAvailableMonths();
    const currentMonth = getCurrentMonth();

    // إضافة أشهر إضافية (3 أشهر للأمام و 6 للخلف)
    const allMonths = new Set(months);
    const now = new Date();
    for (let i = -6; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        allMonths.add(m);
    }

    const sortedMonths = Array.from(allMonths).sort((a, b) => b.localeCompare(a));

    select.innerHTML = '';
    sortedMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = monthToArabic(month);
        if (month === (defaultValue || currentMonth)) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}


/* ═══════════════════════════════════════════════════════════════════════════════
   8. لوحة التحكم (Dashboard)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderDashboard() {
    const month = document.getElementById('dashboardMonthSelect')?.value || getCurrentMonth();
    const employees = db.getEmployees();
    const settings = db.getSettings();

    // ملء قائمة الأشهر
    populateMonthSelect(document.getElementById('dashboardMonthSelect'), month);

    // ── الحسابات المالية (الشهرية) ──
    let totalSalaries = 0;
    employees.forEach(emp => {
        const salary = db.calculateSalary(emp.id, month);
        if (salary && salary.netSalary > 0) {
            totalSalaries += salary.netSalary;
        }
    });

    let totalSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;
    let totalExpenses = 0;

    const trTxs = db.getTreasuryTxs ? db.getTreasuryTxs() : (JSON.parse(localStorage.getItem('almahaba_treasury')) || []);
    const supTxs = db.getSupplierTxs ? db.getSupplierTxs() : (JSON.parse(localStorage.getItem('almahaba_suppliers_txs')) || []);

    // فلترة حركات الخزنة للشهر المحدد
    trTxs.forEach(tx => {
      if (tx.date && tx.date.startsWith(month)) {
        if (tx.type === 'sales') totalSales += parseFloat(tx.amount || 0);
        else if (tx.type === 'sales_return') totalReturns += parseFloat(tx.amount || 0);
        else if (tx.type === 'expense') totalExpenses += parseFloat(tx.amount || 0);
      }
    });

    // فلترة حركات الموردين للشهر المحدد
    supTxs.forEach(tx => {
      if (tx.historical) return; // تجاهل الرصيد الافتتاحي
      if (tx.date && tx.date.startsWith(month)) {
        if (tx.type === 'purchase') totalPurchases += parseFloat(tx.amount || 0);
        else if (tx.type === 'sales_to_supplier') totalSales += parseFloat(tx.amount || 0);
        else if (tx.type === 'return') totalReturns += parseFloat(tx.amount || 0);
      }
    });

    const totalOutflow = totalPurchases + totalExpenses + totalSalaries + totalReturns;
    const netProfit = totalSales - totalOutflow;

    // ── الحسابات الفعلية (الرصيد الكلي والديون) ──
    let globalCash = 0;
    trTxs.forEach(tx => {
      if (tx.type === 'sales' || tx.type === 'cash_in') {
        globalCash += parseFloat(tx.amount || 0);
      } else if (tx.type === 'sales_return' || tx.type === 'expense' || tx.type === 'cash_out') {
        globalCash -= parseFloat(tx.amount || 0);
      }
    });

    supTxs.forEach(tx => {
      if (!tx.historical && tx.type === 'payment') {
        globalCash -= parseFloat(tx.amount || 0);
      }
    });

    let globalDebts = 0;
    const suppliers = db.getSuppliers ? db.getSuppliers() : (JSON.parse(localStorage.getItem('almahaba_suppliers')) || []);
    suppliers.forEach(s => {
      let balance = parseFloat(s.initialBalance || 0);
      supTxs.filter(tx => tx.supplierId == s.id && !tx.historical).forEach(tx => {
          if (tx.type === 'purchase') balance += parseFloat(tx.amount || 0);
          else balance -= parseFloat(tx.amount || 0); // الدفعات والمرتجعات والمبيعات للمورد
      });
      if (balance > 0) {
        globalDebts += balance;
      }
    });

    const globalNet = globalCash - globalDebts;

    const gCashEl = document.getElementById('global-cash');
    const gDebtsEl = document.getElementById('global-debts');
    const gNetEl = document.getElementById('global-net');

    if (gCashEl) gCashEl.textContent = formatCurrency(globalCash);
    if (gDebtsEl) gDebtsEl.textContent = formatCurrency(globalDebts);
    if (gNetEl) {
      gNetEl.textContent = formatCurrency(globalNet);
      gNetEl.style.color = globalNet >= 0 ? 'var(--info)' : 'var(--danger)';
    }

    const statsHTML = `
        ${statCard('إجمالي المبيعات', formatCurrency(totalSales), 'fas fa-arrow-up', '#10b981')}
        ${statCard('المشتريات', formatCurrency(totalPurchases), 'fas fa-shopping-cart', '#ef4444')}
        ${statCard('المصروفات', formatCurrency(totalExpenses), 'fas fa-wallet', '#fd7e14')}
        ${statCard('المرتبات المستحقة', formatCurrency(totalSalaries), 'fas fa-users', '#3b82f6')}
        ${statCard('المرتجعات', formatCurrency(totalReturns), 'fas fa-exchange-alt', '#f59e0b')}
    `;

    document.getElementById('dashboardStats').innerHTML = statsHTML;

    // تحديث الصافي
    const netEl = document.getElementById('dash-net-profit');
    if (netEl) {
      netEl.textContent = formatCurrency(netProfit);
      netEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // تحديث المؤشر البصري (البار)
    const barIncome = document.getElementById('bar-income');
    const barOutflow = document.getElementById('bar-outflow');
    if (barIncome && barOutflow) {
      const totalVolume = totalSales + totalOutflow;
      let incomePercent = 50;
      let outflowPercent = 50;

      if (totalVolume > 0) {
        incomePercent = (totalSales / totalVolume) * 100;
        outflowPercent = (totalOutflow / totalVolume) * 100;
      } else {
        incomePercent = 0;
        outflowPercent = 0;
      }

      barIncome.style.width = incomePercent + '%';
      barOutflow.style.width = outflowPercent + '%';
    }
}

function statCard(label, value, icon, colorHex) {
    return `
      <div class="stat-card glass-card" style="padding: 25px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-bottom: 4px solid ${colorHex}; transition: transform 0.3s ease; cursor: default; background: var(--card-bg);" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="margin-bottom: 15px; font-size: 2.2rem; color: ${colorHex};"><i class="${icon}"></i></div>
        <div class="stat-body">
          <span class="stat-value" style="display: block; font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; color: var(--text-color);">${value}</span>
          <span class="stat-label" style="color: var(--text-muted); font-size: 1rem; font-weight: 600;">${label}</span>
        </div>
      </div>
    `;
}


// حدث تغيير شهر لوحة التحكم
document.getElementById('dashboardMonthSelect')?.addEventListener('change', () => {
    renderDashboard();
});


/* ═══════════════════════════════════════════════════════════════════════════════
   9. صفحة الحضور (Attendance Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderAttendance() {
    const select = document.getElementById('attendanceMonthSelect');
    populateMonthSelect(select, select?.value || getCurrentMonth());
    
    const month = select?.value || getCurrentMonth();
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, monthNum);
    const employees = db.getEmployees();
    const attendance = db.getAttendance(month);

    // ── رأس الجدول ──
    let headerHTML = '<th>الموظف</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(year, monthNum - 1, d);
        const dayName = ARABIC_DAYS[dayDate.getDay()];
        const isFriday = dayDate.getDay() === 5;
        headerHTML += `<th style="${isFriday ? 'color: var(--danger);' : ''}">${d}<br><span style="font-size: 0.6rem; font-weight: 400;">${dayName.slice(0, 3)}</span></th>`;
    }
    document.getElementById('attendanceHeader').innerHTML = headerHTML;

    // ── جسم الجدول ──
    let bodyHTML = '';
    employees.forEach(emp => {
        const empAtt = attendance[emp.id] || {};
        bodyHTML += '<tr>';
        bodyHTML += `<td class="emp-name">${emp.name}</td>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
            const type = empAtt[d] || '';
            const icon = ATTENDANCE_ICONS[type] || '';
            const cssClass = getAttendanceClass(type);
            
            bodyHTML += `<td>
                <button class="att-cell ${cssClass}" 
                        data-emp="${emp.id}" 
                        data-day="${d}" 
                        data-month="${month}"
                        title="${ATTENDANCE_NAMES[type] || 'اضغط للتسجيل'}">
                    ${icon}
                </button>
            </td>`;
        }
        
        bodyHTML += '</tr>';
    });
    document.getElementById('attendanceBody').innerHTML = bodyHTML;

    // ── ملخص الحضور ──
    let summaryHTML = '';
    employees.forEach(emp => {
        const summary = db.getAttendanceSummary(emp.id, month);
        summaryHTML += `
            <tr>
                <td class="emp-name">${emp.name}</td>
                <td class="text-success fw-bold">${summary.present}</td>
                <td class="text-danger fw-bold">${summary.absent}</td>
                <td class="text-warning fw-bold">${summary.leave}</td>
                <td>${summary.halfDay}</td>
                <td class="text-danger">${summary.lateHours}</td>
                <td>${summary.errand}</td>
                <td>${summary.officialHoliday}</td>
            </tr>
        `;
    });
    document.getElementById('attendanceSummaryBody').innerHTML = summaryHTML;
}

// حدث تغيير شهر الحضور
// ── مودال نوع الحضور ──

/**
 * فتح مودال اختيار نوع الحضور
 */
function openAttendanceModal(month, employeeId, day) {
    const emp = db.getEmployeeById(employeeId);
    if (!emp) return;

    attendanceModalData = { month, employeeId, day };
    
    document.getElementById('attendanceModalTitle').textContent = 
        `تسجيل حضور ${emp.name} — يوم ${day} ${monthToArabic(month)}`;
    
    document.getElementById('attendanceModalOverlay').classList.add('show');
}

/**
 * إغلاق مودال الحضور
 */
function closeAttendanceModal() {
    document.getElementById('attendanceModalOverlay').classList.remove('show');
    attendanceModalData = { month: '', employeeId: null, day: null };
}

// أحداث مودال الحضور
// أحداث أزرار نوع الحضور
document.getElementById('attendanceTypeGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.att-type-btn');
    if (!btn) return;

    const type = btn.dataset.type;
    const { month, employeeId, day } = attendanceModalData;

    if (month && employeeId && day) {
        db.updateAttendanceCell(month, employeeId, parseInt(day), type);
        showToast(
            type ? `تم تسجيل ${ATTENDANCE_NAMES[type] || type} بنجاح` : 'تم مسح التسجيل',
            'success'
        );
        if (window.Attendance) window.Attendance.init(); else renderAttendance();
    }

    closeAttendanceModal();
});

// حدث النقر على خلايا الحضور (تفويض الأحداث)
/* ═══════════════════════════════════════════════════════════════════════════════
   10. صفحة المرتبات (Salaries Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderSalaries() {
    const select = document.getElementById('salaryMonthSelect');
    populateMonthSelect(select, select?.value || getCurrentMonth());
    
    const month = select?.value || getCurrentMonth();
    const employees = db.getEmployees();
    const settings = db.getSettings();

    let bodyHTML = '';
    let totalNet = 0;
    let totalBase = 0;
    let totalAbsDed = 0;
    let totalLateDed = 0;
    let totalAdvances = 0;
    let totalBonus = 0;
    let totalOvertime = 0;
    let totalLeaveDed = 0;

    employees.forEach(emp => {
        const salary = db.calculateSalary(emp.id, month);
        if (!salary) return;

        const salaryDetails = db.getSalaryDetails(month);
        const empDetails = salaryDetails[emp.id] || {};

        totalNet += salary.netSalary;
        totalBase += salary.baseSalary;
        totalAbsDed += salary.absenceDeduction;
        totalLateDed += salary.lateDeduction;
        totalAdvances += salary.advances;
        totalBonus += salary.bonus;
        totalOvertime += salary.overtimeAllowance;
        totalLeaveDed += salary.leaveDeduction;

        bodyHTML += `
            <tr>
                <td class="emp-name">${salary.employeeName}</td>
                <td class="currency">${formatCurrency(salary.baseSalary)}</td>
                <td class="currency" style="font-size: 0.75rem;">${formatCurrency(salary.dailyRate)}</td>
                <td class="text-center">${salary.absentDays}</td>
                <td class="currency negative">${salary.absenceDeduction > 0 ? '-' + formatCurrency(salary.absenceDeduction) : '-'}</td>
                <td class="text-center">${salary.lateHours}</td>
                <td class="currency negative">${salary.lateDeduction > 0 ? '-' + formatCurrency(salary.lateDeduction) : '-'}</td>
                <td class="text-center">${salary.leaveDays}</td>
                <td class="currency negative">${salary.leaveDeduction > 0 ? '-' + formatCurrency(salary.leaveDeduction) : '-'}</td>
                <td><input type="number" class="salary-input" data-emp="${emp.id}" data-field="overtimeDays" value="${empDetails.overtimeDays || 0}" min="0"></td>
                <td class="currency positive">${salary.overtimeAllowance > 0 ? '+' + formatCurrency(salary.overtimeAllowance) : '-'}</td>
                <td><input type="number" class="salary-input" data-emp="${emp.id}" data-field="advances" value="${empDetails.advances || 0}" min="0"></td>
                <td><input type="number" class="salary-input" data-emp="${emp.id}" data-field="bonus" value="${empDetails.bonus || 0}" min="0"></td>
                <td class="currency total fw-bold">${formatCurrency(salary.netSalary)}</td>
            </tr>
        `;
    });

    document.getElementById('salaryBody').innerHTML = bodyHTML;

    // ── التذييل (الإجمالي) ──
    document.getElementById('salaryFooter').innerHTML = `
        <tr>
            <td>الإجمالي</td>
            <td class="currency">${formatCurrency(totalBase)}</td>
            <td></td>
            <td></td>
            <td class="currency negative">${totalAbsDed > 0 ? '-' + formatCurrency(totalAbsDed) : '-'}</td>
            <td></td>
            <td class="currency negative">${totalLateDed > 0 ? '-' + formatCurrency(totalLateDed) : '-'}</td>
            <td></td>
            <td class="currency negative">${totalLeaveDed > 0 ? '-' + formatCurrency(totalLeaveDed) : '-'}</td>
            <td></td>
            <td class="currency positive">${totalOvertime > 0 ? '+' + formatCurrency(totalOvertime) : '-'}</td>
            <td class="currency negative">${totalAdvances > 0 ? '-' + formatCurrency(totalAdvances) : '-'}</td>
            <td class="currency positive">${totalBonus > 0 ? '+' + formatCurrency(totalBonus) : '-'}</td>
            <td class="currency total fw-bold">${formatCurrency(totalNet)}</td>
        </tr>
    `;
}

// حدث تغيير شهر المرتبات
document.getElementById('salaryMonthSelect')?.addEventListener('change', renderSalaries);

// حدث حفظ تعديلات المرتبات
document.getElementById('saveSalaryDetailsBtn')?.addEventListener('click', () => {
    const month = document.getElementById('salaryMonthSelect')?.value || getCurrentMonth();
    const salaryDetails = db.getSalaryDetails(month);
    
    // جمع القيم من الحقول
    document.querySelectorAll('.salary-input').forEach(input => {
        const empId = input.dataset.emp;
        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;
        
        if (!salaryDetails[empId]) {
            salaryDetails[empId] = { advances: 0, bonus: 0, overtimeDays: 0, notes: '' };
        }
        salaryDetails[empId][field] = value;
    });
    
    db.saveSalaryDetails(month, salaryDetails);
    showToast('تم حفظ تعديلات المرتبات بنجاح', 'success');
    renderSalaries(); // إعادة الحساب
});

// تحديث تلقائي عند تغيير القيم وتأكيدها (change بدلاً من input لتجنب فقدان التركيز)
document.getElementById('salaryBody')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('salary-input')) {
        // حفظ مؤقت وإعادة حساب
        const month = document.getElementById('salaryMonthSelect')?.value || getCurrentMonth();
        const salaryDetails = db.getSalaryDetails(month);
        
        const empId = e.target.dataset.emp;
        const field = e.target.dataset.field;
        const value = parseFloat(e.target.value) || 0;
        
        if (!salaryDetails[empId]) {
            salaryDetails[empId] = { advances: 0, bonus: 0, overtimeDays: 0, notes: '' };
        }
        salaryDetails[empId][field] = value;
        db.saveSalaryDetails(month, salaryDetails);
        
        // إعادة حساب الصف
        renderSalaries();
    }
});


/* ═══════════════════════════════════════════════════════════════════════════════
   11. صفحة الموظفين (Employees Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderEmployees() {
    const employees = db.getEmployees();
    const grid = document.getElementById('employeesGrid');

    if (employees.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted" style="padding: 60px; grid-column: 1/-1;">لا يوجد موظفين. اضغط "إضافة موظف" للبدء.</p>';
        return;
    }

    grid.innerHTML = employees.map((emp, index) => `
        <div class="employee-card" style="animation-delay: ${index * 0.05}s">
            <div class="employee-card-header">
                <div class="employee-avatar">${emp.name.charAt(0)}</div>
                <div>
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-salary">${formatCurrency(emp.baseSalary)}</div>
                </div>
            </div>
            <div class="employee-details">
                <div class="employee-detail-item">
                    <span>🏖️ رصيد الإجازات</span>
                    <span>${emp.leaveBalance || 0} يوم</span>
                </div>
                <div class="employee-detail-item">
                    <span>📅 تاريخ التعيين</span>
                    <span>${emp.joinDate ? formatDate(emp.joinDate) : 'غير محدد'}</span>
                </div>
                ${emp.phone ? `
                <div class="employee-detail-item">
                    <span>📞 الهاتف</span>
                    <span dir="ltr">${emp.phone}</span>
                </div>` : ''}
            </div>
            <div class="employee-actions">
                <button class="btn btn-primary btn-sm" onclick="editEmployee(${emp.id})">✏️ تعديل</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEmployeeConfirm(${emp.id})">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
}

/**
 * فتح نموذج إضافة موظف
 */
function showEmployeeForm(employee = null) {
    const formCard = document.getElementById('employeeFormCard');
    const formTitle = document.getElementById('employeeFormTitle');
    
    formCard.style.display = 'block';
    
    if (employee) {
        formTitle.textContent = '✏️ تعديل بيانات الموظف';
        document.getElementById('empId').value = employee.id;
        document.getElementById('empName').value = employee.name;
        document.getElementById('empSalary').value = employee.baseSalary;
        document.getElementById('empLeave').value = employee.leaveBalance || 21;
        document.getElementById('empPhone').value = employee.phone || '';
        document.getElementById('empJoinDate').value = employee.joinDate || '';
        document.getElementById('empNotes').value = employee.notes || '';
    } else {
        formTitle.textContent = '➕ إضافة موظف جديد';
        document.getElementById('employeeForm').reset();
        document.getElementById('empId').value = '';
        document.getElementById('empLeave').value = 21;
    }

    formCard.scrollIntoView({ behavior: 'smooth' });
}

/**
 * إخفاء نموذج الموظف
 */
function hideEmployeeForm() {
    document.getElementById('employeeFormCard').style.display = 'none';
    document.getElementById('employeeForm').reset();
}

/**
 * تعديل موظف
 */
function editEmployee(id) {
    const emp = db.getEmployeeById(id);
    if (emp) showEmployeeForm(emp);
}

/**
 * تأكيد حذف موظف
 */
function deleteEmployeeConfirm(id) {
    const emp = db.getEmployeeById(id);
    if (!emp) return;

    showConfirm(
        '⚠️ تأكيد الحذف',
        `هل أنت متأكد من حذف الموظف "<strong>${emp.name}</strong>"؟<br>سيتم إلغاء تفعيله في النظام.`,
        () => {
            db.deleteEmployee(id);
            showToast(`تم حذف الموظف ${emp.name}`, 'success');
            renderEmployees();
        }
    );
}

// أحداث صفحة الموظفين
document.getElementById('addEmployeeBtn')?.addEventListener('click', () => showEmployeeForm());
document.getElementById('cancelEmployeeBtn')?.addEventListener('click', hideEmployeeForm);
document.getElementById('cancelEmployeeBtn2')?.addEventListener('click', hideEmployeeForm);

// حدث حفظ نموذج الموظف
document.getElementById('employeeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('empId').value;
    const employee = {
        name: document.getElementById('empName').value.trim(),
        baseSalary: parseFloat(document.getElementById('empSalary').value) || 0,
        leaveBalance: parseInt(document.getElementById('empLeave').value) || 21,
        phone: document.getElementById('empPhone').value.trim(),
        joinDate: document.getElementById('empJoinDate').value,
        notes: document.getElementById('empNotes').value.trim()
    };

    if (!employee.name) {
        showToast('يرجى إدخال اسم الموظف', 'error');
        return;
    }

    if (id) {
        employee.id = parseInt(id);
    }

    db.saveEmployee(employee);
    showToast(`تم حفظ بيانات الموظف ${employee.name} بنجاح`, 'success');
    hideEmployeeForm();
    renderEmployees();
});


/* ═══════════════════════════════════════════════════════════════════════════════
   12. صفحة قسيمة الراتب (Payslip Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderPayslipSelectors() {
    // ملء قائمة الموظفين
    const empSelect = document.getElementById('payslipEmployee');
    const employees = db.getEmployees();
    
    empSelect.innerHTML = '<option value="">-- اختر الموظف --</option>';
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        empSelect.appendChild(option);
    });

    // ملء قائمة الأشهر
    populateMonthSelect(document.getElementById('payslipMonth'));
}

/**
 * إنشاء وعرض قسيمة الراتب
 */
function generatePayslip() {
    const empId = parseInt(document.getElementById('payslipEmployee').value);
    const month = document.getElementById('payslipMonth').value;

    if (!empId) {
        showToast('يرجى اختيار الموظف', 'warning');
        return;
    }

    const salary = db.calculateSalary(empId, month);
    if (!salary) {
        showToast('لم يتم العثور على بيانات', 'error');
        return;
    }

    const settings = db.getSettings();
    const container = document.getElementById('payslipContent');

    container.innerHTML = `
        <div class="payslip">
            <div class="payslip-header">
                <div class="payslip-company">🔧 ${settings.companyName}</div>
                <div class="payslip-title">قسيمة مرتب — ${monthToArabic(month)}</div>
            </div>

            <div class="payslip-info">
                <div class="payslip-info-item">
                    <span class="payslip-info-label">اسم الموظف:</span>
                    <span class="payslip-info-value">${salary.employeeName}</span>
                </div>
                <div class="payslip-info-item">
                    <span class="payslip-info-label">الشهر:</span>
                    <span class="payslip-info-value">${monthToArabic(month)}</span>
                </div>
                <div class="payslip-info-item">
                    <span class="payslip-info-label">الراتب الأساسي:</span>
                    <span class="payslip-info-value">${formatCurrency(salary.baseSalary)}</span>
                </div>
                <div class="payslip-info-item">
                    <span class="payslip-info-label">اليومي:</span>
                    <span class="payslip-info-value">${formatCurrency(salary.dailyRate)}</span>
                </div>
            </div>

            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">📊 ملخص الحضور</h4>
            <table class="payslip-table">
                <tr>
                    <th>البيان</th>
                    <th>العدد</th>
                </tr>
                <tr><td>أيام الحضور</td><td>${salary.presentDays}</td></tr>
                <tr><td>أيام الغياب</td><td>${salary.absentDays}</td></tr>
                <tr><td>الإجازات</td><td>${salary.leaveDays}</td></tr>
                <tr><td>نصف يوم</td><td>${salary.halfDays}</td></tr>
                <tr><td>ساعات التأخير</td><td>${salary.lateHours}</td></tr>
                <tr><td>المأموريات</td><td>${salary.errands}</td></tr>
                <tr><td>الإجازات الرسمية</td><td>${salary.officialHolidays}</td></tr>
            </table>

            <h4 style="margin: 20px 0 12px; color: var(--text-secondary);">💰 تفاصيل المرتب</h4>
            <table class="payslip-table">
                <tr>
                    <th>البيان</th>
                    <th>المبلغ</th>
                </tr>
                <tr><td>الراتب الأساسي</td><td>${formatCurrency(salary.baseSalary)}</td></tr>
                <tr style="color: var(--danger)"><td>خصم الغياب (${salary.absentDays} يوم)</td><td>- ${formatCurrency(salary.absenceDeduction)}</td></tr>
                <tr style="color: var(--danger)"><td>خصم التأخير (${salary.lateHours} ساعة)</td><td>- ${formatCurrency(salary.lateDeduction)}</td></tr>
                <tr style="color: var(--danger)"><td>خصم الإجازات (${salary.leaveDays} يوم)</td><td>- ${formatCurrency(salary.leaveDeduction)}</td></tr>
                <tr style="color: var(--danger)"><td>سلف ومقدمات</td><td>- ${formatCurrency(salary.advances)}</td></tr>
                <tr style="color: var(--success)"><td>بدل أوفرتايم (${salary.overtimeDays} يوم × ${settings.overtimeRate} ج.م)</td><td>+ ${formatCurrency(salary.overtimeAllowance)}</td></tr>
                <tr style="color: var(--success)"><td>مكافآت</td><td>+ ${formatCurrency(salary.bonus)}</td></tr>
                <tr class="payslip-total-row">
                    <td><strong>صافي المرتب</strong></td>
                    <td><strong>${formatCurrency(salary.netSalary)}</strong></td>
                </tr>
            </table>

            <div class="payslip-footer">
                <div class="payslip-signature">
                    <div class="line"></div>
                    <div class="label">توقيع الموظف</div>
                </div>
                <div class="payslip-signature">
                    <div class="line"></div>
                    <div class="label">توقيع المسؤول</div>
                </div>
            </div>
        </div>
    `;

    // إظهار زر الطباعة
    document.getElementById('printPayslip').style.display = 'inline-flex';
}

// أحداث قسيمة الراتب
document.getElementById('generatePayslip')?.addEventListener('click', generatePayslip);
document.getElementById('printPayslip')?.addEventListener('click', () => {
    window.print();
});


/* ═══════════════════════════════════════════════════════════════════════════════
   13. صفحة الأرشيف (Archive Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

function renderArchive() {
    const archive = db.getArchive();
    const container = document.getElementById('archiveList');

    if (archive.length === 0) {
        container.innerHTML = `
            <div class="archive-empty">
                <span style="font-size: 4rem; display: block; margin-bottom: 16px;">🗄️</span>
                <p>لا توجد أشهر مؤرشفة</p>
                <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 8px;">
                    اضغط "أرشفة الشهر الحالي" لحفظ بيانات الشهر
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML = archive.map(entry => `
        <div class="archive-item">
            <div class="archive-item-info">
                <span class="archive-item-icon">📁</span>
                <div>
                    <div class="archive-item-title">${monthToArabic(entry.month)}</div>
                    <div class="archive-item-date">تم الأرشفة: ${formatDate(entry.createdAt)}</div>
                </div>
            </div>
            <div class="archive-item-actions">
                <button class="btn btn-primary btn-sm" onclick="restoreArchive('${entry.month}')">📥 استعادة</button>
                <button class="btn btn-danger btn-sm" onclick="deleteArchiveConfirm('${entry.month}')">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
}

/**
 * أرشفة الشهر الحالي
 */
function archiveCurrentMonth() {
    const month = getCurrentMonth();
    showConfirm(
        '📥 أرشفة الشهر',
        `هل تريد أرشفة بيانات شهر <strong>${monthToArabic(month)}</strong>؟`,
        () => {
            db.archiveMonth(month);
            showToast(`تم أرشفة شهر ${monthToArabic(month)} بنجاح`, 'success');
            renderArchive();
        }
    );
}

/**
 * استعادة بيانات من الأرشيف
 */
function restoreArchive(month) {
    showConfirm(
        '📥 استعادة البيانات',
        `هل تريد استعادة بيانات شهر <strong>${monthToArabic(month)}</strong>؟<br>⚠️ سيتم استبدال البيانات الحالية لهذا الشهر.`,
        () => {
            db.restoreFromArchive(month);
            showToast(`تم استعادة بيانات ${monthToArabic(month)}`, 'success');
        }
    );
}

/**
 * تأكيد حذف أرشيف
 */
function deleteArchiveConfirm(month) {
    showConfirm(
        '⚠️ حذف الأرشيف',
        `هل أنت متأكد من حذف أرشيف شهر <strong>${monthToArabic(month)}</strong>؟<br>لا يمكن التراجع عن هذا الإجراء.`,
        () => {
            db.deleteArchive(month);
            showToast(`تم حذف أرشيف ${monthToArabic(month)}`, 'success');
            renderArchive();
        }
    );
}

// حدث زر الأرشفة
document.getElementById('archiveCurrentMonth')?.addEventListener('click', archiveCurrentMonth);


/* ═══════════════════════════════════════════════════════════════════════════════
   14. صفحة الإعدادات (Settings Page)
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * تحميل الإعدادات في النموذج
 */
function loadSettings() {
    const settings = db.getSettings();
    
    document.getElementById('settingTheme').value = settings.theme || 'dark';
    document.getElementById('settingOvertimeRate').value = settings.overtimeRate || 100;
    document.getElementById('settingWorkHours').value = settings.workHoursPerDay || 10;
    document.getElementById('settingWeeklyOff').value = settings.weeklyOff || 'sunday';
}

// حدث حفظ الإعدادات
document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const settings = {
        theme: document.getElementById('settingTheme').value,
        overtimeRate: parseFloat(document.getElementById('settingOvertimeRate').value) || 100,
        workHoursPerDay: parseInt(document.getElementById('settingWorkHours').value) || 10,
        weeklyOff: document.getElementById('settingWeeklyOff').value || 'sunday'
    };

    db.saveSettings(settings);
    applyTheme(settings.theme);
    showToast('تم حفظ الإعدادات بنجاح', 'success');
});

// حدث تغيير المظهر من الإعدادات
document.getElementById('settingTheme')?.addEventListener('change', (e) => {
    applyTheme(e.target.value);
    db.saveSettings({ theme: e.target.value });
});

// ── النسخ الاحتياطي ──

// تصدير البيانات
document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const data = db.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `almahaba_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات بنجاح', 'success');
});

// استيراد البيانات
document.getElementById('importDataInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            showConfirm(
                '📥 استيراد البيانات',
                `هل تريد استيراد البيانات من الملف "${file.name}"؟<br>⚠️ سيتم استبدال جميع البيانات الحالية.`,
                () => {
                    const success = db.importData(data);
                    if (success) {
                        showToast('تم استيراد البيانات بنجاح! جاري إعادة التحميل...', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showToast('فشل استيراد البيانات. تأكد من صحة الملف.', 'error');
                    }
                }
            );
        } catch (err) {
            showToast('ملف غير صالح. يرجى اختيار ملف JSON صحيح.', 'error');
        }
    };
    reader.readAsText(file);
    
    // إعادة تعيين الحقل للسماح بإعادة اختيار نفس الملف
    e.target.value = '';
});

// مسح جميع البيانات
document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    showConfirm(
        '🗑️ مسح جميع البيانات',
        '⚠️ <strong>تحذير خطير!</strong><br>سيتم حذف جميع البيانات نهائياً وإعادة تعيين النظام بالكامل.<br><br>هل أنت متأكد تماماً؟',
        () => {
            db.reset();
            showToast('تم مسح جميع البيانات وإعادة التعيين. جاري إعادة التحميل...', 'warning');
            setTimeout(() => location.reload(), 1500);
        }
    );
});


/* ═══════════════════════════════════════════════════════════════════════════════
   15. التاريخ الحالي (Current Date Display)
   ═══════════════════════════════════════════════════════════════════════════════ */

function updateCurrentDate() {
    const now = new Date();
    const dayName = ARABIC_DAYS[now.getDay()];
    const formatted = formatDate(now);
    
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = `📅 ${dayName}، ${formatted}`;
    }
}


/* ═══════════════════════════════════════════════════════════════════════════════
   16. التهيئة الرئيسية (Main Initialization)
   ═══════════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 بدء تشغيل نظام المحبة لإدارة الحضور والمرتبات...');

    // 1. تهيئة قاعدة البيانات السحابية (Supabase)
    if (window.DB && typeof window.DB.init === 'function') {
        await window.DB.init();
    }

    // 1.5 تهيئة نظام تسجيل الدخول
    if (window.Login) {
        window.Login.init();
    }

    if (window.Users) {
        window.Users.init();
    }

    // 2. تطبيق المظهر المحفوظ
    const settings = db.getSettings();
    applyTheme(settings.theme || 'dark');

    // 3. عرض التاريخ الحالي
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000); // تحديث كل دقيقة

    // 4. الشهر الافتراضي
    selectedMonth = getCurrentMonth();

    // 5. التنقل من الرابط (hash)
    const hash = window.location.hash.replace('#', '');
    if (hash && PAGE_TITLES[hash]) {
        navigateTo(hash);
    } else {
        navigateTo('dashboard');
    }

    // 6. الاستماع لتغييرات الرابط
    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '');
        if (page && PAGE_TITLES[page]) {
            navigateTo(page);
        }
    });

    // 7. زر القائمة في الموبايل
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }

    console.log('✅ تم تشغيل النظام بنجاح!');
    console.log(`📊 عدد الموظفين: ${db.getEmployees().length}`);
    console.log(`📅 الشهر الحالي: ${monthToArabic(getCurrentMonth())}`);
});

// تصدير الوظائف للوحدات الأخرى (لتجنب الأخطاء في login, treasury, suppliers)
window.App = {
    renderCurrentPage: function() {
        const hash = window.location.hash.replace('#', '');
        if (hash && PAGE_TITLES[hash]) {
            navigateTo(hash);
        } else {
            navigateTo('dashboard');
        }
    },
    showToast: typeof showToast === 'function' ? showToast : function(msg){ alert(msg); },
    formatCurrency: typeof formatCurrency === 'function' ? formatCurrency : function(v){ return v + ' ج.م'; },
    navigateTo: typeof navigateTo === 'function' ? navigateTo : function(p){ window.location.hash = p; },
    showConfirm: typeof showConfirm === 'function' ? showConfirm : function(t,m,cb){ if(confirm(m)) cb(); },
    currentMonth: typeof getCurrentMonth === 'function' ? getCurrentMonth() : new Date().toISOString().slice(0,7),
    getDaysInMonth: typeof getDaysInMonth === 'function' ? getDaysInMonth : function(y, m) { return new Date(y, m, 0).getDate(); }
};




