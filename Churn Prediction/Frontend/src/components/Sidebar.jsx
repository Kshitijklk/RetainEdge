import { NavLink } from 'react-router-dom';
import { IconGrid, IconDatabase, IconRadar, IconUser, IconPulse, IconAlert, IconFile } from './Icons';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/datasets', label: 'Datasets', icon: IconDatabase },
  { to: '/predictions', label: 'Predictions', icon: IconRadar },
  { to: '/profile', label: 'Profile', icon: IconUser },
  { to: '/help-support', label: 'Help & Support', icon: IconAlert },
  { to: '/about', label: 'About', icon: IconFile },
];

export function Sidebar() {
  return (
    <aside className="w-[220px] shrink-0 hidden md:flex flex-col border-r border-white/10 bg-[#1a1025]/80 px-3 py-5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="text-[#F6DBC0]">
          <IconPulse />
        </span>
        <span className="font-display text-lg tracking-tightish text-text">RetainEdge</span>
      </div>
      <nav className="flex flex-col gap-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-xs leading-relaxed text-text-faint">
        <p>Churn signal, before it costs you the account.</p>
      </div>
    </aside>
  );
}
