import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/components/app/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

/** 后台路由：登录页公开，其余页面受路由守卫保护 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<PlaceholderPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stores" element={<PlaceholderPage />} />
          <Route path="/members" element={<PlaceholderPage />} />
          <Route path="/coupons" element={<PlaceholderPage />} />
          <Route path="/accounts" element={<PlaceholderPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
