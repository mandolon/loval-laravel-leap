import { useState, useCallback, useMemo } from 'react';
import { User, AtSign, Lock } from 'lucide-react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

interface InputRowProps {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}

const InputRow = ({ id, label, icon: Icon, type = 'text', value, onChange }: InputRowProps) => (
  <>
    <label className="block text-sm text-[var(--text)] mb-1" htmlFor={id}>
      {label}
    </label>
    <div className="mb-3 relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <input
        id={id}
        data-testid={`profile-${id}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-8 pr-2 rounded-md border border-slate-300 text-sm"
      />
    </div>
  </>
);

export function ProfileContent() {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dirty, setDirty] = useState(false);
  const [profile, setProfile] = useState({
    first: 'Armando',
    last: 'Lopez',
    email: 'armando@rehome.build',
    role: 'admin' as 'admin' | 'user'
  });
  const [avatarColor, setAvatarColor] = useState('#98A2FF');

  const markDirty = useCallback(() => setDirty(true), []);

  const onSave = useCallback(() => {
    if (!dirty || saveState === 'saving') return;
    
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setDirty(false);
      setTimeout(() => setSaveState('idle'), 900);
    }, 700);
  }, [dirty, saveState]);

  const APPEARANCE_OPTS = useMemo(() => ([
    { k: 'Light', checked: true },
    { k: 'Dark', checked: false },
    { k: 'Auto', checked: false }
  ]), []);

  return (
    <div 
      className="p-6 space-y-6 text-[var(--muted)]" 
      data-testid="profile-content"
    >
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">My Profile</h1>

      {/* Profile Information Section */}
      <div className="grid gap-8" style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}>
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">Profile</h2>
          <p className="text-sm leading-5">
            Your personal information and account security settings.
          </p>
        </div>

        <div>
          {/* Avatar */}
          <div className="mb-3">
            <div 
              className="h-20 w-20 rounded-full text-white grid place-items-center text-2xl font-semibold"
              style={{ background: avatarColor }}
            >
              AL
            </div>
          </div>

          <div className="text-sm font-medium text-[var(--text)] mb-2">
            {profile.first} {profile.last}
          </div>

          <InputRow
            id="first-name"
            label="First Name"
            icon={User}
            value={profile.first}
            onChange={(v) => {
              setProfile(p => ({ ...p, first: v }));
              markDirty();
            }}
          />

          <InputRow
            id="last-name"
            label="Last Name"
            icon={User}
            value={profile.last}
            onChange={(v) => {
              setProfile(p => ({ ...p, last: v }));
              markDirty();
            }}
          />

          <InputRow
            id="email"
            label="Email"
            icon={AtSign}
            type="email"
            value={profile.email}
            onChange={(v) => {
              setProfile(p => ({ ...p, email: v }));
              markDirty();
            }}
          />

          {/* Password */}
          <label className="block text-sm text-[var(--text)] mb-1" htmlFor="password">
            Password
          </label>
          <div className="mb-6 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <Lock className="h-4 w-4" />
            </span>
            <input
              id="password"
              placeholder="Enter New Password"
              onChange={markDirty}
              className="w-full h-9 pl-8 pr-2 rounded-md border border-slate-300 text-sm"
            />
          </div>

          {/* Admin Status */}
          <div className="mb-2">
            <span className="block text-sm text-[var(--text)] mb-1">Admin Status</span>
            <div className="flex items-center gap-2">
              <span
                data-testid="admin-badge"
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                  profile.role === 'admin'
                    ? 'bg-[#4C75D1] border-[#4C75D1] text-white'
                    : 'bg-white border-slate-300 text-[var(--text)]'
                }`}
              >
                {profile.role === 'admin' ? 'Admin' : 'User'}
              </span>
              <span className="text-sm">Contact an admin to change your status.</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" style={{ gridColumn: '1 / -1' }} />

        {/* Avatar Color Picker */}
        <div>
          <h3 className="text-[var(--text)] text-sm font-medium mb-1">Avatar color</h3>
          <p className="text-sm">Choose a preferred theme for the app.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center" role="radiogroup" aria-label="Avatar color">
          {SETTINGS_CONSTANTS.AVATAR_PALETTE.map(color => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="avatarColor"
                value={color}
                checked={avatarColor === color}
                onChange={(e) => {
                  setAvatarColor(e.target.value);
                  markDirty();
                }}
                className="peer sr-only"
                aria-label={`Avatar color ${color}`}
              />
              <span
                data-testid="color-swatch"
                className="block h-9 w-9 rounded-md border border-slate-200 peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:border-blue-500"
                style={{ backgroundColor: color }}
              />
            </label>
          ))}
        </div>

        {/* Divider */}
        <hr className="border-slate-200" style={{ gridColumn: '1 / -1' }} />

        {/* Appearance Theme Selector */}
        <div>
          <h3 className="text-[var(--text)] text-sm font-medium mb-1">Appearance</h3>
          <p className="text-sm">
            Choose light or dark mode, or switch your mode automatically based on your system settings.
          </p>
        </div>

        <div className="flex items-end gap-6" role="radiogroup" aria-label="Appearance">
          {APPEARANCE_OPTS.map(opt => (
            <label
              key={opt.k}
              data-testid="appearance-option"
              className="group w-[120px] select-none cursor-pointer"
            >
              <input
                type="radio"
                name="appearance"
                value={opt.k}
                defaultChecked={opt.checked}
                onChange={markDirty}
                className="peer sr-only"
                aria-label={opt.k}
              />
              <div className="rounded-md border p-1.5 mb-2 peer-checked:border-blue-400">
                <div
                  className={`h-[64px] rounded-sm ${
                    opt.k === 'Dark' ? 'bg-[#0f172a]' : 'bg-white'
                  } grid grid-cols-4 gap-[3px] p-2`}
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 rounded ${
                        opt.k === 'Dark' ? 'bg-[#334155]' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                  <div
                    className={`col-span-4 h-2.5 rounded ${
                      opt.k === 'Dark' ? 'bg-[#1e293b]' : 'bg-slate-300'
                    }`}
                  />
                </div>
              </div>
              <div className="text-center text-sm">{opt.k}</div>
            </label>
          ))}
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 flex justify-end">
        <button
          data-testid="saved-button"
          onClick={onSave}
          data-state={saveState}
          data-dirty={dirty ? 'true' : 'false'}
          aria-busy={saveState === 'saving'}
          disabled={!dirty || saveState === 'saving'}
          className={`w-24 inline-flex items-center justify-center rounded-md text-white text-sm px-4 py-1.5 transition-[opacity,transform,background-color] ${
            !dirty || saveState === 'saving'
              ? 'bg-[#4C75D1]/60 cursor-not-allowed'
              : 'bg-[#4C75D1] hover:opacity-90 active:scale-[.98]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {saveState === 'saving' ? (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" opacity=".25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : null}
            Save
          </span>
        </button>
      </div>
    </div>
  );
}
