import { useState, useCallback, useMemo } from 'react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';

const AVATAR_PALETTE = ['#98A2FF', '#E2991A', '#2BB0A2'];

export function MembersContent() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const members = useMemo(() => [
    { name: 'Armando Lopez', email: 'armando@rehome.build', initials: 'AL', color: AVATAR_PALETTE[0], role: 'team' },
    { name: 'John Doe', email: 'alopez4300@gmail.com', initials: 'JD', color: AVATAR_PALETTE[1], role: 'consultant' },
    { name: 'Jay Doe', email: 'aalopez4300@gmail.com', initials: 'JD', color: AVATAR_PALETTE[2], role: 'client' },
  ], []);

  const toggle = useCallback((email: string) => {
    setSelected(p => ({ ...p, [email]: !p[email] }));
  }, []);

  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="teams-content">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">Members</h1>
      
      <div 
        className="grid gap-8" 
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
        data-testid="teams-2col"
      >
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">Workspace Team</h2>
          <p className="text-sm">People who have access to this workspace.</p>
          <div className="mt-3">
            <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50">
              Invite member
            </button>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            {/* Table Header */}
            <div 
              data-testid="members-header"
              className="grid items-center gap-2 px-3 h-9 text-[12px] text-[var(--muted)] bg-slate-50 border-b border-slate-200"
              style={{ gridTemplateColumns: SETTINGS_CONSTANTS.MEMBERS_COLS }}
            >
              <div></div>
              <div></div>
              <div>NAME</div>
              <div>EMAIL</div>
              <div>ROLE</div>
            </div>

            {/* Table Rows */}
            {members.map((member, idx) => {
              const isChecked = !!selected[member.email];
              
              return (
                <div
                  key={member.email}
                  className={`items-center gap-3 px-3 h-11 text-[13px] grid ${
                    idx ? 'border-t border-slate-200' : ''
                  }`}
                  style={{ gridTemplateColumns: SETTINGS_CONSTANTS.MEMBERS_COLS }}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center">
                    <label className="cursor-pointer" aria-label={`Select ${member.name}`}>
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={isChecked}
                        onChange={() => toggle(member.email)}
                      />
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${
                          isChecked
                            ? 'bg-[#4C75D1] border-[#4C75D1]'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={-1}
                      >
                        {isChecked ? (
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                          >
                            <path d="M5 12l4 4 10-10" />
                          </svg>
                        ) : null}
                      </span>
                    </label>
                  </div>

                  {/* Avatar */}
                  <div className="grid place-items-center">
                    <div
                      className="h-7 w-7 rounded-full text-white grid place-items-center text-[10px] font-semibold leading-none"
                      style={{ background: member.color }}
                    >
                      {member.initials}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="min-w-0 text-[var(--text)] font-medium truncate">
                    {member.name}
                  </div>

                  {/* Email */}
                  <div className="min-w-0 text-sm truncate">{member.email}</div>

                  {/* Role Badge */}
                  <div>
                    <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs text-[var(--text)] capitalize bg-white">
                      {member.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
