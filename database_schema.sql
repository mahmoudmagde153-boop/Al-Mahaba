-- إنشاء جداول قاعدة البيانات الخاصة بشركة المحبة في Supabase

-- 1. جدول الإعدادات
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    theme TEXT DEFAULT 'dark',
    overtimeRate NUMERIC DEFAULT 100,
    workHoursPerDay NUMERIC DEFAULT 10,
    weeklyOff TEXT DEFAULT 'sunday',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول الموظفين
CREATE TABLE public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    baseSalary NUMERIC NOT NULL,
    leaveBalance NUMERIC DEFAULT 21,
    active BOOLEAN DEFAULT true,
    joinDate TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول حضور الموظفين
CREATE TABLE public.attendance (
    month_key TEXT PRIMARY KEY, -- e.g. '2026-06'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول تفاصيل المرتبات
CREATE TABLE public.salary_details (
    month_key TEXT PRIMARY KEY, -- e.g. '2026-06'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول حركات الخزنة
CREATE TABLE public.treasury_txs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    created_by TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول الموردين
CREATE TABLE public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    initialBalance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. جدول حركات الموردين
CREATE TABLE public.supplier_txs (
    id TEXT PRIMARY KEY,
    supplierId TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    method TEXT,
    amount NUMERIC NOT NULL,
    invoiceNo TEXT,
    notes TEXT,
    created_by TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. جدول الأرشيف
CREATE TABLE public.archive (
    month TEXT PRIMARY KEY,
    totalSalaries NUMERIC,
    employeeCount NUMERIC,
    attendanceRate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إعطاء صلاحيات القراءة والكتابة (بما أننا في وضع عدم وجود تسجيل دخول معقد للموظفين حالياً)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_txs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_txs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive ENABLE ROW LEVEL SECURITY;

-- سياسات عامة للوصول (Public Access Policies)
CREATE POLICY "Allow ALL on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on salary_details" ON public.salary_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on treasury_txs" ON public.treasury_txs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on supplier_txs" ON public.supplier_txs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on archive" ON public.archive FOR ALL USING (true) WITH CHECK (true);

-- تفعيل ميزة النشر اللحظي (Real-time) لجميع الجداول
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_details;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treasury_txs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_txs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archive;
