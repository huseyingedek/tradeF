import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import AdminPanelLayout from './layouts/AdminPanelLayout'
import Toasts from './components/Toasts'
import ConfirmDialog from './components/ConfirmDialog'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Markets = lazy(() => import('./pages/Markets'))
const Trade = lazy(() => import('./pages/Trade'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Orders = lazy(() => import('./pages/Orders'))
const Automation = lazy(() => import('./pages/Automation'))
const Bots = lazy(() => import('./pages/Bots'))
const Risk = lazy(() => import('./pages/Risk'))
const Exchanges = lazy(() => import('./pages/Exchanges'))
const Activity = lazy(() => import('./pages/Activity'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail'))
const AdminRisk = lazy(() => import('./pages/admin/PlatformRisk'))
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations'))
const AdminBilling = lazy(() => import('./pages/admin/Billing'))
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'))
const AdminAudit = lazy(() => import('./pages/admin/Audit'))
const AdminTeam = lazy(() => import('./pages/admin/Team'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ForgotPassword = lazy(() => import('./pages/AccountFlows').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/AccountFlows').then((m) => ({ default: m.ResetPassword })))
const VerifyEmail = lazy(() => import('./pages/AccountFlows').then((m) => ({ default: m.VerifyEmail })))
const AcceptInvite = lazy(() => import('./pages/AccountFlows').then((m) => ({ default: m.AcceptInvite })))

const Loader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
    <div className="spinner-border text-primary" role="status" />
  </div>
)

export default function App() {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/bots" element={<Bots />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/admin" element={<AdminPanelLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="risk" element={<AdminRisk />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="team" element={<AdminTeam />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toasts />
      <ConfirmDialog />
    </>
  )
}
