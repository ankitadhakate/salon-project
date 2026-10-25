import { SalonSkeletons } from "@/components/salon-skeletons"

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-blush" />
      <div className="mt-4 h-14 animate-pulse rounded-full bg-blush-soft" />
      <div className="mt-6">
        <SalonSkeletons count={4} />
      </div>
    </div>
  )
}
