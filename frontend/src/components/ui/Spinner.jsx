import { cn } from '../../lib/utils'

export default function Spinner({ className, fullscreen = false }) {
  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-4 border-primary-100 border-t-primary-600 w-8 h-8',
        className
      )}
    />
  )

  if (fullscreen) {
    return <div className="flex items-center justify-center min-h-[60vh]">{spinner}</div>
  }
  return spinner
}
