import useAuth from '../../features/auth/useAuth.js';
import Brand from './Brand.jsx';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  return (
    <header className="app-header">
      <Brand compact to="/readings" />
      <div className="header-right"><span className="header-title">{title}</span><span className="user-avatar" aria-hidden="true">{user?.name?.trim()?.[0]?.toUpperCase() || 'U'}</span><span className="user-name">{user?.name || 'Account'}</span><button className="button button-quiet logout-button" onClick={logout} type="button">Sign out</button></div>
    </header>
  );
}
