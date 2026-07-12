/**
 * ============================================================
 *  إدارة الموظفين - Employees Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  عرض بطاقات الموظفين مع إضافة/تعديل/حذف
 *  رصيد الإجازات يدوي — يتحكم فيه المدير
 *  النقر على الاسم يعرض ملخص التاريخ
 * ============================================================
 */

window.Employees = (function () {
  'use strict';

  /* ───── نقطة الدخول ───── */
  function init() {
    render();
  }

  /* ───── بناء الصفحة ───── */
  function render() {
    const container = document.getElementById('page-employees');
    if (!container) return;

    const employees = window.DB.getEmployees();

    container.innerHTML = `
      <div class="employees-page">
        <div class="page-header">
          <h2><i class="fas fa-users-cog"></i> إدارة الموظفين</h2>
          <button class="btn btn-primary" id="add-emp-btn">
            <i class="fas fa-user-plus"></i> إضافة موظف
          </button>
        </div>

        <div class="employees-grid" id="employees-grid">
          ${employees.map(emp => employeeCard(emp)).join('')}
          ${employees.length === 0 ? '<p class="empty-state">لا يوجد موظفون حالياً — أضف موظفاً جديداً</p>' : ''}
        </div>
      </div>

      <!-- مودال الإضافة/التعديل -->
      <div class="modal-overlay" id="emp-modal" style="display:none;">
        <div class="modal glass-card">
          <div class="modal-header">
            <h3 id="modal-title">إضافة موظف</h3>
            <button class="modal-close" id="modal-close">&times;</button>
          </div>
          <form id="emp-form">
            <input type="hidden" id="emp-id" />
            <div class="form-group">
              <label for="emp-name">اسم الموظف</label>
              <input type="text" id="emp-name" required placeholder="أدخل اسم الموظف" />
            </div>
            <div class="form-group">
              <label for="emp-salary">الراتب الأساسي (ج.م)</label>
              <input type="number" id="emp-salary" required min="0" step="500" placeholder="مثال: 8000" />
            </div>
            <div class="form-group">
              <label for="emp-leave">رصيد الإجازات (أيام)</label>
              <input type="number" id="emp-leave" min="0" value="0" step="1" />
            </div>
            <div class="form-group">
              <label for="emp-join">تاريخ الالتحاق</label>
              <input type="date" id="emp-join" />
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> حفظ
              </button>
              <button type="button" class="btn btn-secondary" id="modal-cancel">إلغاء</button>
            </div>
          </form>
        </div>
      </div>

      <!-- مودال ملف الموظف -->
      <div class="modal-overlay" id="profile-modal" style="display:none;">
        <div class="modal glass-card modal-lg">
          <div class="modal-header">
            <h3 id="profile-title">ملف الموظف</h3>
            <button class="modal-close" id="profile-close">&times;</button>
          </div>
          <div id="profile-content"></div>
        </div>
      </div>
    `;

    attachEvents();
  }

  /* ───── بطاقة موظف ───── */
  function employeeCard(emp) {
    const isActive = emp.active !== false;
    const statusClass = isActive ? 'active' : 'inactive';
    const statusLabel = isActive ? 'نشط' : 'غير نشط';
    const statusIcon = isActive ? 'fa-check-circle' : 'fa-times-circle';

    return `
      <div class="emp-card glass-card ${statusClass}" data-id="${emp.id}">
        <div class="emp-card-header">
          <div class="emp-avatar">${emp.name.charAt(0)}</div>
          <div class="emp-info">
            <h4 class="emp-name-link" data-id="${emp.id}">${emp.name}</h4>
            <span class="emp-status ${statusClass}">
              <i class="fas ${statusIcon}"></i> ${statusLabel}
            </span>
          </div>
        </div>
        <div class="emp-card-body">
          <div class="emp-detail">
            <span class="detail-label">الراتب الأساسي</span>
            <span class="detail-value">${window.formatCurrency(emp.baseSalary)}</span>
          </div>
          <div class="emp-detail">
            <span class="detail-label">رصيد الإجازات</span>
            <span class="detail-value">${emp.leaveBalance || 0} يوم</span>
          </div>
          <div class="emp-detail">
            <span class="detail-label">تاريخ الالتحاق</span>
            <span class="detail-value">${emp.joinDate || '—'}</span>
          </div>
        </div>
        <div class="emp-card-actions">
          <button class="btn-icon btn-edit" data-id="${emp.id}" title="تعديل">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon btn-toggle" data-id="${emp.id}" title="${isActive ? 'تعطيل' : 'تفعيل'}">
            <i class="fas ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
          </button>
          <button class="btn-icon btn-delete" data-id="${emp.id}" title="حذف">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    // زر الإضافة
    document.getElementById('add-emp-btn')?.addEventListener('click', () => openModal());

    // إغلاق المودال
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('emp-modal')?.addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    // تقديم النموذج
    document.getElementById('emp-form')?.addEventListener('submit', handleSubmit);

    // أحداث البطاقات
    const grid = document.getElementById('employees-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const toggleBtn = e.target.closest('.btn-toggle');
        const nameLink = e.target.closest('.emp-name-link');

        if (editBtn) {
          openModal(editBtn.dataset.id);
        } else if (deleteBtn) {
          handleDelete(deleteBtn.dataset.id);
        } else if (toggleBtn) {
          handleToggle(toggleBtn.dataset.id);
        } else if (nameLink) {
          showProfile(nameLink.dataset.id);
        }
      });
    }

    // إغلاق مودال الملف
    document.getElementById('profile-close')?.addEventListener('click', closeProfileModal);
    document.getElementById('profile-modal')?.addEventListener('click', function (e) {
      if (e.target === this) closeProfileModal();
    });
  }

  /* ───── فتح مودال الإضافة/التعديل ───── */
  function openModal(empId) {
    const modal = document.getElementById('emp-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('emp-form');

    if (!modal || !form) return;

    form.reset();
    document.getElementById('emp-id').value = '';

    if (empId) {
      // وضع التعديل
      const employees = window.DB.getEmployees();
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;

      title.textContent = 'تعديل بيانات الموظف';
      document.getElementById('emp-id').value = emp.id;
      document.getElementById('emp-name').value = emp.name;
      document.getElementById('emp-salary').value = emp.baseSalary;
      document.getElementById('emp-leave').value = emp.leaveBalance || 0;
      document.getElementById('emp-join').value = emp.joinDate || '';
    } else {
      title.textContent = 'إضافة موظف جديد';
    }

    modal.style.display = 'flex';
    document.getElementById('emp-name').focus();
  }

  /** إغلاق المودال */
  function closeModal() {
    const modal = document.getElementById('emp-modal');
    if (modal) modal.style.display = 'none';
  }

  /* ───── معالجة تقديم النموذج ───── */
  function handleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('emp-id').value;
    const name = document.getElementById('emp-name').value.trim();
    const baseSalary = Number(document.getElementById('emp-salary').value);
    const leaveBalance = Number(document.getElementById('emp-leave').value) || 0;
    const joinDate = document.getElementById('emp-join').value;

    if (!name || baseSalary <= 0) {
      window.showToast('يرجى إدخال الاسم والراتب بشكل صحيح', 'error');
      return;
    }

    const employee = {
      id: id || generateId(),
      name,
      baseSalary,
      leaveBalance,
      joinDate,
      active: true
    };

    // في حالة التعديل نحافظ على حالة التفعيل
    if (id) {
      const existing = window.DB.getEmployees().find(e => e.id === id);
      if (existing) employee.active = existing.active;
    }

    window.DB.saveEmployee(employee);
    closeModal();
    window.showToast(id ? 'تم تحديث بيانات الموظف' : 'تم إضافة الموظف بنجاح', 'success');
    render();
  }

  /* ───── حذف موظف ───── */
  function handleDelete(empId) {
    const employees = window.DB.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    window.showConfirm(
      'حذف موظف',
      `هل أنت متأكد من حذف الموظف "${emp.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      function () {
        window.DB.deleteEmployee(empId);
        window.showToast('تم حذف الموظف بنجاح', 'success');
        render();
      }
    );
  }

  /* ───── تبديل حالة الموظف ───── */
  function handleToggle(empId) {
    const employees = window.DB.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    emp.active = emp.active === false ? true : false;
    window.DB.saveEmployee(emp);

    const status = emp.active ? 'تم تفعيل' : 'تم تعطيل';
    window.showToast(`${status} الموظف "${emp.name}"`, 'info');
    render();
  }

  /* ───── عرض ملف الموظف ───── */
  function showProfile(empId) {
    const employees = window.DB.getEmployees();
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const modal = document.getElementById('profile-modal');
    const title = document.getElementById('profile-title');
    const content = document.getElementById('profile-content');
    if (!modal || !content) return;

    title.textContent = `ملف الموظف — ${emp.name}`;

    // جمع بيانات تاريخية من أشهر سابقة
    const historyHTML = buildEmployeeHistory(emp);

    content.innerHTML = `
      <div class="profile-overview">
        <div class="profile-avatar">${emp.name.charAt(0)}</div>
        <div class="profile-details">
          <p><strong>الاسم:</strong> ${emp.name}</p>
          <p><strong>الراتب الأساسي:</strong> ${window.formatCurrency(emp.baseSalary)}</p>
          <p><strong>رصيد الإجازات:</strong> ${emp.leaveBalance || 0} يوم</p>
          <p><strong>تاريخ الالتحاق:</strong> ${emp.joinDate || '—'}</p>
          <p><strong>الحالة:</strong> ${emp.active !== false ? '🟢 نشط' : '🔴 غير نشط'}</p>
        </div>
      </div>
      <div class="profile-history">
        <h4><i class="fas fa-chart-line"></i> سجل الأشهر السابقة</h4>
        ${historyHTML}
      </div>
    `;

    modal.style.display = 'flex';
  }

  /** بناء جدول تاريخ الموظف */
  function buildEmployeeHistory(emp) {
    // البحث في جميع بيانات localStorage عن أشهر الحضور
    const monthKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_')) {
        monthKeys.push(key.replace('attendance_', ''));
      }
    }
    monthKeys.sort().reverse();

    if (monthKeys.length === 0) {
      return '<p class="empty-state">لا توجد بيانات تاريخية بعد</p>';
    }

    let rows = '';
    monthKeys.forEach(monthKey => {
      const attendance = window.DB.getAttendance(monthKey) || {};
      const empAtt = attendance[emp.id];
      if (!empAtt) return;

      const [year, month] = monthKey.split('-').map(Number);
      let present = 0, absent = 0, leave = 0;

      Object.values(empAtt).forEach(status => {
        if (status === 'present' || status === 'errand' || status === 'official_holiday') present++;
        else if (status === 'half_day') { present += 0.5; absent += 0.5; }
        else if (status === 'absent') absent++;
        else if (status === 'leave') leave++;
        else if (status?.startsWith('late_')) present++;
      });

      const monthName = window.getArabicMonth(month);
      rows += `
        <tr>
          <td>${monthName} ${year}</td>
          <td class="text-success">${present}</td>
          <td class="text-danger">${absent}</td>
          <td class="text-info">${leave}</td>
        </tr>
      `;
    });

    if (!rows) return '<p class="empty-state">لا توجد بيانات حضور لهذا الموظف</p>';

    return `
      <table class="profile-history-table">
        <thead>
          <tr>
            <th>الشهر</th>
            <th>حضور</th>
            <th>غياب</th>
            <th>إجازات</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.style.display = 'none';
  }

  /** توليد معرّف فريد */
  function generateId() {
    return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  /* ───── الواجهة العامة ───── */
  return { init };
})();

