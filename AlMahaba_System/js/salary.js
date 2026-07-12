/**
 * ============================================================
 *  حساب المرتبات - Salary Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  جدول شامل: حساب تلقائي من بيانات الحضور
 *  حقول يدوية: السلف، البونص، أيام السهرة، خصم الإجازات
 *  الصيغ:
 *    يومي = الراتب / 30
 *    ساعة = يومي / ساعات_العمل
 *    صافي = أساسي - غياب - تأخير - سلف - إجازات + بونص + سهرة
 * ============================================================
 */

window.Salary = (function () {
  'use strict';

  /* ───── حالة الصفحة ───── */
  let selectedMonth = '';
  let currentTotalNetSalary = 0;
  let currentTotalAdvances = 0;
  let currentTotalPayout = 0;

  /* ───── نقطة الدخول ───── */
  function init() {
    selectedMonth = window.getCurrentMonth();
    render();
  }

  /* ───── بناء الصفحة ───── */
  function render() {
    const container = document.getElementById('page-salaries');
    if (!container) return;

    container.innerHTML = `
      <div class="salary-page">
        <div class="page-header">
          <h2><i class="fas fa-calculator"></i> كشف المرتبات</h2>
          <div class="header-actions">
            <div class="month-selector">
              <label for="sal-month">الشهر:</label>
              <input type="month" id="sal-month" value="${selectedMonth}" />
            </div>
            <button class="btn btn-primary" id="save-salary-btn">
              <i class="fas fa-save"></i> حفظ البيانات اليدوية
            </button>
            <button class="btn btn-warning" id="pay-salary-btn" style="margin-right: 10px;">
              <i class="fas fa-money-check-alt"></i> تم صرف رواتب الشهر
            </button>
          </div>
        </div>

        <div class="salary-table-wrapper glass-card">
          <div class="salary-scroll">
            <table class="salary-table" id="salary-table">
              <thead></thead>
              <tbody></tbody>
              <tfoot></tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    attachEvents();
    populateTable();
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    const monthInput = document.getElementById('sal-month');
    if (monthInput) {
      monthInput.addEventListener('change', function () {
        selectedMonth = this.value;
        populateTable();
      });
    }

    const saveBtn = document.getElementById('save-salary-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveManualFields);
    }

    const payBtn = document.getElementById('pay-salary-btn');
    if (payBtn) {
      payBtn.addEventListener('click', paySalaries);
    }
  }

  /* ───── حساب وعرض الجدول ───── */
  function populateTable() {
    const table = document.getElementById('salary-table');
    if (!table) return;

    const employees = window.DB.getEmployees().filter(e => e.active !== false);
    const attendance = window.DB.getAttendance(selectedMonth) || {};
    const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
    const settings = window.DB.getSettings();

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);
    const weeklyOff = getWeeklyOffIndex(settings);
    const workHours = settings.workHours || 10;
    const overtimeRate = settings.overtimeRate || 100;

    // رأس الجدول
    table.querySelector('thead').innerHTML = `
      <tr>
        <th class="sticky-col">الاسم</th>
        <th>أيام الحضور</th>
        <th>أيام الغياب</th>
        <th>الإجازات</th>
        <th>الراتب الأساسي</th>
        <th class="deduction-col">خصم الغياب</th>
        <th>ساعات التأخير</th>
        <th class="deduction-col">خصم التأخير</th>
        <th class="deduction-col editable-header">السلف</th>
        <th class="deduction-col">بونص منصرف</th>
        <th class="addition-col editable-header">البونص</th>
        <th class="editable-header">أيام السهرة</th>
        <th class="addition-col">بدل السهرة</th>
        <th class="deduction-col editable-header">خصم الإجازات</th>
        <th class="net-col">الصافي النهائي</th>
      </tr>
    `;

    // حساب كل موظف
    let rows = '';
    const totals = {
      presentDays: 0, absentDays: 0, leaveDays: 0,
      baseSalary: 0, absenceDeduction: 0, lateHours: 0, lateDeduction: 0,
      advances: 0, paidBonus: 0, bonus: 0, overtimeDays: 0, overtimeAllowance: 0,
      leaveDeduction: 0, netSalary: 0
    };

    employees.forEach(emp => {
      const empAtt = attendance[emp.id] || {};
      const empSalary = salaryDetails[emp.id] || {};

      // حساب من بيانات الحضور
      let presentDays = 0, absentDays = 0, leaveDays = 0, lateHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        if (dow === weeklyOff) continue;

        const status = empAtt[d] || empAtt[String(d)];
        if (!status) continue;

        switch (status) {
          case 'present':
          case 'errand':
            presentDays++;
            break;
          case 'half_day':
            presentDays += 0.5;
            absentDays += 0.5;
            break;
          case 'absent':
            absentDays++;
            break;
          case 'leave':
            leaveDays++;
            break;
          case 'official_holiday':
            presentDays++; // لا تُخصم — تُعامَل كحضور
            break;
          default:
            if (status.startsWith('late_')) {
              presentDays++;
              lateHours += parseInt(status.split('_')[1]) || 0;
            }
        }
      }

      // الحسابات المالية
      const dailyRate = emp.baseSalary / 30;
      const hourlyRate = dailyRate / workHours;
      const absenceDeduction = round2(dailyRate * absentDays);
      const lateDeduction = round2(hourlyRate * lateHours);

      // الحقول اليدوية
      const advances = Number(empSalary.advances) || 0;
      const paidBonus = Number(empSalary.paidBonus) || 0;
      const bonus = Number(empSalary.bonus) || 0;
      const overtimeDays = Number(empSalary.overtimeDays) || 0;
      const overtimeAllowance = round2(overtimeDays * overtimeRate);
      const leaveDeduction = Number(empSalary.leaveDeduction) || 0;

      const netSalary = round2(
        emp.baseSalary - absenceDeduction - lateDeduction - advances - paidBonus - leaveDeduction + bonus + overtimeAllowance
      );

      // تجميع الإجماليات
      totals.presentDays += presentDays;
      totals.absentDays += absentDays;
      totals.leaveDays += leaveDays;
      totals.baseSalary += emp.baseSalary;
      totals.absenceDeduction += absenceDeduction;
      totals.lateHours += lateHours;
      totals.lateDeduction += lateDeduction;
      totals.advances += advances;
      totals.paidBonus += paidBonus;
      totals.bonus += bonus;
      totals.overtimeDays += overtimeDays;
      totals.overtimeAllowance += overtimeAllowance;
      totals.leaveDeduction += leaveDeduction;
      totals.netSalary += netSalary;

      currentTotalNetSalary = round2(totals.netSalary);
      currentTotalAdvances = round2(totals.advances + totals.paidBonus);
      currentTotalPayout = round2(totals.netSalary + totals.advances + totals.paidBonus);

      rows += `
        <tr data-emp-id="${emp.id}">
          <td class="sticky-col emp-name">${emp.name}</td>
          <td>${presentDays}</td>
          <td class="${absentDays > 0 ? 'text-danger' : ''}">${absentDays}</td>
          <td>${leaveDays}</td>
          <td>${window.formatCurrency(emp.baseSalary)}</td>
          <td class="deduction-val">${absenceDeduction > 0 ? '-' + window.formatCurrency(absenceDeduction) : '—'}</td>
          <td class="${lateHours > 0 ? 'text-warning' : ''}">${lateHours}</td>
          <td class="deduction-val">${lateDeduction > 0 ? '-' + window.formatCurrency(lateDeduction) : '—'}</td>
          <td class="deduction-val">
            <input type="number" class="salary-input manual-field" data-field="advances" 
                   value="${advances}" min="0" step="100" />
          </td>
          <td class="deduction-val">${paidBonus > 0 ? '-' + window.formatCurrency(paidBonus) : '—'}</td>
          <td class="addition-val">
            <input type="number" class="salary-input manual-field" data-field="bonus" 
                   value="${bonus}" min="0" step="50" />
          </td>
          <td>
            <input type="number" class="salary-input manual-field" data-field="overtimeDays" 
                   value="${overtimeDays}" min="0" step="1" />
          </td>
          <td class="addition-val">${overtimeAllowance > 0 ? '+' + window.formatCurrency(overtimeAllowance) : '—'}</td>
          <td class="deduction-val">
            <input type="number" class="salary-input manual-field" data-field="leaveDeduction" 
                   value="${leaveDeduction}" min="0" step="100" />
          </td>
          <td class="net-salary ${netSalary >= emp.baseSalary ? 'text-success' : 'text-danger'}">
            <strong>${window.formatCurrency(netSalary)}</strong>
          </td>
        </tr>
      `;
    });

    table.querySelector('tbody').innerHTML = rows;

    // صف الإجماليات
    table.querySelector('tfoot').innerHTML = `
      <tr class="totals-row">
        <td class="sticky-col"><strong>الإجمالي</strong></td>
        <td><strong>${totals.presentDays}</strong></td>
        <td class="text-danger"><strong>${totals.absentDays}</strong></td>
        <td><strong>${totals.leaveDays}</strong></td>
        <td><strong>${window.formatCurrency(totals.baseSalary)}</strong></td>
        <td class="deduction-val"><strong>${totals.absenceDeduction > 0 ? '-' + window.formatCurrency(totals.absenceDeduction) : '—'}</strong></td>
        <td><strong>${totals.lateHours}</strong></td>
        <td class="deduction-val"><strong>-${window.formatCurrency(totals.lateDeduction)}</strong></td>
        <td class="deduction-val"><strong>-${window.formatCurrency(totals.advances)}</strong></td>
        <td class="deduction-val"><strong>-${window.formatCurrency(totals.paidBonus)}</strong></td>
        <td class="addition-val"><strong>+${window.formatCurrency(totals.bonus)}</strong></td>
        <td><strong>${totals.overtimeDays}</strong></td>
        <td class="addition-val"><strong>${totals.overtimeAllowance > 0 ? '+' + window.formatCurrency(totals.overtimeAllowance) : '—'}</strong></td>
        <td class="deduction-val"><strong>${window.formatCurrency(totals.leaveDeduction)}</strong></td>
        <td class="net-salary"><strong>${window.formatCurrency(round2(totals.netSalary))}</strong></td>
      </tr>
    `;
  }

  /* ───── حفظ الحقول اليدوية ───── */
  function saveManualFields() {
    const table = document.getElementById('salary-table');
    if (!table) return;

    const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
    const rows = table.querySelectorAll('tbody tr[data-emp-id]');

    rows.forEach(row => {
      const empId = row.dataset.empId;
      if (!salaryDetails[empId]) salaryDetails[empId] = {};

      const inputs = row.querySelectorAll('.manual-field');
      inputs.forEach(input => {
        const field = input.dataset.field;
        salaryDetails[empId][field] = Number(input.value) || 0;
      });
    });

    window.DB.saveSalaryDetails(selectedMonth, salaryDetails);
    window.showToast('تم حفظ بيانات المرتبات بنجاح', 'success');

    // إعادة حساب الجدول لتحديث الحقول المحسوبة
    populateTable();
  }

  /* ───── صرف المرتبات ───── */
  function paySalaries() {
    if (currentTotalPayout <= 0) {
        window.showToast('لا توجد مرتبات لصرفها', 'error');
        return;
    }
    
    const msg = `هل أنت متأكد من صرف الرواتب؟
سيتم خصم المبلغ التالي من الخزنة (كاش):
- صافي المرتبات: ${window.formatCurrency(currentTotalNetSalary)}
- السلف (المنصرفة سابقاً): ${window.formatCurrency(currentTotalAdvances)}
- الإجمالي المخصوم: ${window.formatCurrency(currentTotalPayout)}`;

    window.showConfirm('تأكيد الصرف والتسوية', msg, function() {
        if (window.DB.addTreasuryTx) {
            window.DB.addTreasuryTx({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                amount: currentTotalPayout,
                notes: 'صرف وتسوية رواتب وسلف الموظفين لشهر: ' + selectedMonth,
                paymentMethod: 'cash'
            });
            window.showToast('تم تسوية الرواتب والسلف وخصمها من الخزنة بنجاح', 'success');
        }
    });
  }

  /* ───── مساعدات ───── */
  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function getWeeklyOffIndex(settings) {
    const dayMap = {
      'الأحد': 0, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3,
      'الخميس': 4, 'الجمعة': 5, 'السبت': 6
    };
    return dayMap[settings.weeklyOff] ?? 0;
  }

  /* ───── الواجهة العامة ───── */
  return { init };
})();

