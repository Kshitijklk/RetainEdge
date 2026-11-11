import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { IconGrid, IconDatabase, IconRadar, IconUser, IconLogout, IconPulse, IconClose, IconAlert, IconFile } from './Icons';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/datasets', label: 'Datasets', icon: IconDatabase },
  { to: '/predictions', label: 'Predictions', icon: IconRadar },
  { to: '/profile', label: 'Profile', icon: IconUser },
  { to: '/help-support', label: 'Help & Support', icon: IconAlert },
  { to: '/about', label: 'About', icon: IconFile },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/10 bg-[#1c1025]/90 px-3 py-5 flex flex-col shadow-glow backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 mb-8">
              <div className="flex items-center gap-2">
                <span className="text-brand-pale">
                  <IconPulse />
                </span>
                <span className="font-display text-lg text-text">RetainEdge</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-text-muted">
                <IconClose />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-[#190f22]/75 px-4 backdrop-blur-xl md:px-8 shrink-0">
          <div className="flex h-full items-center justify-between">
            <button
              className="md:hidden text-text-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <IconGrid />
            </button>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#935073] to-[#F6DBC0] flex items-center justify-center text-xs font-medium text-[#140D1D]">
                    {(user?.name || user?.email || '?')[0]?.toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-text hidden sm:inline">{user?.name || user?.email}</span>
              </div>
              <button className="btn-ghost !px-2.5 !py-2" onClick={handleLogout} title="Log out" aria-label="Log out">
                <IconLogout />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
