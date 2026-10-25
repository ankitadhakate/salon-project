export function Flash({
  notice,
  error,
}: {
  notice?: string
  error?: string
}) {
  if (!notice && !error) return null
  return (
    <div className="grid gap-2">
      {error ? (
        <p
          id="form-error"
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}
    </div>
  )
}
