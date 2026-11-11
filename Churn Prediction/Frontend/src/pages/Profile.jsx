import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconCheck, IconLogout } from '../components/Icons';

const PROVIDER_LABEL = { phone: 'Phone code', google: 'Google' };
const STORAGE_KEY = 'retainedge-profile-settings';

const domainOptions = ['Retail', 'Finance', 'Healthcare', 'SaaS', 'Education', 'Logistics', 'Other'];

function getInitialForm(user) {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : null;

  return {
    organisationName: parsed?.organisationName || '',
    fullName: parsed?.fullName || user?.name || '',
    organisationDomain: parsed?.organisationDomain || 'Retail',
    department: parsed?.department || '',
    teamSize: parsed?.teamSize || '',
    timezone: parsed?.timezone || '',
    primaryGoal: parsed?.primaryGoal || '',
  };
}

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => getInitialForm(user));
  const [saved, setSaved] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl text-text mb-1">Profile</h1>
        <p className="text-text-muted text-sm">Manage your account details and business preferences.</p>
      </div>

      <div className="panel p-6 flex items-center gap-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#935073] to-[#F6DBC0] flex items-center justify-center text-xl text-[#140D1D] font-medium">
            {(user?.name || user?.email || '?')[0]?.toUpperCase()}
          </span>
        )}
        <div className="flex-1">
          <p className="text-text font-medium">{form.fullName || user?.name || 'Unnamed'}</p>
          <p className="text-text-muted text-sm">{user?.email || user?.phoneNumber}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-text-muted capitalize border border-white/10">
          {user?.role || 'User'}
        </span>
      </div>

      <div className="panel p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-text text-sm font-medium">Account details</h2>
          {saved && <span className="text-xs text-risk-low">Changes saved</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label">Organisation name</span>
            <input
              className="input"
              value={form.organisationName}
              onChange={(e) => handleChange('organisationName', e.target.value)}
              placeholder="Acme Labs"
            />
          </label>

          <label className="block">
            <span className="label">Full name</span>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Jordan Lee"
            />
          </label>

          <label className="block">
            <span className="label">Organisation domain</span>
            <select
              className="input"
              value={form.organisationDomain}
              onChange={(e) => handleChange('organisationDomain', e.target.value)}
            >
              {domainOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Department</span>
            <input
              className="input"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Customer Success"
            />
          </label>

          <label className="block">
            <span className="label">Team size</span>
            <input
              className="input"
              value={form.teamSize}
              onChange={(e) => handleChange('teamSize', e.target.value)}
              placeholder="25 people"
            />
          </label>

          <label className="block">
            <span className="label">Timezone</span>
            <input
              className="input"
              value={form.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              placeholder="UTC+5:30"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="label">Primary business goal</span>
            <input
              className="input"
              value={form.primaryGoal}
              onChange={(e) => handleChange('primaryGoal', e.target.value)}
              placeholder="Reduce customer churn and improve retention"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button className="btn-secondary" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="text-text text-sm font-medium mb-4">Sign-in methods</h2>
        <div className="flex flex-wrap gap-2">
          {user?.providers?.length ? (
            user.providers.map((p) => (
              <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-risk-lowSoft text-risk-low flex items-center gap-1.5 border border-risk-low/20">
                <IconCheck width={12} height={12} />
                {PROVIDER_LABEL[p] || p}
              </span>
            ))
          ) : (
            <span className="text-text-muted text-sm">No sign-in methods on record.</span>
          )}
        </div>
      </div>

      <button className="btn-secondary self-start" onClick={handleLogout}>
        <IconLogout />
        Sign out
      </button>
    </div>
  );
}
