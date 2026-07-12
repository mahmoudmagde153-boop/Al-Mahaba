class DB {
    constructor() {
        this.prefix = 'almahaba_';
        
        // Supabase configuration
        this.supabaseUrl = 'https://qcppvkjfsxuctgbylcpm.supabase.co';
        this.supabaseKey = 'sb_publishable_i43B3x7fbi_nT0xSfpBEmA_7_sjBA-A';
        
        if (window.supabase) {
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            console.error("Supabase SDK not loaded!");
        }
        
        // In-memory cache for synchronous reads
        this.state = {
            settings: null,
            users: [],
            employees: [],
            attendance: {}, // keyed by month
            salary_details: {}, // keyed by month
            treasury_txs: [],
            suppliers: [],
            supplier_txs: [],
            archive: []
        };
    }

    async init() {
        // Show loading screen
        let loader = document.createElement('div');
        loader.id = 'supabaseLoader';
        loader.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#0f172a;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:Cairo,sans-serif;">
                <div style="width:60px;height:60px;border:6px solid #1e293b;border-top-color:#10b981;border-radius:50%;animation:spin 1s linear infinite;"></div>
                <h2 style="margin-top:20px; font-weight:bold;">جاري الاتصال بالسحابة (Supabase)...</h2>
                <p style="color:#94a3b8; font-size:14px; margin-top:5px;" id="supabaseLoaderMsg">تحميل البيانات للمرة الأولى...</p>
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        document.body.appendChild(loader);

        try {
            // Migration is disabled for Supabase until SQL script is run
            await this.migrateIfNeeded();

            // Fetch all initial data
            await Promise.all([
                this._fetchCollection('settings', (data) => this.state.settings = data[0] || this._getDefaultSettings()),
                this._fetchCollection('users', async (data) => {
                    if (data.length === 0) {
                        const defaultAdmin = { id: '1', name: 'المدير الرئيسي', username: 'admin', password: '123', permissions: ['*'], role: 'مدير نظام' };
                        this.state.users = [defaultAdmin];
                        await this.supabase.from('users').upsert(defaultAdmin);
                    } else {
                        this.state.users = data;
                    }
                }),
                this._fetchCollection('employees', (data) => this.state.employees = data),
                this._fetchCollection('treasury_txs', (data) => this.state.treasury_txs = data),
                this._fetchCollection('suppliers', (data) => this.state.suppliers = data),
                this._fetchCollection('supplier_txs', (data) => this.state.supplier_txs = data),
                this._fetchCollection('archive', (data) => this.state.archive = data),
                this._fetchCollectionMap('attendance', this.state.attendance),
                this._fetchCollectionMap('salary_details', this.state.salary_details)
            ]);

            // Setup real-time listeners for updates from other devices
            this._setupRealtime();

        } catch (error) {
            console.error("Supabase Error:", error);
            alert("حدث خطأ في الاتصال! يرجى التأكد من أنك قمت بتشغيل كود SQL في Supabase وأنه لا توجد مشكلة في الشبكة.");
        }

        if(document.body.contains(loader)) {
            document.body.removeChild(loader);
        }
    }

    async migrateIfNeeded() {
        const migrated = localStorage.getItem('almahaba_migrated_to_supabase');
        if (migrated) return;

        const lsEmployees = JSON.parse(localStorage.getItem('almahaba_employees') || '[]');
        if (lsEmployees.length === 0) {
            localStorage.setItem('almahaba_migrated_to_supabase', 'true');
            return;
        }

        const msg = document.getElementById('supabaseLoaderMsg');
        if (msg) msg.innerText = "جاري ترحيل بياناتك القديمة إلى السحابة... الرجاء الانتظار";
        console.log("Migrating local data to Supabase...");

        // 1. Settings
        const lsSettings = JSON.parse(localStorage.getItem('almahaba_settings') || 'null');
        if (lsSettings) {
            lsSettings.id = 'global';
            await this.supabase.from('settings').upsert(lsSettings);
        }

        // 2. Employees
        if (lsEmployees.length > 0) {
            await this.supabase.from('employees').upsert(lsEmployees);
        }

        // 3. Treasury
        const lsTreasury = JSON.parse(localStorage.getItem('almahaba_treasury_txs') || '[]');
        if (lsTreasury.length > 0) await this.supabase.from('treasury_txs').upsert(lsTreasury);

        // 4. Suppliers
        const lsSuppliers = JSON.parse(localStorage.getItem('almahaba_supp_suppliers') || '[]');
        if (lsSuppliers.length > 0) await this.supabase.from('suppliers').upsert(lsSuppliers);

        const lsSupplierTxs = JSON.parse(localStorage.getItem('almahaba_supp_transactions') || '[]');
        if (lsSupplierTxs.length > 0) await this.supabase.from('supplier_txs').upsert(lsSupplierTxs);

        // 5. Attendance & Salary details
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key.startsWith('almahaba_attendance_')) {
                let month = key.replace('almahaba_attendance_', '');
                let data = JSON.parse(localStorage.getItem(key));
                await this.supabase.from('attendance').upsert({ month_key: month, data: data });
            } else if (key.startsWith('almahaba_salary_details_')) {
                let month = key.replace('almahaba_salary_details_', '');
                let data = JSON.parse(localStorage.getItem(key));
                await this.supabase.from('salary_details').upsert({ month_key: month, data: data });
            }
        }

        localStorage.setItem('almahaba_migrated_to_supabase', 'true');
        console.log("Migration complete!");
    }

    async _fetchCollection(table, callback) {
        const { data, error } = await this.supabase.from(table).select('*');
        if (!error && data) {
            callback(data);
        } else {
            callback([]);
        }
    }

    async _fetchCollectionMap(table, stateObj) {
        const { data, error } = await this.supabase.from(table).select('*');
        if (!error && data) {
            data.forEach(row => {
                stateObj[row.month_key] = row.data;
            });
        }
    }

    _setupRealtime() {
        this.supabase
            .channel('public:*')
            .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
                const table = payload.table;
                const changeType = payload.eventType; // INSERT, UPDATE, DELETE
                const newRow = payload.new;
                const oldRow = payload.old;

                if (table === 'settings') {
                    if (changeType !== 'DELETE') this.state.settings = newRow;
                }
                else if (table === 'employees' || table === 'users') {
                    if (changeType === 'DELETE') this.state[table] = this.state[table].filter(e => e.id !== oldRow.id);
                    else if (changeType === 'INSERT') this.state[table].push(newRow);
                    else if (changeType === 'UPDATE') {
                        let idx = this.state[table].findIndex(e => e.id === newRow.id);
                        if (idx >= 0) this.state[table][idx] = newRow;
                    }
                }
                else if (table === 'attendance' || table === 'salary_details') {
                    if (changeType === 'DELETE') delete this.state[table][oldRow.month_key];
                    else this.state[table][newRow.month_key] = newRow.data;
                }
                else if (table === 'treasury_txs' || table === 'suppliers' || table === 'supplier_txs' || table === 'archive') {
                    const idKey = (table === 'archive') ? 'month' : 'id';
                    if (changeType === 'DELETE') this.state[table] = this.state[table].filter(e => e[idKey] !== oldRow[idKey]);
                    else if (changeType === 'INSERT') this.state[table].push(newRow);
                    else if (changeType === 'UPDATE') {
                        let idx = this.state[table].findIndex(e => e[idKey] === newRow[idKey]);
                        if (idx >= 0) this.state[table][idx] = newRow;
                    }
                }
                
                // Re-render UI on change
                this._triggerRender();
            })
            .subscribe();
    }

    _triggerRender() {
        if (window.App && typeof window.App.renderCurrentPage === 'function') {
            window.App.renderCurrentPage();
        } else if (window.App && typeof window.App.navigateTo === 'function') {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            window.App.navigateTo(hash, true);
        }
    }

    _auditInfo() {
        const userStr = localStorage.getItem('almahaba_currentUser');
        let createdBy = 'مدير النظام';
        if (userStr) {
            try {
                createdBy = JSON.parse(userStr).username;
            } catch(e) {}
        }
        return { created_by: createdBy, timestamp: new Date().toISOString() };
    }

    _getDefaultSettings() {
        return { id: 'global', theme: 'dark', overtimeRate: 100, workHoursPerDay: 10, weeklyOff: 'sunday' };
    }

    // ============================================
    // API Methods (Used by UI)
    // ============================================

    getSettings() { return this.state.settings || this._getDefaultSettings(); }
    async saveSettings(settings) {
        settings.id = 'global';
        this.state.settings = settings; // Optimistic update
        await this.supabase.from('settings').upsert(settings);
    }

    getEmployees() { return this.state.employees || []; }
    async saveEmployee(emp) {
        if (!emp.id) emp.id = Date.now().toString();
        let idx = this.state.employees.findIndex(e => e.id === emp.id);
        if (idx >= 0) this.state.employees[idx] = emp; else this.state.employees.push(emp);
        await this.supabase.from('employees').upsert(emp);
    }
    async deleteEmployee(id) {
        this.state.employees = this.state.employees.filter(e => e.id !== id.toString());
        await this.supabase.from('employees').delete().eq('id', id.toString());
    }

    getAttendance(monthKey) { return this.state.attendance[monthKey] || {}; }
    async saveAttendance(monthKey, data) {
        this.state.attendance[monthKey] = data;
        await this.supabase.from('attendance').upsert({ month_key: monthKey, data: data });
    }

    getSalaryDetails(monthKey) { return this.state.salary_details[monthKey] || {}; }
    async saveSalaryDetails(monthKey, data) {
        this.state.salary_details[monthKey] = data;
        await this.supabase.from('salary_details').upsert({ month_key: monthKey, data: data });
    }

    getArchive() { return this.state.archive || []; }
    async saveArchiveMonth(monthData) {
        let idx = this.state.archive.findIndex(e => e.month === monthData.month);
        if (idx >= 0) this.state.archive[idx] = monthData; else this.state.archive.push(monthData);
        await this.supabase.from('archive').upsert(monthData);
    }

    getTreasuryTxs() { return this.state.treasury_txs || []; }
    async saveTreasuryTx(tx) {
        if (!tx.id) tx.id = Date.now().toString();
        const data = { ...tx, ...this._auditInfo() };
        this.state.treasury_txs.push(data);
        await this.supabase.from('treasury_txs').upsert(data);
    }
    async updateTreasuryTx(id, newData) {
        const data = { ...newData, ...this._auditInfo() };
        let idx = this.state.treasury_txs.findIndex(e => e.id === id.toString());
        if (idx >= 0) this.state.treasury_txs[idx] = { ...this.state.treasury_txs[idx], ...data };
        await this.supabase.from('treasury_txs').update(data).eq('id', id.toString());
    }
    async deleteTreasuryTx(id) {
        this.state.treasury_txs = this.state.treasury_txs.filter(e => e.id !== id.toString());
        await this.supabase.from('treasury_txs').delete().eq('id', id.toString());
    }

    getSuppliers() { return this.state.suppliers || []; }
    async saveSupplier(sup) {
        if (!sup.id) sup.id = Date.now().toString();
        let idx = this.state.suppliers.findIndex(e => e.id === sup.id);
        if (idx >= 0) this.state.suppliers[idx] = sup; else this.state.suppliers.push(sup);
        await this.supabase.from('suppliers').upsert(sup);
    }
    async deleteSupplier(id) {
        this.state.suppliers = this.state.suppliers.filter(e => e.id !== id.toString());
        await this.supabase.from('suppliers').delete().eq('id', id.toString());
    }
    
    getSupplierTxs() { return this.state.supplier_txs || []; }
    async saveSupplierTx(tx) {
        if (!tx.id) tx.id = Date.now().toString();
        const data = { ...tx, ...this._auditInfo() };
        this.state.supplier_txs.push(data);
        await this.supabase.from('supplier_txs').upsert(data);
    }
    async updateSupplierTx(id, newData) {
        const data = { ...newData, ...this._auditInfo() };
        let idx = this.state.supplier_txs.findIndex(e => e.id === id.toString());
        if (idx >= 0) this.state.supplier_txs[idx] = { ...this.state.supplier_txs[idx], ...data };
        await this.supabase.from('supplier_txs').update(data).eq('id', id.toString());
    }
    async deleteSupplierTx(id) {
        this.state.supplier_txs = this.state.supplier_txs.filter(e => e.id !== id.toString());
        await this.supabase.from('supplier_txs').delete().eq('id', id.toString());
    }

    // ============================================
    // Users & Auth Methods
    // ============================================

    getUsers() { return this.state.users || []; }

    async addUser(user) {
        if (!user.id) user.id = Date.now().toString();
        let idx = this.state.users.findIndex(e => e.username === user.username);
        if (idx >= 0) throw new Error('اسم المستخدم موجود مسبقاً');
        
        this.state.users.push(user);
        await this.supabase.from('users').upsert(user);
    }

    async updateUser(id, data) {
        let idx = this.state.users.findIndex(e => e.id === id.toString());
        if (idx >= 0) {
            this.state.users[idx] = { ...this.state.users[idx], ...data };
            await this.supabase.from('users').update(data).eq('id', id.toString());
        }
    }

    async deleteUser(id) {
        if (id == 1 || id == '1') throw new Error('لا يمكن حذف المدير الرئيسي');
        this.state.users = this.state.users.filter(e => e.id !== id.toString());
        await this.supabase.from('users').delete().eq('id', id.toString());
    }

    getUserByUsername(username) {
        return this.state.users.find(u => u.username === username);
    }

    login(username, password) {
        const user = this.getUserByUsername(username);
        if (user && user.password === password) {
            const { password: _, ...sessionUser } = user;
            sessionStorage.setItem('almahaba_currentUser', JSON.stringify(sessionUser));
            return true;
        }
        return false;
    }

    logout() {
        sessionStorage.removeItem('almahaba_currentUser');
    }

    getCurrentUser() {
        const userStr = sessionStorage.getItem('almahaba_currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.permissions && user.permissions.includes('*')) return true;
        return user.permissions && user.permissions.includes(permission);
    }

    exportData() {
        const data = {
            employees: this.state.employees,
            settings: this.state.settings,
            attendance: this.state.attendance,
            salary_details: this.state.salary_details,
            treasury_txs: this.state.treasury_txs,
            suppliers: this.state.suppliers,
            supplier_txs: this.state.supplier_txs
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "almahaba_supabase_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importData(jsonString) {
        alert('خاصية استيراد الملفات تعطلت أثناء التخزين السحابي لضمان سلامة التزامن.');
    }
}

window.DB = new DB();
