import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell() {
  const { pathname } = useLocation();
  const title = pathname.startsWith('/reports') ? 'Reports' : 'Readings';
  return <div className="app-frame"><Header title={title} /><div className="app-body"><Sidebar /><main className="main-content" id="main-content"><Outlet /></main></div></div>;
}
