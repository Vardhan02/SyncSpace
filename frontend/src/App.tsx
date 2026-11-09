import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { RequireAuth } from "@/components/RequireAuth"
import { TenantLayout } from "@/components/TenantLayout"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { HousesPage } from "@/pages/HousesPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<RequireAuth role="tenant" />}>
          <Route element={<TenantLayout />}>
            <Route path="/houses" element={<HousesPage />} />
            <Route path="/roommate" element={<ComingSoonPage title="Roommate" />} />
            <Route path="/matches" element={<ComingSoonPage title="Matches" />} />
            <Route path="/profile" element={<ComingSoonPage title="Profile" />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="landlord" />}>
          <Route
            path="/landlord"
            element={<ComingSoonPage title="Landlord dashboard" showLogout />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App
