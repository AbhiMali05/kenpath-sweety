import { Link } from 'react-router-dom';

export default function Brand({ compact = false, to = '/' }) {
  return (
    <Link className={`brand${compact ? ' brand-compact' : ''}`} to={to} aria-label="Sweety home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-copy"><strong>Sweety</strong>{!compact && <small>Blood Glucose Tracker</small>}</span>
    </Link>
  );
}
