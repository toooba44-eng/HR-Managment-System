import {
  LayoutDashboard, Users, Building2, Building, CalendarCheck, CalendarDays,
  UserCircle, CreditCard, Package, HardDrive, Activity, LifeBuoy, Settings,
  Globe, FileText, ScrollText, Plug, Gauge, Database, Megaphone, UserCog,
  ArrowUpDown, Bot, Wallet, ClipboardList, Target, TrendingUp, GraduationCap,
  MessageSquare, ShieldCheck, Laptop, Clock, BarChart3, Briefcase,
  FileSignature, Video, Send, Star, Search, Receipt, PlusCircle, ListChecks,
  Inbox, Network, UserPlus, CalendarRange, Timer, Gift, ShieldPlus,
  AlertTriangle, UserMinus, Workflow,
} from 'lucide-react'

import Dashboard from '../pages/Dashboard'
import Employees from '../pages/Employees'
import Departments from '../pages/Departments'
import Attendance from '../pages/Attendance'
import Leaves from '../pages/Leaves'
import Profile from '../pages/Profile'
import SuperAdminHome from '../pages/portals/SuperAdminHome'
import CandidateHome from '../pages/portals/CandidateHome'
import Announcements from '../pages/employee/Announcements'
import Requests from '../pages/employee/Requests'
import Payslips from '../pages/employee/Payslips'
import Policies from '../pages/hr/Policies'
import Payroll from '../pages/hr/Payroll'
import Tasks from '../pages/manager/Tasks'
import TeamMetrics from '../pages/manager/TeamMetrics'
import Jobs from '../pages/candidate/Jobs'
import Applications from '../pages/candidate/Applications'
import Recruitment from '../pages/hr/Recruitment'
import Companies from '../pages/superadmin/Companies'
import Subscriptions from '../pages/superadmin/Subscriptions'
import Expenses from '../pages/hr/Expenses'
import Assets from '../pages/hr/Assets'
import ComingSoon from '../components/ui/ComingSoon'

// Helper for scaffolded (not-yet-built) features
const cs = (title, description, icon) => (
  <ComingSoon title={title} description={description} icon={icon} />
)

/**
 * Each portal maps to one or more roles and declares its own navigation.
 * Nav items carry the route element too, so the router and the sidebar stay
 * in sync from this single source of truth.
 */
export const PORTALS = {
  super_admin: {
    id: 'super_admin',
    name: 'بوابة إدارة المنصة',
    subtitle: 'Super Admin',
    roles: ['super_admin'],
    color: '#7c3aed',
    home: '/sa',
    nav: [
      { to: '/sa', label: 'نظرة عامة', icon: LayoutDashboard, element: <SuperAdminHome /> },
      { to: '/sa/companies', label: 'الشركات المشتركة', icon: Building, element: <Companies /> },
      { to: '/sa/subscriptions', label: 'الباقات والاشتراكات', icon: Package, element: <Subscriptions /> },
      { to: '/sa/billing', label: 'الفواتير والمدفوعات', icon: CreditCard, element: cs('الفواتير والمدفوعات', 'إدارة الفوترة والمدفوعات', CreditCard) },
      { to: '/sa/modules', label: 'تفعيل الوحدات', icon: ListChecks, element: cs('تفعيل وتعطيل الوحدات', 'التحكم في وحدات النظام لكل مؤسسة', ListChecks) },
      { to: '/sa/limits', label: 'حدود المستخدمين والتخزين', icon: HardDrive, element: cs('حدود المستخدمين والتخزين', 'ضبط حدود المستخدمين ومساحة التخزين', HardDrive) },
      { to: '/sa/usage', label: 'مراقبة الاستخدام', icon: Activity, element: cs('مراقبة استخدام النظام', 'متابعة استخدام المؤسسات للنظام', Activity) },
      { to: '/sa/support', label: 'الدعم الفني', icon: LifeBuoy, element: cs('إدارة الدعم الفني', 'تذاكر ودعم العملاء', LifeBuoy) },
      { to: '/sa/settings', label: 'إعدادات النظام العامة', icon: Settings, element: cs('إعدادات النظام العامة', 'الإعدادات العامة للمنصة', Settings) },
      { to: '/sa/localization', label: 'الدول والعملات واللغات', icon: Globe, element: cs('الدول والعملات واللغات', 'إدارة التعريب والعملات والدول', Globe) },
      { to: '/sa/templates', label: 'قوالب النظام', icon: FileText, element: cs('قوالب النظام', 'إدارة قوالب المستندات والرسائل', FileText) },
      { to: '/sa/audit', label: 'سجل العمليات', icon: ScrollText, element: cs('سجل العمليات', 'سجل تدقيق كامل لعمليات النظام', ScrollText) },
      { to: '/sa/api', label: 'مراقبة تكاملات API', icon: Plug, element: cs('مراقبة تكاملات API', 'متابعة التكاملات الخارجية', Plug) },
      { to: '/sa/performance', label: 'أداء النظام', icon: Gauge, element: cs('مراقبة أداء النظام', 'مؤشرات أداء وصحة المنصة', Gauge) },
      { to: '/sa/backups', label: 'النسخ الاحتياطية', icon: Database, element: cs('إدارة النسخ الاحتياطية', 'جدولة واستعادة النسخ الاحتياطية', Database) },
      { to: '/sa/announcements', label: 'الإعلانات والتنبيهات', icon: Megaphone, element: <Announcements /> },
      { to: '/sa/impersonate', label: 'الدخول بالنيابة', icon: UserCog, element: cs('تسجيل الدخول بالنيابة', 'الدخول لحساب عميل بصلاحيات مقيّدة', UserCog) },
      { to: '/sa/requests', label: 'طلبات الترقية والإلغاء', icon: ArrowUpDown, element: cs('طلبات الترقية والإلغاء', 'إدارة طلبات ترقية/إلغاء الاشتراكات', ArrowUpDown) },
      { to: '/sa/ai', label: 'إعدادات الذكاء الاصطناعي', icon: Bot, element: cs('إعدادات الذكاء الاصطناعي', 'ضبط ميزات الذكاء الاصطناعي', Bot) },
    ],
  },

  hr: {
    id: 'hr',
    name: 'بوابة الموارد البشرية',
    subtitle: 'HR Admin',
    roles: ['admin', 'hr_manager'],
    color: '#1d4ed8',
    home: '/',
    nav: [
      { to: '/', label: 'الصفحة الرئيسية', icon: LayoutDashboard, element: <Dashboard />, exact: true },
      { to: '/hr/company', label: 'مؤسستي', icon: Building2, element: cs('مؤسستي', 'الملف التعريفي للمؤسسة وبياناتها العامة والفروع', Building2) },
      { to: '/employees', label: 'الموظفون', icon: Users, element: <Employees /> },
      { to: '/departments', label: 'الهيكل التنظيمي', icon: Network, element: <Departments /> },
      { to: '/hr/recruitment', label: 'التوظيف', icon: Briefcase, element: <Recruitment /> },
      { to: '/hr/onboarding', label: 'التهيئة Onboarding', icon: UserPlus, element: cs('التهيئة (Onboarding)', 'خطط ومهام تهيئة الموظفين الجدد', UserPlus) },
      { to: '/attendance', label: 'الحضور والدوام', icon: CalendarCheck, element: <Attendance /> },
      { to: '/leaves', label: 'الإجازات', icon: CalendarDays, element: <Leaves /> },
      { to: '/hr/shifts', label: 'الورديات والجداول', icon: CalendarRange, element: cs('الورديات والجداول', 'تنظيم الورديات ومناوبات العمل', CalendarRange) },
      { to: '/hr/timesheets', label: 'الجداول الزمنية Timesheets', icon: Timer, element: cs('الجداول الزمنية (Timesheets)', 'تسجيل واعتماد ساعات العمل على المشاريع', Timer) },
      { to: '/hr/payroll', label: 'الرواتب', icon: Wallet, element: <Payroll /> },
      { to: '/hr/compensation', label: 'التعويضات والمزايا', icon: Gift, element: cs('التعويضات والمزايا', 'هياكل الرواتب والبدلات والمزايا والتأمين', Gift) },
      { to: '/hr/performance', label: 'الأداء والأهداف', icon: Target, element: cs('الأداء والأهداف', 'دورات التقييم وإدارة الأهداف (OKR/KPI)', Target) },
      { to: '/hr/training', label: 'التدريب والتطوير', icon: GraduationCap, element: cs('التدريب والتطوير', 'الدورات والبرامج التدريبية ومسارات التطوير', GraduationCap) },
      { to: '/hr/talent', label: 'المواهب والتعاقب الوظيفي', icon: Star, element: cs('المواهب والتعاقب الوظيفي', 'إدارة المواهب وخطط التعاقب الوظيفي', Star) },
      { to: '/hr/expenses', label: 'المصروفات والسلف', icon: Receipt, element: <Expenses /> },
      { to: '/hr/requests', label: 'الخدمات والطلبات', icon: Inbox, element: <Requests title="الخدمات والطلبات" description="راجع واعتمد طلبات الموظفين (خطابات، تحديث بيانات، عمل عن بُعد…)." /> },
      { to: '/hr/documents', label: 'المستندات', icon: FileText, element: cs('المستندات', 'مستندات الموظفين والمؤسسة وإدارة انتهاء الصلاحية', FileText) },
      { to: '/hr/assets', label: 'الأصول والعهد', icon: Package, element: <Assets /> },
      { to: '/hr/engagement', label: 'المشاركة والتواصل', icon: Megaphone, element: <Announcements /> },
      { to: '/hr/health-safety', label: 'الصحة والسلامة', icon: ShieldPlus, element: cs('الصحة والسلامة', 'السلامة المهنية والحوادث والفحوصات الطبية', ShieldPlus) },
      { to: '/hr/grievances', label: 'المخالفات والشكاوى', icon: AlertTriangle, element: cs('المخالفات والشكاوى', 'إدارة المخالفات والإجراءات التأديبية والشكاوى', AlertTriangle) },
      { to: '/hr/offboarding', label: 'إنهاء الخدمة', icon: UserMinus, element: cs('إنهاء الخدمة', 'إجراءات إنهاء الخدمة والمخالصة النهائية', UserMinus) },
      { to: '/hr/reports', label: 'التقارير والتحليلات', icon: BarChart3, element: cs('التقارير والتحليلات', 'تقارير الموارد البشرية ولوحات التحليلات', BarChart3) },
      { to: '/hr/automation', label: 'الأتمتة وسير العمل', icon: Workflow, element: cs('الأتمتة وسير العمل', 'بناء مسارات الموافقات والأتمتة', Workflow) },
      { to: '/hr/integrations', label: 'التكاملات', icon: Plug, element: cs('التكاملات', 'الربط مع الأنظمة والخدمات الخارجية عبر API', Plug) },
      { to: '/hr/settings', label: 'الإعدادات', icon: Settings, element: cs('الإعدادات', 'إعدادات المؤسسة والصلاحيات والسياسات العامة', Settings) },
    ],
  },

  manager: {
    id: 'manager',
    name: 'بوابة المدير',
    subtitle: 'Manager Portal',
    roles: ['department_head'],
    color: '#0891b2',
    home: '/',
    nav: [
      { to: '/', label: 'لوحة الفريق', icon: LayoutDashboard, element: <Dashboard />, exact: true },
      { to: '/employees', label: 'أعضاء الفريق', icon: Users, element: <Employees /> },
      { to: '/attendance', label: 'حضور الفريق', icon: CalendarCheck, element: <Attendance /> },
      { to: '/leaves', label: 'الموافقة على الإجازات', icon: CalendarDays, element: <Leaves /> },
      { to: '/mgr/schedule', label: 'جداول الفريق', icon: Clock, element: cs('جداول الفريق', 'إدارة جداول ومناوبات الفريق', Clock) },
      { to: '/mgr/performance', label: 'مراجعة الأداء', icon: Target, element: cs('مراجعة الأداء', 'تقييم أداء أعضاء الفريق', Target) },
      { to: '/mgr/requests', label: 'طلبات الفريق', icon: Inbox, element: <Requests title="طلبات الفريق" description="راجع واعتمد طلبات أعضاء فريقك." /> },
      { to: '/mgr/expenses', label: 'اعتماد المصروفات', icon: Receipt, element: <Expenses /> },
      { to: '/mgr/tasks', label: 'المهام والأهداف', icon: ClipboardList, element: <Tasks title="مهام الفريق" description="أسند المهام لأعضاء فريقك وتابع تقدّمها." /> },
      { to: '/mgr/metrics', label: 'مؤشرات الفريق', icon: TrendingUp, element: <TeamMetrics /> },
      { to: '/mgr/hiring', label: 'طلب موظفين', icon: PlusCircle, element: cs('طلب موظفين جدد', 'رفع طلبات توظيف جديدة', PlusCircle) },
      { to: '/mgr/interviews', label: 'المقابلات', icon: Video, element: cs('إدارة المقابلات', 'جدولة وإدارة المقابلات', Video) },
      { to: '/mgr/training', label: 'التدريب والتطوير', icon: GraduationCap, element: cs('التدريب والتطوير', 'متابعة تدريب وتطوير الفريق', GraduationCap) },
      { to: '/mgr/promotions', label: 'الترقية والنقل', icon: ArrowUpDown, element: cs('إجراءات الترقية والنقل', 'إجراءات ترقية ونقل الموظفين', ArrowUpDown) },
      { to: '/profile', label: 'ملفي الشخصي', icon: UserCircle, element: <Profile /> },
    ],
  },

  employee: {
    id: 'employee',
    name: 'بوابة الموظف',
    subtitle: 'Self-Service',
    roles: ['employee'],
    color: '#16a34a',
    home: '/',
    nav: [
      { to: '/', label: 'الرئيسية', icon: LayoutDashboard, element: <Dashboard />, exact: true },
      { to: '/profile', label: 'الملف الشخصي', icon: UserCircle, element: <Profile /> },
      { to: '/attendance', label: 'الحضور والانصراف', icon: CalendarCheck, element: <Attendance /> },
      { to: '/leaves', label: 'الإجازات ورصيدها', icon: CalendarDays, element: <Leaves /> },
      { to: '/ess/payslips', label: 'قسائم الراتب', icon: Wallet, element: <Payslips /> },
      { to: '/ess/letters', label: 'الشهادات والخطابات', icon: FileText, element: <Requests typeOptions={['شهادة', 'خطاب']} title="الشهادات والخطابات" description="اطلب خطاب تعريف أو شهادة رسمية وتابع حالتها." /> },
      { to: '/ess/expenses', label: 'المصروفات', icon: Receipt, element: <Expenses /> },
      { to: '/ess/goals', label: 'مهامي وأهدافي', icon: Target, element: <Tasks title="مهامي" description="المهام المسندة إليك — حدّث حالتها فور إنجازها." /> },
      { to: '/ess/courses', label: 'الدورات', icon: GraduationCap, element: cs('التسجيل في الدورات', 'استعراض والتسجيل في الدورات', GraduationCap) },
      { to: '/ess/sign', label: 'توقيع المستندات', icon: FileSignature, element: cs('توقيع المستندات', 'توقيع المستندات إلكترونياً', FileSignature) },
      { to: '/ess/complaints', label: 'الشكاوى والاستفسارات', icon: MessageSquare, element: <Requests type="شكوى" title="الشكاوى والاستفسارات" description="قدّم شكوى أو استفساراً وتابع الرد عليه." /> },
      { to: '/ess/data-update', label: 'تحديث البيانات', icon: UserCog, element: <Requests type="تحديث بيانات" title="طلب تحديث البيانات" description="اطلب تعديل بياناتك الشخصية لدى الموارد البشرية." /> },
      { to: '/ess/announcements', label: 'الإعلانات', icon: Megaphone, element: <Announcements /> },
      { to: '/ess/benefits', label: 'المزايا والتأمين', icon: ShieldCheck, element: cs('المزايا والتأمين', 'الاطلاع على مزاياك وتأمينك', ShieldCheck) },
      { to: '/ess/remote', label: 'العمل عن بُعد', icon: Laptop, element: <Requests type="عمل عن بعد" title="طلب العمل عن بُعد" description="قدّم طلب عمل عن بُعد لموافقة مديرك." /> },
      { to: '/ess/overtime', label: 'العمل الإضافي', icon: Clock, element: <Requests type="عمل إضافي" title="طلب العمل الإضافي" description="قدّم طلب عمل إضافي وتابع اعتماده." /> },
      { to: '/ess/schedule', label: 'جدول الدوام', icon: CalendarDays, element: cs('جدول الدوام', 'الاطلاع على جدول دوامك', CalendarDays) },
      { to: '/ess/policies', label: 'السياسات', icon: ScrollText, element: <Policies /> },
      { to: '/ess/surveys', label: 'الاستطلاعات', icon: ListChecks, element: cs('استطلاعات الموظفين', 'المشاركة في استطلاعات الرأي', ListChecks) },
    ],
  },

  candidate: {
    id: 'candidate',
    name: 'بوابة المرشح',
    subtitle: 'Candidate',
    roles: ['candidate'],
    color: '#ea580c',
    home: '/cand',
    nav: [
      { to: '/cand', label: 'الرئيسية', icon: LayoutDashboard, element: <CandidateHome /> },
      { to: '/cand/profile', label: 'الملف المهني', icon: UserCircle, element: cs('الملف الشخصي المهني', 'استكمال ملفك المهني', UserCircle) },
      { to: '/cand/cv', label: 'السيرة الذاتية', icon: FileText, element: cs('رفع السيرة الذاتية', 'رفع وتحديث سيرتك الذاتية', FileText) },
      { to: '/cand/jobs', label: 'تصفح الوظائف', icon: Search, element: <Jobs /> },
      { to: '/cand/applications', label: 'طلباتي', icon: ListChecks, element: <Applications /> },
      { to: '/cand/interview', label: 'المقابلات', icon: CalendarDays, element: cs('حجز موعد المقابلة', 'حجز ومتابعة مواعيد المقابلات', CalendarDays) },
      { to: '/cand/video', label: 'مقابلة فيديو', icon: Video, element: cs('مقابلة الفيديو', 'إجراء مقابلة عبر الفيديو', Video) },
      { to: '/cand/forms', label: 'نماذج ما قبل التوظيف', icon: FileSignature, element: cs('نماذج ما قبل التوظيف', 'تعبئة نماذج التوظيف', FileSignature) },
      { to: '/cand/documents', label: 'المستندات', icon: FileText, element: cs('المستندات المطلوبة', 'رفع المستندات المطلوبة', FileText) },
      { to: '/cand/offer', label: 'عرض العمل', icon: Send, element: cs('توقيع عرض العمل', 'استلام وتوقيع عرض العمل', Send) },
      { to: '/cand/contact', label: 'التواصل', icon: MessageSquare, element: cs('التواصل مع التوظيف', 'التواصل مع مسؤول التوظيف', MessageSquare) },
      { to: '/cand/talent-pool', label: 'قاعدة المواهب', icon: Star, element: cs('قاعدة المواهب', 'الانضمام إلى قاعدة المواهب', Star) },
    ],
  },
}

const ROLE_TO_PORTAL = {}
for (const portal of Object.values(PORTALS)) {
  for (const role of portal.roles) ROLE_TO_PORTAL[role] = portal
}

export function portalForRole(role) {
  return ROLE_TO_PORTAL[role] || PORTALS.employee
}

// Build the deduplicated route table (union of all portals' nav items),
// plus any extra non-nav routes (e.g. employee detail).
export function buildRouteTable() {
  const byPath = new Map()
  const add = (to, element, roles) => {
    if (!byPath.has(to)) byPath.set(to, { path: to, element, roles: new Set() })
    roles.forEach((r) => byPath.get(to).roles.add(r))
  }
  for (const portal of Object.values(PORTALS)) {
    for (const item of portal.nav) add(item.to, item.element, portal.roles)
  }
  return Array.from(byPath.values()).map((r) => ({ ...r, roles: Array.from(r.roles) }))
}
