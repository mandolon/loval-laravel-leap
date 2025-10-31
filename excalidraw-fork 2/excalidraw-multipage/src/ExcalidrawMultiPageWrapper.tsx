
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DotsHorizontalIcon,
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  CopyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ImageIcon,
} from "@radix-ui/react-icons";
import { Excalidraw, exportToSvg } from "@excalidraw/excalidraw";

// ---------- Arrow Counter Configuration ----------
const COUNTER_CFG = {
  startInches: 0, // starting value in inches (starts at 0)
  pxPerStep: 0.668, // fine-tuned calibration from 14 data points with startInches=0
  stepInches: 1,   // increment amount in inches (1 inch per step)
  showPrefix: "",  // prefix (e.g., "L=")
  showSuffix: "",  // suffix
};

// Format inches to feet'-inches" format
function formatInchesToFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'-${remainingInches.toString().padStart(2, '0')}"`;
}

type ArrowInfo = { textId: string; override?: string };
const arrowMeta = new Map<string, ArrowInfo>();

// ---------- Arrow Counter Helpers ----------
function lengthOfArrow(el: any): number {
  if (el.type !== "arrow" || !Array.isArray(el.points) || el.points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < el.points.length; i++) {
    const [x1, y1] = el.points[i - 1];
    const [x2, y2] = el.points[i];
    const dx = x2 - x1, dy = y2 - y1;
    len += Math.hypot(dx, dy);
  }
  return len;
}

function midPointOfArrow(el: any): { x: number; y: number } {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number; d: number }> = [];
  let acc = 0;
  for (let i = 1; i < el.points.length; i++) {
    const x1 = el.x + el.points[i - 1][0];
    const y1 = el.y + el.points[i - 1][1];
    const x2 = el.x + el.points[i][0];
    const y2 = el.y + el.points[i][1];
    const d = Math.hypot(x2 - x1, y2 - y1);
    segments.push({ x1, y1, x2, y2, d });
    acc += d;
  }
  const half = acc / 2;
  let run = 0;
  for (const s of segments) {
    if (run + s.d >= half) {
      const t = (half - run) / s.d;
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
    run += s.d;
  }
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

function valueForLength(px: number): string {
  const steps = Math.max(0, Math.floor(px / COUNTER_CFG.pxPerStep));
  const totalInches = COUNTER_CFG.startInches + steps * COUNTER_CFG.stepInches;
  const formatted = formatInchesToFeetInches(totalInches);
  return `${COUNTER_CFG.showPrefix}${formatted}${COUNTER_CFG.showSuffix}`;
}

function valueForArrow(el: any, info?: ArrowInfo): string {
  if (info?.override != null) return info.override;
  const L = lengthOfArrow(el);
  const steps = Math.max(0, Math.floor(L / COUNTER_CFG.pxPerStep));
  const totalInches = COUNTER_CFG.startInches + steps * COUNTER_CFG.stepInches;
  const formatted = formatInchesToFeetInches(totalInches);
  return `${COUNTER_CFG.showPrefix}${formatted}${COUNTER_CFG.showSuffix}`;
}

function makeTextElementAt(x: number, y: number, text: string): any {
  return {
    type: "text",
    text,
    fontSize: 8,
    fontFamily: 1, // Excalifont / default
    textAlign: "center",
    verticalAlign: "middle",
    x: x,
    y: y,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 100,
    strokeColor: "#000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: null,
    groupIds: [],
    seed: (Math.random() * 1e9) | 0,
    version: 1,
    versionNonce: (Math.random() * 1e9) | 0,
    isDeleted: false,
    locked: false,
    boundElements: null,
  };
}

let raf: number | null = null;
let arrowCounterCallback: ((count: number, values: string[]) => void) | null = null;

let isUpdatingScene = false; // Guard flag to prevent recursion

function handleArrowCounter(elements: any[], api: any) {
  if (isUpdatingScene) return; // Prevent recursion
  
  // Detect newly created arrows and attach a text label once
  const newArrows: any[] = [];
  for (const el of elements) {
    if (el.type === "arrow" && !arrowMeta.has(el.id) && !el.isDeleted) {
      newArrows.push(el);
    }
  }
  
  // Create labels for new arrows in one batch
  if (newArrows.length > 0) {
    isUpdatingScene = true;
    const scene = api.getSceneElements();
    const newTexts: any[] = [];
    
    for (const el of newArrows) {
      const mid = midPointOfArrow(el);
      const L = lengthOfArrow(el);
      const txt = makeTextElementAt(mid.x, mid.y, valueForLength(L));
      txt.id = uid();
      newTexts.push(txt);
      arrowMeta.set(el.id, { textId: txt.id });
    }
    
    api.updateScene({ elements: [...scene, ...newTexts] });
    isUpdatingScene = false;
  }
  
  // Update numbers only for arrows that already have labels (no updateScene here)
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const map = new Map(elements.map(e => [e.id, e]));
    const needsUpdate: any[] = [];
    
    for (const [arrowId, meta] of arrowMeta.entries()) {
      const arrow = map.get(arrowId);
      if (!arrow || arrow.isDeleted) {
        arrowMeta.delete(arrowId);
        continue;
      }
      const textEl = map.get(meta.textId);
      if (!textEl || textEl.isDeleted) continue;
      
      const val = valueForArrow(arrow, meta);
      const mid = midPointOfArrow(arrow);
      
      if (textEl.text !== val || textEl.x !== mid.x || textEl.y !== mid.y) {
        textEl.text = val;
        textEl.x = mid.x;
        textEl.y = mid.y;
        needsUpdate.push(textEl);
      }
    }
    
    // Only update if something changed
    if (needsUpdate.length > 0) {
      isUpdatingScene = true;
      const scene = api.getSceneElements();
      api.updateScene({ elements: [...scene] });
      isUpdatingScene = false;
    }
    
    // Notify callback of current count and values
    if (arrowCounterCallback) {
      const values: string[] = [];
      for (const [arrowId, meta] of arrowMeta.entries()) {
        const arrow = map.get(arrowId);
        if (arrow && !arrow.isDeleted) {
          values.push(valueForArrow(arrow, meta));
        }
      }
      arrowCounterCallback(arrowMeta.size, values);
    }
  });
}

function setOverrideForSelection(api: any) {
  const sel = api.getSelectedElements().filter((e: any) => e.type === "arrow");
  if (!sel.length) return;
  const input = prompt("Set value for selected arrow(s) (e.g., 6'-00\"):", "");
  if (input == null) return;
  const trimmed = input.trim();
  for (const el of sel) {
    const info = arrowMeta.get(el.id);
    if (!info) continue;
    if (trimmed) {
      info.override = trimmed;
    } else {
      delete info.override;
    }
  }
  api.updateScene({ elements: [...api.getSceneElements()] });
}

function clearOverrideForSelection(api: any) {
  const sel = api.getSelectedElements().filter((e: any) => e.type === "arrow");
  for (const el of sel) {
    const info = arrowMeta.get(el.id);
    if (info && "override" in info) delete info.override;
  }
  api.updateScene({ elements: [...api.getSceneElements()] });
}

// ---------- Types ----------
interface PageData {
  id: string;
  name: string;
  data: any | null; // { elements, appState, files }
  thumb?: string | null; // data URL for preview thumbnail
}

// Util: simple ID
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ---------- Pure helpers (tested below) ----------
export function computeIndexAfterDelete(current: number, deleted: number) {
  if (current === deleted) return Math.max(0, current - 1);
  if (current > deleted) return current - 1;
  return current;
}

export function swapIndexUp<T>(items: T[], idx: number) {
  if (idx <= 0 || idx >= items.length) return items;
  const next = [...items];
  const [it] = next.splice(idx, 1);
  next.splice(idx - 1, 0, it);
  return next;
}

export function swapIndexDown<T>(items: T[], idx: number) {
  if (idx < 0 || idx >= items.length - 1) return items;
  const next = [...items];
  const [it] = next.splice(idx, 1);
  next.splice(idx + 1, 0, it);
  return next;
}

// ---------- Component ----------
export default function ExcalidrawMultiPageWrapper() {
  const [pages, setPages] = useState<PageData[]>([
    { id: uid(), name: "EAST - DWG", data: null },
    { id: uid(), name: "NORTH - DWG", data: null },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rename, setRename] = useState<string>("EAST - DWG");
  const [openRenameId, setOpenRenameId] = useState<string | null>(null);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [arrowCounterEnabled, setArrowCounterEnabled] = useState(false);
  const [arrowCount, setArrowCount] = useState(0);
  const [arrowValues, setArrowValues] = useState<string[]>([]);
  const excaliRef = useRef<any>(null);
  const savingRef = useRef<number | null>(null);
  const persistRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activePage = pages[activeIndex];

  // Save current scene into the active page slot
  const persistActive = useCallback(async () => {
    const api = excaliRef.current;
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles ? api.getFiles() : undefined;

    const data = { elements, appState, files };

    setPages((prev) => {
      const current = prev[activeIndex];
      // Skip update if data is essentially the same
      if (current.data && 
          JSON.stringify(current.data.elements) === JSON.stringify(data.elements)) {
        return prev;
      }
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], data };
      return next;
    });

    // Debounced thumbnail generation
    if (savingRef.current) window.clearTimeout(savingRef.current);
    savingRef.current = window.setTimeout(async () => {
      try {
        const svg = await exportToSvg({ elements, appState, files, exportPadding: 20 });
        const serialized = new XMLSerializer().serializeToString(svg);
        const dataUrl =
          "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(serialized)));
        setPages((prev) => {
          const next = [...prev];
          const p = next[activeIndex];
          next[activeIndex] = { ...p, thumb: dataUrl };
          return next;
        });
      } catch (err) {
        console.warn("Thumbnail export failed:", err);
      }
    }, 400);
  }, [activeIndex]);

  // Handle Excalidraw onChange to keep current page synced
  const handleChange = useCallback((elements: any[], appState: any, files: any) => {
    // Update arrow counters if enabled (with recursion guard)
    if (arrowCounterEnabled && excaliRef.current) {
      handleArrowCounter(elements, excaliRef.current);
    }
    
    // Persist active page
    if (persistRef.current) clearTimeout(persistRef.current);
    persistRef.current = window.setTimeout(() => {
      persistActive();
    }, 100);
  }, [persistActive, arrowCounterEnabled]);

  // Switch page: save current, then load new
  const switchTo = useCallback(
    async (index: number) => {
      if (index === activeIndex) return;
      await persistActive();
      setActiveIndex(index);
    },
    [activeIndex, persistActive]
  );

  // Add, duplicate, delete, reorder
  const addPage = useCallback(() => {
    const newPage: PageData = {
      id: uid(),
      name: `PAGE ${pages.length + 1}`,
      data: null,
    };
    setPages((prev) => [...prev, newPage]);
    setActiveIndex(pages.length);
    setRename(newPage.name);
  }, [pages.length]);

  const duplicatePage = useCallback(
    (idx: number) => {
      const base = pages[idx];
      const copy: PageData = {
        id: uid(),
        name: `${base.name} (Copy)`,
        data: base.data ? { ...base.data } : null,
        thumb: base.thumb || null,
      };
      setPages((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return next;
      });
      setActiveIndex(idx + 1);
      setRename(`${base.name} (Copy)`);
    },
    [pages]
  );

  const deletePage = useCallback(
    (idx: number) => {
      if (pages.length <= 1) return; // keep at least one
      setPages((prev) => prev.filter((_, i) => i !== idx));
      setActiveIndex((prev) => computeIndexAfterDelete(prev, idx));
    },
    [pages.length]
  );

  const moveUp = useCallback((idx: number) => {
    if (idx <= 0) return;
    setPages((prev) => swapIndexUp(prev, idx));
    setActiveIndex((prev) => (prev === idx ? idx - 1 : prev === idx - 1 ? idx : prev));
  }, []);

  const moveDown = useCallback(
    (idx: number) => {
      if (idx >= pages.length - 1) return;
      setPages((prev) => swapIndexDown(prev, idx));
      setActiveIndex((prev) => (prev === idx ? idx + 1 : prev === idx + 1 ? idx : prev));
    },
    [pages.length]
  );

  // Rename dialog helpers
  const openRename = (page: PageData) => {
    setRename(page.name);
    setOpenRenameId(page.id);
  };
  const applyRename = () => {
    if (!openRenameId) return;
    setPages((prev) =>
      prev.map((p) => (p.id === openRenameId ? { ...p, name: rename.trim() || p.name } : p))
    );
    setOpenRenameId(null);
  };

  // Import image to Excalidraw
  const handleImageImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const fileUrl = URL.createObjectURL(file);
      
      const canvas = document.querySelector('.excalidraw') as HTMLElement;
      if (canvas) {
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer,
        });
        
        canvas.dispatchEvent(dropEvent);
        
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      }
    } catch (err) {
      console.error("Failed to import image:", err);
      alert("Failed to import image. Please try drag and drop instead.");
    }
    
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Export active as SVG download
  const downloadActiveSVG = async () => {
    const api = excaliRef.current;
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles ? api.getFiles() : undefined;
    const svg = await exportToSvg({ elements, appState, files, exportPadding: 20 });
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePage?.name || "drawing"}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Set up arrow counter callback
  useEffect(() => {
    arrowCounterCallback = (count: number, values: string[]) => {
      setArrowCount(count);
      setArrowValues(values);
    };
    return () => {
      arrowCounterCallback = null;
    };
  }, []);

  // Initialize count when feature is enabled
  useEffect(() => {
    if (arrowCounterEnabled && excaliRef.current) {
      const elements = excaliRef.current.getSceneElements();
      const map = new Map(elements.map((e: any) => [e.id, e]));
      const validArrows = Array.from(arrowMeta.entries()).filter(([id, meta]) => {
        const arrow = map.get(id);
        return arrow && !arrow.isDeleted;
      });
      setArrowCount(validArrows.length);
      const values = validArrows.map(([id, meta]) => valueForArrow(map.get(id)!, meta));
      setArrowValues(values);
    }
  }, [arrowCounterEnabled]);

  // Keyboard shortcuts for arrow counter overrides
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!arrowCounterEnabled) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOverrideForSelection(excaliRef.current);
      }
      if (mod && e.altKey && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        clearOverrideForSelection(excaliRef.current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arrowCounterEnabled]);

  // Styling helpers
  const panelCls =
    "bg-white/70 backdrop-blur border border-gray-200 rounded-xl shadow-sm";
  const buttonBase =
    "inline-flex items-center justify-center rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm hover:bg-gray-50 active:scale-[.99] transition";

  const propertiesCol = propertiesCollapsed ? '48px' : '280px';
  const pagesCol = pagesCollapsed ? '48px' : '320px';

  return (
    <div 
      className="h-[100vh] w-full grid grid-rows-[48px_1fr] gap-2 p-2 bg-neutral-50 text-neutral-800"
      style={{ gridTemplateColumns: `${propertiesCol} 1fr ${pagesCol}` }}
    >
      {/* Header */}
      <div className="col-span-3 row-span-1 flex items-center justify-between px-2 py-1 bg-white/70 backdrop-blur border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <div className="font-semibold">930 Echo Summit</div>
          <span className="text-neutral-400">/</span>
          <div className="text-neutral-600">Excalidraw Workspace</div>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Left: Properties (mock, inspired by Revit) */}
      <div className={`${panelCls} col-start-1 row-start-2 overflow-hidden flex flex-col ${propertiesCollapsed ? 'hidden' : ''}`}>
        <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium flex items-center justify-between">
          <span>Properties</span>
          <button
            onClick={() => setPropertiesCollapsed(true)}
            className="opacity-70 hover:opacity-100 p-1 rounded hover:bg-gray-100"
            title="Collapse Properties panel"
          >
            <ChevronLeftIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-sm">
          <div className="space-y-4">
            <Field label="View Scale" value={'1/4" = 1\'-0"'} />
            <Field label="Detail Level" value="Fine" />
            <Field label="Discipline" value="Architectural" />
            <Field label="Title on Sheet" value={activePage?.name || "Untitled"} />
            <Field label="Saved" value="Auto" />
            
            {/* Arrow Counter Toggle */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-neutral-500 mb-2">Arrow Counter</div>
              <button
                onClick={() => setArrowCounterEnabled(!arrowCounterEnabled)}
                className={`w-full rounded-lg border px-3 py-2 text-sm transition ${
                  arrowCounterEnabled
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {arrowCounterEnabled ? "✓ Enabled" : "Enable"}
              </button>
              {arrowCounterEnabled && (
                <div className="mt-2 space-y-1">
                  <div className="text-sm font-semibold text-purple-700 text-center">
                    {arrowCount} arrow{arrowCount !== 1 ? 's' : ''} labeled
                  </div>
                  {arrowValues.length > 0 && (
                    <div className="text-xs text-neutral-600 text-center">
                      Values: {arrowValues.join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="text-xs text-neutral-400 mt-2">
                Adds auto-updating numbers to arrows based on length
              </div>
              {arrowCounterEnabled && (
                <div className="text-xs text-neutral-400 mt-1">
                  Shortcuts: Ctrl+Alt+N (set), Ctrl+Alt+Backspace (clear)
                </div>
              )}
            </div>
            
            <div className="text-xs text-neutral-400 pt-2">
              (Non-functional mock fields for layout parity)
            </div>
          </div>
        </div>
      </div>

      {propertiesCollapsed && (
        <button
          onClick={() => setPropertiesCollapsed(false)}
          className="col-start-1 row-start-2 self-start mt-2 opacity-70 hover:opacity-100 p-2 rounded hover:bg-gray-100 border border-gray-200 bg-white/70 backdrop-blur"
          title="Expand Properties panel"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Center: Excalidraw Canvas */}
      <div className={`${panelCls} col-start-2 row-start-2 overflow-hidden`}>
        <div className="h-full w-full">
          <Excalidraw
            key={activePage?.id}
            excalidrawAPI={(api: any) => (excaliRef.current = api)}
            initialData={activePage?.data || undefined}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Right: Pages Navigator */}
      <div className={`${panelCls} col-start-3 row-start-2 overflow-hidden flex flex-col ${pagesCollapsed ? 'hidden' : ''}`}>
        <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagesCollapsed(true)}
              className="opacity-70 hover:opacity-100 p-1 rounded hover:bg-gray-100"
              title="Collapse Pages panel"
            >
              <ChevronRightIcon />
            </button>
            <span>Pages</span>
          </div>
          <button className={`${buttonBase} h-7`} onClick={addPage}>
            <PlusIcon className="mr-1" />Add
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-2">
              {pages.map((p, idx) => (
                <li
                  key={p.id}
                  className={`group rounded-lg border ${
                    idx === activeIndex ? "border-neutral-800" : "border-gray-200"
                  } bg-white overflow-hidden`}
                >
                  <button onClick={() => switchTo(idx)} className="w-full text-left">
                    <div className="aspect-video w-full bg-neutral-100 overflow-hidden flex items-center justify-center">
                      {p.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumb}
                          alt={p.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="text-xs text-neutral-400">No preview</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <div className="text-sm truncate" title={p.name}>
                        {p.name}
                      </div>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-70 hover:opacity-100 p-1 rounded hover:bg-gray-100 cursor-pointer"
                          >
                            <DotsHorizontalIcon />
                          </div>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="min-w-[160px] rounded-md bg-white border border-gray-200 p-1 shadow-md">
                          <DropdownMenu.Item
                            onSelect={() => openRename(p)}
                            className="px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Pencil1Icon />Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={() => duplicatePage(idx)}
                            className="px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <CopyIcon />Duplicate
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                          <DropdownMenu.Item
                            onSelect={() => moveUp(idx)}
                            className="px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <ChevronUpIcon />Move up
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={() => moveDown(idx)}
                            className="px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <ChevronDownIcon />Move down
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                          <DropdownMenu.Item
                            onSelect={() => deletePage(idx)}
                            className="px-2 py-1.5 rounded hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                          >
                            <TrashIcon />Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

      {pagesCollapsed && (
        <button
          onClick={() => setPagesCollapsed(false)}
          className="col-start-3 row-start-2 self-start mt-2 opacity-70 hover:opacity-100 p-2 rounded hover:bg-gray-100 border border-gray-200 bg-white/70 backdrop-blur"
          title="Expand Pages panel"
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* Rename Dialog */}
      <Dialog.Root open={!!openRenameId} onOpenChange={(o) => !o && setOpenRenameId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/20" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] rounded-xl bg-white p-4 shadow-xl border border-gray-200">
            <Dialog.Title className="font-medium">Rename page</Dialog.Title>
            <input
              autoFocus
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyRename()}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-800"
              placeholder="Page name"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpenRenameId(null)} className={buttonBase}>
                Cancel
              </button>
              <button
                onClick={applyRename}
                className={`${buttonBase} bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800`}
              >
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

// Small field row for the mock Properties panel
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm font-medium text-neutral-800">{value}</div>
    </div>
  );
}
