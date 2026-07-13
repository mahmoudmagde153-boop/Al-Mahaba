/* ╔══════════════════════════════════════════════════════════════════════════════╗
   ║  شركة المحبة لقطع الغيار - قاعدة البيانات المحلية                         ║
   ║  Database Manager - LocalStorage Persistence Layer                          ║
   ╚══════════════════════════════════════════════════════════════════════════════╝ */

/**
 * مدير قاعدة البيانات المحلية
 * يستخدم LocalStorage لحفظ البيانات بشكل دائم في المتصفح
 */
class DB {
    constructor() {
        /** @type {string} بادئة مميزة لتجنب تداخل البيانات */
        this.PREFIX = 'almahaba_';
        
        /** @type {string} إصدار قاعدة البيانات */
        this.VERSION = '1.0.0';

        // تهيئة السحابة
        if (window.supabase) {
            this.supabase = window.supabase.createClient(
                'https://qcppvkjfsxuctgbylcpm.supabase.co',
                'sb_publishable_i43B3x7fbi_nT0xSfpBEmA_7_sjBA-A' // استخدم الـ Anon Key هنا
            );
        }
    }

    _fixLocalStorage() {
        if (localStorage.getItem('almahaba_data_fixed_v6')) return;
        
        const tables = ['settings', 'employees', 'treasury_txs', 'suppliers', 'supplier_txs', 'attendance', 'salary_details', 'archive'];
        let changed = false;
        tables.forEach(table => {
            let data = this.get(table);
            if (data) {
                const map = {
                    'overtimerate': 'overtimeRate', 'workhoursperday': 'workHoursPerDay', 'weeklyoff': 'weeklyOff',
                    'basesalary': 'baseSalary', 'leavebalance': 'leaveBalance', 'joindate': 'joinDate',
                    'initialbalance': 'initialBalance', 'initialtreasury': 'initialTreasury', 'initialvisa': 'initialVisa',
                    'supplierid': 'supplierId', 'invoiceno': 'invoiceNo', 'createdby': 'createdBy',
                    'totalsalaries': 'totalSalaries', 'employeecount': 'employeeCount', 'attendancerate': 'attendanceRate',
                    'handledby': 'handledBy', 'overtimedays': 'overtimeDays'
                };
                
                const fixObj = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) {
                        obj.forEach(o => fixObj(o));
                        return;
                    }
                    for (let k in obj) {
                        if (map[k] && obj[map[k]] === undefined) {
                            obj[map[k]] = obj[k];
                            delete obj[k];
                            changed = true;
                        } else if (typeof obj[k] === 'object') {
                            fixObj(obj[k]);
                        }
                    }
                };
                fixObj(data);
                this._setLocal(table, data);
            }
        });

        // Fix tiny Supplier IDs
        let suppliers = this.get('suppliers') || [];
        let txs = this.get('supplier_txs') || [];
        let linkChanged = false;
        
        txs.forEach(tx => {
            if (tx.supplierId) {
                // If the supplierId is tiny, it means it was divided by 1000
                const supplierExists = suppliers.find(s => s.id == tx.supplierId);
                if (!supplierExists) {
                    const originalSupplier = suppliers.find(s => Math.floor(s.id / 1000) == tx.supplierId);
                    if (originalSupplier) {
                        tx.supplierId = originalSupplier.id;
                        linkChanged = true;
                        changed = true;
                    }
                }
            }
        });

        if (linkChanged) {
            this.set('supplier_txs', txs);
        }

        let treasuryTxs = this.get('treasury_txs') || [];
        let treasuryChanged = false;
        treasuryTxs.forEach(tx => {
            if (tx.supplierId) {
                const supplierExists = suppliers.find(s => s.id == tx.supplierId);
                if (!supplierExists) {
                    const originalSupplier = suppliers.find(s => Math.floor(s.id / 1000) == tx.supplierId);
                    if (originalSupplier) {
                        tx.supplierId = originalSupplier.id;
                        treasuryChanged = true;
                        changed = true;
                    }
                }
            }
        });

        if (treasuryChanged) {
            this.set('treasury_txs', treasuryTxs);
        }

        if (changed || linkChanged || treasuryChanged) {
            this._setLocal('last_updated', Date.now() + 5000);
            console.log('✅ Ultimate Fix Applied to Corrupted Data.');
            localStorage.setItem('almahaba_data_fixed_v6', 'true');
            if (window.location) window.location.reload();
        } else {
            localStorage.setItem('almahaba_data_fixed_v6', 'true');
        }
    }

    async _syncToSupabase() {
        if (!this.supabase) return;
        try {
            const fullData = {
                users: this.get('users'),
                settings: this.get('settings'),
                employees: this.get('employees'),
                treasury_txs: this.get('treasury_txs'),
                suppliers: this.get('suppliers'),
                supplier_txs: this.get('supplier_txs'),
                attendance: this.get('attendance'),
                salary_details: this.get('salary_details'),
                archive: this.get('archive'),
                last_updated: this.get('last_updated') || Date.now()
            };
            await this.supabase.from('attendance').upsert({ month_key: 'FULL_DB_BACKUP', data: fullData });
        } catch(e) { console.error('Supabase Sync Error', e); }
    }

    async _fetchFromSupabase() {
        if (!this.supabase) return;
        try {
            const { data } = await this.supabase.from('attendance').select('data').eq('month_key', 'FULL_DB_BACKUP').single();
            if (data && data.data && data.data.users) {
                const cloudDb = data.data;
                const localTimestamp = this.get('last_updated') || 0;
                const cloudTimestamp = cloudDb.last_updated || 0;
                
                if (cloudTimestamp > localTimestamp) {
                    console.log('☁️ السحابة أحدث، جاري التحديث...');
                    for (let k in cloudDb) {
                        this._setLocal(k, cloudDb[k]);
                    }
                    if (!sessionStorage.getItem('almahaba_just_fetched')) {
                        sessionStorage.setItem('almahaba_just_fetched', '1');
                        window.location.reload();
                    }
                } else if (localTimestamp > cloudTimestamp) {
                    this._syncToSupabase();
                }
            } else if (!data) {
                this._syncToSupabase();
            }
        } catch(e) { console.error('Fetch error', e); }
    }

    async _syncAllToSupabase() {
        if (!this.supabase) return;
        if(window.showToast) window.showToast('🚀 جاري رفع داتا شركتك إلى السحابة كنسخة احتياطية...', 'info');
        this._setLocal('last_updated', Date.now() + 1000);
        await this._syncToSupabase();
        if(window.showToast) {
            setTimeout(() => window.showToast('✅ تمت المزامنة بنجاح! السحابة الآن جاهزة.', 'success'), 2000);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       التهيئة الأولية
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * تهيئة قاعدة البيانات بالبيانات الافتراضية إذا كانت فارغة
     */
    init() {
        this._fixLocalStorage();
        // التحقق من وجود بيانات مسبقة
        if (!this.get('initialized')) {
            console.log('🔧 تهيئة قاعدة البيانات لأول مرة...');
            this._initDefaultEmployees();
            this._initDefaultSettings();
            this._initDefaultAttendance();
            this._initDefaultSalaryDetails();
            this._setLocal('suppliers', []);
            this._setLocal('supplier_txs', []);
            this._setLocal('treasury_txs', []);
            this._setLocal('users', [{
                id: 1,
                username: 'admin',
                password: '123', // Default simple password
                name: 'المدير الرئيسي',
                role: 'admin',
                permissions: ['*']
            }]);
            this._setLocal('initialized', true);
            this._setLocal('version', this.VERSION);
            console.log('✅ تم تهيئة قاعدة البيانات بنجاح');
        } else {
            console.log('📂 قاعدة البيانات موجودة بالفعل');
            // تأكد من وجود جدول المستخدمين في التحديث
            if (!this.get('users')) {
                this.set('users', [{
                    id: 1,
                    username: 'admin',
                    password: '123',
                    name: 'المدير الرئيسي',
                    role: 'admin',
                    permissions: ['*']
                }]);
            }
        }

        // تحديث الحضور لشهر يونيو 2026 من ملف الإكسيل الجديد (بدون سلف أو بونص)
        if (!this.get('attendance_updated_june2026_v5')) {
            console.log('🔄 تحديث حضور شهر يونيو 2026 من الشيت...');
            const attendance = this.get('attendance') || {};
            attendance['2026-06'] = {
                1: { 1:'present', 2:'present', 3:'present', 4:'present', 5:'present', 6:'present', 7:'leave', 8:'present', 9:'present', 10:'present', 11:'present', 12:'present', 13:'present', 14:'leave', 15:'present', 16:'present', 17:'present', 18:'present', 19:'present', 20:'present', 21:'leave', 22:'present', 23:'present', 24:'present', 25:'present', 26:'present', 27:'present', 28:'leave', 29:'present' },
                2: { 1:'late_3', 2:'half_day', 3:'half_day', 4:'half_day', 5:'present', 6:'half_day', 7:'leave', 8:'half_day', 9:'present', 10:'present', 11:'present', 12:'present', 13:'present', 14:'leave', 15:'present', 16:'present', 17:'present', 18:'present', 19:'late_2', 20:'late_1', 21:'leave', 22:'absent', 23:'late_2', 24:'late_2', 25:'half_day', 26:'present', 27:'half_day', 28:'leave', 29:'half_day' },
                3: { 1:'absent', 2:'late_2', 3:'late_2', 4:'half_day', 5:'present', 6:'half_day', 7:'leave', 8:'half_day', 9:'half_day', 10:'late_1', 11:'half_day', 12:'absent', 13:'absent', 14:'present', 15:'half_day', 16:'present', 17:'present', 18:'present', 19:'late_2', 20:'late_1', 21:'leave', 22:'present', 23:'late_2', 24:'present', 25:'half_day', 26:'present', 27:'half_day', 28:'leave', 29:'present' },
                4: { 1:'absent', 2:'absent', 3:'absent', 4:'absent', 5:'absent', 6:'absent', 7:'leave', 8:'absent', 9:'absent', 10:'absent', 11:'absent', 12:'absent', 13:'absent', 14:'leave', 15:'absent', 16:'absent', 17:'absent', 18:'absent', 19:'absent', 20:'absent', 21:'absent', 22:'absent', 23:'absent', 24:'absent', 25:'absent', 26:'half_day', 27:'half_day', 28:'leave', 29:'present' },
                5: { 1:'absent', 2:'absent', 3:'absent', 4:'absent', 5:'absent', 6:'absent', 7:'leave', 8:'absent', 9:'absent', 10:'absent', 11:'absent', 12:'absent', 13:'absent', 14:'absent', 15:'absent', 16:'half_day', 17:'present', 18:'half_day', 19:'late_2', 20:'late_1', 21:'leave', 22:'half_day', 23:'present', 24:'present', 25:'present', 26:'absent', 27:'late_2', 28:'leave', 29:'present' }
            };
            this.set('attendance', attendance);
            this.set('attendance_updated_june2026_v5', true);
            console.log('✅ تم تحديث بيانات الحضور فقط v5');
        }

        // جلب الداتا من السحابة لو موجودة
        this._fetchFromSupabase().then(() => {
            this._syncAllToSupabase();
        });
    }

    /**
     * تهيئة بيانات الموظفين الافتراضية
     * @private
     */
    _initDefaultEmployees() {
        const employees = [
            {
                id: 1,
                name: 'حاتم',
                baseSalary: 13000,
                leaveBalance: 21,
                phone: '',
                joinDate: '2024-01-01',
                notes: '',
                active: true
            },
            {
                id: 2,
                name: 'خوليو',
                baseSalary: 8000,
                leaveBalance: 21,
                phone: '',
                joinDate: '2024-01-01',
                notes: '',
                active: true
            },
            {
                id: 3,
                name: 'فهد',
                baseSalary: 8000,
                leaveBalance: 21,
                phone: '',
                joinDate: '2024-01-01',
                notes: '',
                active: true
            },
            {
                id: 4,
                name: 'حمص',
                baseSalary: 4000,
                leaveBalance: 21,
                phone: '',
                joinDate: '2024-01-01',
                notes: '',
                active: true
            },
            {
                id: 5,
                name: 'محمد',
                baseSalary: 6000,
                leaveBalance: 21,
                phone: '',
                joinDate: '2024-01-01',
                notes: '',
                active: true
            }
        ];

        this.set('employees', employees);
        this.set('nextEmployeeId', 6);
    }

    /**
     * تهيئة الإعدادات الافتراضية
     * @private
     */
    _initDefaultSettings() {
        const settings = {
            theme: 'dark',
            overtimeRate: 100,       // بدل الأوفرتايم بالجنيه لكل يوم
            workHoursPerDay: 10,     // ساعات العمل اليومية
            weeklyOff: 'sunday',     // يوم الإجازة الأسبوعية
            companyName: 'شركة المحبة لقطع الغيار',
            systemTitle: 'نظام إدارة الحضور والمرتبات'
        };

        this.set('settings', settings);
    }

    /**
     * تهيئة بيانات الحضور الافتراضية لشهر يونيو 2026
     * @private
     */
    _initDefaultAttendance() {
        const month = '2026-06'; // يونيو 2026

        const attendance = {};

        // حاتم (id: 1)
        attendance[1] = { 1:'present', 2:'present', 3:'present', 4:'present', 5:'present', 6:'present', 7:'leave', 8:'present', 9:'present', 10:'present', 11:'present', 12:'present', 13:'present', 14:'leave', 15:'present', 16:'present', 17:'present', 18:'present', 19:'present', 20:'present', 21:'leave', 22:'present', 23:'present', 24:'present', 25:'present', 26:'present', 27:'present', 28:'leave', 29:'present' };

        // خوليو (id: 2)
        attendance[2] = { 1:'late_3', 2:'half_day', 3:'half_day', 4:'half_day', 5:'present', 6:'half_day', 7:'leave', 8:'half_day', 9:'present', 10:'present', 11:'present', 12:'present', 13:'present', 14:'leave', 15:'present', 16:'present', 17:'present', 18:'present', 19:'late_2', 20:'late_1', 21:'leave', 22:'absent', 23:'late_2', 24:'late_2', 25:'half_day', 26:'present', 27:'half_day', 28:'leave', 29:'half_day' };

        // فهد (id: 3)
        attendance[3] = { 1:'absent', 2:'late_2', 3:'late_2', 4:'half_day', 5:'present', 6:'half_day', 7:'leave', 8:'half_day', 9:'half_day', 10:'late_1', 11:'half_day', 12:'absent', 13:'absent', 14:'present', 15:'half_day', 16:'present', 17:'present', 18:'present', 19:'late_2', 20:'late_1', 21:'leave', 22:'present', 23:'late_2', 24:'present', 25:'half_day', 26:'present', 27:'half_day', 28:'leave', 29:'present' };

        // حمص (id: 4)
        attendance[4] = { 1:'absent', 2:'absent', 3:'absent', 4:'absent', 5:'absent', 6:'absent', 7:'leave', 8:'absent', 9:'absent', 10:'absent', 11:'absent', 12:'absent', 13:'absent', 14:'leave', 15:'absent', 16:'absent', 17:'absent', 18:'absent', 19:'absent', 20:'absent', 21:'absent', 22:'absent', 23:'absent', 24:'absent', 25:'absent', 26:'half_day', 27:'half_day', 28:'leave', 29:'present' };

        // محمد (id: 5)
        attendance[5] = { 1:'absent', 2:'absent', 3:'absent', 4:'absent', 5:'absent', 6:'absent', 7:'leave', 8:'absent', 9:'absent', 10:'absent', 11:'absent', 12:'absent', 13:'absent', 14:'absent', 15:'absent', 16:'half_day', 17:'present', 18:'half_day', 19:'late_2', 20:'late_1', 21:'leave', 22:'half_day', 23:'present', 24:'present', 25:'present', 26:'absent', 27:'late_2', 28:'leave', 29:'present' };

        this.saveAttendance(month, attendance);
    }

    /**
     * تهيئة تفاصيل المرتبات الافتراضية لشهر يونيو 2026
     * @private
     */
    _initDefaultSalaryDetails() {
        const month = '2026-06';

        /*
         * هيكل تفاصيل المرتبات:
         * { "employeeId": { advances, bonus, overtimeDays, notes } }
         * الحقول الإضافية مثل السلف والمكافآت يدخلها المستخدم
         */
        const salaryDetails = {
            1: { advances: 0, bonus: 0, overtimeDays: 0, notes: '' },
            2: { advances: 0, bonus: 0, overtimeDays: 0, notes: '' },
            3: { advances: 300, bonus: 0, overtimeDays: 0, notes: 'سلفة 300 جنيه' },
            4: { advances: 0, bonus: 0, overtimeDays: 0, notes: '' },
            5: { advances: 0, bonus: 0, overtimeDays: 0, notes: '' }
        };

        this.saveSalaryDetails(month, salaryDetails);
    }

    /* ═══════════════════════════════════════════════════════════════════════
       عمليات التخزين الأساسية (Core Storage Operations)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * قراءة قيمة من التخزين المحلي
     * @param {string} key - مفتاح البيانات
     * @returns {*} القيمة المخزنة أو null
     */
    get(key) {
        try {
            const data = localStorage.getItem(this.PREFIX + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ خطأ في قراءة المفتاح: ${key}`, error);
            return null;
        }
    }

    /**
     * حفظ قيمة في التخزين المحلي
     * @param {string} key - مفتاح البيانات
     * @param {*} value - القيمة المراد حفظها
     */
    set(key, value) {
        if(key !== 'last_updated') {
            const oldTime = this.get('last_updated') || 0;
            const newTime = Math.max(Date.now(), oldTime + 1);
            this._setLocal('last_updated', newTime);
        }
        this._setLocal(key, value);
        if (key !== 'initialized' && key !== 'last_updated') {
            this._syncToSupabase();
        }
    }

    _setLocal(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
        } catch (error) {
            console.error(`❌ خطأ في حفظ البيانات: ${key}`, error);
            if (error.name === 'QuotaExceededError') {
                console.error('⚠️ مساحة التخزين ممتلئة!');
            }
        }
    }

    /**
     * حذف قيمة من التخزين المحلي
     * @param {string} key - مفتاح البيانات
     */
    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
    }

    /* ═══════════════════════════════════════════════════════════════════════
       إدارة الموظفين (Employee Management)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * الحصول على قائمة جميع الموظفين
     * @param {boolean} [activeOnly=true] - إرجاع الموظفين النشطين فقط
     * @returns {Array} قائمة الموظفين
     */
    getEmployees(activeOnly = true) {
        const employees = this.get('employees') || [];
        if (activeOnly) {
            return employees.filter(emp => emp.active !== false);
        }
        return employees;
    }

    /**
     * الحصول على موظف بواسطة المعرف
     * @param {number} id - معرف الموظف
     * @returns {Object|null} بيانات الموظف
     */
    getEmployeeById(id) {
        const employees = this.get('employees') || [];
        return employees.find(emp => emp.id === id) || null;
    }

    /**
     * حفظ/تحديث بيانات موظف
     * @param {Object} employee - بيانات الموظف
     * @returns {Object} الموظف بعد الحفظ
     */
    saveEmployee(employee) {
        const employees = this.get('employees') || [];

        if (employee.id) {
            // تحديث موظف موجود
            const index = employees.findIndex(emp => emp.id === employee.id);
            if (index !== -1) {
                employees[index] = { ...employees[index], ...employee };
            }
        } else {
            // إضافة موظف جديد
            const nextId = this.get('nextEmployeeId') || 1;
            employee.id = nextId;
            employee.active = true;
            employees.push(employee);
            this.set('nextEmployeeId', nextId + 1);
        }

        this.set('employees', employees);
        return employee;
    }

    /**
     * حذف موظف (حذف ناعم - تعطيل)
     * @param {number} id - معرف الموظف
     */
    deleteEmployee(id) {
        const employees = this.get('employees') || [];
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            employees[index].active = false;
            this.set('employees', employees);
        }
    }

    /**
     * حذف موظف نهائياً
     * @param {number} id - معرف الموظف
     */
    hardDeleteEmployee(id) {
        const employees = this.get('employees') || [];
        const filtered = employees.filter(emp => emp.id !== id);
        this.set('employees', filtered);
    }

    /* ═══════════════════════════════════════════════════════════════════════
       إدارة الحضور (Attendance Management)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * الحصول على بيانات الحضور لشهر معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @returns {Object} بيانات الحضور
     */
    getAttendance(month) {
        return this.get(`attendance_${month}`) || {};
    }

    /**
     * حفظ بيانات الحضور لشهر معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @param {Object} data - بيانات الحضور
     */
    saveAttendance(month, data) {
        this.set(`attendance_${month}`, data);
    }

    /**
     * تحديث حضور موظف ليوم معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @param {number} employeeId - معرف الموظف
     * @param {number} day - رقم اليوم
     * @param {string} type - نوع الحضور
     */
    updateAttendanceCell(month, employeeId, day, type) {
        const attendance = this.getAttendance(month);
        if (!attendance[employeeId]) {
            attendance[employeeId] = {};
        }

        if (type === '' || type === null || type === undefined) {
            // مسح الحضور
            delete attendance[employeeId][day];
        } else {
            attendance[employeeId][day] = type;
        }

        this.saveAttendance(month, attendance);
    }

    /**
     * حساب ملخص حضور موظف لشهر معين
     * @param {number} employeeId - معرف الموظف
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @returns {Object} ملخص الحضور
     */
    getAttendanceSummary(employeeId, month) {
        const attendance = this.getAttendance(month);
        const empAttendance = attendance[employeeId] || {};

        const summary = {
            present: 0,        // أيام الحضور الكامل
            absent: 0,         // أيام الغياب
            leave: 0,          // أيام الإجازة
            officialHoliday: 0, // إجازات رسمية
            errand: 0,         // مأموريات
            halfDay: 0,        // أيام نصف يوم
            lateHours: 0,      // إجمالي ساعات التأخير
            lateDays: 0,       // عدد أيام التأخير
            totalWorked: 0     // إجمالي أيام العمل الفعلية
        };

        for (const [day, type] of Object.entries(empAttendance)) {
            switch (type) {
                case 'present':
                    summary.present++;
                    break;
                case 'absent':
                    summary.absent++;
                    break;
                case 'leave':
                    summary.leave++;
                    break;
                case 'official_holiday':
                    summary.officialHoliday++;
                    break;
                case 'errand':
                    summary.errand++;
                    break;
                case 'half_day':
                    summary.halfDay++;
                    break;
                case 'late_1':
                case 'late_2':
                case 'late_3':
                case 'late_4':
                case 'late_5':
                    // استخراج عدد ساعات التأخير من نوع الحضور
                    const hours = parseInt(type.split('_')[1]);
                    summary.lateHours += hours;
                    summary.lateDays++;
                    break;
            }
        }

        // حساب إجمالي أيام العمل الفعلية
        // الحضور الكامل + المأمورية + أيام التأخير (تحسب حضور) + نصف يوم (0.5)
        summary.totalWorked = summary.present + summary.errand + summary.lateDays + (summary.halfDay * 0.5);

        return summary;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       إدارة المرتبات (Salary Management)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * الحصول على تفاصيل المرتبات الإضافية لشهر معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @returns {Object} تفاصيل المرتبات
     */
    getSalaryDetails(month) {
        return this.get(`salary_${month}`) || {};
    }

    /**
     * حفظ تفاصيل المرتبات الإضافية لشهر معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @param {Object} data - تفاصيل المرتبات
     */
    saveSalaryDetails(month, data) {
        this.set(`salary_${month}`, data);
    }

    /**
     * حساب مرتب موظف لشهر معين
     * @param {number} employeeId - معرف الموظف
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @returns {Object} تفاصيل المرتب المحسوب
     */
    calculateSalary(employeeId, month) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee) return null;

        const settings = this.getSettings();
        const summary = this.getAttendanceSummary(employeeId, month);
        const details = this.getSalaryDetails(month);
        const empDetails = details[employeeId] || { advances: 0, bonus: 0, overtimeDays: 0, notes: '' };

        const baseSalary = employee.baseSalary;
        const dailyRate = baseSalary / 30;
        const hourlyRate = dailyRate / settings.workHoursPerDay;

        // حساب الخصومات
        const absenceDeduction = dailyRate * summary.absent;
        const lateDeduction = hourlyRate * summary.lateHours;
        const leaveDeduction = dailyRate * summary.leave; // الإجازات تُخصم من الرصيد

        // حساب البدلات
        const overtimeAllowance = empDetails.overtimeDays * settings.overtimeRate;

        // صافي المرتب
        const totalDeductions = absenceDeduction + lateDeduction + leaveDeduction + empDetails.advances;
        const totalAdditions = empDetails.bonus + overtimeAllowance;
        const netSalary = baseSalary - totalDeductions + totalAdditions;

        return {
            employeeId,
            employeeName: employee.name,
            baseSalary,
            dailyRate,
            hourlyRate,

            // ملخص الحضور
            presentDays: summary.present,
            absentDays: summary.absent,
            leaveDays: summary.leave,
            halfDays: summary.halfDay,
            lateHours: summary.lateHours,
            lateDays: summary.lateDays,
            officialHolidays: summary.officialHoliday,
            errands: summary.errand,
            totalWorked: summary.totalWorked,

            // الخصومات
            absenceDeduction,
            lateDeduction,
            leaveDeduction,

            // الإضافات
            overtimeDays: empDetails.overtimeDays,
            overtimeAllowance,
            bonus: empDetails.bonus,
            advances: empDetails.advances,

            // الإجماليات
            totalDeductions,
            totalAdditions,
            netSalary,

            notes: empDetails.notes
        };
    }

    /* ═══════════════════════════════════════════════════════════════════════
       الإعدادات (Settings)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * الحصول على الإعدادات
     * @returns {Object} الإعدادات الحالية
     */
    getSettings() {
        return this.get('settings') || {
            theme: 'dark',
            overtimeRate: 100,
            workHoursPerDay: 10,
            weeklyOff: 'sunday',
            companyName: 'شركة المحبة لقطع الغيار',
            systemTitle: 'نظام إدارة الحضور والمرتبات'
        };
    }

    /**
     * حفظ الإعدادات
     * @param {Object} settings - الإعدادات المحدثة
     */
    saveSettings(settings) {
        const current = this.getSettings();
        this.set('settings', { ...current, ...settings });
        
        // التهيئة لـ IndexedDB للصور والمرفقات
        this.initIndexedDB().catch(e => console.error('Failed to init IndexedDB', e));
    }

    /* ═══════════════════════════════════════════════════════════════════════
       5. الأرشيف والتصدير
       ═══════════════════════════════════════════════════════════════════════ */

    /* ═══════════════════════════════════════════════════════════════════════
       إدارة المستخدمين والصلاحيات (Auth & RBAC)
       ═══════════════════════════════════════════════════════════════════════ */
    
    getUsers() {
        return this.get('users') || [];
    }

    getUser(id) {
        return this.getUsers().find(u => u.id == id);
    }

    getUserByUsername(username) {
        return this.getUsers().find(u => u.username === username);
    }

    addUser(user) {
        const users = this.getUsers();
        if (users.find(u => u.username === user.username)) {
            throw new Error('اسم المستخدم موجود مسبقاً');
        }
        user.id = Date.now();
        users.push(user);
        this.set('users', users);
    }

    updateUser(id, data) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.id == id);
        if (index !== -1) {
            // Check username conflict
            if (data.username && data.username !== users[index].username) {
                if (users.find(u => u.username === data.username)) {
                    throw new Error('اسم المستخدم موجود مسبقاً');
                }
            }
            users[index] = { ...users[index], ...data };
            this.set('users', users);
        }
    }

    deleteUser(id) {
        const users = this.getUsers();
        // Prevent deleting the main admin (id: 1)
        if (id == 1) throw new Error('لا يمكن حذف المدير الرئيسي');
        const newUsers = users.filter(u => u.id != id);
        this.set('users', newUsers);
    }

    login(username, password) {
        const user = this.getUserByUsername(username);
        if (user && user.password === password) {
            // Remove password from session
            const { password: _, ...sessionUser } = user;
            sessionStorage.setItem(this.PREFIX + 'currentUser', JSON.stringify(sessionUser));
            return true;
        }
        return false;
    }

    logout() {
        sessionStorage.removeItem(this.PREFIX + 'currentUser');
    }

    getCurrentUser() {
        const userStr = sessionStorage.getItem(this.PREFIX + 'currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.permissions.includes('*')) return true; // Super Admin
        return user.permissions.includes(permission);
    }

    _auditInfo() {
        const user = this.getCurrentUser();
        return {
            createdBy: user ? user.name : 'مجهول',
            createdAt: new Date().toISOString()
        };
    }

    /* ═══════════════════════════════════════════════════════════════════════
       2. الموظفين (Employees)
       ═══════════════════════════════════════════════════════════════════════ */
    getSuppliers() {
        return this.get('suppliers') || [];
    }

    saveSupplier(supplier) {
        const suppliers = this.getSuppliers();
        if (supplier.id) {
            const index = suppliers.findIndex(s => s.id == supplier.id);
            if (index !== -1) {
                // Keep the original createdBy if it exists
                supplier.createdBy = suppliers[index].createdBy;
                supplier.createdAt = suppliers[index].createdAt;
                suppliers[index] = { ...suppliers[index], ...supplier };
            }
        } else {
            supplier.id = Date.now();
            Object.assign(supplier, this._auditInfo());
            suppliers.push(supplier);
        }
        this.set('suppliers', suppliers);
        return supplier.id;
    }

    addSupplier(supplier) {
        const suppliers = this.getSuppliers();
        supplier.id = Date.now();
        Object.assign(supplier, this._auditInfo());
        suppliers.push(supplier);
        this.set('suppliers', suppliers);
    }

    deleteSupplier(id) {
        let suppliers = this.getSuppliers();
        suppliers = suppliers.filter(s => s.id != id);
        this.set('suppliers', suppliers);
        this.deleteImage(id).catch(e => console.error('Failed to delete supplier image', e));
    }

    getSupplierTxs() {
        return this.get('supplier_txs') || [];
    }

    addSupplierTx(tx) {
        const txs = this.getSupplierTxs();
        tx.id = Date.now();
        Object.assign(tx, this._auditInfo());
        txs.push(tx);
        this.set('supplier_txs', txs);
        return tx.id;
    }

    updateSupplierTx(id, newData) {
        const txs = this.getSupplierTxs();
        const index = txs.findIndex(t => t.id == id);
        if (index !== -1) {
            txs[index] = { ...txs[index], ...newData, ...this._auditInfo() }; // Audit update
            this.set('supplier_txs', txs);
        }
    }

    deleteSupplierTx(id) {
        let txs = this.getSupplierTxs();
        txs = txs.filter(t => t.id != id);
        this.set('supplier_txs', txs);
        this.deleteImage(id).catch(e => console.error(e));
    }

    /* ═══════════════════════════════════════════════════════════════════════
       7. الخزنة (Treasury)
       ═══════════════════════════════════════════════════════════════════════ */
    getTreasuryTxs() {
        return this.get('treasury_txs') || [];
    }

    addTreasuryTx(tx) {
        const txs = this.getTreasuryTxs();
        tx.id = Date.now();
        Object.assign(tx, this._auditInfo());
        txs.push(tx);
        this.set('treasury_txs', txs);
        return tx.id;
    }

    updateTreasuryTx(id, newData) {
        const txs = this.getTreasuryTxs();
        const index = txs.findIndex(t => t.id == id);
        if (index !== -1) {
            txs[index] = { ...txs[index], ...newData, ...this._auditInfo() };
            this.set('treasury_txs', txs);
        }
    }

    deleteTreasuryTx(id) {
        let txs = this.getTreasuryTxs();
        txs = txs.filter(t => t.id != id);
        this.set('treasury_txs', txs);
        this.deleteImage(id).catch(e => console.error(e));
    }

    async _initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AlMahaba_DB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images');
                }
            };
        });
    }

    async saveImage(id, dataUrl) {
        const db = await this._initIndexedDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            const request = store.put(dataUrl, id.toString());
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getImage(id) {
        const db = await this._initIndexedDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readonly');
            const store = tx.objectStore('images');
            const request = store.get(id.toString());
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteImage(id) {
        const db = await this._initIndexedDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readwrite');
            const store = tx.objectStore('images');
            const request = store.delete(id.toString());
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * الحصول على قائمة الأرشيف
     * @returns {Array} قائمة الأشهر المؤرشفة
     */
    getArchive() {
        return this.get('archive') || [];
    }

    /**
     * أرشفة شهر معين
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     * @returns {Object} بيانات الأرشيف
     */
    archiveMonth(month) {
        const archive = this.getArchive();

        // التحقق من عدم وجود أرشيف مسبق لنفس الشهر
        const existing = archive.find(a => a.month === month);
        if (existing) {
            // تحديث الأرشيف الموجود
            existing.attendance = this.getAttendance(month);
            existing.salaryDetails = this.getSalaryDetails(month);
            existing.employees = this.getEmployees(false);
            existing.updatedAt = new Date().toISOString();
        } else {
            // إنشاء أرشيف جديد
            archive.push({
                month,
                attendance: this.getAttendance(month),
                salaryDetails: this.getSalaryDetails(month),
                employees: this.getEmployees(false),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        // ترتيب حسب الشهر تنازلياً
        archive.sort((a, b) => b.month.localeCompare(a.month));
        this.set('archive', archive);

        return archive;
    }

    /**
     * حذف أرشيف شهر
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     */
    deleteArchive(month) {
        const archive = this.getArchive();
        const filtered = archive.filter(a => a.month !== month);
        this.set('archive', filtered);
    }

    /**
     * استعادة بيانات من الأرشيف
     * @param {string} month - الشهر بصيغة 'YYYY-MM'
     */
    restoreFromArchive(month) {
        const archive = this.getArchive();
        const entry = archive.find(a => a.month === month);
        if (entry) {
            this.saveAttendance(month, entry.attendance);
            this.saveSalaryDetails(month, entry.salaryDetails);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       التصدير والاستيراد (Export & Import)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * تصدير جميع البيانات كملف JSON
     * @returns {Object} جميع بيانات النظام
     */
    exportData() {
        const allData = {};
        const prefix = this.PREFIX;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                const cleanKey = key.replace(prefix, '');
                try {
                    allData[cleanKey] = JSON.parse(localStorage.getItem(key));
                } catch {
                    allData[cleanKey] = localStorage.getItem(key);
                }
            }
        }

        return {
            exportDate: new Date().toISOString(),
            version: this.VERSION,
            appName: 'شركة المحبة لقطع الغيار - نظام الحضور والمرتبات',
            data: allData
        };
    }

    /**
     * استيراد بيانات من ملف JSON
     * @param {string} jsonString - البيانات المستوردة كـ JSON string
     * @returns {boolean} نجاح العملية
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            Object.keys(data).forEach(key => {
                this.set(key, data[key]);
            });
            return true;
        } catch (e) {
            console.error('خطأ في استيراد البيانات:', e);
            return false;
        }
    }

    /**
     * مسح جميع بيانات التطبيق
     */
    clearAll() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    /**
     * إعادة تعيين قاعدة البيانات (مسح + إعادة تهيئة)
     */
    reset() {
        this.clearAll();
        this.init();
    }

    /* ═══════════════════════════════════════════════════════════════════════
       أدوات مساعدة (Utilities)
       ═══════════════════════════════════════════════════════════════════════ */

    /**
     * الحصول على قائمة الأشهر المتاحة (التي بها بيانات حضور)
     * @returns {Array<string>} قائمة الأشهر بصيغة 'YYYY-MM'
     */
    getAvailableMonths() {
        const months = new Set();
        const prefix = this.PREFIX + 'attendance_';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                months.add(key.replace(prefix, ''));
            }
        }

        // إضافة الشهر الحالي دائماً
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        months.add(currentMonth);

        // ترتيب تنازلياً
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }

    /**
     * الحصول على حجم البيانات المخزنة (بالبايت تقريبياً)
     * @returns {number} الحجم بالبايت
     */
    getStorageSize() {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.PREFIX)) {
                size += key.length + (localStorage.getItem(key) || '').length;
            }
        }
        return size * 2; // UTF-16
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// إنشاء نسخة عامة من قاعدة البيانات
// ══════════════════════════════════════════════════════════════════════════════
const db = new DB();
window.DB = db;

