import React, { useState } from 'react'
import { Clock, FileText, CheckCircle2, StickyNote } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Project, UpdateProjectInput } from '@/lib/api/types'

// ============= HELPER COMPONENTS =============

interface SectionProps {
  title: string
  helper?: string
  children: React.ReactNode
  action?: React.ReactNode
  disabled?: boolean
}

function Section({ title, helper, children, action, disabled = false }: SectionProps) {
  return (
    <section className="rounded-lg">
      <header className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="text-[13px] font-semibold text-slate-900 dark:text-neutral-200 truncate">{title}</h3>
          {helper && <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 truncate">{helper}</p>}
        </div>
        <div className="flex-shrink-0">{action}</div>
      </header>
      <div className="relative p-2 sm:p-3">
        {children}
        {disabled && <div className="absolute inset-0 pointer-events-auto" />}
      </div>
    </section>
  )
}

interface RowProps {
  label: string
  children: React.ReactNode
}

function Row({ label, children }: RowProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-0.5 py-1 sm:py-1.5 sm:grid-cols-[120px_1fr] md:grid-cols-[140px_1fr] sm:gap-x-1 md:gap-x-2">
      <label className="text-[12px] font-medium text-slate-700 dark:text-neutral-300 sm:pr-1 pt-1.5">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-2.5 py-1.5 text-[12px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-slate-500 ${props.className || ''}`}
    />
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function TextArea(props: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-2.5 py-1.5 text-[12px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-slate-500 ${props.className || ''}`}
    />
  )
}

// ============= PHONE HELPERS =============

function onlyDigits(s: string | null | undefined): string {
  return String(s ?? '').replace(/\D/g, '').slice(0, 10)
}

function formatPhone(digits: string): string {
  const s = String(digits || '').slice(0, 10)
  const a = s.slice(0, 3)
  const b = s.slice(3, 6)
  const c = s.slice(6, 10)
  if (!s) return ''
  if (s.length < 3) return `(${a}`
  if (s.length === 3) return `(${a}) `
  if (s.length < 6) return `(${a}) ${b}`
  if (s.length === 6) return `(${a}) ${b}-`
  return `(${a}) ${b}-${c}`
}

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  digits: string
  onDigitsChange: (digits: string) => void
}

function PhoneInput({ digits, onDigitsChange, ...props }: PhoneInputProps) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={formatPhone(digits)}
      onChange={(e) => onDigitsChange(onlyDigits(e.target.value))}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-2.5 py-1.5 text-[12px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-slate-500 ${props.className || ''}`}
      {...props}
    />
  )
}

// ============= ACTIVITY TYPES =============

interface Activity {
  id: string
  type: string
  user: string
  message: string
  when: string
}

// ============= MAIN COMPONENT =============

interface ProjectTabContentProps {
  project: Project
  onUpdate: (input: Partial<UpdateProjectInput>) => void
}

export default function ProjectTabContent({ project, onUpdate }: ProjectTabContentProps) {
  const [menu, setMenu] = useState<'profile' | 'client' | 'parcel' | 'billing' | 'preferences' | 'activity'>('profile')
  const [draft, setDraft] = useState({
    name: project.name || '',
    address: project.address || {},
    status: project.status || 'pending',
    phase: project.phase || 'Pre-Design',
    description: project.description || '',
    estimatedAmount: project.estimatedAmount ?? '',
    dueDate: project.dueDate || '',
    progress: project.progress ?? 0,
    primaryClient: {
      firstName: project.primaryClient?.firstName || '',
      lastName: project.primaryClient?.lastName || '',
      email: project.primaryClient?.email || '',
      phone: onlyDigits(project.primaryClient?.phone),
    },
    secondaryClient: project.secondaryClient ? {
      firstName: project.secondaryClient.firstName || '',
      lastName: project.secondaryClient.lastName || '',
      email: project.secondaryClient.email || '',
      phone: onlyDigits(project.secondaryClient.phone),
    } : null,
    assessorParcelInfo: project.assessorParcelInfo || {},
    invoiceNotes: '',
  })

  const [mode, setMode] = useState({ profile: false, client: false, billing: false })
  const [snapshot, setSnapshot] = useState<any>(null)
  const [activityFilter, setActivityFilter] = useState('all')

  // Fetch activity log
  const { data: activities = [] } = useQuery({
    queryKey: ['activity', project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          action,
          resource_type,
          change_summary,
          created_at,
          user:users!activity_log_user_id_fkey(name, avatar_url)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((a: any) => ({
        id: a.id,
        type: a.resource_type?.toLowerCase() || 'note',
        user: a.user?.name || 'Unknown',
        message: a.change_summary || a.action,
        when: a.created_at,
      })) as Activity[]
    },
  })

  // Phone validation
  const primaryPhoneDigits = onlyDigits(draft.primaryClient?.phone)
  const secondaryPhoneDigits = draft.secondaryClient ? onlyDigits(draft.secondaryClient.phone) : ''
  const clientPhonesValid =
    primaryPhoneDigits.length === 10 &&
    (!draft.secondaryClient || secondaryPhoneDigits.length === 0 || secondaryPhoneDigits.length === 10)

  const beginEdit = (key: keyof typeof mode) => {
    setSnapshot(JSON.parse(JSON.stringify(draft)))
    setMode((m) => ({ ...m, [key]: true }))
  }

  const cancelEdit = (key: keyof typeof mode) => {
    if (snapshot) setDraft(snapshot)
    setMode((m) => ({ ...m, [key]: false }))
  }

  const saveEdit = (key: keyof typeof mode) => {
    // Transform draft to API format
    const updatePayload: Partial<UpdateProjectInput> = {}
    
    if (key === 'profile') {
      updatePayload.name = draft.name
      updatePayload.address = draft.address
      updatePayload.status = draft.status
      updatePayload.phase = draft.phase
      updatePayload.description = draft.description
      updatePayload.estimatedAmount = draft.estimatedAmount ? Number(draft.estimatedAmount) : undefined
      updatePayload.dueDate = draft.dueDate || undefined
      updatePayload.progress = draft.progress
    } else if (key === 'client') {
      updatePayload.primaryClient = draft.primaryClient
      updatePayload.secondaryClient = draft.secondaryClient || undefined
    } else if (key === 'billing') {
      updatePayload.estimatedAmount = draft.estimatedAmount ? Number(draft.estimatedAmount) : undefined
    }

    onUpdate(updatePayload)
    setMode((m) => ({ ...m, [key]: false }))
  }

  const save = (patch: any) => {
    setDraft((d) => ({ ...d, ...patch }))
    onUpdate(patch)
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0A0E14] p-1.5 sm:p-2 md:p-3">
      <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-[140px_1fr] lg:grid-cols-[145px_1fr] md:min-h-[60vh] md:items-start">
        <nav className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1118] p-1 sm:p-1.5 text-[12px] shadow-sm md:sticky md:top-1 md:h-[calc(100vh-120px)] md:max-h-[70vh] md:overflow-auto md:w-[140px] lg:w-[145px]">
          <MenuItem id="profile" label="Project profile" active={menu} setActive={setMenu} />
          <MenuItem id="client" label="Client profile" active={menu} setActive={setMenu} />
          <MenuItem id="parcel" label="Parcel information" active={menu} setActive={setMenu} />
          <MenuItem id="billing" label="Billing & fees" active={menu} setActive={setMenu} />
          <MenuItem id="preferences" label="Preferences" active={menu} setActive={setMenu} />
          <MenuItem id="activity" label="Activity" active={menu} setActive={setMenu} />
        </nav>

        <div className="space-y-2 sm:space-y-3">
          {menu === 'profile' && (
            <Section
              title="Project profile"
              helper="Grouped fields to save space"
              disabled={!mode.profile}
              action={
                !mode.profile ? (
                  <button
                    onClick={() => beginEdit('profile')}
                    className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => cancelEdit('profile')}
                      className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit('profile')}
                      className="rounded-md bg-slate-900 dark:bg-[#3b82f6] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-white hover:bg-slate-800 dark:hover:bg-[#2563eb] whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )
              }
            >
              <Row label="Project name">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Row>

              <Row label="Address">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 md:grid-cols-[50px_1fr_1fr_140px]">
                  <Input
                    placeholder="#"
                    value={draft.address.streetNumber || ''}
                    onChange={(e) => setDraft({ ...draft, address: { ...draft.address, streetNumber: e.target.value } })}
                  />
                  <Input
                    placeholder="Street"
                    value={draft.address.streetName || ''}
                    onChange={(e) => setDraft({ ...draft, address: { ...draft.address, streetName: e.target.value } })}
                  />
                  <Input
                    placeholder="City"
                    value={draft.address.city || ''}
                    onChange={(e) => setDraft({ ...draft, address: { ...draft.address, city: e.target.value } })}
                  />
                  <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                    <Input
                      placeholder="State"
                      value={draft.address.state || ''}
                      onChange={(e) => setDraft({ ...draft, address: { ...draft.address, state: e.target.value } })}
                    />
                    <Input
                      placeholder="ZIP"
                      value={draft.address.zipCode || ''}
                      onChange={(e) => setDraft({ ...draft, address: { ...draft.address, zipCode: e.target.value } })}
                    />
                  </div>
                </div>
              </Row>

              <Row label="Status & Phase">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-2">
                  <select
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-2.5 py-1.5 text-[12px] text-slate-900 dark:text-neutral-200"
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as 'pending' | 'active' | 'completed' | 'archived' })}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-2.5 py-1.5 text-[12px] text-slate-900 dark:text-neutral-200"
                    value={draft.phase}
                    onChange={(e) => setDraft({ ...draft, phase: e.target.value as 'Pre-Design' | 'Design' | 'Permit' | 'Build' })}
                  >
                    <option value="Pre-Design">Pre-Design</option>
                    <option value="Design">Design</option>
                    <option value="Permit">Permit</option>
                    <option value="Build">Build</option>
                  </select>
                </div>
              </Row>

              <Row label="Budget, Due, Progress">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-2 md:grid-cols-3">
                  <Input
                    type="number"
                    value={draft.estimatedAmount ?? ''}
                    onChange={(e) => setDraft({ ...draft, estimatedAmount: e.target.value })}
                    placeholder="$ Amount"
                  />
                  <Input
                    type="date"
                    value={draft.dueDate || ''}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={draft.progress}
                      onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                      className="w-full"
                    />
                    <span className="w-10 text-right text-[12px] text-slate-700 dark:text-neutral-300">{draft.progress}%</span>
                  </div>
                </div>
              </Row>

              <Row label="Description">
                <TextArea
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Row>
            </Section>
          )}

          {menu === 'client' && (
            <Section
              title="Client profile"
              helper="Primary & secondary"
              disabled={!mode.client}
              action={
                !mode.client ? (
                  <button
                    onClick={() => beginEdit('client')}
                    className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => cancelEdit('client')}
                      className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit('client')}
                      disabled={!clientPhonesValid}
                      className={`rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-white whitespace-nowrap ${
                        !clientPhonesValid
                          ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 dark:bg-[#3b82f6] hover:bg-slate-800 dark:hover:bg-[#2563eb]'
                      }`}
                    >
                      Save
                    </button>
                  </div>
                )
              }
            >
              <Row label="Primary client">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_140px]">
                  <Input
                    placeholder="First"
                    value={draft.primaryClient.firstName || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, primaryClient: { ...draft.primaryClient, firstName: e.target.value } })
                    }
                  />
                  <Input
                    placeholder="Last"
                    value={draft.primaryClient.lastName || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, primaryClient: { ...draft.primaryClient, lastName: e.target.value } })
                    }
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={draft.primaryClient.email || ''}
                    onChange={(e) =>
                      setDraft({ ...draft, primaryClient: { ...draft.primaryClient, email: e.target.value } })
                    }
                  />
                  <PhoneInput
                    placeholder="(999) 999-9999"
                    digits={onlyDigits(draft.primaryClient.phone)}
                    onDigitsChange={(d) =>
                      setDraft({ ...draft, primaryClient: { ...draft.primaryClient, phone: d } })
                    }
                  />
                </div>
              </Row>

              <Row label="Secondary client">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_140px]">
                  <Input
                    placeholder="First"
                    value={draft.secondaryClient?.firstName || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        secondaryClient: {
                          firstName: e.target.value,
                          lastName: draft.secondaryClient?.lastName || '',
                          email: draft.secondaryClient?.email || '',
                          phone: draft.secondaryClient?.phone || '',
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="Last"
                    value={draft.secondaryClient?.lastName || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        secondaryClient: {
                          firstName: draft.secondaryClient?.firstName || '',
                          lastName: e.target.value,
                          email: draft.secondaryClient?.email || '',
                          phone: draft.secondaryClient?.phone || '',
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={draft.secondaryClient?.email || ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        secondaryClient: {
                          firstName: draft.secondaryClient?.firstName || '',
                          lastName: draft.secondaryClient?.lastName || '',
                          email: e.target.value,
                          phone: draft.secondaryClient?.phone || '',
                        },
                      })
                    }
                  />
                  <PhoneInput
                    placeholder="(999) 999-9999"
                    digits={draft.secondaryClient ? onlyDigits(draft.secondaryClient.phone) : ''}
                    onDigitsChange={(d) =>
                      setDraft({
                        ...draft,
                        secondaryClient: {
                          firstName: draft.secondaryClient?.firstName || '',
                          lastName: draft.secondaryClient?.lastName || '',
                          email: draft.secondaryClient?.email || '',
                          phone: d,
                        },
                      })
                    }
                  />
                </div>
              </Row>
            </Section>
          )}

          {menu === 'parcel' && (
            <Section title="Parcel information" helper="Assessor & zoning data">
              <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Assessor's Parcel #" value={project.assessorParcelInfo?.parcelNumber} />
                <Field label="Occupancy Class" value={project.assessorParcelInfo?.occupancyClass} />
                <Field label="Zoning Designation" value={project.assessorParcelInfo?.zoningDesignation} />
                <Field label="Construction" value={project.assessorParcelInfo?.construction} />
                <Field label="Stories" value={project.assessorParcelInfo?.stories} />
                <Field label="Plate Height" value={project.assessorParcelInfo?.plateHeight} />
                <Field label="Roof Height" value={project.assessorParcelInfo?.roofHeight} />
                <Field label="Year Built" value={project.assessorParcelInfo?.yearBuilt} />
                <Field label="Approx Lot Area" value={project.assessorParcelInfo?.lotArea} />
                <Field label="Acres" value={project.assessorParcelInfo?.acres} />
              </div>
            </Section>
          )}

          {menu === 'billing' && (
            <Section
              title="Billing & fees"
              helper="Design fee and invoice notes"
              disabled={!mode.billing}
              action={
                !mode.billing ? (
                  <button
                    onClick={() => beginEdit('billing')}
                    className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => cancelEdit('billing')}
                      className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-slate-900 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-[#1a2433] whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit('billing')}
                      className="rounded-md bg-slate-900 dark:bg-[#3b82f6] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] text-white hover:bg-slate-800 dark:hover:bg-[#2563eb] whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )
              }
            >
              <Row label="Estimated amount & Notes">
                <div className="grid grid-cols-1 gap-1 sm:gap-1.5 sm:grid-cols-1 md:grid-cols-[1fr_2fr]">
                  <Input
                    type="number"
                    value={draft.estimatedAmount ?? ''}
                    onChange={(e) => setDraft({ ...draft, estimatedAmount: e.target.value })}
                    placeholder="$ Amount"
                  />
                  <TextArea
                    rows={2}
                    value={draft.invoiceNotes}
                    onChange={(e) => setDraft({ ...draft, invoiceNotes: e.target.value })}
                    placeholder="Internal notes for invoicing"
                  />
                </div>
              </Row>
            </Section>
          )}

          {menu === 'preferences' && (
            <Section title="Preferences" helper="Small project options">
              <div className="space-y-2 text-[12px] text-slate-700 dark:text-neutral-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                    defaultChecked
                  />
                  Show phases in timeline
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-600" />
                  Use simplified invoices
                </label>
              </div>
            </Section>
          )}

          {menu === 'activity' && (
            <Section title="Activity" helper="Recent project events">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'file', label: 'Files' },
                  { id: 'task', label: 'Tasks' },
                  { id: 'status', label: 'Status' },
                  { id: 'note', label: 'Notes' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActivityFilter(f.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      activityFilter === f.id
                        ? 'bg-slate-900 dark:bg-[#3b82f6] text-white'
                        : 'bg-slate-100 dark:bg-[#141C28] text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-[#1a2433]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {activities
                  .filter((a) => activityFilter === 'all' || a.type === activityFilter)
                  .map((a) => (
                    <li key={a.id} className="flex items-start gap-2 py-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-[#141C28]">
                        <TypeIcon type={a.type} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-slate-900 dark:text-neutral-200">{a.message}</div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                          {a.user} • {formatLocal(a.when)}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>

              {activities.length === 0 && (
                <div className="py-6 text-center text-[12px] text-slate-500 dark:text-neutral-400">
                  No activity yet for this project
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

// ============= SUB COMPONENTS =============

interface MenuItemProps {
  id: string
  label: string
  active: string
  setActive: (id: any) => void
}

function MenuItem({ id, label, active, setActive }: MenuItemProps) {
  const isActive = active === id
  return (
    <button
      className={`flex w-full items-center rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 text-left transition-colors ${
        isActive
          ? 'bg-slate-100 dark:bg-[#141C28] text-slate-900 dark:text-blue-300 font-medium'
          : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#141C28]'
      }`}
      onClick={() => setActive(id)}
    >
      <span className="text-[11px] sm:text-[12px]">{label}</span>
    </button>
  )
}

interface FieldProps {
  label: string
  value?: string | number | null
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] text-slate-900 dark:text-neutral-200">{value ?? '—'}</div>
    </div>
  )
}

function TypeIcon({ type }: { type: string }) {
  const cls = 'h-3.5 w-3.5 text-slate-700 dark:text-neutral-300'
  if (type === 'file') return <FileText className={cls} />
  if (type === 'task') return <CheckCircle2 className={cls} />
  if (type === 'status') return <Clock className={cls} />
  return <StickyNote className={cls} />
}

function formatLocal(ts: string) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}
