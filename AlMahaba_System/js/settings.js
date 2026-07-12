/**
 * ============================================================
 *  الإعدادات - Settings Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 *  إعدادات النظام: السمة، بدل السهرة، ساعات العمل، يوم الإجازة
 *  نسخ احتياطي: تصدير / استيراد / إعادة تعيين
 * ============================================================
 */

window.Settings = (function () {
  'use strict';

  /* ───── نقطة الدخول ───── */
  function init() {
    render();
  }

  /* ───── بناء الصفحة ───── */
  function render() {
    const container = document.getElementById('page-settings');
    if (!container) return;

    const settings = window.DB.getSettings();

    container.innerHTML = `
      <div class="settings-page">
        <div class="page-header">
          <h2><i class="fas fa-cogs"></i> الإعدادات</h2>
        </div>

        <!-- إعدادات النظام -->
        <div class="settings-section glass-card">
          <h3><i class="fas fa-sliders-h"></i> إعدادات النظام</h3>
          <form id="settings-form">

            <!-- السمة -->
            <div class="form-group theme-toggle-group">
              <label>سمة التطبيق</label>
              <div class="theme-toggle-wrapper">
                <button type="button" class="theme-btn ${settings.theme !== 'dark' ? 'active' : ''}" data-theme="light">
                  <i class="fas fa-sun"></i> فاتحة
                </button>
                <button type="button" class="theme-btn ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                  <i class="fas fa-moon"></i> داكنة
                </button>
              </div>
              <input type="hidden" id="setting-theme" value="${settings.theme || 'light'}" />
            </div>

            <!-- بدل السهرة -->
            <div class="form-group">
              <label for="setting-overtime">
                <i class="fas fa-moon"></i> بدل السهرة لليوم (ج.م)
              </label>
              <input type="number" id="setting-overtime" 
                     value="${settings.overtimeRate || 100}" 
                     min="0" step="10" placeholder="100" />
              <small class="form-hint">المبلغ المضاف لكل يوم سهرة (أوفرتايم)</small>
            </div>

            <!-- ساعات العمل -->
            <div class="form-group">
              <label for="setting-workhours">
                <i class="fas fa-clock"></i> عدد ساعات العمل اليومي
              </label>
              <input type="number" id="setting-workhours" 
                     value="${settings.workHours || 10}" 
                     min="1" max="24" step="1" placeholder="10" />
              <small class="form-hint">يُستخدم في حساب خصم التأخير (الأجر بالساعة = يومي ÷ ساعات العمل)</small>
            </div>

            <!-- يوم الإجازة -->
            <div class="form-group">
              <label for="setting-weeklyoff">
                <i class="fas fa-calendar-times"></i> يوم الإجازة الأسبوعية
              </label>
              <select id="setting-weeklyoff">
                ${buildWeekdayOptions(settings.weeklyOff || 'الأحد')}
              </select>
              <small class="form-hint">اليوم الذي لا يُحتسب فيه حضور أو غياب</small>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-lg">
                <i class="fas fa-save"></i> حفظ الإعدادات
              </button>
            </div>
          </form>
        </div>

        <div class="settings-card glass-card">
                <h3><i class="fas fa-user-lock"></i> التحكم في صلاحيات المحل</h3>
                <form id="securityForm">
                    <div class="form-group">
                        <label>إغلاق النظام على موظفي المحل</label>
                        <select id="lockShop" class="form-control">
                            <option value="false" ${settings.lockShop !== true ? 'selected' : ''}>مفتوح (يسمح بالدخول)</option>
                            <option value="true" ${settings.lockShop === true ? 'selected' : ''}>مغلق (يمنع الدخول)</option>
                        </select>
                        <small class="text-muted">عند الإغلاق، لن يتمكن حساب "shop" من تسجيل الدخول للنظام.</small>
                    </div>
                    <button type="submit" class="btn btn-primary">حفظ إعدادات الأمان</button>
                </form>
            </div>

            <div class="settings-card glass-card">
                <h3><i class="fas fa-database"></i> النسخ الاحتياطي واستعادة البيانات</h3>

          <div class="backup-grid">
            <!-- تصدير -->
            <div class="backup-card">
              <div class="backup-icon"><i class="fas fa-file-export"></i></div>
              <h4>تصدير البيانات</h4>
              <p>تحميل نسخة احتياطية كاملة من جميع البيانات بصيغة JSON</p>
              <button class="btn btn-primary" id="export-btn">
                <i class="fas fa-download"></i> تصدير
              </button>
            </div>

            <!-- استيراد -->
            <div class="backup-card">
              <div class="backup-icon"><i class="fas fa-file-import"></i></div>
              <h4>استيراد البيانات</h4>
              <p>استعادة البيانات من ملف نسخة احتياطية سابقة</p>
              <input type="file" id="import-file" accept=".json" style="display:none" />
              <button class="btn btn-secondary" id="import-btn">
                <i class="fas fa-upload"></i> استيراد
              </button>
            </div>

            <!-- إعادة تعيين -->
            <div class="backup-card danger-card">
              <div class="backup-icon"><i class="fas fa-exclamation-triangle"></i></div>
              <h4>إعادة تعيين</h4>
              <p>حذف جميع البيانات والعودة للإعدادات الافتراضية</p>
              <button class="btn btn-danger" id="reset-btn">
                <i class="fas fa-trash-alt"></i> إعادة تعيين
              </button>
            </div>
          </div>
        </div>

        <!-- معلومات النظام -->
        <div class="settings-section glass-card">
          <h3><i class="fas fa-info-circle"></i> معلومات النظام</h3>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">اسم النظام:</span>
              <span class="info-value">نظام شركة المحبة لإدارة الحضور والمرتبات</span>
            </div>
            <div class="info-item">
              <span class="info-label">الإصدار:</span>
              <span class="info-value">1.0.0</span>
            </div>
            <div class="info-item">
              <span class="info-label">حجم البيانات:</span>
              <span class="info-value" id="storage-size">${calculateStorageSize()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">عدد المفاتيح المحفوظة:</span>
              <span class="info-value">${localStorage.length}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  /* ───── خيارات أيام الأسبوع ───── */
  function buildWeekdayOptions(selected) {
    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return days.map(d => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`).join('');
  }

  /* ───── حساب حجم التخزين ───── */
  function calculateStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += (key.length + value.length) * 2; // UTF-16
    }

    if (total < 1024) return total + ' بايت';
    if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' ك.ب';
    return (total / (1024 * 1024)).toFixed(2) + ' م.ب';
  }

  /* ───── ربط الأحداث ───── */
  function attachEvents() {
    // أزرار السمة
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const theme = this.dataset.theme;
        document.getElementById('setting-theme').value = theme;

        // تبديل الحالة النشطة
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // معاينة فورية
        applyTheme(theme);
      });
    });

    // حفظ الإعدادات
    document.getElementById('settings-form')?.addEventListener('submit', function (e) {
      e.preventDefault();
      saveSettings();
    });

    // حفظ الأمان
    document.getElementById('securityForm')?.addEventListener('submit', function (e) {
      e.preventDefault();
      const settings = window.DB.getSettings();
      settings.lockShop = document.getElementById('lockShop').value === 'true';
      window.DB.saveSettings(settings);
      window.showToast('تم حفظ إعدادات الأمان بنجاح', 'success');
    });

    // تصدير
    document.getElementById('export-btn')?.addEventListener('click', exportData);

    // استيراد
    document.getElementById('import-btn')?.addEventListener('click', function () {
      document.getElementById('import-file')?.click();
    });
    document.getElementById('import-file')?.addEventListener('change', importData);

    // إعادة تعيين
    document.getElementById('reset-btn')?.addEventListener('click', resetData);
  }

  /* ───── حفظ الإعدادات ───── */
  function saveSettings() {
    const settings = {
      theme: document.getElementById('setting-theme').value || 'light',
      overtimeRate: Number(document.getElementById('setting-overtime').value) || 100,
      workHours: Number(document.getElementById('setting-workhours').value) || 10,
      weeklyOff: document.getElementById('setting-weeklyoff').value || 'الأحد'
    };

    window.DB.saveSettings(settings);
    applyTheme(settings.theme);
    window.showToast('تم حفظ الإعدادات بنجاح', 'success');
  }

  /* ───── تطبيق السمة فورياً ───── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }

  /* ───── تصدير البيانات ───── */
  function exportData() {
    try {
      const jsonString = window.DB.exportData();
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `almahaba_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      window.showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
    } catch (err) {
      console.error('خطأ في التصدير:', err);
      window.showToast('حدث خطأ أثناء التصدير', 'error');
    }
  }

  /* ───── استيراد البيانات ───── */
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      window.showToast('يرجى اختيار ملف بصيغة JSON', 'error');
      return;
    }

    window.showConfirm(
      'استيراد البيانات',
      'سيتم استبدال جميع البيانات الحالية بالبيانات المستوردة. هل تريد المتابعة؟',
      function () {
        const reader = new FileReader();
        reader.onload = function (event) {
          try {
            const jsonString = event.target.result;
            window.DB.importData(jsonString);
            window.showToast('تم استيراد البيانات بنجاح — سيتم إعادة تحميل الصفحة', 'success');
            setTimeout(() => location.reload(), 1500);
          } catch (err) {
            console.error('خطأ في الاستيراد:', err);
            window.showToast('ملف النسخة الاحتياطية غير صالح', 'error');
          }
        };
        reader.readAsText(file);
      }
    );

    // إعادة تعيين حقل الملف
    e.target.value = '';
  }

  /* ───── إعادة تعيين جميع البيانات ───── */
  function resetData() {
    window.showConfirm(
      '⚠️ إعادة تعيين كاملة',
      'سيتم حذف جميع البيانات نهائياً بما في ذلك: الموظفين، الحضور، المرتبات، والإعدادات. هذا الإجراء لا يمكن التراجع عنه!\n\nهل أنت متأكد تماماً؟',
      function () {
        // تأكيد ثانٍ للحماية
        window.showConfirm(
          '🔴 تأكيد أخير',
          'ستفقد جميع بياناتك بلا رجعة. اضغط "تأكيد" للمتابعة.',
          function () {
            localStorage.clear();
            window.showToast('تم حذف جميع البيانات — سيتم إعادة تحميل الصفحة', 'warning');
            setTimeout(() => location.reload(), 1500);
          }
        );
      }
    );
  }

  /* ───── الواجهة العامة ───── */
  return { init };
})();

