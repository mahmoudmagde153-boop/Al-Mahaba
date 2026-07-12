/**
 * ============================================================
 *  إدارة المستخدمين والصلاحيات
 * ============================================================
 */

window.Users = (function () {
    'use strict';

    let selectedUserId = null;

    // قائمة الشاشات المتاحة للصلاحيات
    const PERMISSIONS_LIST = [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'treasury', label: 'الخزنة واليومية' },
        { id: 'suppliers', label: 'الموردين' },
        { id: 'attendance', label: 'الحضور والغياب' },
        { id: 'salaries', label: 'المرتبات' },
        { id: 'employees', label: 'الموظفين' },
        { id: 'payslip', label: 'قسيمة الراتب' },
        { id: 'archive', label: 'الأرشيف' },
        { id: 'settings', label: 'الإعدادات' },
        { id: 'users', label: 'إدارة المستخدمين' }
    ];

    function init() {
        render();

        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', openAddModal);
        }
    }

    function render() {
        const users = window.DB.getUsers();
        const tbody = document.getElementById('usersList');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">لا يوجد مستخدمين مسجلين</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const isSuperAdmin = user.role === 'admin' || user.permissions.includes('*');
            const permissionsText = isSuperAdmin ? '<span class="badge" style="background:#10b981; color:#fff; padding:3px 8px; border-radius:4px;">صلاحيات كاملة</span>' : 
                (user.permissions && user.permissions.length > 0 ? user.permissions.length + ' شاشات' : 'لا توجد صلاحيات');
            
            const actionButtons = user.id == 1 ? 
                '<span class="text-muted">مدير أساسي (لا يمكن حذفه)</span>' : 
                `<button class="btn btn-warning btn-sm" onclick="window.Users.openEditModal(${user.id})">✏️ تعديل</button>
                 <button class="btn btn-danger btn-sm" onclick="window.Users.deleteUser(${user.id})">🗑️ حذف</button>`;

            return `
                <tr>
                    <td><strong>${user.name}</strong></td>
                    <td>${user.username}</td>
                    <td>${isSuperAdmin ? 'مدير عام' : 'موظف / مستخدم'}</td>
                    <td>${permissionsText}</td>
                    <td><div class="actions-group" style="display:flex; gap:5px;">${actionButtons}</div></td>
                </tr>
            `;
        }).join('');
    }

    function openAddModal() {
        selectedUserId = null;
        showUserModal();
    }

    function openEditModal(id) {
        selectedUserId = id;
        const user = window.DB.getUser(id);
        if (!user) return;
        showUserModal(user);
    }

    function showUserModal(user = null) {
        const isEdit = !!user;
        const isSuperAdmin = user && (user.permissions.includes('*') || user.id == 1);

        const html = `
            <form id="userForm">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>الاسم الكامل</label>
                    <input type="text" id="uName" class="input-field" required value="${isEdit ? user.name : ''}" style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>اسم الدخول (Username)</label>
                    <input type="text" id="uUsername" class="input-field" required value="${isEdit ? user.username : ''}" ${isEdit && user.id == 1 ? 'readonly' : ''} style="width:100%; padding:8px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>كلمة المرور</label>
                    <input type="password" id="uPassword" class="input-field" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'اتركه فارغاً لعدم التغيير' : 'ادخل كلمة المرور'}" style="width:100%; padding:8px;">
                </div>
                
                ${!(isEdit && user.id == 1) ? `
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: flex; justify-content: space-between;">
                        <span>صلاحيات الوصول (الشاشات المسموحة)</span>
                        <label style="font-size: 12px; font-weight: normal; cursor:pointer;">
                            <input type="checkbox" id="selectAllPerms" ${isSuperAdmin ? 'checked' : ''}> تحديد الكل (صلاحيات كاملة)
                        </label>
                    </label>
                    <div class="permissions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
                        ${PERMISSIONS_LIST.map(p => {
                            const checked = isSuperAdmin || (user && user.permissions.includes(p.id)) ? 'checked' : '';
                            return `
                                <label style="display:flex; align-items:center; gap:5px; font-size:13px; cursor:pointer;">
                                    <input type="checkbox" class="perm-chk" value="${p.id}" ${checked}> ${p.label}
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : '<div class="alert alert-info" style="margin-top:15px; padding:10px; background:#e0f2fe; border-radius:5px;">هذا الحساب له صلاحيات كاملة دائماً</div>'}
                
                <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="window.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ التعديلات' : 'إضافة المستخدم'}</button>
                </div>
            </form>
        `;

        window.showConfirm(isEdit ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد', html, () => {});
        
        // Remove default modal handlers since we use a custom form
        const footer = document.querySelector('#modal .modal-footer');
        if(footer) footer.style.display = 'none';

        // Select All behavior
        const selectAll = document.getElementById('selectAllPerms');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                document.querySelectorAll('.perm-chk').forEach(chk => {
                    chk.checked = e.target.checked;
                });
            });
        }

        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            saveUser();
        });
    }

    function saveUser() {
        const name = document.getElementById('uName').value.trim();
        const username = document.getElementById('uUsername').value.trim();
        const passwordInput = document.getElementById('uPassword').value.trim();

        let permissions = [];
        const selectAll = document.getElementById('selectAllPerms');
        if (selectAll && selectAll.checked) {
            permissions = ['*'];
        } else {
            document.querySelectorAll('.perm-chk:checked').forEach(chk => {
                permissions.push(chk.value);
            });
        }

        try {
            if (selectedUserId) {
                const updateData = { name, username };
                if (passwordInput) updateData.password = passwordInput;
                if (selectedUserId != 1) updateData.permissions = permissions;
                
                window.DB.updateUser(selectedUserId, updateData);
                window.showToast('تم تحديث بيانات المستخدم بنجاح', 'success');
            } else {
                if (!passwordInput) {
                    window.showToast('كلمة المرور مطلوبة', 'error');
                    return;
                }
                window.DB.addUser({ name, username, password: passwordInput, role: 'user', permissions });
                window.showToast('تم إضافة المستخدم بنجاح', 'success');
            }
            window.closeModal();
            
            // إعادة إظهار الفوتر الافتراضي للمودال
            const footer = document.querySelector('#modal .modal-footer');
            if(footer) footer.style.display = 'flex';
            
            render();
        } catch (err) {
            window.showToast(err.message, 'error');
        }
    }

    function deleteUser(id) {
        // Reset footer if needed
        const footer = document.querySelector('#modal .modal-footer');
        if(footer) footer.style.display = 'flex';

        window.showConfirm('حذف مستخدم', 'هل أنت متأكد من حذف هذا المستخدم؟ لن يتمكن من الدخول للنظام مرة أخرى.', () => {
            try {
                window.DB.deleteUser(id);
                window.showToast('تم حذف المستخدم', 'success');
                render();
            } catch (err) {
                window.showToast(err.message, 'error');
            }
        });
    }

    return {
        init,
        render,
        openEditModal,
        deleteUser
    };
})();
