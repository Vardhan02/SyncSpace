import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { LandlordLayout } from "@/components/LandlordLayout"
import { RequireAuth } from "@/components/RequireAuth"
import { TenantLayout } from "@/components/TenantLayout"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { HouseDetailPage } from "@/pages/HouseDetailPage"
import { HousesPage } from "@/pages/HousesPage"
import { LandingPage } from "@/pages/LandingPage"
import { LandlordProfilePage } from "@/pages/LandlordProfilePage"
import { ListingDetailPage } from "@/pages/ListingDetailPage"
import { LoginPage } from "@/pages/LoginPage"
import { MyListingsPage } from "@/pages/MyListingsPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { ProfileEditPage } from "@/pages/ProfileEditPage"
import { RoomateMatchPage } from "@/pages/RoomateMatchPage"
import { SignupPage } from "@/pages/SignupPage"
import { TenantProfilePage } from "@/pages/TenantProfilePage"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
            <Route path="/matches" element={<ComingSoonPage title="Matches" />} />
            <Route path="/profile" element={<TenantProfilePage />} />
            <Route path="/profile/edit/:step" element={<ProfileEditPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="landlord" />}>
          <Route element={<LandlordLayout />}>
            <Route path="/landlord" element={<Navigate to="/landlord/listings" replace />} />
            <Route path="/landlord/listings" element={<MyListingsPage />} />
            <Route path="/landlord/listings/:houseId" element={<ListingDetailPage />} />
            <Route
              path="/landlord/listings/:houseId/edit"
              element={<ComingSoonPage title="Edit listing" />}
            />
            <Route
              path="/landlord/applications"
              element={<ComingSoonPage title="Applications" />}
            />
            <Route path="/landlord/profile" element={<LandlordProfilePage />} />
            <Route path="/landlord/profile/edit/:step" element={<ProfileEditPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  )
}

export default App
