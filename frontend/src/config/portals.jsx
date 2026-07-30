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
import Billing from '../pages/superadmin/Billing'
import Expenses from '../pages/hr/Expenses'
import Assets from '../pages/hr/Assets'
import Performance from '../pages/hr/Performance'
import Training from '../pages/hr/Training'
import Reports from '../pages/hr/Reports'
import Offboarding from '../pages/hr/Offboarding'
import Grievances from '../pages/hr/Grievances'
import HealthSafety from '../pages/hr/HealthSafety'
import Shifts from '../pages/hr/Shifts'
import Timesheets from '../pages/hr/Timesheets'
import Compensation from '../pages/hr/Compensation'
import Talent from '../pages/hr/Talent'
import Documents from '../pages/hr/Documents'
import Company from '../pages/hr/Company'
import HrSettings from '../pages/hr/Settings'
import Onboarding from '../pages/hr/Onboarding'
import Automation from '../pages/hr/Automation'
import Integrations from '../pages/hr/Integrations'
import Surveys from '../pages/employee/Surveys'
import Signatures from '../pages/employee/Signatures'
import Hiring from '../pages/manager/Hiring'
import Interviews from '../pages/manager/Interviews'
import Promotions from '../pages/manager/Promotions'
import CandidateProfile from '../pages/candidate/Profile'
import CandidateCV from '../pages/candidate/CV'
import CandidateTalentPool from '../pages/candidate/TalentPool'
import CandidateInterview from '../pages/candidate/Interview'
import CandidateVideo from '../pages/candidate/Video'
import CandidateForms from '../pages/candidate/Forms'
import CandidateDocuments from '../pages/candidate/Documents'
import CandidateOffer from '../pages/candidate/Offer'
import CandidateContact from '../pages/candidate/Contact'
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

      { section: 'العملاء والاشتراكات', to: '/sa/companies', label: 'الشركات المشتركة', icon: Building, element: <Companies /> },
      { section: 'العملاء والاشتراكات', to: '/sa/subscriptions', label: 'الباقات والاشتراكات', icon: Package, element: <Subscriptions /> },
      { section: 'العملاء والاشتراكات', to: '/sa/billing', label: 'الفواتير والمدفوعات', icon: CreditCard, element: <Billing /> },
      { section: 'العملاء والاشتراكات', to: '/sa/requests', label: 'طلبات الترقية والإلغاء', icon: ArrowUpDown, element: cs('طلبات الترقية والإلغاء', 'إدارة طلبات ترقية/إلغاء الاشتراكات', ArrowUpDown) },

      { section: 'التحكم والحدود', to: '/sa/modules', label: 'تفعيل الوحدات', icon: ListChecks, element: cs('تفعيل وتعطيل الوحدات', 'التحكم في وحدات النظام لكل مؤسسة', ListChecks) },
      { section: 'التحكم والحدود', to: '/sa/limits', label: 'حدود المستخدمين والتخزين', icon: HardDrive, element: cs('حدود المستخدمين والتخزين', 'ضبط حدود المستخدمين ومساحة التخزين', HardDrive) },
      { section: 'التحكم والحدود', to: '/sa/impersonate', label: 'الدخول بالنيابة', icon: UserCog, element: cs('تسجيل الدخول بالنيابة', 'الدخول لحساب عميل بصلاحيات مقيّدة', UserCog) },

      { section: 'المراقبة والتشغيل', to: '/sa/usage', label: 'مراقبة الاستخدام', icon: Activity, element: cs('مراقبة استخدام النظام', 'متابعة استخدام المؤسسات للنظام', Activity) },
      { section: 'المراقبة والتشغيل', to: '/sa/performance', label: 'أداء النظام', icon: Gauge, element: cs('مراقبة أداء النظام', 'مؤشرات أداء وصحة المنصة', Gauge) },
      { section: 'المراقبة والتشغيل', to: '/sa/api', label: 'مراقبة تكاملات API', icon: Plug, element: cs('مراقبة تكاملات API', 'متابعة التكاملات الخارجية', Plug) },
      { section: 'المراقبة والتشغيل', to: '/sa/backups', label: 'النسخ الاحتياطية', icon: Database, element: cs('إدارة النسخ الاحتياطية', 'جدولة واستعادة النسخ الاحتياطية', Database) },
      { section: 'المراقبة والتشغيل', to: '/sa/audit', label: 'سجل العمليات', icon: ScrollText, element: cs('سجل العمليات', 'سجل تدقيق كامل لعمليات النظام', ScrollText) },

      { section: 'الدعم والتواصل', to: '/sa/support', label: 'الدعم الفني', icon: LifeBuoy, element: cs('إدارة الدعم الفني', 'تذاكر ودعم العملاء', LifeBuoy) },
      { section: 'الدعم والتواصل', to: '/sa/announcements', label: 'الإعلانات والتنبيهات', icon: Megaphone, element: <Announcements /> },

      { section: 'إعدادات المنصة', to: '/sa/settings', label: 'إعدادات النظام العامة', icon: Settings, element: cs('إعدادات النظام العامة', 'الإعدادات العامة للمنصة', Settings) },
      { section: 'إعدادات المنصة', to: '/sa/localization', label: 'الدول والعملات واللغات', icon: Globe, element: cs('الدول والعملات واللغات', 'إدارة التعريب والعملات والدول', Globe) },
      { section: 'إعدادات المنصة', to: '/sa/templates', label: 'قوالب النظام', icon: FileText, element: cs('قوالب النظام', 'إدارة قوالب المستندات والرسائل', FileText) },
      { section: 'إعدادات المنصة', to: '/sa/ai', label: 'إعدادات الذكاء الاصطناعي', icon: Bot, element: cs('إعدادات الذكاء الاصطناعي', 'ضبط ميزات الذكاء الاصطناعي', Bot) },
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

      { section: 'المؤسسة', to: '/hr/company', label: 'مؤسستي', icon: Building2, element: <Company /> },
      { section: 'المؤسسة', to: '/departments', label: 'الهيكل التنظيمي', icon: Network, element: <Departments /> },
      { section: 'المؤسسة', to: '/employees', label: 'الموظفون', icon: Users, element: <Employees /> },

      { section: 'التوظيف والتعيين', to: '/hr/recruitment', label: 'التوظيف', icon: Briefcase, element: <Recruitment /> },
      { section: 'التوظيف والتعيين', to: '/hr/onboarding', label: 'التهيئة Onboarding', icon: UserPlus, element: <Onboarding /> },

      { section: 'الوقت والحضور', to: '/attendance', label: 'الحضور والدوام', icon: CalendarCheck, element: <Attendance /> },
      { section: 'الوقت والحضور', to: '/hr/shifts', label: 'الورديات والجداول', icon: CalendarRange, element: <Shifts /> },
      { section: 'الوقت والحضور', to: '/hr/timesheets', label: 'الجداول الزمنية Timesheets', icon: Timer, element: <Timesheets /> },
      { section: 'الوقت والحضور', to: '/leaves', label: 'الإجازات', icon: CalendarDays, element: <Leaves /> },

      { section: 'الرواتب والتعويضات', to: '/hr/payroll', label: 'الرواتب', icon: Wallet, element: <Payroll /> },
      { section: 'الرواتب والتعويضات', to: '/hr/compensation', label: 'التعويضات والمزايا', icon: Gift, element: <Compensation /> },
      { section: 'الرواتب والتعويضات', to: '/hr/expenses', label: 'المصروفات والسلف', icon: Receipt, element: <Expenses /> },

      { section: 'الأداء والتطوير', to: '/hr/performance', label: 'الأداء والأهداف', icon: Target, element: <Performance /> },
      { section: 'الأداء والتطوير', to: '/hr/training', label: 'التدريب والتطوير', icon: GraduationCap, element: <Training /> },
      { section: 'الأداء والتطوير', to: '/hr/talent', label: 'المواهب والتعاقب الوظيفي', icon: Star, element: <Talent /> },

      { section: 'خدمات الموظفين', to: '/hr/requests', label: 'الخدمات والطلبات', icon: Inbox, element: <Requests title="الخدمات والطلبات" description="راجع واعتمد طلبات الموظفين (خطابات، تحديث بيانات، عمل عن بُعد…)." /> },
      { section: 'خدمات الموظفين', to: '/hr/documents', label: 'المستندات', icon: FileText, element: <Documents /> },
      { section: 'خدمات الموظفين', to: '/hr/assets', label: 'الأصول والعهد', icon: Package, element: <Assets /> },
      { section: 'خدمات الموظفين', to: '/hr/engagement', label: 'المشاركة والتواصل', icon: Megaphone, element: <Announcements /> },

      { section: 'الامتثال والعلاقات', to: '/hr/health-safety', label: 'الصحة والسلامة', icon: ShieldPlus, element: <HealthSafety /> },
      { section: 'الامتثال والعلاقات', to: '/hr/grievances', label: 'المخالفات والشكاوى', icon: AlertTriangle, element: <Grievances /> },
      { section: 'الامتثال والعلاقات', to: '/hr/offboarding', label: 'إنهاء الخدمة', icon: UserMinus, element: <Offboarding /> },

      { section: 'النظام والتقارير', to: '/hr/reports', label: 'التقارير والتحليلات', icon: BarChart3, element: <Reports /> },
      { section: 'النظام والتقارير', to: '/hr/automation', label: 'الأتمتة وسير العمل', icon: Workflow, element: <Automation /> },
      { section: 'النظام والتقارير', to: '/hr/integrations', label: 'التكاملات', icon: Plug, element: <Integrations /> },
      { section: 'النظام والتقارير', to: '/hr/settings', label: 'الإعدادات', icon: Settings, element: <HrSettings /> },
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
      { to: '/mgr/metrics', label: 'مؤشرات الفريق', icon: TrendingUp, element: <TeamMetrics /> },

      { section: 'إدارة الفريق', to: '/employees', label: 'أعضاء الفريق', icon: Users, element: <Employees /> },
      { section: 'إدارة الفريق', to: '/attendance', label: 'حضور الفريق', icon: CalendarCheck, element: <Attendance /> },
      { section: 'إدارة الفريق', to: '/mgr/schedule', label: 'جداول الفريق', icon: Clock, element: <Shifts /> },

      { section: 'الموافقات', to: '/leaves', label: 'الموافقة على الإجازات', icon: CalendarDays, element: <Leaves /> },
      { section: 'الموافقات', to: '/mgr/requests', label: 'طلبات الفريق', icon: Inbox, element: <Requests title="طلبات الفريق" description="راجع واعتمد طلبات أعضاء فريقك." /> },
      { section: 'الموافقات', to: '/mgr/expenses', label: 'اعتماد المصروفات', icon: Receipt, element: <Expenses /> },

      { section: 'الأداء والمهام', to: '/mgr/performance', label: 'مراجعة الأداء', icon: Target, element: <Performance /> },
      { section: 'الأداء والمهام', to: '/mgr/tasks', label: 'المهام والأهداف', icon: ClipboardList, element: <Tasks title="مهام الفريق" description="أسند المهام لأعضاء فريقك وتابع تقدّمها." /> },
      { section: 'الأداء والمهام', to: '/mgr/training', label: 'التدريب والتطوير', icon: GraduationCap, element: <Training /> },

      { section: 'التوظيف والتطوير الوظيفي', to: '/mgr/hiring', label: 'طلب موظفين', icon: PlusCircle, element: <Hiring /> },
      { section: 'التوظيف والتطوير الوظيفي', to: '/mgr/interviews', label: 'المقابلات', icon: Video, element: <Interviews /> },
      { section: 'التوظيف والتطوير الوظيفي', to: '/mgr/promotions', label: 'الترقية والنقل', icon: ArrowUpDown, element: <Promotions /> },

      { section: 'حسابي', to: '/profile', label: 'ملفي الشخصي', icon: UserCircle, element: <Profile /> },
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

      { section: 'الوقت والحضور', to: '/attendance', label: 'الحضور والانصراف', icon: CalendarCheck, element: <Attendance /> },
      { section: 'الوقت والحضور', to: '/leaves', label: 'الإجازات ورصيدها', icon: CalendarDays, element: <Leaves /> },
      { section: 'الوقت والحضور', to: '/ess/schedule', label: 'جدول الدوام', icon: CalendarRange, element: <Shifts /> },
      { section: 'الوقت والحضور', to: '/ess/remote', label: 'العمل عن بُعد', icon: Laptop, element: <Requests type="عمل عن بعد" title="طلب العمل عن بُعد" description="قدّم طلب عمل عن بُعد لموافقة مديرك." /> },
      { section: 'الوقت والحضور', to: '/ess/overtime', label: 'العمل الإضافي', icon: Clock, element: <Requests type="عمل إضافي" title="طلب العمل الإضافي" description="قدّم طلب عمل إضافي وتابع اعتماده." /> },

      { section: 'الرواتب والمصروفات', to: '/ess/payslips', label: 'قسائم الراتب', icon: Wallet, element: <Payslips /> },
      { section: 'الرواتب والمصروفات', to: '/ess/expenses', label: 'المصروفات', icon: Receipt, element: <Expenses /> },
      { section: 'الرواتب والمصروفات', to: '/ess/benefits', label: 'المزايا والتأمين', icon: ShieldCheck, element: <Compensation /> },

      { section: 'الأداء والتطوير', to: '/ess/goals', label: 'مهامي', icon: ClipboardList, element: <Tasks title="مهامي" description="المهام المسندة إليك — حدّث حالتها فور إنجازها." /> },
      { section: 'الأداء والتطوير', to: '/ess/performance', label: 'الأداء والأهداف', icon: Target, element: <Performance /> },
      { section: 'الأداء والتطوير', to: '/ess/courses', label: 'الدورات', icon: GraduationCap, element: <Training /> },

      { section: 'الطلبات والخدمات', to: '/ess/letters', label: 'الشهادات والخطابات', icon: FileText, element: <Requests typeOptions={['شهادة', 'خطاب']} title="الشهادات والخطابات" description="اطلب خطاب تعريف أو شهادة رسمية وتابع حالتها." /> },
      { section: 'الطلبات والخدمات', to: '/ess/data-update', label: 'تحديث البيانات', icon: UserCog, element: <Requests type="تحديث بيانات" title="طلب تحديث البيانات" description="اطلب تعديل بياناتك الشخصية لدى الموارد البشرية." /> },
      { section: 'الطلبات والخدمات', to: '/ess/sign', label: 'توقيع المستندات', icon: FileSignature, element: <Signatures /> },
      { section: 'الطلبات والخدمات', to: '/ess/complaints', label: 'الشكاوى والاستفسارات', icon: MessageSquare, element: <Requests type="شكوى" title="الشكاوى والاستفسارات" description="قدّم شكوى أو استفساراً وتابع الرد عليه." /> },

      { section: 'التواصل والمعرفة', to: '/ess/announcements', label: 'الإعلانات', icon: Megaphone, element: <Announcements /> },
      { section: 'التواصل والمعرفة', to: '/ess/policies', label: 'السياسات', icon: ScrollText, element: <Policies /> },
      { section: 'التواصل والمعرفة', to: '/ess/surveys', label: 'الاستطلاعات', icon: ListChecks, element: <Surveys /> },
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
      { to: '/cand/profile', label: 'الملف المهني', icon: UserCircle, element: <CandidateProfile /> },
      { to: '/cand/cv', label: 'السيرة الذاتية', icon: FileText, element: <CandidateCV /> },
      { to: '/cand/jobs', label: 'تصفح الوظائف', icon: Search, element: <Jobs /> },
      { to: '/cand/applications', label: 'طلباتي', icon: ListChecks, element: <Applications /> },
      { to: '/cand/interview', label: 'المقابلات', icon: CalendarDays, element: <CandidateInterview /> },
      { to: '/cand/video', label: 'مقابلة فيديو', icon: Video, element: <CandidateVideo /> },
      { to: '/cand/forms', label: 'نماذج ما قبل التوظيف', icon: FileSignature, element: <CandidateForms /> },
      { to: '/cand/documents', label: 'المستندات', icon: FileText, element: <CandidateDocuments /> },
      { to: '/cand/offer', label: 'عرض العمل', icon: Send, element: <CandidateOffer /> },
      { to: '/cand/contact', label: 'التواصل', icon: MessageSquare, element: <CandidateContact /> },
      { to: '/cand/talent-pool', label: 'قاعدة المواهب', icon: Star, element: <CandidateTalentPool /> },
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
