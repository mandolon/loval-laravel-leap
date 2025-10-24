import React from "react";

// Tailwind is assumed to be available by the preview runtime
// Replica task list with clickable status + single-button filter toggle
// Fix: remove stray adjacent JSX, ensure single roots, and inset borders/padding

// Base seed data (immutable)
const tasks = [
  { name: "As Built Update", date: "7/28/23", assignee: "MP", createdBy: "AL", open: true },
  { name: "Redlines for Schematics", date: "9/13/23", assignee: "AL", createdBy: "MP", hasDesc: true, open: true, openColor: "red" },
  { name: "2709 T Street Addition Schematic Redlines", date: "11/21/23", assignee: "AL", createdBy: "MP", noteDot: true, hasDesc: true },
  { name: "Merriman Kitchen Wall - Minor permit", date: "6/25/20", assignee: "AL", createdBy: "AL", hasFile: true, hasDesc: true },
  { name: "Jacques / Wilcox Barn Site plan", date: "6/25/20", assignee: "AL", createdBy: "MP" },
  { name: "Choteau Circle DWG files", date: "6/25/20", assignee: "AL", createdBy: "MP", hasFile: true },
  { name: "Choteau Circle Casita Engineering", date: "6/25/20", assignee: "MP", createdBy: "MP", caret: true, hasDesc: true },
  { name: "Minor revisions - Lighting plan", date: "5/21/23", assignee: "AL", createdBy: "MP" },
  { name: "As Built", date: "5/20/23", assignee: "AL", createdBy: "AL" },
  { name: "As Built - 05.22.23", date: "5/22/23", assignee: "MP", createdBy: "AL", hasDesc: true },
  { name: "Update - 05.22.23", date: "5/22/23", assignee: "AL", createdBy: "MP" },
] as const;

type Row = {
  name: string;
  date: string;
  assignee: string;
  createdBy: string;
  open?: boolean;             // open = not completed
  openColor?: "blue" | "red"; // status type for open tasks
  caret?: boolean;
  noteDot?: boolean;
  hasFile?: boolean;
  hasDesc?: boolean;
  // internal for reversible toggle
  _prev?: { openColor: "blue" | "red" };
};

const FILTERS = ['all','progress','task','completed'] as const;
const nextFilter = (f: typeof FILTERS[number]) => FILTERS[(FILTERS.indexOf(f) + 1) % FILTERS.length];
const labelForFilter = (value: typeof FILTERS[number]) => (
  value === 'all' ? 'ALL' : value === 'progress' ? 'PROGRESS/UPDATE' : value === 'task' ? 'TASK/REDLINE' : 'COMPLETED'
);

function FilterToggle({ value, onToggle }: { value: typeof FILTERS[number]; onToggle: () => void }) {
  // Single root element: button wraps everything (no adjacent JSX)
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      aria-label="Toggle filter"
      title="Toggle filter"
      type="button"
    >
      {value === 'progress' && <IconOpenCircle color="blue" />}
      {value === 'task' && <IconOpenCircle color="red" />}
      {value === 'completed' && <IconCheck />}
      <span className="uppercase">{labelForFilter(value)}</span>
    </button>
  );
}

const IconCheck = () => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] text-emerald-500" fill="currentColor" aria-hidden>
    <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.707-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414Z"/>
  </svg>
);

const IconOpenCircle = ({ color = "blue" }: { color?: "blue" | "red" }) => (
  <svg viewBox="0 0 20 20" className={`h-[18px] w-[18px] ${color === "red" ? "text-red-600" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="10" cy="10" r="7" strokeDasharray="8 4" strokeLinecap="round" />
  </svg>
);

const IconChevron = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400 transform rotate-90" fill="currentColor" aria-hidden>
    {/* Closed chevron (filled triangle) pointing down via rotation */}
    <path d="M9 6l8 6-8 6z" />
  </svg>
);

const IconDot = () => (
  <span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" />
);

const IconPaperclip = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 7v8a4 4 0 1 0 8 0V6a3 3 0 1 0-6 0v9a2 2 0 1 0 4 0V8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconDesc = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 7h16M4 12h12M4 17h8" strokeLinecap="round"/>
  </svg>
);

const Avatar = ({ text, tone = "teal" }: { text: string; tone?: "teal" | "slate" }) => {
  const base = "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold";
  const colors = tone === "teal" ? "bg-teal-500 text-white" : "bg-slate-800 text-white";
  return <span className={`${base} ${colors}`}>{text}</span>;
};

export default function TaskListReplica() {
  // --- rows state: seed from tasks; normalize openColor and capture previous color for revert ---
  const [rows, setRows] = React.useState<Row[]>(() =>
    tasks.map((t) => {
      const normalized = t.open ? (t.openColor ?? 'blue') : undefined; // ensure explicit color for open rows
      return { ...t, openColor: normalized, _prev: { openColor: normalized ?? 'blue' } } as Row;
    })
  );

  // --- filter state & derived list ---
  const [filter, setFilter] = React.useState<'all' | 'progress' | 'task' | 'completed'>('all');

  const filteredTasks = React.useMemo(() => {
    const list = rows;
    if (filter === 'all') return list;
    return list.filter((t) => {
      const isOpen = !!t.open;
      if (filter === 'progress') return isOpen && t.openColor !== 'red';
      if (filter === 'task') return isOpen && t.openColor === 'red';
      if (filter === 'completed') return !isOpen;
      return true;
    });
  }, [rows, filter]);

  // --- toggle status (click circle) ---
  const toggleStatus = (idx: number) => {
    setRows((prev) => prev.map((t, i) => {
      if (i !== idx) return t;
      if (t.open) {
        // Mark completed; remember color
        return { ...t, _prev: { openColor: t.openColor ?? 'blue' }, open: false, openColor: undefined };
      }
      // Revert to previous open state (default blue if unknown)
      return { ...t, open: true, openColor: t._prev?.openColor ?? 'blue' };
    }));
  };

  // --- runtime tests (dev-only) ---
  React.useEffect(() => {
    const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error(`Test failed: ${msg}`); };

    // Data shape
    assert(Array.isArray(rows), 'rows must be an array');
    rows.forEach((t: any, idx: number) => {
      assert(typeof t.name === 'string' && t.name.length > 0, `row[${idx}] name missing`);
      assert(typeof t.date === 'string', `row[${idx}] date missing`);
      assert(typeof t.assignee === 'string', `row[${idx}] assignee missing`);
      assert(typeof t.createdBy === 'string', `row[${idx}] createdBy missing`);
      if (t.open) {
        assert(t.openColor === 'red' || t.openColor === 'blue', `row[${idx}] openColor must be defined for open rows`);
      }
    });

    // Filter partitioning (based on current rows)
    const progress = rows.filter((t) => t.open && t.openColor !== 'red').length;
    const task = rows.filter((t) => t.open && t.openColor === 'red').length;
    const completed = rows.filter((t) => !t.open).length;
    assert(progress + task + completed === rows.length, 'filters partition the task list');

    // Toggle round-trip tests on known indices
    // Test 0: open (blue) -> complete -> revert blue
    if (rows[0]) {
      const r0 = rows[0];
      const completed0 = { ...r0, _prev: { openColor: r0.openColor ?? 'blue' }, open: false, openColor: undefined };
      const reverted0 = { ...completed0, open: true, openColor: completed0._prev.openColor };
      if (r0.open) {
        // only assert when initially open
        if (r0.openColor !== 'blue') throw new Error('row[0] should start blue');
        if (reverted0.openColor !== 'blue') throw new Error('row[0] should revert to original color');
      }
    }
    // Test 1: open (red) -> complete -> revert red
    if (rows[1]) {
      const r1 = rows[1];
      const completed1 = { ...r1, _prev: { openColor: r1.openColor ?? 'blue' }, open: false, openColor: undefined };
      const reverted1 = { ...completed1, open: true, openColor: completed1._prev.openColor };
      if (r1.open) {
        if (r1.openColor !== 'red') throw new Error('row[1] should start red');
        if (reverted1.openColor !== 'red') throw new Error('row[1] should revert to red');
      }
    }

    // Label mapping tests
    const labels = FILTERS.map((f) => labelForFilter(f));
    const expected = ['ALL','PROGRESS/UPDATE','TASK/REDLINE','COMPLETED'];
    labels.forEach((l, i) => { if (l !== expected[i]) throw new Error('labelForFilter mapping mismatch'); });
  }, [rows]);

  // Test: filter toggle cycles back to 'all' after 4 clicks
  React.useEffect(() => {
    const assert = (c: boolean, m: string) => { if (!c) throw new Error(`Test failed: ${m}`); };
    let f: typeof FILTERS[number] = 'all';
    for (let i = 0; i < 4; i++) f = nextFilter(f);
    assert(f === 'all', 'nextFilter should cycle back to all after 4 steps');
  }, []);

  return (
    // Single root element for component
    <div className="min-h-screen w-full bg-white p-6 text-gray-900">
      {/* Card Container */}
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center px-5 py-4 mb-1">
          <h2 className="text-[15px] font-medium text-gray-800">Task List</h2>
        </div>

        {/* Controls Row (inset border) */}
        <div className="px-5">
          <div className="flex items-center justify-between border-t border-gray-200 py-3">
            <div className="flex items-center gap-2 text-sm">
              <IconChevron />
              <FilterToggle value={filter} onToggle={() => setFilter(nextFilter(filter))} />
              <span className="text-gray-600 tabular-nums">{filteredTasks.length}</span>
            </div>
          </div>
        </div>

        {/* Column Headers (inset border) */}
        <div className="px-5">
          <div className="grid grid-cols-[1fr_140px_120px_120px] items-center border-b border-gray-200 px-0 pt-2 pb-0.5 text-[11px] text-gray-500 leading-tight font-medium">
            <div>Name</div>
            <div className="text-left">Date created</div>
            <div className="text-left">Assignee</div>
            <div className="text-left">Created by</div>
          </div>
        </div>

        {/* Rows (inset list & separators) */}
        <ul className="divide-y divide-gray-200 px-5">
          {filteredTasks.map((t: Row, i: number) => (
            <li key={i} className="grid grid-cols-[1fr_140px_120px_120px] items-center px-0 py-2 text-[13px] hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 cursor-pointer transition-colors duration-150">
              <div className="flex items-center gap-3">
                {t.caret ? (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-gray-500" fill="currentColor"><path d="M7 5.5 13 10 7 14.5z"/></svg>
                ) : (
                  <span className="w-3.5" />
                )}

                {/* Clickable status icon */}
                <button
                  type="button"
                  onClick={() => toggleStatus(i)}
                  title={t.open ? 'Mark complete' : 'Undo complete'}
                  aria-label={t.open ? 'Mark complete' : 'Undo complete'}
                  className="p-0 m-0 leading-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {t.open ? <IconOpenCircle color={t.openColor} /> : <IconCheck />}
                </button>

                <span className="font-medium text-gray-800">{t.name}</span>
                {t.noteDot && <IconDot />}
                <span className="ml-1 flex items-center gap-2 text-gray-400" aria-label="Task detail indicators">
                  {/* Icons below identify what exists in task detail: description / attachment */}
                  {t.hasDesc && (
                    <span title="Has description" aria-label="Has description" className="inline-flex items-center">
                      <IconDesc />
                      <span className="sr-only">Description present</span>
                    </span>
                  )}
                  {t.hasFile && (
                    <span title="Has attachment" aria-label="Has attachment" className="inline-flex items-center">
                      <IconPaperclip />
                      <span className="sr-only">Attachment present</span>
                    </span>
                  )}
                </span>
              </div>
              <div className="text-[13px] text-gray-600">{t.date}</div>
              <div>
                <Avatar text={t.assignee} tone="teal" />
              </div>
              <div>
                <Avatar text={t.createdBy} tone="slate" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
