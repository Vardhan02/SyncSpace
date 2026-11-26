import axios from "axios"

import { useAuthStore } from "@/stores/authStore"

export const hasBackend = Boolean(import.meta.env.VITE_API_URL)

export const toApiHouseId = (houseId: string) => Number(houseId.replace("h-", ""))

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
