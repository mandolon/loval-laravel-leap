/**
 * RequestsPageBody Component
 * Main list view with filters and actions for Requests
 */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { RequestPreviewModal } from "./RequestPreviewModal";
import { NewRequestModal } from "./NewRequestModal";
import { EditRequestModal } from "./EditRequestModal";
import { formatDate } from "./requestsData";
import type { Request } from "@/lib/api/types";
import {
  useWorkspaceRequests,
  useCreateRequest,
  useUpdateRequest,
  useDeleteRequest
} from "@/lib/api/hooks/useRequests";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useUsers } from "@/lib/api/hooks/useUsers";

const AIRY_SELECT =
  "w-full h-8 rounded-lg border border-neutral-200 bg-white text-[13px] text-neutral-900 px-3 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200 cursor-pointer disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed";

export function RequestsPageBody() {
  const { currentWorkspaceId } = useWorkspaces();
  const { user } = useUser();
  const { data: requests = [], isLoading } = useWorkspaceRequests(currentWorkspaceId || "");
  const { data: usersData = [] } = useUsers();
  const { data: projects = [] } = useProjects(
    currentWorkspaceId || "",
    user?.id,
    user?.is_admin
  );
  
  // Transform UserWithWorkspaces[] to simpler User[] format for modals
  const users = usersData.map(u => ({
    id: u.id,
    shortId: '', // Not needed for modals
    name: u.name,
    email: u.email,
    avatarUrl: u.avatar_url || undefined,
    createdAt: '', // Not needed for modals
    updatedAt: '', // Not needed for modals
  }));
  
  const createRequest = useCreateRequest();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "sent">("open");
  const [sortBy, setSortBy] = useState<"recent" | "due">("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);

  // Auto-open request when coming from notification
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    if (requestId && requests.length > 0) {
      const request = requests.find(r => r.id === requestId);
      if (request) {
        // Mark as read if it's assigned to the current user
        if (request.assignedToUserId === user?.id && request.isUnread) {
          updateRequest.mutate({
            id: request.id,
            data: { isUnread: false },
          });
        }
        setActiveRequest(request);
        // Clear the requestId from URL after opening
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('requestId');
          return newParams;
        }, { replace: true });
      }
    }
  }, [searchParams, requests, user?.id]);

  // Helper function to get user display name
  const getUserDisplayName = (userId: string) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser?.name || userId;
  };

  // Helper function to get project name
  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name || null;
  };

  const filteredRequests = useMemo(() => {
    let items = requests.slice();

    if (statusFilter === "sent") {
      // Outbox: requests the current user created
      items = items.filter((r) => r.createdByUserId === user?.id);
    } else {
      // Inbox: requests assigned to current user
      items = items.filter((r) => r.assignedToUserId === user?.id);
      if (statusFilter === "open") {
        items = items.filter((r) => r.status !== "closed");
      } else if (statusFilter === "closed") {
        items = items.filter((r) => r.status === "closed");
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((r) => {
        const projectName = getProjectName(r.projectId);
        const createdByName = getUserDisplayName(r.createdByUserId);
        return (
          r.title.toLowerCase().includes(q) ||
          createdByName.toLowerCase().includes(q) ||
          (projectName && projectName.toLowerCase().includes(q))
        );
      });
    }

    const toMs = (value: string | null | undefined) => {
      if (!value) return 0;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return 0;
      return d.getTime();
    };

    items.sort((a, b) => {
      if (sortBy === "recent") {
        return toMs(b.createdAt) - toMs(a.createdAt);
      }
      if (sortBy === "due") {
        const aHasDue = !!a.respondBy;
        const bHasDue = !!b.respondBy;

        // If both have a respond-by date, sort by that first.
        if (aHasDue && bHasDue) {
          return toMs(a.respondBy) - toMs(b.respondBy);
        }
        // Requests with a respond-by date come before those without.
        if (aHasDue && !bHasDue) return -1;
        if (!aHasDue && bHasDue) return 1;

        // If neither has a respond-by date, fall back to createdAt (newest first).
        return toMs(b.createdAt) - toMs(a.createdAt);
      }
      return 0;
    });

    return items;
  }, [requests, statusFilter, sortBy, searchQuery, user, users, projects]);

  const setStatusFor = (id: string, status: "open" | "closed") => {
    updateRequest.mutate({
      id,
      data: {
        status,
        isUnread: false,
      },
    });
  };

  const handleTitleClick = (request: Request) => {
    // Mark as read when opening (only for inbox requests, not sent)
    if (statusFilter !== "sent" && request.isUnread) {
      updateRequest.mutate({
        id: request.id,
        data: { isUnread: false },
      });
    }
    setActiveRequest(request);
  };

  const handleEdit = (request: Request) => {
    setEditingRequest(request);
  };

  const handleEditSubmit = (data: {
    title: string;
    description: string;
    projectId: string | null;
    assignee: string;
    dueBy: string | null;
  }) => {
    if (!editingRequest) return;

    updateRequest.mutate(
      {
        id: editingRequest.id,
        data: {
          title: data.title,
          body: data.description,
          assignedToUserId: data.assignee,
          projectId: data.projectId || undefined,
          respondBy: data.dueBy || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingRequest(null);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteRequest.mutate(id);
  };

  const handleNewRequest = (data: {
    title: string;
    description: string;
    projectId: string | null;
    assignee: string;
    dueBy: string | null;
  }) => {
    if (!currentWorkspaceId) return;

    createRequest.mutate(
      {
        title: data.title,
        body: data.description,
        assignedToUserId: data.assignee,
        projectId: data.projectId || undefined,
        workspaceId: currentWorkspaceId,
        respondBy: data.dueBy || undefined,
      },
      {
        onSuccess: () => {
          setShowNewRequestModal(false);
        },
      }
    );
  };

  const searchPlaceholder = "Search";

  return (
    <div className="text-slate-600 flex flex-col gap-4 h-full">
        {/* Open / Closed / Sent tabs + primary action (outside container) */}
        <div className="flex items-end justify-between px-1 text-[13px] mb-[2px]">
          <div className="flex items-center gap-4 ml-3">
            <button
              type="button"
              onClick={() => setStatusFilter("open")}
              className={`text-sm pb-1 border-b-2 cursor-pointer ${
                statusFilter === "open"
                  ? "border-emerald-500 text-slate-900 font-medium"
                  : "border-transparent text-neutral-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`text-sm pb-1 border-b-2 cursor-pointer ${
                statusFilter === "closed"
                  ? "border-emerald-500 text-slate-900 font-medium"
                  : "border-transparent text-neutral-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              Closed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("sent")}
              className={`text-sm pb-1 border-b-2 cursor-pointer ${
                statusFilter === "sent"
                  ? "border-emerald-500 text-slate-900 font-medium"
                  : "border-transparent text-neutral-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              Sent
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNewRequestModal(true)}
            className="h-8 px-3 rounded-lg border border-neutral-200 bg-white text-[13px] hover:bg-neutral-50 cursor-pointer"
          >
            New request
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white/95 backdrop-blur-sm overflow-hidden">
        {/* Header controls */}
        <div className="border-b border-neutral-200 bg-neutral-50/80 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-neutral-900"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-[230px] rounded-md border border-neutral-200 bg-white pl-7 pr-2 text-[12px] text-neutral-900 placeholder:text-neutral-400 outline-none hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200"
              />
            </div>

            <div className="flex items-center gap-1 text-[12px] text-neutral-500">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "due")}
                className={`${AIRY_SELECT} w-[130px] h-8 text-[12px]`}
              >
                <option value="recent">Newest</option>
                <option value="due">Due date</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="px-8 py-16 text-center text-[13px] text-neutral-600">
            <div className="mb-2 text-[15px] font-medium text-slate-900">Loading requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-8 py-16 text-center text-neutral-600">
            <div className="mb-3 text-xl font-medium text-slate-900">Welcome to requests!</div>
            <p className="mx-auto max-w-md text-lg">
              Requests are a simple way for your team to ask for what they need—plan markups, measurements, clarifications, invoices, or other project details. Use a request when someone needs a clear response, and use tasks for longer work that needs to be tracked.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {filteredRequests.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-neutral-50">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="mt-1 flex h-4 w-4 items-center justify-center">
                      {r.isUnread ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTitleClick(r)}
                          className="truncate text-left text-[14px] font-medium text-slate-900 hover:underline cursor-pointer"
                        >
                          {r.title}
                        </button>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-neutral-500">
                        <span>
                          {statusFilter === "sent" ? "to " : "from "}
                          {statusFilter === "sent"
                            ? getUserDisplayName(r.assignedToUserId)
                            : getUserDisplayName(r.createdByUserId)}
                        </span>
                        {getProjectName(r.projectId) && <span>• {getProjectName(r.projectId)}</span>}
                        {r.respondBy && (
                          <span>
                            • {statusFilter === "sent" ? "Due date set to " : "respond by "}
                            <span className="text-neutral-800 font-medium">
                              {formatDate(r.respondBy)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {statusFilter === "sent" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(r)}
                          className="inline-flex h-7 items-center rounded-md border border-neutral-200 bg-white px-3 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="inline-flex h-7 items-center rounded-md bg-rose-600 px-3 text-[11px] font-semibold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      r.status !== "closed" && (
                        <button
                          type="button"
                          onClick={() => setStatusFor(r.id, "closed")}
                          className="inline-flex h-7 items-center rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Close
                        </button>
                      )
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeRequest && (
        <RequestPreviewModal
          request={activeRequest}
          createdByName={getUserDisplayName(activeRequest.createdByUserId)}
          projectName={getProjectName(activeRequest.projectId)}
          onClose={() => setActiveRequest(null)}
        />
      )}
      {showNewRequestModal && (
        <NewRequestModal
          users={users}
          projects={projects.filter(p => p.workspaceId === currentWorkspaceId)}
          onClose={() => setShowNewRequestModal(false)}
          onSubmit={handleNewRequest}
        />
      )}
      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          users={users}
          projects={projects.filter(p => p.workspaceId === currentWorkspaceId)}
          onClose={() => setEditingRequest(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
