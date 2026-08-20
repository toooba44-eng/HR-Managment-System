# YASME HR — نظام إدارة الموارد البشرية

نظام متكامل لإدارة الموارد البشرية: الموظفون، الإدارات، الحضور والانصراف، الإجازات، والمستندات — مع لوحة تحكم ورسوم بيانية. واجهة عربية بالكامل (RTL).

**Backend:** Node.js · Express · SQLite (better-sqlite3) · JWT
**Frontend:** React · Vite · Tailwind CSS · React Query · Zustand · Recharts

---

## 🌐 نسخة تجريبية مباشرة (GitHub Pages)

رابط مباشر يعمل في المتصفح دون أي خادم:

**https://toooba44-eng.github.io/HR-Managment-System/**

> النسخة التجريبية **ثابتة (static)** وتعمل بالكامل داخل المتصفح ببيانات وهمية (نفس بيانات الـ seed) عبر طبقة API وهمية — لا يوجد باكند حقيقي، والتعديلات مؤقتة ولا تُحفظ بين الجلسات. للحصول على باكند فعلي بقاعدة بيانات، انشر على Railway (انظر قسم CI/CD).

### تفعيل الرابط (خطوة لمرة واحدة)

1. يجب أن يكون المستودع **عاماً (Public)** — GitHub Pages للمستودعات الخاصة يتطلب خطة مدفوعة. (`Settings → General → Change visibility`).
2. فعّل Pages: `Settings → Pages → Build and deployment → Source: **GitHub Actions**`.
3. ادمج الـ PR في `main` (أو شغّل workflow «Deploy demo to GitHub Pages» يدوياً). سينشر التلقائي الرابط.

بناء النسخة التجريبية محلياً:
```bash
cd frontend
VITE_DEMO=true VITE_BASE=/HR-Managment-System/ npm run build
npm run preview
```

---

## 🚂 نشر فعلي بقاعدة بيانات حقيقية (Railway — خدمة واحدة)

للحصول على موقع حقيقي **يحفظ البيانات** (بخلاف نسخة Pages التجريبية)، انشر على Railway كخدمة واحدة: الخادم يبني الواجهة ويخدمها + الـ API + قاعدة SQLite على قرص دائم — **رابط واحد** بلا CORS.

المفتاح: جذر المشروع يحتوي `Dockerfile` موحّد و`railway.json`. والخادم (`backend/src/server.js`) يخدم مجلد `public/` (نسخة الواجهة المبنية) مع SPA fallback.

**الخطوات على [railway.app](https://railway.app):**
1. سجّل الدخول عبر GitHub → **New Project → Deploy from GitHub repo** → اختر `HR-Managment-System`.
2. Railway يكتشف `Dockerfile` في الجذر ويبني تلقائياً.
3. في **Variables** أضِف:
   - `SEED_DB=true` (لبذر البيانات التجريبية أول مرة)
   - `JWT_SECRET=<قيمة سرية قوية>`
   - `DATABASE_PATH=/app/database/hr_system.db`
4. في **Settings → Volumes** أنشئ Volume واربطه بالمسار **`/app/database`** (ليبقى SQLite محفوظاً بين عمليات النشر).
5. **Settings → Networking → Generate Domain** للحصول على الرابط العام.

Railway يحقن `PORT` تلقائياً، والخادم يستمع عليه. الفحص الصحّي على `/api/health`.

> بعد أول نشر ناجح يمكنك ضبط `SEED_DB=false` حتى لا يُعاد البذر (وهو آمن أصلاً لأنه idempotent).

---

## 🚀 التشغيل بنقرة واحدة (Docker)

المتطلب الوحيد: Docker + Docker Compose.

```bash
docker compose up --build
```

ثم افتح: **http://localhost:8080**

- الواجهة تُخدَّم عبر Nginx وتُمرِّر طلبات `/api` إلى الـ backend داخلياً (لا مشاكل CORS).
- قاعدة البيانات والمستندات تُحفظ في volumes باسم `hr-db` و `hr-uploads`.
- تُبذَر البيانات التجريبية تلقائياً عند أول تشغيل (`SEED_DB=true`).

لإيقاف وحذف كل شيء:
```bash
docker compose down          # إيقاف
docker compose down -v        # إيقاف + حذف البيانات
```

متغيرات اختيارية (عبر ملف `.env` أو البيئة): `FRONTEND_PORT`، `JWT_SECRET`، `SEED_DB`.

---

## 🧑‍💻 التشغيل للتطوير (بدون Docker)

المتطلب: Node.js 18+.

```bash
# تثبيت اعتماديات الـ backend والـ frontend معاً
npm run install:all

# تشغيل الاثنين معاً (backend على 5000، frontend على 5173)
npm run dev
```

أو كلٌّ على حدة:

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:5000

# Frontend (Terminal آخر)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

يقوم الـ backend تلقائياً بإنشاء الجداول وبذر البيانات في وضع التطوير — لا حاجة لخطوة migrate/seed يدوية (وهي متاحة عبر `npm run migrate` و `npm run seed` عند الحاجة).

---

## 🏛️ بوابات النظام الخمس

النظام مقسّم إلى **٥ بوابات مستقلة** داخل منصة واحدة، والتوجيه يتم تلقائياً حسب دور المستخدم:

| البوابة | الدور | الوصف |
|---------|-------|-------|
| **إدارة المنصة** (Super Admin) | `super_admin` | إدارة الشركات، الاشتراكات، الفوترة، الوحدات، ومراقبة المنصة (SaaS) |
| **الموارد البشرية** (HR Admin) | `admin` / `hr_manager` | إدارة الموظفين، الإدارات، الحضور، الإجازات، الرواتب، السياسات |
| **المدير** (Manager) | `department_head` | الفريق، الموافقات، الأداء، المهام، المقابلات |
| **الموظف** (Self-Service) | `employee` | الملف، الحضور، الإجازات، القسائم، الطلبات، الخدمات الذاتية |
| **المرشح** (Candidate) | `candidate` | الوظائف، التقديم، المقابلات، عرض العمل، قاعدة المواهب |

> **الحالة:** هيكل البوابات الخمس + التنقّل + التوجيه حسب الدور مكتمل. الميزات المرتبطة بباكند موجود تعمل بالكامل؛ وباقي الميزات مُهيّأة كصفحات "قريباً" وتُبنى تباعاً بوابةً تلو الأخرى.
>
> **بوابة الموظف (مُعمّقة):** الإعلانات، الطلبات الحقيقية (شهادات/خطابات، عمل عن بُعد، عمل إضافي، تحديث بيانات، شكاوى) مع تتبّع الحالة، وقسائم الراتب المحسوبة — كلها تعمل end-to-end. ويستطيع المدير والموارد البشرية اعتماد الطلبات، والموارد البشرية نشر الإعلانات.
>
> **بوابة الموارد البشرية (مُعمّقة):** كشف الرواتب (Payroll) لكل الموظفين مع الإجماليات والفلترة بالإدارة، وإدارة السياسات (إنشاء/تعديل/حذف) — ويطّلع الموظفون على السياسات نفسها من بوابتهم.
>
> **بوابة المدير (مُعمّقة):** إسناد المهام لأعضاء الفريق مع الأولوية وتاريخ الاستحقاق وتتبّع الحالة (والموظف يحدّث حالة مهامه من بوابته)، ومؤشرات الفريق المحسوبة لحظياً (حضور، إجازات معلّقة، توزيع حالات المهام).
>
> **بوابة المرشح + توظيف HR (مُعمّقة):** تصفّح الوظائف المفتوحة والتقديم عليها ومتابعة حالة الطلب بمؤشّر مراحل (قيد المراجعة → مقابلة → مقبول)؛ وفي بوابة HR: إدارة الوظائف (نشر/تعديل/إغلاق/حذف) ومراجعة الطلبات وتغيير حالتها.
>
> **بوابة إدارة المنصة (مُعمّقة):** إدارة الشركات المشتركة (إنشاء/تعديل/تفعيل/تعليق/حذف) مع ملخّص الحالة وتوزيع الباقات، صفحة الباقات والاشتراكات، وبثّ الإعلانات العامة — كلها محميّة لدور `super_admin` فقط.

## 🔐 بيانات الدخول التجريبية

| البريد | كلمة المرور | البوابة |
|--------|-------------|---------|
| `superadmin@quant.com` | `super123` | إدارة المنصة |
| `admin@quant.com` | `admin123` | الموارد البشرية |
| `mohamed.tech@quant.com` | `password123` | المدير |
| `khaled.dev@quant.com` | `password123` | الموظف |
| `candidate@quant.com` | `candidate123` | المرشح |

---

## 🖥️ واجهات Frontend

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| تسجيل الدخول | `/login` | مصادقة JWT + حسابات تجريبية بنقرة |
| لوحة التحكم | `/` | إحصائيات + رسم الحضور الأسبوعي + توزيع الإدارات + النشاط الأخير |
| الموظفون | `/employees` | بحث + فلترة + ترقيم صفحات + إضافة موظف |
| ملف الموظف | `/employees/:id` | بروفايل كامل (معلومات، حضور، إجازات، مستندات) |
| الإدارات | `/departments` | بطاقات الإدارات + إضافة إدارة |
| الحضور والانصراف | `/attendance` | Check-in/out + سجل يومي + ملخص |
| الإجازات | `/leaves` | طلب + موافقة/رفض + رصيد الإجازات |
| ملفي الشخصي | `/profile` | البيانات + تغيير كلمة المرور |

الصلاحيات مطبّقة في الواجهة والـ API (6 أدوار: super_admin, admin, hr_manager, department_head, employee, candidate) موزّعة على 5 بوابات. كل بوابة لها تنقّلها الخاص، ويُوجَّه المستخدم لبوابته تلقائياً بعد الدخول.

---

## 📁 هيكل المشروع

```
HR-Managment-System/
├── backend/
│   ├── src/
│   │   ├── config/          # database, migrate, seed
│   │   ├── middleware/      # auth, validation, errorHandler
│   │   ├── routes/          # auth, employees, departments, attendance, leaves, dashboard, documents
│   │   └── server.js        # نقطة الدخول
│   ├── Dockerfile
│   └── railway.json
├── frontend/
│   ├── src/
│   │   ├── api/             # عميل axios + تعريف الـ endpoints
│   │   ├── store/           # Zustand (المصادقة)
│   │   ├── components/      # layout + ui
│   │   ├── pages/           # الصفحات
│   │   └── lib/             # أدوات مساعدة
│   ├── Dockerfile           # multi-stage: بناء Vite + خدمة Nginx
│   ├── default.conf.template
│   └── railway.json
├── .github/workflows/       # ci.yml + deploy.yml
├── docker-compose.yml
└── package.json             # سكربتات المونوريبو
```

---

## 📡 أهم نقاط الـ API

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/health` | فحص صحة الخادم |
| POST | `/api/auth/login` | تسجيل الدخول |
| GET | `/api/auth/me` | المستخدم الحالي |
| PUT | `/api/auth/change-password` | تغيير كلمة المرور |
| GET | `/api/employees` | قائمة الموظفين (بحث/فلترة/ترقيم) |
| GET | `/api/employees/:id` | بروفايل موظف كامل |
| POST | `/api/employees` | إضافة موظف (admin/hr) |
| GET | `/api/departments` | قائمة الإدارات |
| GET | `/api/departments/org-chart/tree` | الهيكل التنظيمي |
| GET | `/api/attendance` | سجل الحضور + ملخص |
| POST | `/api/attendance/checkin` · `/checkout` | تسجيل دخول/خروج |
| GET | `/api/leaves` | طلبات الإجازات |
| POST | `/api/leaves` | طلب إجازة |
| PUT | `/api/leaves/:id/approve` · `/cancel` | موافقة/رفض/إلغاء |
| GET | `/api/leaves/balance/:employee_id` | رصيد الإجازات |
| GET | `/api/dashboard/stats` | إحصائيات لوحة التحكم |
| GET | `/api/documents/employee/:id` · POST `/api/documents` | مستندات الموظف |
| GET · POST | `/api/announcements` | الإعلانات (نشر لـ HR/الإدارة) |
| GET · POST | `/api/requests` · PUT `/:id/resolve` | طلبات الموظفين + اعتمادها |
| GET | `/api/payslips/:employee_id` | قسائم الراتب المحسوبة |
| GET · POST · PUT · DELETE | `/api/policies` | سياسات المؤسسة (إدارة لـ HR، قراءة للجميع) |
| GET | `/api/payroll` | كشف الرواتب والإجماليات (HR/الإدارة) |
| GET · POST · PUT `/:id/status` · DELETE | `/api/tasks` | المهام (إسناد للمدير، تحديث الحالة للموظف) |
| GET · POST · PUT · DELETE | `/api/jobs` | الوظائف (إدارة لـ HR، تصفّح المفتوحة للمرشح) |
| GET · GET `/mine` · POST · PUT `/:id/status` | `/api/applications` | طلبات التوظيف (تقديم المرشح، مراجعة HR) |
| GET · POST · PUT · DELETE | `/api/companies` | الشركات المشتركة (Super Admin فقط) |

---

## ⚙️ CI/CD

يعمل عبر GitHub Actions:

### `ci.yml` (عند كل push و PR)
- **frontend:** `npm ci` → lint → build → رفع مخرجات البناء كـ artifact.
- **backend:** `npm ci` → تشغيل الخادم واختبار دخان على `/api/health` و `/api/auth/login`.
- **docker:** بناء صورتَي الـ backend والـ frontend للتأكد من صحة الـ Dockerfiles (مع تخزين مؤقت GHA).

### `deploy.yml` (عند push إلى `main`)
النشر التلقائي على **Railway**. يتخطّى النشر بأمان إذا لم يُضبط السر المطلوب.

**الإعداد المطلوب في GitHub:**
- Secret: `RAILWAY_TOKEN` — رمز مشروع Railway (Project Token).
- Variables (اختياري): `RAILWAY_BACKEND_SERVICE`، `RAILWAY_FRONTEND_SERVICE` (الافتراضي `backend` و `frontend`).

**على Railway:** أنشئ مشروعاً بخدمتين تعتمدان على Dockerfile — واحدة جذرها `backend/` والأخرى `frontend/`. اضبط متغيّر `BACKEND_URL` في خدمة الـ frontend على الرابط الداخلي/العام للـ backend، و`SEED_DB=true` في خدمة الـ backend لأول تشغيل.

---

## 🛠️ ملاحظات تقنية

- قاعدة البيانات تُنشَأ تلقائياً (الجداول + الفهارس + بيانات تجريبية) عند الإقلاع.
- بذر البيانات **idempotent** — يتخطّى إن كانت القاعدة مبذورة مسبقاً.
- الرفع محدود بـ 10MB وأنواع: PDF, DOC/DOCX, JPG, PNG.
- الأمان: helmet، rate limiting، bcrypt، JWT.

## 📄 الرخصة

MIT License
