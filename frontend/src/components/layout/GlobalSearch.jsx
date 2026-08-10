import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { Search, X, FileText } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'
import { employeesApi } from '../../api/endpoints'
import Avatar from '../ui/Avatar'

const CAN_SEARCH_EMPLOYEES = ['admin', 'hr_manager', 'department_head', 'super_admin']

function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const debouncedQuery = useDebounced(query)

  const canSearchEmployees = CAN_SEARCH_EMPLOYEES.includes(user?.role)
  const navItems = portalForRole(user?.role).nav

  const pageResults = query.trim().length > 0
    ? navItems.filter((n) => n.label.includes(query.trim())).slice(0, 6)
    : []

  const { data } = useQuery(
    ['global-search-employees', debouncedQuery],
    () => employeesApi.list({ search: debouncedQuery, limit: 6 }),
    { enabled: canSearchEmployees && debouncedQuery.trim().length >= 2 }
  )
  const employeeResults = debouncedQuery.trim().length >= 2 ? (data?.employees || []) : []

  const results = [
    ...pageResults.map((r) => ({ kind: 'page', ...r })),
    ...employeeResults.map((r) => ({ kind: 'employee', ...r })),
  ]

  const close = () => { setOpen(false); setQuery(''); setActiveIndex(0) }

  const select = (r) => {
    if (!r) return
    navigate(r.kind === 'page' ? r.to : `/employees/${r.id}`)
    close()
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => { setActiveIndex(0) }, [query, debouncedQuery])

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); select(results[activeIndex]) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
        title="بحث (Ctrl+K)"
      >
        <Search className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-24 px-4" onClick={close}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="ابحث عن صفحة أو موظف..."
                className="flex-1 outline-none text-sm"
              />
              <button onClick={close} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {query.trim().length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">اكتب للبحث عن صفحة{canSearchEmployees ? ' أو موظف' : ''}</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">لا توجد نتائج</p>
              ) : (
                <>
                  {pageResults.length > 0 && (
                    <div className="py-2">
                      <p className="px-4 py-1 text-[11px] font-bold text-slate-400">الصفحات</p>
                      {pageResults.map((r, i) => (
                        <button
                          key={r.to}
                          onClick={() => select({ kind: 'page', ...r })}
                          className={`w-full text-right px-4 py-2.5 flex items-center gap-3 ${activeIndex === i ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                        >
                          {r.icon ? <r.icon className="w-4 h-4 text-slate-400 shrink-0" /> : <FileText className="w-4 h-4 text-slate-400 shrink-0" />}
                          <span className="text-sm text-slate-700">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {employeeResults.length > 0 && (
                    <div className="py-2 border-t border-slate-50">
                      <p className="px-4 py-1 text-[11px] font-bold text-slate-400">الموظفون</p>
                      {employeeResults.map((r, i) => {
                        const idx = pageResults.length + i
                        return (
                          <button
                            key={r.id}
                            onClick={() => select({ kind: 'employee', ...r })}
                            className={`w-full text-right px-4 py-2.5 flex items-center gap-3 ${activeIndex === idx ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                          >
                            <Avatar name={r.full_name} src={r.profile_picture} size="sm" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-slate-700 truncate">{r.full_name}</span>
                              <span className="block text-xs text-slate-400 truncate">{r.job_title}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
