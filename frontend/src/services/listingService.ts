import { api } from "@/lib/api"
import type { LandlordOnboarding, ListingDetail } from "@/types"

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

export function createListing(values: LandlordOnboarding) {
  return api<ListingDetail>("/listings", { method: "POST", body: toListing(values) })
}

// Up to 10 per listing, JPG or PNG, 5 MB each
export function uploadListingPhotos(houseId: number, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append("files", file)
  return api<ListingDetail["photos"]>(`/listings/${houseId}/photos`, { method: "POST", body: form })
}
