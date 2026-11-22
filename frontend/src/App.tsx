import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { RequireAuth } from "@/components/RequireAuth"
import { TenantLayout } from "@/components/TenantLayout"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { HouseDetailPage } from "@/pages/HouseDetailPage"
import { HousesPage } from "@/pages/HousesPage"
import { LoginPage } from "@/pages/LoginPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { MatchesPage } from "@/pages/MatchesPage"
import { RoomateMatchPage } from "@/pages/RoomateMatchPage"
import { SignupPage } from "@/pages/SignupPage"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        <Route element={<RequireAuth role="tenant" />}>
          <Route element={<TenantLayout />}>
            <Route path="/houses" element={<HousesPage />} />
            <Route path="/houses/:houseId" element={<HouseDetailPage />} />
            <Route path="/roommate" element={<RoomateMatchPage />} />
            <Route path="/matches" element={<MatchesPage />} />
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
