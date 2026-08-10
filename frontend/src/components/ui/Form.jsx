import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input-field', className)} {...props} />
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input-field resize-none', className)} rows={3} {...props} />
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn('input-field', className)} {...props}>
      {children}
    </select>
  )
})

export function Button({ variant = 'primary', className, children, loading, ...props }) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary'
  return (
    <button className={cn(base, (loading || props.disabled) && 'opacity-70 cursor-not-allowed', className)} disabled={loading || props.disabled} {...props}>
      {loading && (
        <span className="animate-spin rounded-full border-2 border-white/40 border-t-white w-4 h-4" />
      )}
      {children}
    </button>
  )
}
