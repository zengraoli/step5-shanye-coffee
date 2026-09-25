import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppLayout } from '@/components/app/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { CouponsPage } from '@/pages/CouponsPage'
import { MembersPage } from '@/pages/MembersPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { StoresPage } from '@/pages/StoresPage'
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
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/accounts" element={<PlaceholderPage />} />
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
