/**
 * ============================================================
 *  لوحة المعلومات - Dashboard Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  يعرض إحصائيات عامة: إجمالي المرتبات، عدد الموظفين،
 *  نسبة الحضور، إجمالي الخصومات، مع أشرطة حضور ونشاط حديث.
 * ============================================================
 */

window.Dashboard = (function () {
  'use strict';

  /* ───── حالة الصفحة ───── */
  let selectedMonth = '';

  /* ───── نقطة الدخول ───── */
  function init() {
    selectedMonth = window.getCurrentMonth();
    render();
  }

  /* ───── بناء الصفحة الكاملة ───── */
  function render() {
    const container = document.getElementById('page-dashboard');
    if (!container) return;

    container.innerHTML = buildHTML();
    attachEvents();
    populateData();
  }

  /* ───── هيكل HTML ───── */
  function buildHTML() {
    return `
      <div class="dashboard-page">
        <!-- عنوان الصفحة مع محدد الشهر -->
        <div class="page-header">
          <h2><i class="fas fa-chart-line"></i> لوحة المعلومات</h2>
          <div class="month-selector">
            <label for="dash-month">الشهر:</label>
            <input type="month" id="dash-month" value="${selectedMonth}" />
          </div>
        </div>

        <!-- بطاقات الإحصائيات الأربعة -->
        <div class="stats-grid" id="stats-grid">
          ${statCard('total-salaries', 'fas fa-coins', 'إجمالي المرتبات', '0 ج.م', 'accent-gold')}
          ${statCard('total-employees', 'fas fa-users', 'عدد الموظفين', '0', 'accent-blue')}
          ${statCard('attendance-rate', 'fas fa-clipboard-check', 'نسبة الحضور', '0%', 'accent-green')}
          ${statCard('total-deductions', 'fas fa-hand-holding-usd', 'إجمالي الخصومات', '0 ج.م', 'accent-red')}
        </div>

        <!-- أفضل وأسوأ حضور -->
        <div class="highlights-row" id="highlights-row">
          <div class="highlight-card best glass-card">
            <div class="highlight-icon"><i class="fas fa-trophy"></i></div>
            <div class="highlight-body">
              <span class="highlight-label">أفضل حضور</span>
              <span class="highlight-value" id="best-employee">—</span>
            </div>
          </div>
          <div class="highlight-card worst glass-card">
            <div class="highlight-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="highlight-body">
              <span class="highlight-label">أكثر غياباً</span>
              <span class="highlight-value" id="worst-employee">—</span>
            </div>
          </div>
        </div>

        <!-- أشرطة الحضور لكل موظف -->
        <div class="glass-card chart-section">
          <h3><i class="fas fa-chart-bar"></i> نسبة حضور الموظفين</h3>
          <div class="attendance-bars" id="attendance-bars"></div>
        </div>

        <!-- النشاط الأخير -->
        <div class="glass-card activity-section">
          <h3><i class="fas fa-history"></i> النشاط الأخير</h3>
          <ul class="activity-list" id="activity-list"></ul>
        </div>
      </div>
    `;
  }

  /** بطاقة إحصاء واحدة */
  function statCard(id, icon, label, value, accent) {
    return `
      <div class="stat-card glass-card ${accent}" id="${id}">
        <div class="stat-icon"><i class="${icon}"></i></div>
        <div class="stat-body">
          <span class="stat-value">${value}</span>
          <span class="stat-label">${label}</span>
        </div>
      </div>
    `;
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    const monthInput = document.getElementById('dash-month');
    if (monthInput) {
      monthInput.addEventListener('change', function () {
        selectedMonth = this.value;
        populateData();
      });
    }
  }

  /* ───── حساب وعرض البيانات ───── */
  function populateData() {
    const employees = window.DB.getEmployees().filter(e => e.active !== false);
    const attendance = window.DB.getAttendance(selectedMonth) || {};
    const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
    const settings = window.DB.getSettings();

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);

    /* ──── حساب إحصائيات كل موظف ──── */
    let totalSalaries = 0;
    let totalDeductions = 0;
    const empStats = []; // { name, presentDays, absentDays, totalDays, percentage }

    employees.forEach(emp => {
      const empAtt = attendance[emp.id] || {};
      const empSalary = salaryDetails[emp.id] || {};

      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let lateHours = 0;
      let workingDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        const dayDate = new Date(year, month - 1, d);
        const dayOfWeek = dayDate.getDay(); // 0=أحد

        // تحديد يوم الإجازة الأسبوعية
        const weeklyOff = getWeeklyOffDay(settings);
        if (dayOfWeek === weeklyOff) continue; // يوم الراحة الأسبوعية

        const status = empAtt[d] || empAtt[String(d)];
        if (!status) continue; // لم يُسجّل بعد

        workingDays++;

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
            // إجازة رسمية — لا تُحتسب غياب ولا تُخصم
            presentDays++;
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
      const hourlyRate = dailyRate / (settings.workHours || 10);
      const absenceDeduction = dailyRate * absentDays;
      const lateDeduction = hourlyRate * lateHours;
      const advances = Number(empSalary.advances) || 0;
      const leaveDeduction = Number(empSalary.leaveDeduction) || 0;
      const bonus = Number(empSalary.bonus) || 0;
      const overtimeDays = Number(empSalary.overtimeDays) || 0;
      const overtimeAllowance = overtimeDays * (settings.overtimeRate || 100);

      const netSalary = emp.baseSalary - absenceDeduction - lateDeduction - advances - leaveDeduction + bonus + overtimeAllowance;
      const deductions = absenceDeduction + lateDeduction + advances + leaveDeduction;

      totalSalaries += netSalary;
      totalDeductions += deductions;

      const percentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
      empStats.push({
        name: emp.name,
        presentDays,
        absentDays,
        workingDays,
        percentage
      });
    });

    // نسبة الحضور الإجمالية
    const totalWorking = empStats.reduce((s, e) => s + e.workingDays, 0);
    const totalPresent = empStats.reduce((s, e) => s + e.presentDays, 0);
    const overallRate = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : 0;

    /* ──── تحديث البطاقات ──── */
    updateStatCard('total-salaries', window.formatCurrency(totalSalaries));
    updateStatCard('total-employees', employees.length);
    updateStatCard('attendance-rate', overallRate + '%');
    updateStatCard('total-deductions', window.formatCurrency(totalDeductions));

    /* ──── أفضل / أسوأ حضور ──── */
    if (empStats.length > 0) {
      const sorted = [...empStats].sort((a, b) => b.percentage - a.percentage);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      setText('best-employee', `${best.name} (${best.percentage}%)`);
      setText('worst-employee', `${worst.name} (${worst.percentage}%)`);
    }

    /* ──── أشرطة الحضور ──── */
    renderAttendanceBars(empStats);

    /* ──── النشاط الأخير ──── */
    renderRecentActivity(employees, attendance);
  }

  /** تحديث قيمة بطاقة إحصاء */
  function updateStatCard(id, value) {
    const card = document.getElementById(id);
    if (!card) return;
    const valEl = card.querySelector('.stat-value');
    if (valEl) valEl.textContent = value;
  }

  /** تعيين نص عنصر */
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /** تحديد رقم يوم الإجازة الأسبوعية (0=أحد .. 6=سبت) */
  function getWeeklyOffDay(settings) {
    const dayMap = {
      'الأحد': 0, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3,
      'الخميس': 4, 'الجمعة': 5, 'السبت': 6
    };
    return dayMap[settings.weeklyOff] ?? 0; // الافتراضي: الأحد
  }

  /* ───── رسم أشرطة الحضور ───── */
  function renderAttendanceBars(empStats) {
    const container = document.getElementById('attendance-bars');
    if (!container) return;

    if (empStats.length === 0) {
      container.innerHTML = '<p class="empty-state">لا توجد بيانات حضور لهذا الشهر</p>';
      return;
    }

    container.innerHTML = empStats.map(emp => {
      const color = emp.percentage >= 90 ? 'var(--success)'
        : emp.percentage >= 70 ? 'var(--warning)'
          : 'var(--danger)';
      return `
        <div class="bar-row">
          <span class="bar-label">${emp.name}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${emp.percentage}%; background: ${color};">
              <span class="bar-percent">${emp.percentage}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ───── النشاط الأخير ───── */
  function renderRecentActivity(employees, attendance) {
    const list = document.getElementById('activity-list');
    if (!list) return;

    const activities = [];
    const typeLabels = {
      present: '✅ حضور', absent: '❌ غياب', leave: '🏖️ إجازة',
      official_holiday: '🎉 رسمية', errand: '📋 مأمورية',
      half_day: '🕐 نص يوم'
    };
    for (let i = 1; i <= 5; i++) typeLabels[`late_${i}`] = `⏰ تأخير ${i} ساعات`;

    const empMap = {};
    employees.forEach(e => empMap[e.id] = e.name);

    // جمع آخر 20 نشاط (نبدأ من أحدث يوم)
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);

    for (let d = daysInMonth; d >= 1; d--) {
      for (const empId in attendance) {
        const status = attendance[empId]?.[d] || attendance[empId]?.[String(d)];
        if (!status) continue;
        activities.push({
          day: d,
          empName: empMap[empId] || empId,
          status: typeLabels[status] || status
        });
        if (activities.length >= 20) break;
      }
      if (activities.length >= 20) break;
    }

    if (activities.length === 0) {
      list.innerHTML = '<li class="empty-state">لا يوجد نشاط مسجّل لهذا الشهر</li>';
      return;
    }

    list.innerHTML = activities.map(a => `
      <li class="activity-item">
        <span class="activity-date">${a.day} / ${month}</span>
        <span class="activity-name">${a.empName}</span>
        <span class="activity-status">${a.status}</span>
      </li>
    `).join('');
  }

  /* ───── الواجهة العامة ───── */
  return { init };
})();

