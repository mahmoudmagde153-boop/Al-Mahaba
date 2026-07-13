/**
 * ============================================================
 *  لوحة المعلومات - Dashboard Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 */

window.Dashboard = (function () {
  'use strict';

  let selectedMonth = '';

  function init() {
    selectedMonth = window.getCurrentMonth();
    render();
  }

  function render() {
    const container = document.getElementById('page-dashboard');
    if (!container) return;

    container.innerHTML = buildHTML();
    attachEvents();
    populateData();
  }

  function buildHTML() {
    return `
      <div class="dashboard-page">
        <!-- عنوان الصفحة مع محدد الشهر -->
        <div class="page-header" style="margin-bottom: 30px;">
          <h2><i class="fas fa-chart-pie"></i> لوحة التحكم المالية</h2>
          <div class="month-selector">
            <label for="dash-month">الشهر:</label>
            <input type="month" id="dash-month" value="${selectedMonth}" style="padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);" />
          </div>
        </div>

        <!-- بطاقات الإحصائيات -->
        <div class="stats-grid" id="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px;">
          ${statCard('dash-sales', 'fas fa-arrow-up', 'إجمالي المبيعات', '0 ج.م', 'accent-green')}
          ${statCard('dash-purchases', 'fas fa-shopping-cart', 'المشتريات', '0 ج.م', 'accent-red')}
          ${statCard('dash-expenses', 'fas fa-wallet', 'المصروفات', '0 ج.م', 'accent-orange')}
          ${statCard('dash-salaries', 'fas fa-users', 'المرتبات المستحقة', '0 ج.م', 'accent-blue')}
          ${statCard('dash-returns', 'fas fa-exchange-alt', 'المرتجعات', '0 ج.م', 'accent-warning')}
        </div>

        <!-- مؤشر الصافي المالي -->
        <div class="glass-card" style="padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(99, 102, 241, 0.2);">
          <h3 style="margin-bottom: 15px; color: var(--text-color); font-size: 1.4rem;"><i class="fas fa-balance-scale"></i> صافي الدخل التقديري للشهر</h3>
          <h1 id="dash-net-profit" style="font-size: 3rem; margin-bottom: 20px; text-shadow: 0 2px 10px rgba(0,0,0,0.1);">0 ج.م</h1>
          
          <!-- مؤشر بصري (Visual Bar) -->
          <div style="width: 100%; height: 12px; background: var(--bg-color); border-radius: 10px; overflow: hidden; display: flex; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);">
            <div id="bar-income" style="height: 100%; background: var(--success); width: 50%; transition: width 1s ease;"></div>
            <div id="bar-outflow" style="height: 100%; background: var(--danger); width: 50%; transition: width 1s ease;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.9rem; color: var(--text-muted); font-weight: bold;">
            <span><i class="fas fa-circle" style="color: var(--success); font-size: 0.6rem; margin-left: 5px;"></i> الدخل (مبيعات)</span>
            <span>الخارج (مشتريات، مصروفات، الخ) <i class="fas fa-circle" style="color: var(--danger); font-size: 0.6rem; margin-right: 5px;"></i></span>
          </div>
        </div>

      </div>
    `;
  }

  function statCard(id, icon, label, value, accent) {
    let colorHex = '#6366f1';
    if(accent === 'accent-green') colorHex = '#10b981';
    if(accent === 'accent-red') colorHex = '#ef4444';
    if(accent === 'accent-warning') colorHex = '#f59e0b';
    if(accent === 'accent-orange') colorHex = '#fd7e14';
    if(accent === 'accent-blue') colorHex = '#3b82f6';

    return `
      <div class="stat-card glass-card" id="${id}" style="padding: 25px 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border-bottom: 4px solid ${colorHex}; transition: transform 0.3s ease; cursor: default;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
        <div class="stat-icon" style="margin-bottom: 15px; font-size: 2.2rem; color: ${colorHex};"><i class="${icon}"></i></div>
        <div class="stat-body">
          <span class="stat-value" style="display: block; font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; color: var(--text-color);">${value}</span>
          <span class="stat-label" style="color: var(--text-muted); font-size: 1rem; font-weight: 600;">${label}</span>
        </div>
      </div>
    `;
  }

  function attachEvents() {
    const monthInput = document.getElementById('dash-month');
    if (monthInput) {
      monthInput.addEventListener('change', function () {
        selectedMonth = this.value;
        populateData();
      });
    }
  }

  function getWeeklyOffDay(settings) {
    const dayMap = {
      'الأحد': 0, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3,
      'الخميس': 4, 'الجمعة': 5, 'السبت': 6
    };
    return dayMap[settings.weeklyOff] ?? 0;
  }

  function populateData() {
    const employees = window.DB.getEmployees().filter(e => e.active !== false);
    const attendance = window.DB.getAttendance(selectedMonth) || {};
    const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
    const settings = window.DB.getSettings();

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);

    /* ──── 1. المرتبات ──── */
    let totalSalaries = 0;

    employees.forEach(emp => {
      const empAtt = attendance[emp.id] || {};
      const empSalary = salaryDetails[emp.id] || {};

      let absentDays = 0;
      let lateHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(year, month - 1, d);
        const dayOfWeek = dayDate.getDay();
        const weeklyOff = getWeeklyOffDay(settings);
        
        if (dayOfWeek === weeklyOff) continue;

        const status = empAtt[d] || empAtt[String(d)];
        if (!status) continue;

        switch (status) {
          case 'half_day': absentDays += 0.5; break;
          case 'absent': absentDays++; break;
          default:
            if (status.startsWith('late_')) lateHours += parseInt(status.split('_')[1]) || 0;
        }
      }

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
      if (netSalary > 0) totalSalaries += netSalary;
    });

    /* ──── 2. المبيعات، المشتريات، المصروفات، والمرتجعات ──── */
    let totalSales = 0;
    let totalPurchases = 0;
    let totalReturns = 0;
    let totalExpenses = 0;

    const trTxs = window.DB.getTreasuryTxs();
    const supTxs = window.DB.getSupplierTxs();

    trTxs.forEach(tx => {
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        if (tx.type === 'sales') totalSales += parseFloat(tx.amount || 0);
        else if (tx.type === 'sales_return') totalReturns += parseFloat(tx.amount || 0);
        else if (tx.type === 'expense') totalExpenses += parseFloat(tx.amount || 0);
      }
    });

    supTxs.forEach(tx => {
      if (tx.historical) return;
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        if (tx.type === 'purchase') totalPurchases += parseFloat(tx.amount || 0);
        else if (tx.type === 'sales_to_supplier') totalSales += parseFloat(tx.amount || 0);
        else if (tx.type === 'return') totalReturns += parseFloat(tx.amount || 0);
      }
    });

    // الصافي = المبيعات - (المشتريات + المصروفات + المرتبات + المرتجعات)
    const totalOutflow = totalPurchases + totalExpenses + totalSalaries + totalReturns;
    const netProfit = totalSales - totalOutflow;

    /* ──── تحديث الواجهة ──── */
    updateStatCard('dash-sales', window.formatCurrency(totalSales));
    updateStatCard('dash-purchases', window.formatCurrency(totalPurchases));
    updateStatCard('dash-returns', window.formatCurrency(totalReturns));
    updateStatCard('dash-expenses', window.formatCurrency(totalExpenses));
    updateStatCard('dash-salaries', window.formatCurrency(totalSalaries));

    // تحديث الصافي
    const netEl = document.getElementById('dash-net-profit');
    if (netEl) {
      netEl.textContent = window.formatCurrency(netProfit);
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

  function updateStatCard(id, value) {
    const card = document.getElementById(id);
    if (!card) return;
    const valEl = card.querySelector('.stat-value');
    if (valEl) valEl.textContent = value;
  }

  return { init };
})();
