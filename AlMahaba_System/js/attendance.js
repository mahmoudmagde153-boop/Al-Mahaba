window.Attendance = (function () {
    'use strict';
    
    let currentMonth = '';
    let modalData = { month: '', employeeId: null, day: null };

    const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const ATTENDANCE_ICONS = {
        'present': '✅',
        'absent': '❌',
        'leave': '🏖️',
        'official_holiday': '🎉',
        'errand': '📋',
        'half_day': '🕐',
        'late_1': '⏰',
        'late_2': '⏰',
        'late_3': '⏰',
        'late_4': '⏰',
        'late_5': '⏰'
    };
    const ATTENDANCE_NAMES = {
        'present': 'حضور',
        'absent': 'غياب',
        'leave': 'إجازة',
        'official_holiday': 'عطلة رسمية',
        'errand': 'مأمورية',
        'half_day': 'نص يوم',
        'late_1': 'تأخير 1 ساعة',
        'late_2': 'تأخير 2 ساعة',
        'late_3': 'تأخير 3 ساعات',
        'late_4': 'تأخير 4 ساعات',
        'late_5': 'تأخير 5 ساعات'
    };

    function getAttendanceClass(type) {
        if (!type) return '';
        if (type.startsWith('late')) return 'late';
        return type;
    }

    function init() {
        const select = document.getElementById('attendanceMonthSelect');
        if (select) {
            if (window.populateMonthSelect) {
                window.populateMonthSelect(select, select.value || window.getCurrentMonth());
            }
            currentMonth = select.value || window.getCurrentMonth();
        } else {
            currentMonth = window.getCurrentMonth();
        }
        render();
        setupEvents();
    }

    let eventsAttached = false;
    function setupEvents() {
        if (eventsAttached) return;
        
        const monthSelect = document.getElementById('attendanceMonthSelect');
        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                currentMonth = e.target.value;
                render();
            });
        }

        const body = document.getElementById('attendanceBody');
        if (body) {
            body.addEventListener('click', (e) => {
                const cell = e.target.closest('.att-cell');
                if (!cell) return;
                const emp = cell.dataset.emp;
                const day = cell.dataset.day;
                const month = cell.dataset.month;
                openAttendanceModal(month, parseInt(emp), parseInt(day));
            });
        }

        const typeGrid = document.getElementById('attendanceTypeGrid');
        if (typeGrid) {
            typeGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.att-type-btn');
                if (!btn) return;

                const type = btn.dataset.type;
                const { month, employeeId, day } = modalData;
                
                const attendance = window.DB.getAttendance(month) || {};
                if (!attendance[employeeId]) attendance[employeeId] = {};
                
                if (type === '') {
                    delete attendance[employeeId][day];
                } else {
                    attendance[employeeId][day] = type;
                }
                
                window.DB.saveAttendance(month, attendance);
                render();
                closeAttendanceModal();
            });
        }

        const closeBtn = document.getElementById('attendanceModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAttendanceModal);
        }
        const overlay = document.getElementById('attendanceModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) closeAttendanceModal();
            });
        }

        eventsAttached = true;
    }

    function render() {
        const parts = currentMonth.split('-');
        const year = parseInt(parts[0]);
        const monthNum = parseInt(parts[1]);
        const daysInMonth = window.getDaysInMonth(year, monthNum);
        const employees = window.DB.getEmployees().filter(e => e.active !== false);
        const attendance = window.DB.getAttendance(currentMonth) || {};
        const salaryDetailsData = window.DB.getSalaryDetails(currentMonth) || {};

        let headerHTML = '<th>الموظف</th>';
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = new Date(year, monthNum - 1, d);
            const dayName = ARABIC_DAYS[dayDate.getDay()];
            const isFriday = dayDate.getDay() === 5;
            headerHTML += `<th style="${isFriday ? 'color: var(--danger);' : ''}">${d}<br><span style="font-size: 0.6rem; font-weight: 400;">${dayName.slice(0, 3)}</span></th>`;
        }
        document.getElementById('attendanceHeader').innerHTML = headerHTML;

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
                            data-month="${currentMonth}"
                            title="${ATTENDANCE_NAMES[type] || 'غير مسجل'}">
                        ${icon}
                    </button>
                </td>`;
            }
            
            bodyHTML += '</tr>';
        });
        document.getElementById('attendanceBody').innerHTML = bodyHTML;

        let summaryHTML = '';
        employees.forEach(emp => {
            const summary = window.DB.getAttendanceSummary(emp.id, currentMonth);
            const advancesTotal = (salaryDetailsData[emp.id] && salaryDetailsData[emp.id].advances) ? salaryDetailsData[emp.id].advances : 0;
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
                    <td class="text-warning fw-bold">${advancesTotal}</td>
                </tr>
            `;
        });
        document.getElementById('attendanceSummaryBody').innerHTML = summaryHTML;
    }

    function openAttendanceModal(month, employeeId, day) {
        const emp = window.DB.getEmployeeById(employeeId);
        if (!emp) return;
        modalData = { month, employeeId, day };
        document.getElementById('attendanceModalTitle').textContent = `تسجيل حضور ${emp.name} - يوم ${day}`;
        document.getElementById('attendanceModalOverlay').classList.add('show');
    }

    function closeAttendanceModal() {
        document.getElementById('attendanceModalOverlay').classList.remove('show');
        modalData = { month: '', employeeId: null, day: null };
    }

    function showAdvanceModal() {
        const select = document.getElementById('advEmployee');
        select.innerHTML = window.DB.getEmployees().filter(e => e.active !== false).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        document.getElementById('advanceModalOverlay').classList.add('show');
    }

    function hideAdvanceModal() {
        document.getElementById('advanceModalOverlay').classList.remove('show');
    }

    function saveAdvance(e) {
        e.preventDefault();
        const empId = parseInt(document.getElementById('advEmployee').value);
        const amount = parseFloat(document.getElementById('advAmount').value);
        
        if (!empId || !amount || amount <= 0) return;

        const emp = window.DB.getEmployeeById(empId);
        if (!emp) return;

        const salaryDetails = window.DB.getSalaryDetails(currentMonth) || {};
        if (!salaryDetails[empId]) {
            salaryDetails[empId] = { advances: 0, bonus: 0, overtimeDays: 0, leaveDeduction: 0 };
        }
        salaryDetails[empId].advances = (salaryDetails[empId].advances || 0) + amount;
        window.DB.saveSalaryDetails(currentMonth, salaryDetails);

        if (window.DB.addTreasuryTx) {
            window.DB.addTreasuryTx({
                id: Date.now(),
                date: new Date().toISOString(),
                type: 'expense',
                amount: amount,
                notes: 'سلفة للموظف: ' + emp.name,
                paymentMethod: 'cash'
            });
        }

        window.showToast('تم تسجيل سلفة بقيمة ' + amount + ' ج.م للموظف ' + emp.name, 'success');
        hideAdvanceModal();
        document.getElementById('advanceForm').reset();
        render(); // Update summary table
    }

    function showBonusModal() {
        const empSelect = document.getElementById('bonusEmployee');
        if (!empSelect) return;
        
        empSelect.innerHTML = '<option value="" disabled selected>اختر الموظف...</option>';
        window.DB.getEmployees().filter(e => e.active !== false).forEach(emp => {
            empSelect.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
        
        document.getElementById('bonusModalOverlay').classList.add('show');
    }

    function hideBonusModal() {
        document.getElementById('bonusModalOverlay').classList.remove('show');
    }

    function saveBonus(e) {
        e.preventDefault();
        const empId = parseInt(document.getElementById('bonusEmployee').value);
        const amount = parseFloat(document.getElementById('bonusAmount').value);
        
        if (!empId || !amount || amount <= 0) return;

        const emp = window.DB.getEmployeeById(empId);
        if (!emp) return;

        const salaryDetails = window.DB.getSalaryDetails(currentMonth) || {};
        if (!salaryDetails[empId]) {
            salaryDetails[empId] = { advances: 0, bonus: 0, paidBonus: 0, overtimeDays: 0, leaveDeduction: 0 };
        }
        
        // Add to total bonus AND to paid bonus
        salaryDetails[empId].bonus = (salaryDetails[empId].bonus || 0) + amount;
        salaryDetails[empId].paidBonus = (salaryDetails[empId].paidBonus || 0) + amount;
        
        window.DB.saveSalaryDetails(currentMonth, salaryDetails);

        if (window.DB.addTreasuryTx) {
            window.DB.addTreasuryTx({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                amount: amount,
                notes: 'صرف مكافأة / بونص فوري للموظف: ' + emp.name,
                paymentMethod: 'cash'
            });
        }

        window.showToast('تم صرف مكافأة بقيمة ' + amount + ' ج.م للموظف ' + emp.name, 'success');
        hideBonusModal();
        document.getElementById('bonusForm').reset();
        render(); 
    }

    return { 
        init,
        showAdvanceModal,
        hideAdvanceModal,
        saveAdvance,
        showBonusModal,
        hideBonusModal,
        saveBonus
    };
})();

