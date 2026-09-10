import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { PatientsPage } from './features/patients/PatientsPage'
import { PatientDetailPage } from './features/patients/PatientDetailPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { TemplatesPage } from './features/plan/TemplatesPage'
import { BillingPage } from './features/billing/BillingPage'
import { PlanWizardPage } from './features/plan/PlanWizardPage'
import { PublicPlanPage } from './features/public/PublicPlanPage'
import { ReferencePage } from './features/reference/ReferencePage'
import { ClassroomsPage } from './features/classroom/ClassroomsPage'
import { RecipesPage } from './features/recipes/RecipesPage'
import { AgendaPage } from './features/agenda/AgendaPage'
import { ConfiguracionPage } from './features/configuracion/ConfiguracionPage'

export function App() {
  const [params] = useSearchParams()
  const resetToken = params.get('reset')
  if (resetToken) {
    return <Navigate to={`/redefinir-senha?token=${encodeURIComponent(resetToken)}`} replace />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/olvide-password" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/portal/:token" element={<PublicPlanPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="pacientes" element={<PatientsPage />} />
          <Route path="pacientes/:id" element={<PatientDetailPage />} />
          <Route path="plan/nuevo" element={<PlanWizardPage />} />
          <Route path="plan/:planId" element={<PlanWizardPage />} />
          <Route path="plantillas" element={<TemplatesPage />} />
          <Route path="recetas" element={<RecipesPage />} />
          <Route path="referencia" element={<ReferencePage />} />
          <Route path="salon" element={<ClassroomsPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="plan-pro" element={<BillingPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
