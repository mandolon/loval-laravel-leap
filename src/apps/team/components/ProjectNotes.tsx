import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MoreHorizontal, User, Move, ChevronLeft, ChevronRight } from "lucide-react";
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
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Title validation state
  const [titleCharCount, setTitleCharCount] = useState(0);
  const [showTitleHelper, setShowTitleHelper] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Resizable sidebar state
  const [sidebarW, setSidebarW] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
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
      saveCtl.current.lastSaved = firstNote.content;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enable undo/redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
        e.preventDefault();
        document.execCommand('redo', false);
      } else {
        // Ctrl+Z or Cmd+Z = Undo
        e.preventDefault();
        document.execCommand('undo', false);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      // Ctrl+Y = Redo (Windows)
      e.preventDefault();
      document.execCommand('redo', false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');
    
    if (html) {
      // Parse HTML and remove font-size styles while keeping other formatting
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Recursively remove font-size and font-family from all elements
      const cleanElement = (el: Element) => {
        if (el instanceof HTMLElement) {
          // Remove font-size, font-family, and font shorthand
          el.style.fontSize = '';
          el.style.fontFamily = '';
          el.style.font = '';
          
          // Remove size attributes from font tags
          if (el.tagName === 'FONT') {
            el.removeAttribute('size');
            el.removeAttribute('face');
          }
          
          // Remove style attribute if it only contained font properties
          if (el.style.length === 0) {
            el.removeAttribute('style');
          }
        }
        
        // Recursively clean children
        Array.from(el.children).forEach(cleanElement);
      };
      
      Array.from(tempDiv.children).forEach(cleanElement);
      
      // Insert the cleaned HTML
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const fragment = document.createDocumentFragment();
        const nodes = Array.from(tempDiv.childNodes);
        nodes.forEach(node => fragment.appendChild(node.cloneNode(true)));
        
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // Plain text fallback
      document.execCommand('insertText', false, text);
    }
    
    // Trigger input handler to save
    handleInput();
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
    let next = (el.innerText || "").trim();
    
    // Validate: don't allow blank titles
    if (!next) {
      setTitleError("Title cannot be empty");
      setShowTitleHelper(true);
      // Restore previous title
      el.textContent = noteTitle;
      return;
    }
    
    // Limit to 40 characters
    if (next.length > 40) {
      next = next.substring(0, 40);
      el.textContent = next; // Update display immediately
    }
    
    console.log('[TITLE DEBUG] commitRename called', { next, activeNoteId, length: next.length });
    setTitleError(null);
    setShowTitleHelper(false);
    setNoteTitle(next);
    setTitleCharCount(next.length);
    
    // Don't remove contenteditable - keep it editable
    if (activeNoteId) {
      console.log('[TITLE DEBUG] Updating note title in database');
      updateNoteMutation.mutate({ id: activeNoteId, title: next });
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

  const onTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const text = el.textContent || "";
    
    // Update character count
    setTitleCharCount(text.length);
    
    // Clear error if user starts typing
    if (text.trim().length > 0) {
      setTitleError(null);
    }
    
    // Enforce 40 character limit in real-time
    if (text.length > 40) {
      const truncated = text.substring(0, 40);
      el.textContent = truncated;
      setTitleCharCount(40);
      
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const openMenuAtButton = (btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    // Position menu to the left of the button, aligned with its top
    setMenu({ open: true, x: rect.left - 165, y: rect.top - 5 });
  };

  const onListContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ open: true, x: e.clientX, y: e.clientY });
  };

  const onMenuAction = (action: string) => {
    if (action === "rename") {
      beginListRename();
    } else if (action === "delete") {
      if (activeNoteId) {
        const currentNoteId = activeNoteId;
        
        // Clear the current note immediately
        setActiveNoteId(null);
        setNoteTitle("");
        setDoc("");
        setCreatedByUser(null);
        setLastUpdated("");
        
        // Clear the editable ref
        if (editableRef.current) {
          editableRef.current.innerHTML = "";
        }
        
        // Delete from database
        deleteNoteMutation.mutate(currentNoteId, {
          onSuccess: () => {
            // After successful delete, select the first remaining note if any
            const remainingNotes = notes.filter(n => n.id !== currentNoteId);
            if (remainingNotes.length > 0) {
              const firstNote = remainingNotes[0];
              setActiveNoteId(firstNote.id);
              setNoteTitle(firstNote.title);
              setDoc(firstNote.content);
              setLastUpdated(firstNote.updatedAt);
              loadCreatedByUser(firstNote.createdBy);
              saveCtl.current.lastSaved = firstNote.content;
            }
          }
        });
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
    if (editableRef.current && doc !== undefined) {
      const currentHTML = editableRef.current.innerHTML;
      const isFocused = document.activeElement === editableRef.current;
      
      // Only update if not currently editing and content is different
      if (!isFocused && currentHTML !== doc) {
        editableRef.current.innerHTML = doc;
        saveCtl.current.lastSaved = doc;
      }
    }
  }, [doc, activeNoteId]);

  // Sync title to ref when it changes (but not when focused)
  useEffect(() => {
    if (titleRef.current && noteTitle !== undefined) {
      const isFocused = document.activeElement === titleRef.current;
      console.log('[TITLE DEBUG] Title sync effect running', {
        noteTitle,
        currentText: titleRef.current.textContent,
        isFocused,
        contentEditable: titleRef.current.getAttribute('contenteditable'),
        activeNoteId
      });
      
      // Only update if not currently editing
      if (!isFocused && titleRef.current.textContent !== noteTitle) {
        console.log('[TITLE DEBUG] Updating title textContent from', titleRef.current.textContent, 'to', noteTitle);
        titleRef.current.textContent = noteTitle;
      }
    }
  }, [noteTitle, activeNoteId]);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    let autoCollapsedRef = false;
    
    const handleResize = () => {
      const width = window.innerWidth;
      const shouldCollapse = width < 1200; // Breakpoint at 1200px
      
      setSidebarCollapsed(prev => {
        if (shouldCollapse && !prev) {
          autoCollapsedRef = true;
          setAutoCollapsed(true);
          return true;
        } else if (!shouldCollapse && autoCollapsedRef) {
          autoCollapsedRef = false;
          setAutoCollapsed(false);
          return false;
        }
        return prev;
      });
    };

    // Check on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array



  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading notes...</div>;
  }

  return (
    <div ref={rowRef} className="flex h-full w-full overflow-hidden">
      {/* Left Sidebar */}
      <div 
        style={{ width: sidebarCollapsed ? 0 : sidebarW }} 
        className="flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 transition-all duration-200 overflow-hidden"
      >
        {/* Header */}
        <div data-testid="notes-sidebar-header" className="h-10 px-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!showSearch ? (
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">Project Notes</h2>
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
          <div className="flex items-center gap-1">
            <button
              data-testid="search-toggle"
              onClick={focusSearch}
              className="h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div ref={sidebarScrollRef} data-testid="notes-sidebar-scroll" className="flex-1 overflow-y-auto thin-scrollbar pr-0">
          <div className="p-2 space-y-1">
            {notes.filter(n => matchesPage).map((note) => (
              <div
                key={note.id}
                data-testid="date-item"
                onClick={() => selectNote(note.id)}
                onContextMenu={onListContextMenu}
                style={activeNoteId !== note.id ? { transition: 'background-color 0.2s' } : undefined}
                onMouseEnter={(e) => {
                  if (activeNoteId !== note.id) {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeNoteId !== note.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                className={`flex items-center justify-between gap-2 pl-0 pr-2 py-2 rounded-[10px] cursor-pointer ${
                  activeNoteId === note.id ? 'bg-gray-100 dark:bg-slate-800' : ''
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

            {/* Add Page Button - appears after last note in list */}
            <button
              onClick={() => onMenuAction("new")}
              className="w-full flex items-center justify-start gap-2 px-3 py-2 mt-2 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span>Add Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div
        data-testid="notes-resizer"
        onMouseDown={() => setIsResizing(true)}
        className="w-3 cursor-col-resize shrink-0"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
        {/* Expand button when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-2 left-2 z-10 h-8 w-8 grid place-items-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        
        {activeNoteId ? (
          <>
            {/* Header area - fixed, no scroll */}
            <div className="shrink-0 px-8 pt-12 pb-4 flex justify-center">
              <div className="w-full max-w-3xl">
                <div className="text-[13px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mb-4 overflow-hidden">
                  <Move className="w-4 h-4 shrink-0 text-gray-500 dark:text-slate-400" />
                  <span className="hover:underline cursor-pointer truncate" style={{ fontWeight: 500 }}>Link Task or Doc</span>
                </div>

                <div
                  ref={titleRef}
                  contentEditable
                  suppressContentEditableWarning
                  onKeyDown={onTitleKeyDown}
                  onInput={onTitleInput}
                  onBlur={(e) => {
                    console.log('[TITLE DEBUG] onBlur triggered');
                    setShowTitleHelper(false);
                    commitRename();
                  }}
                  onFocus={() => {
                    console.log('[TITLE DEBUG] onFocus triggered', {
                      contentEditable: titleRef.current?.getAttribute('contenteditable'),
                      textContent: titleRef.current?.textContent
                    });
                    setShowTitleHelper(true);
                    const text = titleRef.current?.textContent || "";
                    setTitleCharCount(text.length);
                  }}
                  onClick={() => {
                    console.log('[TITLE DEBUG] onClick triggered', {
                      contentEditable: titleRef.current?.getAttribute('contenteditable'),
                      textContent: titleRef.current?.textContent,
                      isFocused: document.activeElement === titleRef.current
                    });
                  }}
                  className="text-[34px] font-semibold text-slate-900 dark:text-slate-100 mb-4 outline-none break-words cursor-text"
                  style={{ color: '#0f172a' }}
                />

                {createdByUser && (
                  <div className="text-[12px] flex items-center gap-2 overflow-hidden" style={{ color: '#202020' }}>
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate"><span style={{ fontWeight: 500 }}>Created by:</span> {createdByUser.name}</span>
                    <span className="mx-1 shrink-0">•</span>
                    <span className="truncate">Last updated: <span style={{ fontWeight: 500 }}>{new Date(lastUpdated).toLocaleDateString()} at {new Date(lastUpdated).toLocaleTimeString()}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* Editable area - independent scroll */}
            <div ref={mainScrollRef} data-testid="notes-main-scroll" className="flex-1 overflow-y-auto px-8 py-6 flex justify-center">
              <div className="w-full max-w-3xl">
                <div
                  ref={editableRef}
                  contentEditable={true}
                  onInput={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  className="outline-none text-[15.5px] leading-[1.75rem] cursor-text"
                  style={{ 
                    minHeight: '480px',
                    fontSize: '15.5px',
                    lineHeight: '1.75rem',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="text-center max-w-md">
              <div className="mb-6 text-slate-400 dark:text-slate-500">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                No project notes yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                Create your first note for this project. Notes here are specific to this project.
              </p>
              <button
                onClick={() => onMenuAction("new")}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Create Note
              </button>
            </div>
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
