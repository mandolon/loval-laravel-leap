import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type { Project, UpdateProjectInput } from "@/lib/api/types";

// Phone utility functions
function onlyDigits(s: string | undefined): string {
  return String(s || "").replace(/\D/g, "").slice(0, 10);
}

function formatPhone(digits: string): string {
  const s = String(digits || "").slice(0, 10);
  if (!s) return "";
  const a = s.slice(0, 3);
  const b = s.slice(3, 6);
  const c = s.slice(6, 10);
  if (s.length < 3) return `(${a}`;
  if (s.length === 3) return `(${a}) `;
  if (s.length < 6) return `(${a}) ${b}`;
  if (s.length === 6) return `(${a}) ${b}-`;
  return `(${a}) ${b}-${c}`;
}

// Component interfaces
interface SectionProps {
  title: string;
  helper?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  disabled?: boolean;
}

function Section({ title, helper, children, action, disabled = false }: SectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1118] shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-200">{title}</h3>
          {helper && <p className="text-[12px] text-slate-500 dark:text-neutral-400">{helper}</p>}
        </div>
        {action}
      </header>
      <div className="relative p-4">
        {children}
        {disabled && <div className="absolute inset-0 pointer-events-auto bg-transparent" />}
      </div>
    </section>
  );
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-0.5 py-2 sm:grid-cols-[160px_1fr] sm:gap-x-1">
      <label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 sm:pr-1">{label}</label>
      <div>{children}</div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function Input(props: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-3 py-2 text-[14px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-blue-400 ${props.className || ""}`}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

function TextArea(props: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-3 py-2 text-[14px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-blue-400 ${props.className || ""}`}
    />
  );
}

interface PhoneInputProps extends Omit<InputProps, 'onChange'> {
  digits: string;
  onDigitsChange: (digits: string) => void;
}

function PhoneInput({ digits, onDigitsChange, ...props }: PhoneInputProps) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={formatPhone(digits)}
      onChange={(e) => onDigitsChange(onlyDigits(e.target.value))}
      className={`w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-3 py-2 text-[14px] text-slate-900 dark:text-neutral-200 outline-none focus:border-slate-400 dark:focus:border-blue-400 ${props.className || ""}`}
      {...props}
    />
  );
}

interface MenuItemProps {
  id: string;
  label: string;
  active: string;
  setActive: (id: string) => void;
}

function MenuItem({ id, label, active, setActive }: MenuItemProps) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
        isActive
          ? "bg-slate-100 dark:bg-[#141C28] text-slate-900 dark:text-blue-300"
          : "text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-[#141C28]"
      }`}
    >
      {label}
    </button>
  );
}

// Main component props
interface ProjectClientSettingsRealProps {
  project: Project;
  onUpdate?: (patch: Partial<UpdateProjectInput>) => void;
  onBack?: () => void;
  onToggleChat?: (isOpen: boolean) => void;
  defaultChatOpen?: boolean;
  filesContent?: React.ReactNode;
  tasksContent?: React.ReactNode;
  invoicesContent?: React.ReactNode;
  linksContent?: React.ReactNode;
  notesContent?: React.ReactNode;
}

export default function ProjectClientSettingsReal({
  project,
  onUpdate,
  onBack,
  onToggleChat,
  defaultChatOpen = false,
  filesContent,
  tasksContent,
  invoicesContent,
  linksContent,
  notesContent,
}: ProjectClientSettingsRealProps) {
  const [menu, setMenu] = useState("profile");
  const [draft, setDraft] = useState({
    name: project.name || "",
    address: project.address || {},
    status: project.status || "active",
    phase: project.phase || "Pre-Design",
    description: project.description || "",
    estimatedAmount: project.estimatedAmount ?? "",
    dueDate: project.dueDate || "",
    progress: project.progress ?? 0,
    primaryClient: project.primaryClient || {},
    secondaryClient: project.secondaryClient || null,
    assessorParcelInfo: project.assessorParcelInfo || {},
  });

  const [mode, setMode] = useState({ profile: false, client: false, parcel: false, billing: false });
  const [snapshot, setSnapshot] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(!!defaultChatOpen);

  const onBackClick = () => {
    if (typeof onBack === "function") onBack();
    else if (typeof window !== "undefined" && window.history?.length > 0) window.history.back();
  };

  const toggleChat = () => {
    setChatOpen((v) => {
      const next = !v;
      if (typeof onToggleChat === "function") onToggleChat(next);
      return next;
    });
  };

  // Phone validation for client section
  const primaryPhoneDigits = onlyDigits(draft.primaryClient?.phone);
  const secondaryPhoneDigits = onlyDigits(draft.secondaryClient?.phone);
  const clientPhonesValid =
    primaryPhoneDigits.length === 10 &&
    (!draft.secondaryClient || !secondaryPhoneDigits || secondaryPhoneDigits.length === 0 || secondaryPhoneDigits.length === 10);

  const beginEdit = (key: keyof typeof mode) => {
    setSnapshot(JSON.parse(JSON.stringify(draft)));
    setMode((m) => ({ ...m, [key]: true }));
  };

  const cancelEdit = (key: keyof typeof mode) => {
    if (snapshot) setDraft(snapshot);
    setMode((m) => ({ ...m, [key]: false }));
  };

  const saveEdit = (key: keyof typeof mode) => {
    if (onUpdate) {
      // Map draft to UpdateProjectInput format
      const patch: Partial<UpdateProjectInput> = {
        name: draft.name,
        description: draft.description,
        status: draft.status as any,
        phase: draft.phase as any,
        address: draft.address,
        primaryClient: draft.primaryClient ? {
          firstName: draft.primaryClient.firstName,
          lastName: draft.primaryClient.lastName,
          email: draft.primaryClient.email,
          phone: draft.primaryClient.phone,
        } : undefined,
        secondaryClient: draft.secondaryClient ? {
          firstName: draft.secondaryClient.firstName,
          lastName: draft.secondaryClient.lastName,
          email: draft.secondaryClient.email,
          phone: draft.secondaryClient.phone,
        } : undefined,
        assessorParcelInfo: draft.assessorParcelInfo,
        estimatedAmount: typeof draft.estimatedAmount === 'string' ? (parseFloat(draft.estimatedAmount) || undefined) : draft.estimatedAmount,
        dueDate: draft.dueDate || undefined,
        progress: draft.progress,
      };
      onUpdate(patch);
    }
    setMode((m) => ({ ...m, [key]: false }));
  };

  const save = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (onUpdate) {
      const mappedPatch: Partial<UpdateProjectInput> = {};
      if (patch.name !== undefined) mappedPatch.name = patch.name;
      if (patch.description !== undefined) mappedPatch.description = patch.description;
      if (patch.status !== undefined) mappedPatch.status = patch.status as any;
      if (patch.phase !== undefined) mappedPatch.phase = patch.phase as any;
      if (patch.address !== undefined) mappedPatch.address = patch.address;
      if (patch.primaryClient !== undefined) {
        mappedPatch.primaryClient = {
          firstName: patch.primaryClient.firstName,
          lastName: patch.primaryClient.lastName,
          email: patch.primaryClient.email,
          phone: patch.primaryClient.phone,
        };
      }
      if (patch.secondaryClient !== undefined) {
        mappedPatch.secondaryClient = patch.secondaryClient ? {
          firstName: patch.secondaryClient.firstName,
          lastName: patch.secondaryClient.lastName,
          email: patch.secondaryClient.email,
          phone: patch.secondaryClient.phone,
        } : undefined;
      }
      if (patch.assessorParcelInfo !== undefined) mappedPatch.assessorParcelInfo = patch.assessorParcelInfo;
      if (patch.estimatedAmount !== undefined) {
        mappedPatch.estimatedAmount = typeof patch.estimatedAmount === 'string' 
          ? (parseFloat(patch.estimatedAmount) || undefined) 
          : patch.estimatedAmount;
      }
      if (patch.dueDate !== undefined) mappedPatch.dueDate = patch.dueDate || undefined;
      if (patch.progress !== undefined) mappedPatch.progress = patch.progress;
      
      onUpdate(mappedPatch);
    }
  };

  const topTab = "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-[#141C28] data-[state=active]:text-white dark:data-[state=active]:text-blue-300 hover:bg-slate-100 dark:hover:bg-[#141C28]";

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <Tabs defaultValue="project" className="w-full">
        <div className="mb-6 -mx-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1118] p-1 shadow-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={onBackClick}
              aria-label="Back"
              title="Back"
              className="rounded-full p-2 text-slate-700 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#141C28]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <TabsList className="flex flex-1 flex-wrap gap-1 overflow-x-auto bg-transparent p-0">
              <TabsTrigger value="files" className={topTab}>Files</TabsTrigger>
              <TabsTrigger value="tasks" className={topTab}>Tasks</TabsTrigger>
              <TabsTrigger value="invoices" className={topTab}>Invoices</TabsTrigger>
              <TabsTrigger value="links" className={topTab}>Links</TabsTrigger>
              <TabsTrigger value="project" className={topTab}>Project</TabsTrigger>
              <TabsTrigger value="notes" className={topTab}>Notes</TabsTrigger>
            </TabsList>

            <button
              onClick={toggleChat}
              aria-label="Toggle project chat"
              title={chatOpen ? "Hide chat" : "Show chat"}
              aria-pressed={chatOpen}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                chatOpen
                  ? "bg-slate-900 dark:bg-[#141C28] text-white dark:text-blue-300"
                  : "text-slate-700 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#141C28]"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </div>

        {/* Files tab - using existing implementation */}
        <TabsContent value="files" className="mt-0">
          {filesContent || <div className="text-slate-500 dark:text-neutral-400 p-6">Files content goes here</div>}
        </TabsContent>

        {/* Tasks tab - using existing implementation */}
        <TabsContent value="tasks" className="mt-0">
          {tasksContent || <div className="text-slate-500 dark:text-neutral-400 p-6">Tasks content goes here</div>}
        </TabsContent>

        {/* Invoices tab - using existing implementation */}
        <TabsContent value="invoices" className="mt-0">
          {invoicesContent || <div className="text-slate-500 dark:text-neutral-400 p-6">Invoices content goes here</div>}
        </TabsContent>

        {/* Links tab - using existing implementation */}
        <TabsContent value="links" className="mt-0">
          {linksContent || <div className="text-slate-500 dark:text-neutral-400 p-6">Links content goes here</div>}
        </TabsContent>

        {/* Notes tab - using existing implementation */}
        <TabsContent value="notes" className="mt-0">
          {notesContent || <div className="text-slate-500 dark:text-neutral-400 p-6">Notes content goes here</div>}
        </TabsContent>

        {/* Project tab with inner menu */}
        <TabsContent value="project">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:min-h-[70vh] md:items-start">
            <nav className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1118] p-2 text-[14px] shadow-sm md:sticky md:top-2 md:h-[70vh] md:overflow-auto">
              <MenuItem id="profile" label="Project profile" active={menu} setActive={setMenu} />
              <MenuItem id="client" label="Client profile" active={menu} setActive={setMenu} />
              <MenuItem id="parcel" label="Parcel information" active={menu} setActive={setMenu} />
              <MenuItem id="billing" label="Billing & fees" active={menu} setActive={setMenu} />
              <MenuItem id="preferences" label="Preferences" active={menu} setActive={setMenu} />
              <MenuItem id="activity" label="Activity" active={menu} setActive={setMenu} />
            </nav>

            <div className="space-y-6">
              {menu === "profile" && (
                <Section
                  title="Project profile"
                  helper="Grouped fields to save space"
                  disabled={!mode.profile}
                  action={
                    !mode.profile ? (
                      <button
                        onClick={() => beginEdit("profile")}
                        className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelEdit("profile")}
                          className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit("profile")}
                          className="rounded-md bg-slate-900 dark:bg-[#3b82f6] px-3 py-1.5 text-[13px] text-white hover:bg-slate-800 dark:hover:bg-[#2563eb]"
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
                      onBlur={() => save({ name: draft.name })}
                    />
                  </Row>

                  <Row label="Address">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[72px_160px_1fr_180px]">
                      <Input
                        placeholder="#"
                        value={draft.address.streetNumber || ""}
                        onChange={(e) => setDraft({ ...draft, address: { ...draft.address, streetNumber: e.target.value } })}
                        onBlur={() => save({ address: draft.address })}
                      />
                      <Input
                        placeholder="Street"
                        value={draft.address.streetName || ""}
                        onChange={(e) => setDraft({ ...draft, address: { ...draft.address, streetName: e.target.value } })}
                        onBlur={() => save({ address: draft.address })}
                      />
                      <Input
                        placeholder="City"
                        value={draft.address.city || ""}
                        onChange={(e) => setDraft({ ...draft, address: { ...draft.address, city: e.target.value } })}
                        onBlur={() => save({ address: draft.address })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="State"
                          value={draft.address.state || ""}
                          onChange={(e) => setDraft({ ...draft, address: { ...draft.address, state: e.target.value } })}
                          onBlur={() => save({ address: draft.address })}
                        />
                        <Input
                          placeholder="ZIP"
                          value={draft.address.zipCode || ""}
                          onChange={(e) => setDraft({ ...draft, address: { ...draft.address, zipCode: e.target.value } })}
                          onBlur={() => save({ address: draft.address })}
                        />
                      </div>
                    </div>
                  </Row>

                  <Row label="Status & Phase">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-3 py-2 text-[14px] text-slate-900 dark:text-neutral-200"
                        value={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
                        onBlur={() => save({ status: draft.status as any })}
                      >
                        <option value="active">In Progress</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0E1118] px-3 py-2 text-[14px] text-slate-900 dark:text-neutral-200"
                        value={draft.phase}
                        onChange={(e) => setDraft({ ...draft, phase: e.target.value as any })}
                        onBlur={() => save({ phase: draft.phase as any })}
                      >
                        <option value="Pre-Design">Pre-Design</option>
                        <option value="Design">Design</option>
                        <option value="Permit">Permit</option>
                        <option value="Build">Build</option>
                      </select>
                    </div>
                  </Row>

                  <Row label="Budget, Due, Progress">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Input
                        type="number"
                        value={draft.estimatedAmount ?? ""}
                        onChange={(e) => setDraft({ ...draft, estimatedAmount: e.target.value })}
                        onBlur={() => save({ estimatedAmount: draft.estimatedAmount })}
                        placeholder="$ Amount"
                      />
                      <Input
                        type="date"
                        value={draft.dueDate || ""}
                        onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                        onBlur={() => save({ dueDate: draft.dueDate || null })}
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={draft.progress}
                          onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                          onMouseUp={() => save({ progress: draft.progress })}
                          className="w-full"
                        />
                        <span className="w-10 text-right text-[13px] text-slate-700 dark:text-neutral-300">{draft.progress}%</span>
                      </div>
                    </div>
                  </Row>

                  <Row label="Description">
                    <TextArea
                      rows={4}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      onBlur={() => save({ description: draft.description })}
                    />
                  </Row>
                </Section>
              )}

              {menu === "client" && (
                <Section
                  title="Client profile"
                  helper="Primary & secondary"
                  disabled={!mode.client}
                  action={
                    !mode.client ? (
                      <button
                        onClick={() => beginEdit("client")}
                        className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelEdit("client")}
                          className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit("client")}
                          disabled={!clientPhonesValid}
                          className={`rounded-md px-3 py-1.5 text-[13px] text-white ${
                            !clientPhonesValid
                              ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed"
                              : "bg-slate-900 dark:bg-[#3b82f6] hover:bg-slate-800 dark:hover:bg-[#2563eb]"
                          }`}
                        >
                          Save
                        </button>
                      </div>
                    )
                  }
                >
                  <Row label="Primary client">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_120px_1fr_160px]">
                      <Input
                        placeholder="First"
                        value={draft.primaryClient.firstName || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, primaryClient: { ...draft.primaryClient, firstName: e.target.value } })
                        }
                        onBlur={() => save({ primaryClient: draft.primaryClient })}
                      />
                      <Input
                        placeholder="Last"
                        value={draft.primaryClient.lastName || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, primaryClient: { ...draft.primaryClient, lastName: e.target.value } })
                        }
                        onBlur={() => save({ primaryClient: draft.primaryClient })}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={draft.primaryClient.email || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, primaryClient: { ...draft.primaryClient, email: e.target.value } })
                        }
                        onBlur={() => save({ primaryClient: draft.primaryClient })}
                      />
                      <PhoneInput
                        placeholder="(999) 999-9999"
                        digits={onlyDigits(draft.primaryClient.phone)}
                        onDigitsChange={(d) => setDraft({ ...draft, primaryClient: { ...draft.primaryClient, phone: d } })}
                        onBlur={() => save({ primaryClient: draft.primaryClient })}
                      />
                    </div>
                  </Row>

                  <Row label="Secondary client">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_120px_1fr_160px]">
                      <Input
                        placeholder="First"
                        value={(draft.secondaryClient && draft.secondaryClient.firstName) || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, secondaryClient: { ...(draft.secondaryClient || {}), firstName: e.target.value } })
                        }
                        onBlur={() => save({ secondaryClient: draft.secondaryClient })}
                      />
                      <Input
                        placeholder="Last"
                        value={(draft.secondaryClient && draft.secondaryClient.lastName) || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, secondaryClient: { ...(draft.secondaryClient || {}), lastName: e.target.value } })
                        }
                        onBlur={() => save({ secondaryClient: draft.secondaryClient })}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={(draft.secondaryClient && draft.secondaryClient.email) || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, secondaryClient: { ...(draft.secondaryClient || {}), email: e.target.value } })
                        }
                        onBlur={() => save({ secondaryClient: draft.secondaryClient })}
                      />
                      <PhoneInput
                        placeholder="(999) 999-9999"
                        digits={onlyDigits(draft.secondaryClient?.phone)}
                        onDigitsChange={(d) =>
                          setDraft({ ...draft, secondaryClient: { ...(draft.secondaryClient || {}), phone: d } })
                        }
                        onBlur={() => save({ secondaryClient: draft.secondaryClient })}
                      />
                    </div>
                  </Row>
                </Section>
              )}

              {menu === "parcel" && (
                <Section
                  title="Parcel information"
                  helper="Assessor data"
                  disabled={!mode.parcel}
                  action={
                    !mode.parcel ? (
                      <button
                        onClick={() => beginEdit("parcel")}
                        className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelEdit("parcel")}
                          className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#141C28] px-3 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-900 dark:text-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit("parcel")}
                          className="rounded-md bg-slate-900 dark:bg-[#3b82f6] px-3 py-1.5 text-[13px] text-white hover:bg-slate-800 dark:hover:bg-[#2563eb]"
                        >
                          Save
                        </button>
                      </div>
                    )
                  }
                >
                  <Row label="Parcel #">
                    <Input
                      value={draft.assessorParcelInfo.parcelNumber || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, parcelNumber: e.target.value } })
                      }
                      onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                    />
                  </Row>

                  <Row label="Occupancy & Zoning">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Occupancy"
                        value={draft.assessorParcelInfo.occupancyClass || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, occupancyClass: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                      <Input
                        placeholder="Zoning"
                        value={draft.assessorParcelInfo.zoningDesignation || ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            assessorParcelInfo: { ...draft.assessorParcelInfo, zoningDesignation: e.target.value },
                          })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                    </div>
                  </Row>

                  <Row label="Construction & Stories">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Construction"
                        value={draft.assessorParcelInfo.construction || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, construction: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                      <Input
                        placeholder="Stories"
                        value={draft.assessorParcelInfo.stories || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, stories: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                    </div>
                  </Row>

                  <Row label="Plate & Roof Height">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Plate"
                        value={draft.assessorParcelInfo.plateHeight || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, plateHeight: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                      <Input
                        placeholder="Roof"
                        value={draft.assessorParcelInfo.roofHeight || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, roofHeight: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                    </div>
                  </Row>

                  <Row label="Year Built">
                    <Input
                      value={draft.assessorParcelInfo.yearBuilt || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, yearBuilt: e.target.value } })
                      }
                      onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                    />
                  </Row>

                  <Row label="Lot Area & Acres">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Lot Area"
                        value={draft.assessorParcelInfo.lotArea || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, lotArea: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                      <Input
                        placeholder="Acres"
                        value={draft.assessorParcelInfo.acres || ""}
                        onChange={(e) =>
                          setDraft({ ...draft, assessorParcelInfo: { ...draft.assessorParcelInfo, acres: e.target.value } })
                        }
                        onBlur={() => save({ assessorParcelInfo: draft.assessorParcelInfo })}
                      />
                    </div>
                  </Row>
                </Section>
              )}

              {menu === "billing" && (
                <Section title="Billing & fees" helper="Invoice settings">
                  <div className="text-slate-500 dark:text-neutral-400 text-sm">Billing settings coming soon</div>
                </Section>
              )}

              {menu === "preferences" && (
                <Section title="Preferences" helper="Project settings">
                  <div className="text-slate-500 dark:text-neutral-400 text-sm">Project preferences coming soon</div>
                </Section>
              )}

              {menu === "activity" && (
                <Section title="Activity" helper="Recent actions">
                  <div className="text-slate-500 dark:text-neutral-400 text-sm">Activity feed coming soon</div>
                </Section>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
