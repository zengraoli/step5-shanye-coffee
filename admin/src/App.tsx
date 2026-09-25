import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/app/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

/** 后台路由（T10 起增加登录页与路由守卫） */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PlaceholderPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PlaceholderPage />} />
        <Route path="/orders" element={<PlaceholderPage />} />
        <Route path="/products" element={<PlaceholderPage />} />
        <Route path="/stores" element={<PlaceholderPage />} />
        <Route path="/members" element={<PlaceholderPage />} />
        <Route path="/coupons" element={<PlaceholderPage />} />
        <Route path="/accounts" element={<PlaceholderPage />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Route>
    </Routes>
  )
}
