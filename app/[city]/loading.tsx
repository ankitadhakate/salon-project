import { SalonSkeletons } from "@/components/salon-skeletons"

export default function CityLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-6">
        <SalonSkeletons />
      </div>
    </div>
  )
}
