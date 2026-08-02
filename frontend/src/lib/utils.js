import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Arabic role labels
export const ROLE_LABELS = {
  super_admin: 'مدير المنصة',
  admin: 'مدير النظام',
  hr_manager: 'مدير الموارد البشرية',
  department_head: 'رئيس قسم',
  employee: 'موظف',
  candidate: 'مرشح',
}

// Status → badge class mapping
export const STATUS_BADGE = {
  نشط: 'badge-success',
  حاضر: 'badge-success',
  موافقة: 'badge-success',
  إجازة: 'badge-info',
  'عمل عن بعد': 'badge-info',
  معلق: 'badge-warning',
  معلقة: 'badge-warning',
  تأخر: 'badge-warning',
  'قيد التنفيذ': 'badge-warning',
  'لم تبدأ': 'badge-info',
  جديدة: 'badge-info',
  مكتملة: 'badge-success',
  مقبولة: 'badge-success',
  مفتوحة: 'badge-success',
  مغلقة: 'badge-danger',
  'قيد المراجعة': 'badge-warning',
  مقابلة: 'badge-info',
  مقبول: 'badge-success',
  مرفوض: 'badge-danger',
  نشطة: 'badge-success',
  'معلّقة': 'badge-warning',
  معتمدة: 'badge-success',
  مصروفة: 'badge-info',
  متاح: 'badge-success',
  'مُخصّص': 'badge-info',
  صيانة: 'badge-warning',
  'مُتلف': 'badge-danger',
  متاحة: 'badge-success',
  'مفتوح': 'badge-warning',
  'قيد المعالجة': 'badge-info',
  'مغلق': 'badge-success',
  'مسجّل': 'badge-info',
  'قيد التقدم': 'badge-warning',
  مكتمل: 'badge-success',
  مسودة: 'badge-info',
  مؤرشف: 'badge-info',
  سارية: 'badge-success',
  'تنتهي قريباً': 'badge-warning',
  منتهية: 'badge-danger',
  'بدون انتهاء': 'badge-info',
  متصل: 'badge-success',
  'غير متصل': 'badge-info',
  خطأ: 'badge-danger',
  مدفوعة: 'badge-success',
  'غير مدفوعة': 'badge-warning',
  متأخرة: 'badge-danger',
  'بانتظار التوقيع': 'badge-warning',
  'موقّع': 'badge-success',
  'موافق عليه': 'badge-success',
  مجدولة: 'badge-info',
  مطلوب: 'badge-warning',
  مرفوع: 'badge-success',
  معلومة: 'badge-info',
  تحذير: 'badge-warning',
  حرج: 'badge-danger',
  فشل: 'badge-danger',
  'صحّي': 'badge-success',
  'مقدّم': 'badge-warning',
  معتمد: 'badge-success',
  غائب: 'badge-danger',
  مرفوضة: 'badge-danger',
  مستقيل: 'badge-danger',
  مفصول: 'badge-danger',
  ملغاة: 'badge-danger',
}

export function formatDate(date) {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  } catch {
    return date
  }
}

export function formatTime(datetime) {
  if (!datetime) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(datetime))
  } catch {
    return datetime
  }
}

export function formatDateTime(datetime) {
  if (!datetime) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(datetime))
  } catch {
    return datetime
  }
}

export function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getInitials(name) {
  if (!name) return '؟'
  const parts = name.trim().split(' ')
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2)
}

// Deterministic avatar color from a string
export function avatarColor(seed = '') {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-violet-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
