import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-12 text-center">
      <h1 className="text-4xl font-semibold text-espresso">Page not found</h1>
      <p className="mt-3 text-sm text-cocoa/70">
        The page you are looking for doesn't exist.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Back to Home
      </Link>
    </section>
  )
}
