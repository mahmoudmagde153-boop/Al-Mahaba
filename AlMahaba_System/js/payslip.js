/**
 * ============================================================
 *  كشف المرتب - Payslip Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  اختيار موظف + شهر → كشف مرتب رسمي قابل للطباعة
 *  يتضمن: بيانات الراتب، ملخص الحضور، خطوط التوقيع
 * ============================================================
 */

window.Payslip = (function () {
  'use strict';

  /* ───── حالة الصفحة ───── */
  let selectedEmpId = '';
  let selectedMonth = '';

  /* ───── نقطة الدخول ───── */
  function init() {
    selectedMonth = window.getCurrentMonth();
    render();
  }

  /* ───── بناء الصفحة ───── */
  function render() {
    const container = document.getElementById('page-payslip');
    if (!container) return;

    const employees = window.DB.getEmployees().filter(e => e.active !== false);

    container.innerHTML = `
      <div class="payslip-page">
        <div class="page-header">
          <h2><i class="fas fa-file-invoice-dollar"></i> كشف المرتب</h2>
        </div>

        <!-- اختيارات التوليد -->
        <div class="payslip-controls glass-card">
          <div class="control-group">
            <label for="ps-employee">الموظف:</label>
            <select id="ps-employee">
              <option value="">— اختر الموظف —</option>
              ${employees.map(e => `<option value="${e.id}" ${e.id === selectedEmpId ? 'selected' : ''}>${e.name}</option>`).join('')}
            </select>
          </div>
          <div class="control-group">
            <label for="ps-month">الشهر:</label>
            <input type="month" id="ps-month" value="${selectedMonth}" />
          </div>
          <button class="btn btn-primary" id="generate-payslip">
            <i class="fas fa-magic"></i> توليد الكشف
          </button>
          <button class="btn btn-secondary" id="print-payslip" style="display:none;">
            <i class="fas fa-print"></i> طباعة
          </button>
        </div>

        <!-- كشف المرتب -->
        <div id="payslip-output"></div>
      </div>
    `;

    attachEvents();
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    document.getElementById('ps-employee')?.addEventListener('change', function () {
      selectedEmpId = this.value;
    });
    document.getElementById('ps-month')?.addEventListener('change', function () {
      selectedMonth = this.value;
    });
    document.getElementById('generate-payslip')?.addEventListener('click', generatePayslip);
    document.getElementById('print-payslip')?.addEventListener('click', printPayslip);
  }

  /* ───── توليد كشف المرتب ───── */
  function generatePayslip() {
    if (!selectedEmpId) {
      window.showToast('يرجى اختيار الموظف أولاً', 'error');
      return;
    }

    const employees = window.DB.getEmployees();
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) {
      window.showToast('الموظف غير موجود', 'error');
      return;
    }

    const attendance = window.DB.getAttendance(selectedMonth) || {};
    const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
    const settings = window.DB.getSettings();
    const empAtt = attendance[emp.id] || {};
    const empSalary = salaryDetails[emp.id] || {};

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);
    const weeklyOff = getWeeklyOffIndex(settings);
    const workHours = settings.workHours || 10;
    const overtimeRate = settings.overtimeRate || 100;
    const monthName = window.getArabicMonth(month);

    // حساب الحضور
    let presentDays = 0, absentDays = 0, leaveDays = 0, lateHours = 0, officialHolidays = 0;

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
          presentDays++;
          officialHolidays++;
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
    const advances = Number(empSalary.advances) || 0;
    const paidBonus = Number(empSalary.paidBonus) || 0;
    const bonus = Number(empSalary.bonus) || 0;
    const overtimeDays = Number(empSalary.overtimeDays) || 0;
    const overtimeAllowance = round2(overtimeDays * overtimeRate);
    const leaveDeduction = Number(empSalary.leaveDeduction) || 0;

    const netSalary = round2(
      emp.baseSalary - absenceDeduction - lateDeduction - advances - paidBonus - leaveDeduction + bonus + overtimeAllowance
    );

    // بناء الكشف
    const output = document.getElementById('payslip-output');
    if (!output) return;

    output.innerHTML = `
      <div class="payslip-card" id="payslip-card">
        <!-- رأس الشركة -->
        <div class="payslip-header">
          <div class="company-logo">
            <i class="fas fa-car-alt"></i>
          </div>
          <div class="company-info">
            <h2>شركة المحبة لقطع الغيار</h2>
            <p>Al-Mahaba Auto Parts Company</p>
          </div>
        </div>

        <div class="payslip-title">
          <h3>كشف مرتب شهر ${monthName} ${year}</h3>
        </div>

        <!-- بيانات الموظف -->
        <div class="payslip-emp-info">
          <div class="info-row">
            <span class="info-label">اسم الموظف:</span>
            <span class="info-value">${emp.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الراتب الأساسي:</span>
            <span class="info-value">${window.formatCurrency(emp.baseSalary)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">تاريخ الالتحاق:</span>
            <span class="info-value">${emp.joinDate || '—'}</span>
          </div>
        </div>

        <!-- جدول البيان -->
        <table class="payslip-table">
          <thead>
            <tr>
              <th>البيان</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الراتب الأساسي</td>
              <td>${window.formatCurrency(emp.baseSalary)}</td>
            </tr>
            <tr class="addition-row">
              <td><i class="fas fa-plus-circle"></i> بدل السهرة (${overtimeDays} يوم × ${overtimeRate} ج.م)</td>
              <td class="text-success">+${window.formatCurrency(overtimeAllowance)}</td>
            </tr>
            ${bonus > 0 ? `
            <tr>
              <td>البونص (+)</td>
              <td class="text-success">${window.formatCurrency(bonus)}</td>
            </tr>` : ''}
            
            ${paidBonus > 0 ? `
            <tr>
              <td>بونص منصرف مسبقاً (-)</td>
              <td class="text-danger">-${window.formatCurrency(paidBonus)}</td>
            </tr>` : ''}
            
            <tr class="deduction-row">
              <td><i class="fas fa-minus-circle"></i> خصم الغياب (${absentDays} يوم)</td>
              <td class="text-danger">-${window.formatCurrency(absenceDeduction)}</td>
            </tr>
            <tr class="deduction-row">
              <td><i class="fas fa-minus-circle"></i> خصم التأخير (${lateHours} ساعة)</td>
              <td class="text-danger">-${window.formatCurrency(lateDeduction)}</td>
            </tr>
            <tr class="deduction-row">
              <td><i class="fas fa-minus-circle"></i> السلف</td>
              <td class="text-danger">-${window.formatCurrency(advances)}</td>
            </tr>
            <tr class="deduction-row">
              <td><i class="fas fa-minus-circle"></i> خصم الإجازات</td>
              <td class="text-danger">-${window.formatCurrency(leaveDeduction)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="net-row">
              <td><strong>الصافي النهائي</strong></td>
              <td class="net-amount"><strong>${window.formatCurrency(netSalary)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <!-- ملخص الحضور -->
        <div class="payslip-attendance-summary">
          <h4>ملخص الحضور</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-icon">✅</span>
              <span class="summary-label">أيام الحضور</span>
              <span class="summary-value">${presentDays}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">❌</span>
              <span class="summary-label">أيام الغياب</span>
              <span class="summary-value">${absentDays}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">🏖️</span>
              <span class="summary-label">الإجازات</span>
              <span class="summary-value">${leaveDays}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">🎉</span>
              <span class="summary-label">إجازات رسمية</span>
              <span class="summary-value">${officialHolidays}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">⏰</span>
              <span class="summary-label">ساعات التأخير</span>
              <span class="summary-value">${lateHours}</span>
            </div>
          </div>
        </div>

        <!-- خطوط التوقيع -->
        <div class="payslip-signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <span>توقيع الموظف</span>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <span>توقيع الإدارة</span>
          </div>
        </div>

        <!-- تذييل -->
        <div class="payslip-footer">
          <p>تم إصدار هذا الكشف بواسطة نظام شركة المحبة لإدارة المرتبات</p>
          <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>
    `;

    // إظهار زر الطباعة
    const printBtn = document.getElementById('print-payslip');
    if (printBtn) printBtn.style.display = 'inline-flex';

    window.showToast('تم توليد كشف المرتب بنجاح', 'success');
  }

  /* ───── طباعة الكشف ───── */
  function printPayslip() {
    const card = document.getElementById('payslip-card');
    if (!card) {
      window.showToast('يرجى توليد الكشف أولاً', 'error');
      return;
    }

    // إضافة class للطباعة
    document.body.classList.add('printing-payslip');

    window.print();

    // إزالة class بعد الطباعة
    setTimeout(() => {
      document.body.classList.remove('printing-payslip');
    }, 1000);
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

