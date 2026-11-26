import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="not-found page-wrap">
      <span className="eyebrow">404 · Page not found</span>
      <h1>We can’t find that page.</h1>
      <p>It may have moved, or the address may be incorrect.</p>
      <Link className="button button-primary" to="/">Go to Sweety</Link>
    </main>
  );
}
