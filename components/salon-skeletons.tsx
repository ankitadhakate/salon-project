export function SalonSkeletons({ count = 3 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
          <div className="shimmer aspect-[4/3]" />
          <div className="grid gap-2 p-4">
            <div className="shimmer h-5 w-2/3 rounded-lg" />
            <div className="shimmer h-4 w-1/3 rounded-lg" />
            <div className="shimmer h-4 w-1/2 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  )
}