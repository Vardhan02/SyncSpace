import { useAuthStore } from "@/stores/authStore"
import type { AuthSession } from "@/types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
}

// "phone: invalid phone number" -> "Invalid phone number"
function readable(message: string) {
  const text = message.replace(/^\w+: /, "")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

async function send(path: string, { method = "GET", body }: RequestOptions, token: string | null) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
}

async function read<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, readable(data?.message ?? "Something went wrong"))
  }
  return data as T
}

// Requests that expire at the same time wait for the same refresh.
let refreshing: Promise<boolean> | null = null

async function renewSession() {
  const { refreshToken, startSession } = useAuthStore.getState()
  if (!refreshToken) return false

  try {
    const response = await send("/auth/refresh", { method: "POST", body: { refreshToken } }, null)
    startSession(await read<AuthSession>(response))
    return true
  } catch {
    return false
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken
  let response = await send(path, options, token)

  // Access tokens last an hour. Get a new one and try once more.
  if (response.status === 401 && token) {
    refreshing ??= renewSession().finally(() => (refreshing = null))
    if (!(await refreshing)) {
      useAuthStore.getState().logout()
      throw new ApiError(401, "Your session has expired. Log in again.")
    }
    response = await send(path, options, useAuthStore.getState().accessToken)
  }

  return read<T>(response)
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong"
}
