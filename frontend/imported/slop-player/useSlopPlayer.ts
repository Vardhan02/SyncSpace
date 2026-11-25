import { useEffect, useState } from "react"

export function useSlopPlayer() {
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle")

  useEffect(() => {
    if (status !== "loading") return
    const timer = setTimeout(() => setStatus("playing"), 2000)
    return () => clearTimeout(timer)
  }, [status])

  return { status, generate: () => setStatus("loading") }
}
