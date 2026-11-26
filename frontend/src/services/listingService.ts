import { api } from "@/lib/api"
import type { LandlordOnboarding, ListingDetail, ListingSummary } from "@/types"

export function getMyListings() {
  return api<ListingSummary[]>("/listings/mine")
}

export function getListing(houseId: number) {
  return api<ListingDetail>(`/listings/${houseId}`)
}

export function deleteListing(houseId: number) {
  return api<void>(`/listings/${houseId}`, { method: "DELETE" })
}

// Names only: tenants' contact details stay hidden until an application is confirmed
export function getListingLikes(houseId: number) {
  return api<{ count: number; names: string[] }>(`/listings/${houseId}/likes`)
}

// What POST and PUT /api/listings take. Empty optional fields go as null.
function toListing(values: LandlordOnboarding) {
  return {
    title: values.title,
    area: values.area,
    address: values.address,
    rent: values.rent,
    roomType: values.roomType,
    availableFrom: values.availableFrom,
    roomsAvailable: values.roomsAvailable,
    description: values.description || null,
    amenities: values.amenities,
    petsAllowed: values.petsAllowed,
    smokingAllowed: values.smokingAllowed,
    guestPolicy: values.guestPolicy,
    quietHoursStart: values.quietHoursStart || null,
    quietHoursEnd: values.quietHoursEnd || null,
    minLeaseMonths: values.houseMinLeaseMonths,
    maxOccupants: values.maxOccupants,
    extraRules: values.extraRules?.trim() || null,
  }
}

// A saved listing in the shape the listing form edits
export function formFromListing(listing: ListingDetail): Partial<LandlordOnboarding> {
  return {
    title: listing.title,
    area: listing.area,
    address: listing.address,
    rent: listing.rent,
    roomType: listing.roomType,
    availableFrom: listing.availableFrom,
    roomsAvailable: listing.roomsAvailable,
    description: listing.description ?? "",
    amenities: listing.amenities.map((amenity) => amenity.name),
    petsAllowed: listing.petsAllowed,
    smokingAllowed: listing.smokingAllowed,
    guestPolicy: listing.guestPolicy,
    quietHoursStart: listing.quietHoursStart ?? undefined,
    quietHoursEnd: listing.quietHoursEnd ?? undefined,
    houseMinLeaseMonths: listing.minLeaseMonths,
    maxOccupants: listing.maxOccupants,
    extraRules: listing.extraRules ?? "",
    housePhotoCount: listing.photos.length,
  }
}

export function createListing(values: LandlordOnboarding) {
  return api<ListingDetail>("/listings", { method: "POST", body: toListing(values) })
}

// Leaves the status as it is
export function updateListing(houseId: number, values: LandlordOnboarding) {
  return api<ListingDetail>(`/listings/${houseId}`, { method: "PUT", body: toListing(values) })
}

export function deleteListingPhoto(houseId: number, photoId: number) {
  return api<void>(`/listings/${houseId}/photos/${photoId}`, { method: "DELETE" })
}

// Up to 10 per listing, JPG or PNG, 5 MB each
export function uploadListingPhotos(houseId: number, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  return api<ListingDetail["photos"]>(`/listings/${houseId}/photos`, { method: "POST", body: form })
}
