import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createListing,
  deleteListing,
  deleteListingPhoto,
  getListing,
  getListingLikes,
  getMyListings,
  updateListing,
  uploadListingPhotos,
} from "@/services/listingService"
import type { LandlordOnboarding } from "@/types"

type SaveListing = {
  // Missing for a new listing
  houseId?: number
  values: LandlordOnboarding
  removePhotoIds: number[]
  newPhotos: File[]
  // How many of the saved photos stay
  keptPhotos: number
  // Told the new id straight away, so trying again after a failed upload doesn't create a second listing
  onCreated?: (houseId: number) => void
}

// Creates or updates a listing and its photos, and returns the house id
export function useSaveListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ houseId, values, removePhotoIds, newPhotos, keptPhotos, onCreated }: SaveListing) => {
      let id: number
      if (houseId === undefined) {
        id = (await createListing(values)).houseId
        onCreated?.(id)
      } else {
        id = houseId
        await updateListing(id, values)
      }

      const removePhotos = () => Promise.all(removePhotoIds.map((photoId) => deleteListingPhoto(id, photoId)))
      const addPhotos = () => (newPhotos.length > 0 ? uploadListingPhotos(id, newPhotos) : null)
      // The backend won't delete a listing's last photo, so when every old photo goes the new
      // ones have to be in first. Otherwise removing first leaves room under the 6-photo limit.
      if (keptPhotos === 0) {
        await addPhotos()
        await removePhotos()
      } else {
        await removePhotos()
        await addPhotos()
      }
      return id
    },
    // Also after a failure, since part of it may have gone through (a photo already removed)
    onSettled: (id, _error, { houseId }) => {
      const changed = id ?? houseId
      if (changed !== undefined) queryClient.invalidateQueries({ queryKey: ["listings", changed] })
      return queryClient.invalidateQueries({ queryKey: ["listings", "mine"] })
    },
  })
}

export function useMyListingSummaries() {
  return useQuery({ queryKey: ["listings", "mine"], queryFn: getMyListings })
}

export function useListing(houseId: number) {
  return useQuery({
    queryKey: ["listings", houseId],
    queryFn: () => getListing(houseId),
    enabled: Number.isInteger(houseId),
  })
}

// Only fetched while the likes pop-up is open
export function useListingLikes(houseId: number | null) {
  return useQuery({
    queryKey: ["listings", houseId, "likes"],
    queryFn: () => getListingLikes(houseId as number),
    enabled: houseId !== null,
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteListing,
    onSuccess: (_result, houseId) => {
      queryClient.removeQueries({ queryKey: ["listings", houseId] })
      return queryClient.invalidateQueries({ queryKey: ["listings", "mine"] })
    },
  })
}
