import React from "react";

// Helper to generate relative timestamps for the demo
// Stores full ISO strings so Date parsing is consistent
const minutesAgo = (mins) => {
  const d = new Date(Date.now() - mins * 60 * 1000);
  return d.toISOString();
};

// Demo notification data used to drive the list UI
// "when" values are relative to "now" so friendly timestamps actually show
const seedNotifications = [
  {
    id: "n1",
    kind: "workspace_chat_message",
    actor: "Alex Kim",
    when: minutesAgo(5), // a few mins ago
    workspaceName: "PinerWorks",
    title: "posted in PinerWorks Workspace Chat",
    preview:
      "Hey team, uploaded the latest Echo Summit cabin plan set — see sheets A2.1–A2.4 and drop any redlines in chat.",
    unread: true,
  },
  {
    id: "n2",
    kind: "project_chat_message",
    actor: "Priya N.",
    when: minutesAgo(60 * 3), // a few hours ago
    projectName: "Echo Summit Cabin",
    title: "posted in Echo Summit Cabin",
    preview: "This is another test message about the cabin revisions.",
    unread: true,
  },
  {
    id: "n3",
    kind: "task_assigned",
    actor: "Sam R.",
    when: minutesAgo(60 * 26), // yesterday
    taskTitle: "Draft floor plan",
    title: "assigned you a Task",
    preview: "Draft floor plan for Echo Summit Cabin.",
    unread: false,
  },
  {
    id: "n4",
    kind: "model_added",
    actor: "Alex Kim",
    when: minutesAgo(60 * 24 * 3), // a few days ago
    modelName: "Cabin-IFC-v3.ifc",
    projectName: "Echo Summit Cabin",
    title: "added a 3D model",
    preview: "Cabin-IFC-v3.ifc +3 other files.",
    unread: false,
  },
  {
    id: "n5",
    kind: "request_created",
    actor: "Priya N.",
    when: minutesAgo(60 * 24 * 9), // last week
    requestTitle: "Mark up lighting plan",
    title: "sent you a Request",
    preview: "Mark up lighting plan for main level.",
    unread: false,
  },
];

// Friendly, millennial-ish timestamps
const formatWhen = (s) => {
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return s;

  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffSec = diffMs / 1000;

  // Future dates → short date
  if (diffSec < 0) {
    const opts = { month: "short", day: "numeric" };
    if (dt.getFullYear() !== now.getFullYear()) {
      opts.year = "numeric";
    }
    return dt.toLocaleDateString(undefined, opts);
  }

  if (diffSec < 60) return "Just now";

  const diffMin = diffSec / 60;
  if (diffMin < 3) {
    return "a few mins ago";
  }

  const diffHr = diffMin / 60;
  if (diffHr < 1) {
    return "a few mins ago";
  }

  if (diffHr < 2) {
    return "about an hour ago";
  }

  if (diffHr < 6) {
    return "a few hours ago";
  }

  const diffDay = diffHr / 24;
  if (diffDay < 2) {
    return "yesterday";
  }

  if (diffDay < 7) {
    return "a few days ago";
  }

  if (diffDay < 14) {
    return "last week";
  }

  // Older → short calendar date
  const opts = { month: "short", day: "numeric" };
  if (dt.getFullYear() !== now.getFullYear()) {
    opts.year = "numeric";
  }
  return dt.toLocaleDateString(undefined, opts);
};

const kindBadge = (kind) => {
  switch (kind) {
    case "workspace_chat_message":
    case "project_chat_message":
      return "💬";
    case "task_assigned":
      return "✅";
    case "model_added":
      return "📐";
    case "request_created":
      return "📋";
    default:
      return "";
  }
};

const NotificationDemoModal = () => {
  const [filter, setFilter] = React.useState("all"); // "all" | "unread"
  const [items, setItems] = React.useState(seedNotifications);

  const visibleNotifications =
    filter === "unread" ? items.filter((n) => n.unread) : items;

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-start p-6">
      <div className="w-full max-w-md">
        {/* Popover-style card like live notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[13px]">
                🔔
              </div>
              <span className="text-sm font-semibold text-slate-900">
                Notifications
              </span>
            </div>
            <button className="text-[11px] text-sky-600 hover:text-sky-700">
              View all
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full ${
                filter === "all"
                  ? "bg-sky-500 text-white font-medium shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-full ${
                filter === "unread"
                  ? "bg-sky-500 text-white font-medium shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Unread
            </button>
          </div>

          {/* List */}
          <ul className="divide-y divide-slate-100">
            {visibleNotifications.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
              >
                {/* Icon */}
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-[13px]">
                  {kindBadge(item.kind)}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 truncate">
                    <span className="font-semibold">{item.actor}</span>{" "}
                    {item.kind === "workspace_chat_message" ? (
                      <>
                        <span className="font-normal">posted in </span>
                        <span className="font-normal underline underline-offset-2">
                          {item.workspaceName} Workspace
                        </span>
                      </>
                    ) : item.kind === "project_chat_message" ? (
                      <>
                        <span className="font-normal">posted in </span>
                        <span className="font-normal underline underline-offset-2">
                          {item.projectName}
                        </span>
                      </>
                    ) : item.kind === "task_assigned" ? (
                      <>
                        <span className="font-normal">
                          assigned <span className="font-semibold">you</span> a{" "}
                        </span>
                        <span className="font-normal underline underline-offset-2">
                          Task
                        </span>
                      </>
                    ) : item.kind === "model_added" ? (
                      <>
                        <span className="font-normal">added files to </span>
                        <span className="font-normal underline underline-offset-2">
                          3218 4th Ave.
                        </span>
                      </>
                    ) : item.kind === "request_created" ? (
                      <>
                        <span className="font-normal">sent you a </span>
                        <span className="font-normal underline underline-offset-2">
                          Request
                        </span>
                      </>
                    ) : (
                      <span className="font-normal">{item.title}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[310px]">
                    {item.preview}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatWhen(item.when)}
                  </p>
                </div>

                {/* Unread dot */}
                <div className="-ml-2">
                  {item.unread ? (
                    <span className="block h-2 w-2 rounded-full bg-sky-500" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-end text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => {
                setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
                setFilter("all");
              }}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemoModal;
