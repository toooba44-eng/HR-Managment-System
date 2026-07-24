import { avatarColor, getInitials, cn } from '../../lib/utils'

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-3xl',
}

export default function Avatar({ name, src, size = 'md', className }) {
  const dimension = sizes[size] || sizes.md

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', dimension, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        avatarColor(name),
        dimension,
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
