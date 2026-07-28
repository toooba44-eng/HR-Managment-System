import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import EmployeeDetail from './pages/EmployeeDetail'
import { buildRouteTable, portalForRole } from './config/portals'
import { useAuthStore } from './store/authStore'

const routeTable = buildRouteTable()

// Extra routes that aren't part of any portal's nav
const extraRoutes = [
  { path: '/employees/:id', element: <EmployeeDetail />, roles: ['admin', 'hr_manager', 'department_head'] },
]

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
        {[...routeTable, ...extraRoutes].map(({ path, element, roles }) => (
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
