import { NavLink } from 'react-router-dom';

const items = [{ to: '/readings', label: 'Readings', symbol: '◷' }, { to: '/reports', label: 'Reports', symbol: '▤' }];

export default function Sidebar() {
  return (
    <nav className="side-nav" aria-label="Main navigation">
      <span className="nav-label">YOUR TRACKER</span>
      {items.map(({ to, label, symbol }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><span className="nav-symbol" aria-hidden="true">{symbol}</span>{label}</NavLink>)}
      <div className="nav-note"><span className="note-dot" />Your health data is private to you.</div>
    </nav>
  );
}
