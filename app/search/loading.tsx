import { SalonSkeletons } from "@/components/salon-skeletons"

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="shimmer h-9 w-48 rounded-xl" />
      <div className="shimmer mt-4 h-14 rounded-full" />
      <div className="mt-6">
        <SalonSkeletons count={4} />
      </div>
    </div>
  )
}
