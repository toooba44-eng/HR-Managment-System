import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { portalForRole } from '../../config/portals'

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role not allowed on this route → send to the user's own portal home
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={portalForRole(user.role).home} replace />
  }

  return children
}
