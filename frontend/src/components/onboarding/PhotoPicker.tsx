import { ImagePlus, X } from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"

import { MAX_PHOTO_MB } from "@/lib/onboardingOptions"
import { cn } from "@/lib/utils"
import { usePhotoStore } from "@/stores/photoStore"
import type { Photo } from "@/stores/photoStore"

type PhotoPickerProps = {
  // Separates e.g. the profile photo from the house photos.
  group: string
  max: number
  count?: number
  onCountChange: (count: number) => void
  round?: boolean
  // A photo that's already uploaded. Shown until a new one is picked or it's removed.
  saved?: string
  onRemoveSaved?: () => void
}

export function PhotoPicker({ group, max, count, onCountChange, round = false, saved, onRemoveSaved }: PhotoPickerProps) {
  const picked = usePhotoStore((state) => state.groups[group]) ?? []
  const setGroup = usePhotoStore((state) => state.setGroup)
  const photos = picked.length || !saved ? picked : [{ id: "saved", url: saved, name: "Your photo" }]

  useEffect(() => {
    if (count !== photos.length) onCountChange(photos.length)
  }, [photos.length, count, onCountChange])

  function addFiles(files: FileList | null) {
    if (!files) return
    const added: Photo[] = []
    let skipped = 0

    for (const file of files) {
      const valid = ["image/jpeg", "image/png"].includes(file.type)
      const small = file.size <= MAX_PHOTO_MB * 1024 * 1024
      if (!valid || !small || picked.length + added.length >= max) {
        skipped++
        continue
      }
      added.push({ id: crypto.randomUUID(), url: URL.createObjectURL(file), name: file.name, file })
    }

    if (skipped) {
      toast.error(
        `${skipped} photo${skipped > 1 ? "s" : ""} skipped. Use JPG or PNG under ${MAX_PHOTO_MB} MB` +
          (max > 1 ? `, max ${max} photos.` : ".")
      )
    }
    setGroup(group, [...picked, ...added])
  }

  function remove(id: string) {
    if (id === "saved") {
      onRemoveSaved?.()
      return
    }
    const photo = picked.find((item) => item.id === id)
    if (photo) URL.revokeObjectURL(photo.url)
    setGroup(group, picked.filter((item) => item.id !== id))
  }

  function makeCover(id: string) {
    const photo = picked.find((item) => item.id === id)
    if (photo) setGroup(group, [photo, ...picked.filter((item) => item.id !== id)])
  }

  const tile = round ? "size-28 rounded-full" : "aspect-4/3 rounded-[12px]"

  return (
    <div className={cn(round ? "flex gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3")}>
      {photos.map((photo, index) => (
        // Only the photo is clipped to the tile, so the remove button can sit over its edge
        <div key={photo.id} className={cn("relative", round ? "size-28" : "aspect-4/3")}>
          <img src={photo.url} alt={photo.name} className={cn("size-full bg-secondary object-cover", tile)} />
          {max > 1 ? (
            index === 0 ? (
              <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-foreground">
                Cover
              </span>
            ) : (
              <button
                type="button"
                className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-white"
                onClick={() => makeCover(photo.id)}
              >
                Make cover
              </button>
            )
          ) : null}
          <button
            type="button"
            aria-label={`Remove ${photo.name}`}
            className={cn(
              "absolute flex size-7 items-center justify-center rounded-full bg-white text-foreground hover:bg-secondary",
              round ? "top-0 right-0 border border-border shadow-sm" : "top-2 right-2"
            )}
            onClick={() => remove(photo.id)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}

      {photos.length < max ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-border text-[13px] text-muted-foreground transition-colors hover:bg-secondary",
            tile
          )}
        >
          <ImagePlus className="size-6" aria-hidden="true" />
          {max > 1 ? "Add photos" : "Add photo"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple={max > 1}
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </label>
      ) : null}
    </div>
  )
}
