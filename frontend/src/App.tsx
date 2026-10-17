import { Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { LoginPage } from "@/pages/LoginPage"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  )
}

export default App
