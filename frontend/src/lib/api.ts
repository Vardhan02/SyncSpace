import { useAuthStore } from "@/stores/authStore"

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

export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const token = useAuthStore.getState().accessToken
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, readable(data?.message ?? "Something went wrong"))
  }
  return data as T
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong"
}
