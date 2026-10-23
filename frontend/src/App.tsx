import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  )
}

export default App
