import { Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { usePhotoStore } from "@/stores/photoStore"

type ProfileSectionProps = {
  title: string
  description?: string
  editTo?: string
  className?: string
  children: ReactNode
}

export function ProfileSection({ title, description, editTo, className, children }: ProfileSectionProps) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-[20px] border border-border p-5 md:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="pt-0.5 text-[13px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {editTo ? <EditLink to={editTo} /> : null}
      </div>
      {children}
    </section>
  )
}

export function EditLink({ to, label = "Edit" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="-mt-1 -mr-2 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-medium text-foreground hover:bg-secondary"
    >
      <Pencil className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  )
}

// A list of label → value rows. Empty values show as "Not set" so gaps are easy to spot.
export function InfoList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 border-b border-border py-2.5 text-[14px] last:border-0"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={cn("text-foreground", !value && "text-placeholder")}>
            {value || "Not set"}
          </dd>
        </div>
      ))}
    </dl>
  )
}

type AvatarProps = {
  name: string
  photoGroup: string
  className?: string
}

export function Avatar({ name, photoGroup, className }: AvatarProps) {
  const photo = usePhotoStore((state) => state.groups[photoGroup]?.[0])
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-foreground",
        className
      )}
    >
      {photo ? <img src={photo.url} alt={name} className="size-full object-cover" /> : initials}
    </div>
  )
}
