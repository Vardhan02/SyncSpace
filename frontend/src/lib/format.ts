export function formatMatchLikes(names: string[]) {
  if (names.length === 1) return `Liked by ${names[0]} from your matches`
  return `Liked by ${names[0]} and ${names.length - 1} more of your matches`
}

export function formatDate(value: string, month: "short" | "long" = "short") {
  return new Date(value).toLocaleDateString("en-IE", { day: "numeric", month })
}

export function formatBudgetRange(min: number, max: number) {
  return `€${min}–${max}`
}

export function formatFullDate(value: string) {
  return new Date(value).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
