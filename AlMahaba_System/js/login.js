/**
 * ============================================================
 *  نظام تسجيل الدخول والصلاحيات - Login & Auth Module
 *  شركة المحبة لقطع الغيار
 * ============================================================
 */

window.Login = (function () {
    'use strict';

    function init() {
        // التحقق مما إذا كان هناك جلسة مسجلة مسبقاً من قاعدة البيانات
        const sessionUser = window.DB.getCurrentUser();
        if (sessionUser) {
            applyPermissions();
            hideLogin();
        } else {
            showLogin();
        }

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    function handleLogin(e) {
        e.preventDefault();
        const user = document.getElementById('loginUsername').value.trim();
        const pass = document.getElementById('loginPassword').value.trim();

        if (window.DB.login(user, pass)) {
            successLogin();
        } else {
            window.showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    }

    function successLogin() {
        applyPermissions();
        hideLogin();
        window.showToast(`أهلاً بك يا ${window.DB.getCurrentUser().name}`, 'success');

        // توجيه حسب الصلاحية لأول صفحة متاحة
        if (window.DB.hasPermission('*') || window.DB.hasPermission('dashboard')) {
            window.navigateTo('dashboard');
        } else {
            window.navigateTo('attendance');
        }
    }

    function handleLogout() {
        window.DB.logout();
        showLogin();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        // Reload page to reset state safely
        location.reload();
    }

    function applyPermissions() {
        const user = window.DB.getCurrentUser();
        if (!user) return;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.innerHTML = `تسجيل خروج (${user.name})`;
        }

        // Apply visual permission rules (hiding tabs)
        document.querySelectorAll('.nav-item').forEach(el => {
            const page = el.getAttribute('data-page');
            if (!page) return;
            
            // Default rules if we don't have explicit fine-grained roles yet
            // If they are admin (*), they see everything
            if (window.DB.hasPermission('*') || window.DB.hasPermission(page)) {
                el.style.display = 'flex';
            } else {
                // If it's a restricted page and they don't have permission
                if (['dashboard', 'treasury', 'suppliers', 'salaries', 'employees', 'archive', 'settings', 'users'].includes(page)) {
                    el.style.display = 'none';
                }
            }
        });
    }

    function showLogin() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    function hideLogin() {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function getUser() {
        return window.DB.getCurrentUser();
    }

    return {
        init,
        getUser,
        handleLogout,
        applyPermissions
    };
})();

