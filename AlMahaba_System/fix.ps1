$content = Get-Content "C:\Users\Mahmoud.Magdy\.gemini\antigravity\scratch\AlMahaba_System\js\attendance.js" -Raw

$content = $content.Replace("getElementById('page-content')", "getElementById('page-attendance')")

$modalHtml = @"
          <!-- زر تسجيل السلفة -->
          <div class="header-actions" style="margin-top: 10px; display: flex; gap: 10px;">
            <button class="btn btn-warning" onclick="window.Attendance.showAdvanceModal()">
              <i class="fas fa-money-bill-wave"></i> تسجيل سلفة
            </button>
          </div>
          
          <!-- نافذة السلف المنبثقة -->
          <div id="advanceModal" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div class="modal glass-card" style="width: 400px; padding: 20px; border-radius: 12px; background: var(--bg-card);">
              <div class="modal-header" style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3>تسجيل سلفة نقدية</h3>
                <button onclick="window.Attendance.hideAdvanceModal()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem;">&times;</button>
              </div>
              <div class="modal-body">
                <form id="advanceForm" onsubmit="window.Attendance.saveAdvance(event)">
                  <div class="form-group" style="margin-bottom: 15px;">
                    <label>اختر الموظف</label>
                    <select id="advEmployee" class="input-field" required style="width: 100%; padding: 8px;">
                      `${window.DB.getEmployees().filter(e => e.active !== false).map(e => `<option value="`${e.id}`">`${e.name}`</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group" style="margin-bottom: 15px;">
                    <label>مبلغ السلفة (ج.م)</label>
                    <input type="number" id="advAmount" class="input-field" required min="1" step="1" style="width: 100%; padding: 8px;">
                  </div>
                  <div class="form-actions" style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="window.Attendance.hideAdvanceModal()">إلغاء</button>
                    <button type="submit" class="btn btn-warning">تسجيل السلفة</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div class="month-selector">
"@

$content = $content.Replace('<div class="month-selector">', $modalHtml)

$content = $content.Replace('<th class="summary-col">الإجازات</th>', '<th class="summary-col">الإجازات</th><th class="summary-col" style="color:#f59e0b">السلف (ج)</th>')
$content = $content.Replace('<th class="summary-col"></th>', '<th class="summary-col"></th><th class="summary-col"></th>')

$tableLoopStart = "    let bodyRows = '';`n    employees.forEach(emp => {`n      const empAtt = attendanceData[emp.id] || {};`n      let presentCount = 0, absentCount = 0, leaveCount = 0;"
$tableLoopNew = "    let bodyRows = '';`n    const salaryDetailsData = window.DB.getSalaryDetails(selectedMonth) || {};`n    employees.forEach(emp => {`n      const empAtt = attendanceData[emp.id] || {};`n      let presentCount = 0, absentCount = 0, leaveCount = 0;`n      const advancesTotal = (salaryDetailsData[emp.id] && salaryDetailsData[emp.id].advances) ? salaryDetailsData[emp.id].advances : 0;"

$content = $content.Replace($tableLoopStart, $tableLoopNew)

$cellEnd = "      cells += `<td class=`"summary-col leave-count`">`${leaveCount}</td>`;"
$cellNew = "      cells += `<td class=`"summary-col leave-count`">`${leaveCount}</td>`;`n      cells += `<td class=`"summary-col`" style=`"color:#f59e0b; font-weight:bold;`">`${advancesTotal}</td>`;"
$content = $content.Replace($cellEnd, $cellNew)

$advanceFuncs = @"
  function showAdvanceModal() {
      const modal = document.getElementById('advanceModal');
      if (modal) modal.style.display = 'flex';
  }

  function hideAdvanceModal() {
      const modal = document.getElementById('advanceModal');
      if (modal) modal.style.display = 'none';
  }

  function saveAdvance(e) {
      e.preventDefault();
      const empId = parseInt(document.getElementById('advEmployee').value);
      const amount = parseFloat(document.getElementById('advAmount').value);
      
      if (!empId || !amount || amount <= 0) return;

      const emp = window.DB.getEmployees().find(e => e.id === empId);
      if (!emp) return;

      const salaryDetails = window.DB.getSalaryDetails(selectedMonth) || {};
      if (!salaryDetails[empId]) {
          salaryDetails[empId] = { advances: 0, bonus: 0, overtimeDays: 0, leaveDeduction: 0 };
      }
      salaryDetails[empId].advances = (salaryDetails[empId].advances || 0) + amount;
      window.DB.saveSalaryDetails(selectedMonth, salaryDetails);

      if (window.DB.addTreasuryTx) {
          window.DB.addTreasuryTx({
              date: new Date().toISOString(),
              type: 'expense',
              amount: amount,
              notes: 'سلفة للموظف: ' + emp.name,
              paymentMethod: 'cash'
          });
      }

      window.App.showToast('تم تسجيل سلفة بقيمة ' + amount + ' ج.م للموظف ' + emp.name, 'success');
      hideAdvanceModal();
      document.getElementById('advanceForm').reset();
      
      // Update table to show new advance
      const scrollContainer = document.getElementById('attendance-scroll');
      if (scrollContainer) {
        scrollContainer.innerHTML = buildTable();
      }
  }

  return {
"@

$content = $content.Replace("  return {", $advanceFuncs)
$content = $content.Replace("    init`n  };", "    init,`n    showAdvanceModal,`n    hideAdvanceModal,`n    saveAdvance`n  };")

Set-Content "C:\Users\Mahmoud.Magdy\OneDrive - Nations of sky\Desktop\AlMahaba_System\js\attendance.js" $content
Write-Output "SUCCESS"
