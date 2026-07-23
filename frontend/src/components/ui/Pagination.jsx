import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`e${idx}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'w-9 h-9 rounded-lg border text-sm font-medium transition-colors',
              p === page
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  )
}
