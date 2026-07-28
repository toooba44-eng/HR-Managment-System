import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import EmployeeDetail from './pages/EmployeeDetail'
import Profile from './pages/Profile'
import Policies from './pages/hr/Policies'
import { buildRouteTable, portalForRole } from './config/portals'
import { useAuthStore } from './store/authStore'

// Routes that aren't in any portal's nav but must stay reachable (by URL or
// from the top bar). Roles here are merged with any nav-derived roles for the
// same path so a route is never registered twice.
const extraRoutes = [
  { path: '/employees/:id', element: <EmployeeDetail />, roles: ['admin', 'hr_manager', 'department_head'] },
  { path: '/profile', element: <Profile />, roles: ['admin', 'hr_manager'] },
  { path: '/hr/policies', element: <Policies />, roles: ['admin', 'hr_manager'] },
]

// Merge nav routes + extra routes, de-duplicating by path (union of roles).
function composeRoutes() {
  const byPath = new Map()
  for (const r of buildRouteTable()) byPath.set(r.path, { ...r, roles: new Set(r.roles) })
  for (const r of extraRoutes) {
    if (byPath.has(r.path)) {
      r.roles.forEach((role) => byPath.get(r.path).roles.add(role))
    } else {
      byPath.set(r.path, { ...r, roles: new Set(r.roles) })
    }
  }
  return Array.from(byPath.values()).map((r) => ({ ...r, roles: Array.from(r.roles) }))
}

const routes = composeRoutes()

function HomeRedirect() {
  const { user } = useAuthStore()
  return <Navigate to={portalForRole(user?.role).home} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {routes.map(({ path, element, roles }) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedRoute roles={roles}>{element}</ProtectedRoute>}
          />
        ))}
      </Route>

      {/* Anything else → the current user's portal home (or login) */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
