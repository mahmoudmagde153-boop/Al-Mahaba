/**
 * ============================================================
 *  الأرشيف الشهري - Archive Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  عرض جميع الأشهر المحفوظة مع إحصائياتها
 *  إمكانية: عرض التفاصيل، مقارنة شهرين، قفل الشهر، الأرشفة
 * ============================================================
 */

window.Archive = (function () {
  'use strict';

  /* ───── حالة الصفحة ───── */
  let selectedForCompare = []; // أشهر محددة للمقارنة (حد أقصى 2)

  /* ───── نقطة الدخول ───── */
  function init() {
    render();
  }

  /* ───── بناء الصفحة ───── */
  function render() {
    const container = document.getElementById('page-archive');
    if (!container) return;

    const months = getAvailableMonths();

    container.innerHTML = `
      <div class="archive-page">
        <div class="page-header">
          <h2><i class="fas fa-archive"></i> الأرشيف الشهري</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="save-current-archive">
              <i class="fas fa-download"></i> أرشفة الشهر الحالي
            </button>
            <button class="btn btn-secondary" id="compare-months-btn" disabled>
              <i class="fas fa-columns"></i> مقارنة (<span id="compare-count">0</span>/2)
            </button>
          </div>
        </div>

        ${months.length === 0 
          ? '<div class="empty-state glass-card"><i class="fas fa-inbox"></i><p>لا توجد بيانات مؤرشفة بعد</p><p>ابدأ بتسجيل الحضور ثم اضغط "أرشفة الشهر الحالي"</p></div>'
          : `<div class="archive-grid" id="archive-grid">${months.map(m => monthCard(m)).join('')}</div>`
        }

        <!-- تفاصيل الشهر -->
        <div class="modal-overlay" id="detail-modal" style="display:none;">
          <div class="modal glass-card modal-lg">
            <div class="modal-header">
              <h3 id="detail-title">تفاصيل الشهر</h3>
              <button class="modal-close" id="detail-close">&times;</button>
            </div>
            <div id="detail-content"></div>
          </div>
        </div>

        <!-- مقارنة شهرين -->
        <div class="modal-overlay" id="compare-modal" style="display:none;">
          <div class="modal glass-card modal-xl">
            <div class="modal-header">
              <h3>مقارنة الأشهر</h3>
              <button class="modal-close" id="compare-close">&times;</button>
            </div>
            <div id="compare-content"></div>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  /* ───── بطاقة الشهر ───── */
  function monthCard(monthData) {
    const { monthKey, monthName, year, totalSalaries, empCount, attendanceRate, isLocked } = monthData;
    const isSelected = selectedForCompare.includes(monthKey);

    return `
      <div class="archive-card glass-card ${isLocked ? 'locked' : ''} ${isSelected ? 'selected-compare' : ''}" data-month="${monthKey}">
        <div class="archive-card-header">
          <h3>${monthName} ${year}</h3>
          ${isLocked ? '<span class="lock-badge"><i class="fas fa-lock"></i> مقفل</span>' : ''}
        </div>
        <div class="archive-card-body">
          <div class="archive-stat">
            <i class="fas fa-coins"></i>
            <span class="stat-label">إجمالي المرتبات</span>
            <span class="stat-value">${window.formatCurrency(totalSalaries)}</span>
          </div>
          <div class="archive-stat">
            <i class="fas fa-users"></i>
            <span class="stat-label">عدد الموظفين</span>
            <span class="stat-value">${empCount}</span>
          </div>
          <div class="archive-stat">
            <i class="fas fa-chart-pie"></i>
            <span class="stat-label">نسبة الحضور</span>
            <span class="stat-value">${attendanceRate}%</span>
          </div>
        </div>
        <div class="archive-card-actions">
          <button class="btn btn-sm btn-primary view-detail-btn" data-month="${monthKey}">
            <i class="fas fa-eye"></i> عرض
          </button>
          <button class="btn btn-sm btn-secondary compare-select-btn" data-month="${monthKey}">
            <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i> مقارنة
          </button>
          <button class="btn btn-sm ${isLocked ? 'btn-warning' : 'btn-accent'} lock-btn" data-month="${monthKey}">
            <i class="fas ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${isLocked ? 'فتح' : 'قفل'}
          </button>
        </div>
      </div>
    `;
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    // أرشفة الشهر الحالي
    document.getElementById('save-current-archive')?.addEventListener('click', archiveCurrentMonth);

    // أحداث البطاقات
    const grid = document.getElementById('archive-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.view-detail-btn');
        const compareBtn = e.target.closest('.compare-select-btn');
        const lockBtn = e.target.closest('.lock-btn');

        if (viewBtn) showDetail(viewBtn.dataset.month);
        else if (compareBtn) toggleCompareSelection(compareBtn.dataset.month);
        else if (lockBtn) toggleLock(lockBtn.dataset.month);
      });
    }

    // زر المقارنة
    document.getElementById('compare-months-btn')?.addEventListener('click', showComparison);

    // إغلاق المودالات
    document.getElementById('detail-close')?.addEventListener('click', () => {
      document.getElementById('detail-modal').style.display = 'none';
    });
    document.getElementById('detail-modal')?.addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });
    document.getElementById('compare-close')?.addEventListener('click', () => {
      document.getElementById('compare-modal').style.display = 'none';
    });
    document.getElementById('compare-modal')?.addEventListener('click', function (e) {
      if (e.target === this) this.style.display = 'none';
    });
  }

  /* ───── جمع الأشهر المتاحة من localStorage ───── */
  function getAvailableMonths() {
    const months = [];
    const lockedMonths = JSON.parse(localStorage.getItem('locked_months') || '{}');

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        const monthKey = key.replace('attendance_', '');
        const [year, month] = monthKey.split('-').map(Number);
        if (!year || !month) continue;

        const stats = calculateMonthStats(monthKey);
        months.push({
          monthKey,
          monthName: window.getArabicMonth(month),
          year,
          totalSalaries: stats.totalSalaries,
          empCount: stats.empCount,
          attendanceRate: stats.attendanceRate,
          isLocked: !!lockedMonths[monthKey]
        });
      }
    }

    // ترتيب تنازلي (أحدث أولاً)
    months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return months;
  }

  /* ───── حساب إحصائيات شهر ───── */
  function calculateMonthStats(monthKey) {
    const employees = window.DB.getEmployees().filter(e => e.active !== false);
    const attendance = window.DB.getAttendance(monthKey) || {};
    const salaryDetails = window.DB.getSalaryDetails(monthKey) || {};
    const settings = window.DB.getSettings();

    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = window.getDaysInMonth(year, month);
    const weeklyOff = getWeeklyOffIndex(settings);
    const workHours = settings.workHours || 10;
    const overtimeRate = settings.overtimeRate || 100;

    let totalSalaries = 0;
    let totalPresent = 0, totalWorking = 0;

    employees.forEach(emp => {
      const empAtt = attendance[emp.id] || {};
      const empSalary = salaryDetails[emp.id] || {};
      let presentDays = 0, absentDays = 0, lateHours = 0, workingDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        if (date.getDay() === weeklyOff) continue;

        const status = empAtt[d] || empAtt[String(d)];
        if (!status) continue;
        workingDays++;

        switch (status) {
          case 'present': case 'errand': case 'official_holiday':
            presentDays++; break;
          case 'half_day':
            presentDays += 0.5; absentDays += 0.5; break;
          case 'absent':
            absentDays++; break;
          default:
            if (status.startsWith('late_')) {
              presentDays++;
              lateHours += parseInt(status.split('_')[1]) || 0;
            }
        }
      }

      totalPresent += presentDays;
      totalWorking += workingDays;

      const dailyRate = emp.baseSalary / 30;
      const hourlyRate = dailyRate / workHours;
      const absenceDeduction = dailyRate * absentDays;
      const lateDeduction = hourlyRate * lateHours;
      const advances = Number(empSalary.advances) || 0;
      const bonus = Number(empSalary.bonus) || 0;
      const overtimeDays = Number(empSalary.overtimeDays) || 0;
      const overtimeAllowance = overtimeDays * overtimeRate;
      const leaveDeduction = Number(empSalary.leaveDeduction) || 0;

      totalSalaries += emp.baseSalary - absenceDeduction - lateDeduction - advances - leaveDeduction + bonus + overtimeAllowance;
    });

    const attendanceRate = totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : 0;

    return {
      totalSalaries: Math.round(totalSalaries * 100) / 100,
      empCount: employees.length,
      attendanceRate
    };
  }

  /* ───── أرشفة الشهر الحالي ───── */
  function archiveCurrentMonth() {
    const currentMonth = window.getCurrentMonth();
    const attendance = window.DB.getAttendance(currentMonth);

    if (!attendance || Object.keys(attendance).length === 0) {
      window.showToast('لا توجد بيانات حضور للشهر الحالي', 'error');
      return;
    }

    // البيانات محفوظة بالفعل في localStorage — نعيد رسم الصفحة فقط
    window.showToast('تم أرشفة بيانات الشهر الحالي بنجاح', 'success');
    render();
  }

  /* ───── عرض تفاصيل شهر ───── */
  function showDetail(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const monthName = window.getArabicMonth(month);

    const employees = window.DB.getEmployees().filter(e => e.active !== false);
    const attendance = window.DB.getAttendance(monthKey) || {};
    const salaryDetails = window.DB.getSalaryDetails(monthKey) || {};
    const settings = window.DB.getSettings();
    const daysInMonth = window.getDaysInMonth(year, month);
    const weeklyOff = getWeeklyOffIndex(settings);
    const workHours = settings.workHours || 10;
    const overtimeRate = settings.overtimeRate || 100;

    let rows = '';
    let grandTotal = 0;

    employees.forEach(emp => {
      const empAtt = attendance[emp.id] || {};
      const empSalary = salaryDetails[emp.id] || {};

      let presentDays = 0, absentDays = 0, leaveDays = 0, lateHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        if (date.getDay() === weeklyOff) continue;
        const status = empAtt[d] || empAtt[String(d)];
        if (!status) continue;

        switch (status) {
          case 'present': case 'errand': case 'official_holiday':
            presentDays++; break;
          case 'half_day':
            presentDays += 0.5; absentDays += 0.5; break;
          case 'absent':
            absentDays++; break;
          case 'leave':
            leaveDays++; break;
          default:
            if (status.startsWith('late_')) {
              presentDays++;
              lateHours += parseInt(status.split('_')[1]) || 0;
            }
        }
      }

      const dailyRate = emp.baseSalary / 30;
      const hourlyRate = dailyRate / workHours;
      const absenceDeduction = Math.round(dailyRate * absentDays * 100) / 100;
      const lateDeduction = Math.round(hourlyRate * lateHours * 100) / 100;
      const advances = Number(empSalary.advances) || 0;
      const bonus = Number(empSalary.bonus) || 0;
      const overtimeDays = Number(empSalary.overtimeDays) || 0;
      const overtimeAllowance = overtimeDays * overtimeRate;
      const leaveDeduction = Number(empSalary.leaveDeduction) || 0;

      const net = Math.round((emp.baseSalary - absenceDeduction - lateDeduction - advances - leaveDeduction + bonus + overtimeAllowance) * 100) / 100;
      grandTotal += net;

      rows += `
        <tr>
          <td>${emp.name}</td>
          <td>${presentDays}</td>
          <td>${absentDays}</td>
          <td>${leaveDays}</td>
          <td>${window.formatCurrency(emp.baseSalary)}</td>
          <td class="text-danger">${absenceDeduction > 0 ? '-' + window.formatCurrency(absenceDeduction) : '—'}</td>
          <td class="text-danger">${lateDeduction > 0 ? '-' + window.formatCurrency(lateDeduction) : '—'}</td>
          <td class="text-success">${bonus > 0 ? '+' + window.formatCurrency(bonus) : '—'}</td>
          <td><strong>${window.formatCurrency(net)}</strong></td>
        </tr>
      `;
    });

    const modal = document.getElementById('detail-modal');
    const title = document.getElementById('detail-title');
    const content = document.getElementById('detail-content');

    title.textContent = `تفاصيل شهر ${monthName} ${year}`;
    content.innerHTML = `
      <div class="detail-table-wrapper">
        <table class="salary-table">
          <thead>
            <tr>
              <th>الاسم</th><th>حضور</th><th>غياب</th><th>إجازات</th>
              <th>الراتب</th><th>خصم الغياب</th><th>خصم التأخير</th>
              <th>البونص</th><th>الصافي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="totals-row">
              <td colspan="8"><strong>إجمالي المرتبات</strong></td>
              <td><strong>${window.formatCurrency(Math.round(grandTotal * 100) / 100)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    modal.style.display = 'flex';
  }

  /* ───── تبديل اختيار المقارنة ───── */
  function toggleCompareSelection(monthKey) {
    const idx = selectedForCompare.indexOf(monthKey);
    if (idx >= 0) {
      selectedForCompare.splice(idx, 1);
    } else if (selectedForCompare.length < 2) {
      selectedForCompare.push(monthKey);
    } else {
      window.showToast('يمكنك اختيار شهرين فقط للمقارنة', 'warning');
      return;
    }

    // تحديث العدد وحالة الزر
    const countEl = document.getElementById('compare-count');
    const compareBtn = document.getElementById('compare-months-btn');
    if (countEl) countEl.textContent = selectedForCompare.length;
    if (compareBtn) compareBtn.disabled = selectedForCompare.length !== 2;

    // تحديث مظهر البطاقات
    document.querySelectorAll('.archive-card').forEach(card => {
      const mk = card.dataset.month;
      card.classList.toggle('selected-compare', selectedForCompare.includes(mk));
      const icon = card.querySelector('.compare-select-btn i');
      if (icon) {
        icon.className = selectedForCompare.includes(mk) ? 'fas fa-check-square' : 'fas fa-square';
      }
    });
  }

  /* ───── عرض المقارنة ───── */
  function showComparison() {
    if (selectedForCompare.length !== 2) return;

    const [mk1, mk2] = selectedForCompare;
    const stats1 = calculateMonthStats(mk1);
    const stats2 = calculateMonthStats(mk2);
    const [y1, m1] = mk1.split('-').map(Number);
    const [y2, m2] = mk2.split('-').map(Number);
    const name1 = `${window.getArabicMonth(m1)} ${y1}`;
    const name2 = `${window.getArabicMonth(m2)} ${y2}`;

    const modal = document.getElementById('compare-modal');
    const content = document.getElementById('compare-content');

    content.innerHTML = `
      <div class="compare-grid">
        <div class="compare-column glass-card">
          <h3>${name1}</h3>
          <div class="compare-stat">
            <span class="label">إجمالي المرتبات</span>
            <span class="value">${window.formatCurrency(stats1.totalSalaries)}</span>
          </div>
          <div class="compare-stat">
            <span class="label">عدد الموظفين</span>
            <span class="value">${stats1.empCount}</span>
          </div>
          <div class="compare-stat">
            <span class="label">نسبة الحضور</span>
            <span class="value">${stats1.attendanceRate}%</span>
          </div>
        </div>

        <div class="compare-vs">
          <i class="fas fa-exchange-alt"></i>
        </div>

        <div class="compare-column glass-card">
          <h3>${name2}</h3>
          <div class="compare-stat">
            <span class="label">إجمالي المرتبات</span>
            <span class="value">${window.formatCurrency(stats2.totalSalaries)}</span>
          </div>
          <div class="compare-stat">
            <span class="label">عدد الموظفين</span>
            <span class="value">${stats2.empCount}</span>
          </div>
          <div class="compare-stat">
            <span class="label">نسبة الحضور</span>
            <span class="value">${stats2.attendanceRate}%</span>
          </div>
        </div>
      </div>

      <div class="compare-diff glass-card">
        <h4>الفرق</h4>
        <div class="diff-row">
          <span>فرق المرتبات:</span>
          <span class="${stats2.totalSalaries - stats1.totalSalaries >= 0 ? 'text-success' : 'text-danger'}">
            ${window.formatCurrency(Math.abs(stats2.totalSalaries - stats1.totalSalaries))}
            ${stats2.totalSalaries >= stats1.totalSalaries ? '↑' : '↓'}
          </span>
        </div>
        <div class="diff-row">
          <span>فرق نسبة الحضور:</span>
          <span class="${stats2.attendanceRate - stats1.attendanceRate >= 0 ? 'text-success' : 'text-danger'}">
            ${Math.abs(stats2.attendanceRate - stats1.attendanceRate)}%
            ${stats2.attendanceRate >= stats1.attendanceRate ? '↑' : '↓'}
          </span>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  /* ───── قفل / فتح الشهر ───── */
  function toggleLock(monthKey) {
    const lockedMonths = JSON.parse(localStorage.getItem('locked_months') || '{}');

    if (lockedMonths[monthKey]) {
      window.showConfirm(
        'فتح الشهر',
        'هل تريد إلغاء قفل هذا الشهر؟ سيسمح ذلك بتعديل البيانات.',
        function () {
          delete lockedMonths[monthKey];
          localStorage.setItem('locked_months', JSON.stringify(lockedMonths));
          window.showToast('تم فتح الشهر', 'info');
          render();
        }
      );
    } else {
      window.showConfirm(
        'قفل الشهر',
        'سيتم قفل هذا الشهر ومنع تعديل بياناته. هل تريد المتابعة؟',
        function () {
          lockedMonths[monthKey] = true;
          localStorage.setItem('locked_months', JSON.stringify(lockedMonths));
          window.showToast('تم قفل الشهر بنجاح', 'success');
          render();
        }
      );
    }
  }

  /* ───── مساعدات ───── */
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

