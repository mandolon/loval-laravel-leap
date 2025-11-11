import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MoreHorizontal } from "lucide-react";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/lib/api/hooks/useNotes";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectNotesProps {
  projectId: string;
  workspaceId: string;
}

function ChainIcon({ className = "" }) {
  return (
    <svg
      className={`w-4 h-4 mr-1 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
      <path d="M14 11a5 5 0 0 1 0 7L12.5 20.5a5 5 0 1 1-7-7L7 11" />
    </svg>
  );
}

export function ProjectNotes({ projectId, workspaceId }: ProjectNotesProps) {
  const { user } = useUser();
  const { data: notes = [], isLoading } = useNotes(projectId);
  const createNoteMutation = useCreateNote(projectId);
  const updateNoteMutation = useUpdateNote(projectId);
  const deleteNoteMutation = useDeleteNote(projectId);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [doc, setDoc] = useState("");
  const [createdByUser, setCreatedByUser] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const editableRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const listTitleRef = useRef<HTMLDivElement>(null);

  // Resizable sidebar state
  const [sidebarW, setSidebarW] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });
  const closeMenu = () => setMenu({ open: false, x: 0, y: 0 });

  // Search state
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Autosave control
  const saveCtl = useRef({ idleTimer: null as any, maxTimer: null as any, lastSaved: "" });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveDocNowRef = useRef(() => {});

  const focusSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const matchesPage = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return true;
    const tokens = term.split(/\s+/).filter(Boolean);
    const hay = (noteTitle + "\n" + (editableRef.current ? editableRef.current.textContent || "" : doc.replace(/<[^>]+>/g, " "))).toLowerCase();
    return tokens.every(t => hay.includes(t));
  }, [q, noteTitle, doc]);

  useEffect(() => {
    const onGlobalClick = () => closeMenu();
    window.addEventListener("click", onGlobalClick);
    return () => window.removeEventListener("click", onGlobalClick);
  }, []);

  useEffect(() => {
    if (!showSearch) return;
    const onDown = (e: MouseEvent) => {
      const label = document.querySelector('[data-testid="search-container"]');
      const btn = document.querySelector('[data-testid="search-toggle"]');
      if (label && !label.contains(e.target as Node) && btn && !btn.contains(e.target as Node) && !(q || '').trim()) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showSearch, q]);

  // Load first note on mount
  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) {
      const firstNote = notes[0];
      setActiveNoteId(firstNote.id);
      setNoteTitle(firstNote.title);
      setDoc(firstNote.content);
      setLastUpdated(firstNote.updatedAt);
      loadCreatedByUser(firstNote.createdBy);
    }
  }, [notes, activeNoteId]);

  const loadCreatedByUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setCreatedByUser(data);
      }
    } catch (e) {
      console.error('Failed to load user:', e);
    }
  };

  // Smart autosave
  useEffect(() => {
    saveDocNowRef.current = () => {
      if (!activeNoteId) return;
      const val = editableRef.current ? (editableRef.current.innerHTML || "") : doc;
      if (val === saveCtl.current.lastSaved) return;
      
      updateNoteMutation.mutate(
        { id: activeNoteId, content: val, title: noteTitle },
        {
          onSuccess: () => {
            saveCtl.current.lastSaved = val;
            setSavedAt(Date.now());
            if (saveCtl.current.idleTimer) { clearTimeout(saveCtl.current.idleTimer); saveCtl.current.idleTimer = null; }
            if (saveCtl.current.maxTimer) { clearTimeout(saveCtl.current.maxTimer); saveCtl.current.maxTimer = null; }
          }
        }
      );
    };
  }, [doc, activeNoteId, noteTitle, updateNoteMutation]);

  useEffect(() => {
    if (!activeNoteId) return;
    const currentHtml = editableRef.current ? (editableRef.current.innerHTML || "") : doc;
    const delta = Math.abs(currentHtml.length - (saveCtl.current.lastSaved?.length || 0));

    // Idle save after 3s
    if (saveCtl.current.idleTimer) clearTimeout(saveCtl.current.idleTimer);
    saveCtl.current.idleTimer = setTimeout(() => {
      saveDocNowRef.current && saveDocNowRef.current();
    }, 3000);

    // Max wait 30s
    if (!saveCtl.current.maxTimer) {
      saveCtl.current.maxTimer = setTimeout(() => {
        saveDocNowRef.current && saveDocNowRef.current();
        saveCtl.current.maxTimer = null;
      }, 30000);
    }

    // Large change 800ms
    if (delta >= 220) {
      if (saveCtl.current.idleTimer) clearTimeout(saveCtl.current.idleTimer);
      saveCtl.current.idleTimer = setTimeout(() => {
        saveDocNowRef.current && saveDocNowRef.current();
      }, 800);
    }
  }, [doc, activeNoteId]);

  useEffect(() => {
    if (savedAt == null) return;
    const t = setTimeout(() => setSavedAt(null), 1500);
    return () => clearTimeout(t);
  }, [savedAt]);

  useEffect(() => {
    const flush = () => saveDocNowRef.current && saveDocNowRef.current();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
      if (saveCtl.current.idleTimer) clearTimeout(saveCtl.current.idleTimer);
      if (saveCtl.current.maxTimer) clearTimeout(saveCtl.current.maxTimer);
      flush();
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing || !rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const min = 220;
      const max = Math.min(600, rect.width - 360);
      const next = Math.max(min, Math.min(max, x));
      setSidebarW(next);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  const handleInput = () => {
    setDoc(editableRef.current ? editableRef.current.innerHTML : "");
  };

  const beginRename = () => {
    const el = titleRef.current;
    if (!el) return;
    el.setAttribute("contenteditable", "true");
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const commitRename = () => {
    const el = titleRef.current;
    if (!el) return;
    const next = (el.innerText || "").trim();
    setNoteTitle(next || "Untitled Page");
    el.removeAttribute("contenteditable");
    if (activeNoteId) {
      updateNoteMutation.mutate({ id: activeNoteId, title: next || "Untitled Page" });
    }
  };

  const beginListRename = () => {
    const el = listTitleRef.current;
    if (!el) return;
    el.setAttribute("contenteditable", "true");
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const commitListRename = () => {
    const el = listTitleRef.current;
    if (!el) return;
    const next = (el.innerText || "").trim();
    setNoteTitle(next || "Untitled Page");
    el.removeAttribute("contenteditable");
    if (activeNoteId) {
      updateNoteMutation.mutate({ id: activeNoteId, title: next || "Untitled Page" });
    }
  };

  const onListTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitListRename();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const onTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const openMenuAtButton = (btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    setMenu({ open: true, x: rect.left, y: rect.bottom + 4 });
  };

  const onListContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  const onMenuAction = (action: string) => {
    if (action === "rename") {
      beginListRename();
    } else if (action === "delete") {
      if (activeNoteId) {
        deleteNoteMutation.mutate(activeNoteId);
        setActiveNoteId(null);
        setNoteTitle("");
        setDoc("");
      }
    } else if (action === "new") {
      createNoteMutation.mutate(
        { title: "Untitled Page", content: "" },
        {
          onSuccess: (newNote) => {
            setActiveNoteId(newNote.id);
            setNoteTitle(newNote.title);
            setDoc(newNote.content);
            setLastUpdated(newNote.updatedAt);
            loadCreatedByUser(newNote.createdBy);
            beginRename();
          }
        }
      );
    }
    closeMenu();
  };

  const selectNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setActiveNoteId(note.id);
      setNoteTitle(note.title);
      setDoc(note.content);
      setLastUpdated(note.updatedAt);
      loadCreatedByUser(note.createdBy);
      saveCtl.current.lastSaved = note.content;
      if (editableRef.current) {
        editableRef.current.innerHTML = note.content;
      }
    }
  };

  useEffect(() => {
    if (editableRef.current && editableRef.current.innerHTML === "" && doc) {
      editableRef.current.innerHTML = doc;
    }
  }, [doc]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading notes...</div>;
  }

  return (
    <div ref={rowRef} className="flex h-full w-full overflow-hidden">
      {/* Left Sidebar */}
      <div style={{ width: sidebarW }} className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        {/* Header */}
        <div data-testid="notes-sidebar-header" className="h-14 px-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!showSearch ? (
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Notes</h2>
            ) : (
              <label data-testid="search-container" className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-1 focus:ring-sky-400/20"
                />
              </label>
            )}
          </div>
          <button
            data-testid="search-toggle"
            onClick={focusSearch}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Notes List */}
        <div data-testid="notes-sidebar-scroll" className="flex-1 overflow-y-auto thin-scrollbar pr-0">
          <div className="p-2 space-y-1">
            {notes.filter(n => matchesPage).map((note) => (
              <div
                key={note.id}
                data-testid="date-item"
                onClick={() => selectNote(note.id)}
                onContextMenu={onListContextMenu}
                className={`flex items-center justify-between gap-2 pl-0 pr-2 py-2 rounded-[10px] cursor-pointer transition-colors ${
                  activeNoteId === note.id ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div
                  ref={activeNoteId === note.id ? listTitleRef : null}
                  onKeyDown={onListTitleKeyDown}
                  onBlur={commitListRename}
                  className="flex-1 text-[13px] text-slate-700 dark:text-slate-300 truncate px-3 outline-none"
                >
                  {note.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenuAtButton(e.currentTarget);
                  }}
                  className="h-6 w-6 grid place-items-center rounded hover:bg-gray-200 dark:hover:bg-slate-700 shrink-0"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div
        data-testid="notes-resizer"
        onMouseDown={() => setIsResizing(true)}
        className="w-3 cursor-col-resize shrink-0 flex items-stretch hover:bg-slate-100 dark:hover:bg-slate-800 group relative"
      >
        <div
          data-testid="notes-resizer-line"
          className="w-px bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors mx-auto"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900">
        {activeNoteId ? (
          <>
            <div data-testid="notes-main-scroll" className="flex-1 overflow-y-auto px-8 py-6">
              <div
                ref={titleRef}
                onKeyDown={onTitleKeyDown}
                onBlur={commitRename}
                onDoubleClick={beginRename}
                className="text-[34px] font-semibold text-slate-900 dark:text-slate-100 mb-2 outline-none cursor-text"
              >
                {noteTitle}
              </div>

              <div className="text-[13px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mb-6">
                <ChainIcon className="text-gray-500 dark:text-slate-400" />
                <span className="hover:underline cursor-pointer">Link Task or Doc</span>
              </div>

              <div
                ref={editableRef}
                contentEditable
                onInput={handleInput}
                className="text-[15.5px] leading-7 text-slate-800 dark:text-slate-200 outline-none"
                style={{ minHeight: '480px' }}
              />

              {createdByUser && (
                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-[12px] text-slate-500 dark:text-slate-400">
                  <div>Created by {createdByUser.name}</div>
                  <div>Last updated {new Date(lastUpdated).toLocaleString()}</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
            Select a note to view
          </div>
        )}
      </div>

      {/* Context Menu */}
      {menu.open && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1"
        >
          <button
            onClick={() => onMenuAction("rename")}
            className="w-full px-3 py-1.5 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Rename
          </button>
          <button
            onClick={() => onMenuAction("new")}
            className="w-full px-3 py-1.5 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            New page
          </button>
          <button
            onClick={() => onMenuAction("delete")}
            className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Delete
          </button>
        </div>
      )}

      {/* Save Indicator */}
      {savedAt !== null && (
        <div className="fixed bottom-4 right-5 px-3 py-1.5 rounded-full bg-slate-900/80 dark:bg-slate-700/80 text-white text-[12px] font-medium shadow-lg">
          Saved
        </div>
      )}
    </div>
  );
}
