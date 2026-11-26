// After checking a reset email link, Supabase redirects to the app with the result after the #:
//   #access_token=...&refresh_token=...&type=recovery         the link worked
//   #error=access_denied&error_code=otp_expired&error_description=...   it expired or was used
export type ResetLink = { token: string } | { expired: true } | null

export function readResetLink(hash: string): ResetLink {
  const params = new URLSearchParams(hash.replace(/^#/, ""))
  if (params.get("type") === "recovery" && params.get("access_token")) {
    return { token: params.get("access_token") as string }
  }
  if (params.get("error_code") || params.get("error")) return { expired: true }
  return null
}

// Supabase may send people back to any page, so every page checks for a reset link
export function isResetLink(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""))
  return params.get("type") === "recovery" || params.has("error_code")
}
