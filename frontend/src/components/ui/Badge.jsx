import { STATUS_BADGE, cn } from '../../lib/utils'

export default function Badge({ status, children, className }) {
  const cls = STATUS_BADGE[status] || 'badge-info'
  return <span className={cn(cls, className)}>{children || status}</span>
}
