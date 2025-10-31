import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  Home,
  FolderKanban,
  CheckSquare,
  Bot,
  Book,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { TeamAvatarMenu } from "./TeamAvatarMenu";
import ProjectPanel from "./ProjectPanel";
import TeamFileViewer from "./viewers/TeamFileViewer";
import ExcalidrawCanvas from '@/components/drawings/ExcalidrawCanvas';
import { SCALE_PRESETS, getInchesPerSceneUnit, type ScalePreset, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';

// ----------------------------------
// Theme & constants
// ----------------------------------
const RAIL_GRADIENT = `
  linear-gradient(180deg, hsl(222 47% 10%) 0%, hsl(222 47% 8%) 55%, hsl(222 47% 6%) 100%),
  radial-gradient(80% 50% at 50% 0%, hsl(213 94% 68% / 0.14), transparent),
  radial-gradient(80% 50% at 50% 100%, hsl(259 94% 68% / 0.12), transparent)
`.trim();

const HOVER_DELAY_MS = 250;
const CLOSE_DELAY_MS = 150;
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 600;

// ----------------------------------
// TypeScript Interfaces
// ----------------------------------
interface RailItemProps {
  tabKey: string;
  label: string;
  icon: any;
  active: boolean;
  items?: string[];
  openTab: string | null;
  setOpenTab: React.Dispatch<React.SetStateAction<string | null>>;
  selected: { tab: string; item: string } | null;
  setSelected: React.Dispatch<React.SetStateAction<{ tab: string; item: string } | null>>;
  onActivate: () => void;
  menuEnabled?: boolean;
}

interface TopHeaderProps {
  railCollapsed: boolean;
  setRailCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mdUp: boolean;
}

interface PageHeaderProps {
  tabKey: string;
  title: string;
  selected?: { tab: string; item: string } | null;
  projectPanelCollapsed?: boolean;
  onToggleProjectPanel?: () => void;
}

interface TabsRowProps {
  tabs: Array<{ key: string; label: string; icon: React.ReactNode }>;
  active: string;
  onChange: (key: string) => void;
}

// ----------------------------------
// Media hook (for sidebar peek on md+)
// ----------------------------------
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// ----------------------------------
// Maps / data
// ----------------------------------
const ICON_MAP = {
  home: Home,
  projects: FolderKanban,
  tasks: CheckSquare,
  ai: Bot,
  chat: MessageSquare,
  details: Book,
};

const TITLES = {
  home: "Home",
  projects: "Projects",
  tasks: "Tasks",
  ai: "AI",
  chat: "Chat",
  details: "Detail Library",
};

const DETAIL_CATEGORIES = [
  { name: "Foundation", items: ["Footings", "Grade Beams", "Slab-on-Grade", "Basement Walls"] },
  { name: "Wall", items: ["Exterior Walls", "Interior Walls", "Curtain Walls", "Party Walls"] },
  { name: "Roof", items: ["Pitched Roofs", "Flat Roofs", "Roof-to-Wall Connections", "Skylights"] },
  { name: "Window & Door", items: ["Window Heads", "Window Sills", "Door Frames", "Door Thresholds"] },
  { name: "Stair", items: ["Stair Sections", "Handrails", "Landings", "Connections"] },
  { name: "Connection", items: ["Beam Connections", "Column Connections", "Truss Connections", "Base Plates"] },
  { name: "Finish", items: ["Flooring", "Ceilings", "Wall Finishes", "Trim & Molding"] },
];

const DETAIL_TAB_CARDS = {
  "Foundation": [
    { name: "Slab-on-Grade", items: ["Thickened Edge", "Control Joint", "Perimeter Insulation", "Vapor Barrier Lap"] },
    { name: "Crawlspace Foundation", items: ["Pier & Beam", "Vent & Sill Detail", "Moisture Barrier"] },
    { name: "Basement Foundation", items: ["Wall Waterproofing", "Footing Drain", "Sill Plate Anchor"] },
    { name: "Footings", items: ["Strip Footing", "Pad Footing", "Rebar Lap Splice"] }
  ],
  "Wall": [
    { name: "2x6 Wood Stud Exterior Wall", items: ["WRB + Flashing", "Fiberglass Batt", "Class II Vapor Retarder", "Sheathing Nailing"] },
    { name: "Plywood Shear Wall", items: ["Holdowns", "Nailing Schedule", "Boundary Nailing"] },
    { name: "Interior GWB Partition", items: ["Staggered Stud", "Sound Insulation", "Resilient Channel"] }
  ],
  "Floor/Ceiling": [
    { name: "Wood Joist Floor", items: ["Joist Hanger", "Subfloor Adhesive", "Blocking/Strutting"] },
    { name: "I-Joist Floor", items: ["Web Openings", "Rim Board", "Bearing Detail"] },
    { name: "GWB Ceiling", items: ["Furring Channel", "Air/Vapor Layer", "Recessed Can Light"] }
  ],
  "Roof": [
    { name: "Asphalt Shingle Roof", items: ["Drip Edge", "Ice & Water Shield", "Ridge Vent"] },
    { name: "Truss to Wall Connection", items: ["Hurricane Tie", "Blocking", "Continuous Load Path"] },
    { name: "Low-Slope Membrane", items: ["Tapered Insulation", "Parapet Cap", "Scupper"] }
  ],
  "Stair": [
    { name: "Residential Wood Stair", items: ["Stringer Cut", "Tread/Riser", "Skirt Board"] },
    { name: "Handrail & Guard", items: ["Post to Tread", "Bracket Mount", "Top Rail"] }
  ],
  "Finish": [
    { name: "Baseboard & Casing", items: ["Outside Corner", "Inside Corner", "Casing Return"] },
    { name: "Tile Shower", items: ["Shower Pan Liner", "Cement Board", "Waterproofing Membrane"] },
    { name: "Hardwood Floor", items: ["Underlayment", "Expansion Gap", "Transition Strip"] }
  ]
};

const ITEMS_CONFIG = {
  home: ["Inbox", "Replies", "My Tasks", "Posts"],
  projects: [
    "Project 1",
    "Project 2",
    "Project 3",
    "Project 4",
    "Project 5",
    "Project 6",
  ],
};

// ----------------------------------
// Root App
// ----------------------------------
export default function RehomeDoubleSidebar() {
  const [active, setActive] = useState("tasks");
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ tab: string; item: string } | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [projectPanelCollapsed, setProjectPanelCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<{ pageId: string; pageName: string; versionTitle: string } | null>(null);
  const [showArrowStats, setShowArrowStats] = useState(true); // Toggle visibility of stats display
  const [currentScale, setCurrentScale] = useState<ScalePreset>("1/4\" = 1'");
  const [arrowStats, setArrowStats] = useState<ArrowCounterStats>({ count: 0, values: [] });
  const [inchesPerSceneUnit, setInchesPerSceneUnit] = useState<number>(getInchesPerSceneUnit(SCALE_PRESETS["1/4\" = 1'"]));
  const [pxPerStep, setPxPerStep] = useState(0.668); // Calibration state
  const [chatResetTrigger, setChatResetTrigger] = useState(0);
  const mdUp = useMediaQuery("(min-width: 768px)");
  const { currentWorkspaceId } = useWorkspaces();
  const { user } = useUser();

  const handleChatActivate = useCallback(() => {
    setActive("chat");
    setChatResetTrigger(prev => prev + 1);
  }, []);

  const handleCalibration = useCallback(() => {
    window.dispatchEvent(new Event('trigger-calibration'));
  }, []);

  // Fetch user's projects for the current workspace
  const { data: userProjects = [] } = useQuery({
    queryKey: ['team-user-projects', currentWorkspaceId, user?.id],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?.id) {
        console.log('Missing workspace or user:', { currentWorkspaceId, userId: user?.id });
        return [];
      }
      
      console.log('Fetching projects for workspace:', currentWorkspaceId, 'user:', user.id);
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('projects.workspace_id', currentWorkspaceId)
        .is('deleted_at', null)
        .is('projects.deleted_at', null);

      if (error) {
        console.error('Error fetching user projects:', error);
        return [];
      }

      console.log('Fetched user projects:', data);
      const projects = data?.map((pm: any) => ({ id: pm.projects.id, name: pm.projects.name })) || [];
      console.log('User projects:', projects);
      return projects;
    },
    enabled: !!currentWorkspaceId && !!user?.id,
  });

  const projectItems = userProjects.length > 0 ? userProjects.map((p: any) => p.name) : ITEMS_CONFIG.projects;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Soft background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)",
        }}
      />

      {/* Top header */}
      <TopHeader
        railCollapsed={railCollapsed}
        setRailCollapsed={setRailCollapsed}
        mdUp={mdUp}
      />

      {/* Fixed narrow rail */}
      <aside
        className="fixed left-1.5 top-1.5 bottom-1.5 w-14 z-40 text-white rounded-xl shadow-xl border border-white/10 backdrop-blur-md flex flex-col items-center pt-3 gap-0"
        style={{
          background: RAIL_GRADIENT,
          transform: railCollapsed
            ? mdUp
              ? "translateX(calc(-100% + 6px))"
              : "translateX(-100%)"
            : "translateX(0)",
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="h-8 w-8" />
        <div className="my-2 h-px w-8 bg-white/10" />

        {["home", "chat", "projects"].map((tab) => (
          <RailItem
            key={tab}
            tabKey={tab}
            label={TITLES[tab as keyof typeof TITLES]}
            icon={ICON_MAP[tab as keyof typeof ICON_MAP]}
            active={active === tab}
            items={tab === "projects" ? projectItems : ITEMS_CONFIG[tab as keyof typeof ITEMS_CONFIG]}
            openTab={openTab}
            setOpenTab={setOpenTab}
            selected={selected}
            setSelected={setSelected}
            onActivate={tab === "chat" ? handleChatActivate : () => setActive(tab)}
            menuEnabled={tab === "projects"}
          />
        ))}

        {["tasks", "ai"].map((tab) => (
          <RailItem
            key={tab}
            tabKey={tab}
            label={TITLES[tab as keyof typeof TITLES]}
            icon={ICON_MAP[tab as keyof typeof ICON_MAP]}
            active={active === tab}
            openTab={openTab}
            setOpenTab={setOpenTab}
            selected={selected}
            setSelected={setSelected}
            onActivate={() => setActive(tab)}
          />
        ))}

        <div className="my-2 h-px w-8 bg-white/20" />

        <RailItem
          tabKey="details"
          label={TITLES.details}
          icon={ICON_MAP.details}
          active={active === "details"}
          items={[]}
          openTab={openTab}
          setOpenTab={setOpenTab}
          selected={selected}
          setSelected={setSelected}
          onActivate={() => setActive("details")}
        />

        <div className="mt-auto mb-2 h-px w-8 bg-white/10" />
      </aside>

      {/* Content frame */}
      <div
        className="fixed z-30 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out"
        style={{
          top: "calc(0.375rem + 2.25rem + 0.25rem)",
          bottom: "0.75rem",
          right: active === "projects" && selected?.tab === "projects" && !projectPanelCollapsed
            ? "calc(240px + 0.375rem + 0.5rem)" // panel width + margin + gap
            : "0.375rem",
          left: railCollapsed
            ? mdUp
              ? "calc(0.375rem + 6px + 0.75rem)"
              : "0.375rem"
            : "calc(0.375rem + 3.5rem + 0.75rem)",
        }}
      >
        <div className="h-full overflow-hidden flex flex-col">
          <PageHeader 
            tabKey={active} 
            title={TITLES[active as keyof typeof TITLES] || active}
            selected={selected}
            projectPanelCollapsed={projectPanelCollapsed}
            onToggleProjectPanel={() => setProjectPanelCollapsed(!projectPanelCollapsed)}
          />

          <div
            className={
              active === "tasks"
                ? "flex-1 min-h-0 overflow-hidden"
                : "flex-1 min-h-0 overflow-auto"
            }
          >
            {active === "projects" ? (
              <div className="h-full flex flex-col">
                {/* File/Whiteboard Viewer Area */}
                <div className="flex-1 min-h-0 h-full">
                  {selectedWhiteboard ? (
                    <ExcalidrawCanvas
                      pageId={selectedWhiteboard.pageId}
                      projectId={userProjects.find((p: any) => p.name === selected?.item)?.id || ''}
                      onApiReady={(api) => {/* Optional: store api reference */}}
                      inchesPerSceneUnit={inchesPerSceneUnit}
                      onArrowStatsChange={setArrowStats}
                      onCalibrationChange={(newInchesPerSceneUnit) => setInchesPerSceneUnit(newInchesPerSceneUnit)}
                    />
                  ) : selectedFile ? (
                    <TeamFileViewer file={selectedFile} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-slate-600">
                        <p className="text-sm font-medium">No file or whiteboard selected</p>
                        <p className="text-xs mt-1">Select from the panel to preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : active === "details" ? (
              <DetailLibraryView />
            ) : active === "tasks" ? (
              <TasksView />
            ) : active === "chat" ? (
              <ChatView resetTrigger={chatResetTrigger} />
            ) : active === "home" ? (
              <HomeView />
            ) : null}
          </div>
        </div>
      </div>

      {/* ProjectPanel - separate fixed element outside the content frame */}
      {active === "projects" && selected?.tab === "projects" && (
        <div
          className="fixed z-30 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out"
          style={{
            top: "calc(0.375rem + 2.25rem + 0.25rem)",
            bottom: "0.75rem",
            right: "0.375rem",
            width: projectPanelCollapsed ? 0 : "240px",
            opacity: projectPanelCollapsed ? 0 : 1,
            overflow: "hidden",
          }}
        >
            <ProjectPanel
              projectId={userProjects.find((p: any) => p.name === selected.item)?.id || ''}
              projectName={selected.item}
              onBreadcrumb={(crumb) => console.log('Breadcrumb:', crumb)}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setSelectedWhiteboard(null);
              }}
              onWhiteboardSelect={(wb) => {
                setSelectedWhiteboard(wb);
                setSelectedFile(null);
              }}
              showArrowStats={showArrowStats}
              onToggleArrowStats={() => setShowArrowStats(!showArrowStats)}
              currentScale={currentScale}
              onScaleChange={(scale) => {
                setCurrentScale(scale);
                setInchesPerSceneUnit(getInchesPerSceneUnit(SCALE_PRESETS[scale]));
              }}
              arrowStats={arrowStats}
              onCalibrate={handleCalibration}
              inchesPerSceneUnit={inchesPerSceneUnit}
            />
        </div>
      )}
    </div>
  );
}

// ----------------------------------
// Rail Icon + Hover Menu
// ----------------------------------
const RailItem = memo(function RailItem({
  tabKey,
  label,
  icon: IconComponent,
  active,
  items = [],
  openTab,
  setOpenTab,
  selected,
  setSelected,
  onActivate,
  menuEnabled = false,
}: RailItemProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const overIcon = useRef(false);
  const overPanel = useRef(false);
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const isTouchRef = useRef(false);
  const lastTapRef = useRef(0);
  const suppressClickRef = useRef(false);

  const scheduleOpen = useCallback(() => {
    if (!menuEnabled || openTab === tabKey) return;
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => setOpenTab(tabKey), HOVER_DELAY_MS);
  }, [menuEnabled, openTab, tabKey, setOpenTab]);

  const scheduleClose = useCallback(() => {
    if (!menuEnabled) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!overIcon.current && !overPanel.current) {
        setOpenTab((t) => (t === tabKey ? null : t));
      }
    }, CLOSE_DELAY_MS);
  }, [menuEnabled, tabKey, setOpenTab]);

  useEffect(() => {
    if (!menuEnabled || openTab !== tabKey) return;
    const onDocPointer = (ev: PointerEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(ev.target as Node)) setOpenTab(null);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [openTab, tabKey, setOpenTab, menuEnabled]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isTouchRef.current = e.pointerType === "touch";
      suppressClickRef.current = isTouchRef.current;
      overIcon.current = true;

      if (isTouchRef.current && menuEnabled) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          onActivate();
          setOpenTab(null);
          lastTapRef.current = 0;
        }, LONG_PRESS_MS);
      }
    },
    [menuEnabled, onActivate, setOpenTab]
  );

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (isTouchRef.current && menuEnabled) {
      const now = performance.now();
      if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
        onActivate();
        setOpenTab(null);
        lastTapRef.current = 0;
      } else {
        setOpenTab(tabKey);
        lastTapRef.current = now;
      }
    }
  }, [menuEnabled, onActivate, setOpenTab, tabKey]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
        return;
      }
      onActivate();
      // After navigating via icon click, close hover menu. Reopens on next hover.
      if (menuEnabled) {
        if (showTimer.current) clearTimeout(showTimer.current);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        overIcon.current = false;
        overPanel.current = false;
        setOpenTab(null);
      }
    },
    [onActivate, menuEnabled, setOpenTab]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") {
        overIcon.current = true;
        scheduleOpen();
      }
    },
    [scheduleOpen]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") {
        overIcon.current = false;
        scheduleClose();
      }
    },
    [scheduleClose]
  );

  const handleMenuMouseEnter = useCallback(() => {
    overPanel.current = true;
    setOpenTab(tabKey);
  }, [tabKey, setOpenTab]);

  const handleMenuMouseLeave = useCallback(() => {
    overPanel.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleItemClick = useCallback(
    (item: string) => {
      setSelected({ tab: tabKey, item });
      onActivate();
      setOpenTab(null);
      const ae = document.activeElement as HTMLElement;
      if (ae?.blur) ae.blur();
    },
    [tabKey, setSelected, onActivate, setOpenTab]
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, item: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleItemClick(item);
      }
    },
    [handleItemClick]
  );

  return (
    <div
      className="relative z-40 flex flex-col items-center gap-1.5 mb-3 group/nav"
      ref={containerRef}
    >
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onBlur={scheduleClose}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuEnabled && openTab === tabKey}
        className={`relative group h-9 w-9 cursor-pointer grid place-items-center rounded-xl transition duration-300 ease-out ${
          active
            ? "bg-white/10 text-white"
            : "text-white/80 hover:text-white hover:bg-white/5"
        }`}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-xl transform ring-1 ring-white/10 bg-white/0 opacity-0 scale-95 transition duration-300 group-hover:bg-white/5 group-hover:opacity-100 group-hover:scale-100 ${
            active ? "opacity-100 bg-white/5" : ""
          }`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-2xl opacity-0 blur-md transition duration-300 group-hover:opacity-60"
          style={{
            background:
              "radial-gradient(24px 24px at 50% 50%, rgba(255,255,255,0.35), transparent 70%)",
          }}
        />
        <span className="pointer-events-none transform transition duration-300 group-hover:-translate-y-px group-hover:translate-x-[1px] group-hover:scale-110 group-hover:rotate-[2deg] group-hover:drop-shadow-[0_6px_14px_rgba(255,255,255,0.35)] active:scale-95">
          <IconComponent className="h-5 w-5" />
        </span>

        <span className="pointer-events-none absolute left-12 px-1.5 py-1 rounded-md text-[11px] text-slate-700 bg-white/90 backdrop-blur-sm border border-slate-200 opacity-0 -translate-x-[6px] group-hover:opacity-100 group-hover:translate-x-0 transition">
          {label}
        </span>
      </button>

      <div
        className={`w-12 px-1 text-center text-[10px] leading-tight tracking-wide select-none transition-colors ${
          active ? "text-white" : "text-white/70"
        } group-hover/nav:text-white`}
      >
        {label}
      </div>

      {menuEnabled && (
        <div
          role="menu"
          data-open={openTab === tabKey ? "true" : "false"}
          className={`absolute left-14 top-1/2 -translate-y-1/2 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-md p-2 z-50 ${
            openTab === tabKey
              ? "opacity-100 translate-x-0 pointer-events-auto"
              : "opacity-0 -translate-x-2 pointer-events-none"
          } transition duration-200`}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          {tabKey === "projects" ? (
            <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-slate-800 tracking-[0.04em] flex items-center justify-between">
              <span>{label}</span>
              <button
                aria-label="Add project"
                className="h-6 w-6 grid place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="px-2 pt-1 pb-1.5 text-[12px] text-slate-500">{label}</div>
          )}

          <div className="flex flex-col">
            {items.map((t) => {
              const isSelected = selected?.tab === tabKey && selected?.item === t;
              const isHover = hoverItem === t;
              return (
                <button
                  key={t}
                  role="menuitem"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => handleItemClick(t)}
                  onKeyDown={(e) => handleItemKeyDown(e, t)}
                  onMouseEnter={() => setHoverItem(t)}
                  onMouseLeave={() => setHoverItem(null)}
                  onPointerEnter={() => setHoverItem(t)}
                  onPointerLeave={() => setHoverItem(null)}
                  className={`text-left inline-flex items-center group gap-2 w-full rounded-lg px-1.5 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#e8f0fe] text-slate-900 ring-1 ring-[#d2e3fc]"
                      : isHover
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tabKey === "projects" && (
                    <span
                      className={`shrink-0 transition ${
                        isHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="currentColor"
                        stroke="none"
                      >
                        <path d="M8 5l10 7-10 7z" />
                      </svg>
                    </span>
                  )}
                  <span>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// ----------------------------------
// Global Header
// ----------------------------------
const TopHeader = memo(function TopHeader({
  railCollapsed,
  setRailCollapsed,
  mdUp,
}: TopHeaderProps) {
  const leftValue = railCollapsed
    ? mdUp
      ? "calc(0.375rem + 6px + 0.75rem)"
      : "0.375rem"
    : "calc(0.375rem + 3.5rem + 0.75rem)";

  return (
    <div
      className="fixed z-50 h-9 flex items-center group/header"
      style={{
        top: "0.375rem",
        left: leftValue,
        right: "0.375rem",
        transition: "left 260ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div className="w-full px-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left: collapse toggle (appears on header hover) */}
          <div className="h-9 flex items-center justify-start gap-2">
            <button
              onClick={() => setRailCollapsed((v) => !v)}
              className="opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 h-7 w-7 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm"
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {railCollapsed ? (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              )}
            </button>
          </div>

          {/* Center: search + calendar + new */}
          <div className="h-9 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <label className="relative block">
                <span className="absolute inset-y-0 left-2 grid place-items-center">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-400"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-[380px] max-w-[48vw] h-7 rounded-lg border border-slate-200 bg-white/90 pl-8 pr-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/60"
                />
              </label>

              <button
                className="h-7 w-7 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm"
                aria-label="Open calendar"
              >
                <span className="sr-only">Calendar</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-slate-500"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>

              <button className="h-7 px-2.5 rounded-full border border-violet-200 bg-white text-violet-700 text-[12px] font-medium shadow-sm inline-flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New
              </button>
            </div>
          </div>

          {/* Right: account chip */}
          <div className="h-9 flex items-center justify-end pr-1">
            <TeamAvatarMenu />
          </div>
        </div>
      </div>
    </div>
  );
});

// ----------------------------------
// Page Header (inside content)
// ----------------------------------
const PageHeader = memo(function PageHeader({ 
  tabKey, 
  title, 
  selected, 
  projectPanelCollapsed, 
  onToggleProjectPanel 
}: PageHeaderProps) {
  const Icon = ICON_MAP[tabKey] || Home;
  const showCollapseButton = tabKey === "projects" && selected?.tab === "projects";

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 rounded-t-xl">
      <div className="h-10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <span className="truncate text-slate-900 text-[15px] font-medium">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showCollapseButton && onToggleProjectPanel && (
            <button
              onClick={onToggleProjectPanel}
              className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors group"
              aria-label={projectPanelCollapsed ? "Show project panel" : "Hide project panel"}
              title={projectPanelCollapsed ? "Show Files & Whiteboards" : "Hide Files & Whiteboards"}
            >
              {projectPanelCollapsed ? (
                <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ----------------------------------
// Shared Tabs Row
// ----------------------------------
function TabsRow({ tabs, active, onChange }: TabsRowProps) {
  return (
    <div className="-mx-6 px-6 h-7 flex items-end gap-2 text-[13px] border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
      <nav className="flex items-center gap-4">
        {tabs.map(({ key, label, icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-medium leading-none px-1 pt-0 pb-2 -mb-px rounded-none bg-transparent hover:bg-slate-100/60 ${
                isActive
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-700 hover:text-slate-900 border-b-2 border-transparent"
              }`}
            >
              <span className="shrink-0" aria-hidden>
                {icon}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ----------------------------------
// Detail Library View
// ----------------------------------
const DetailLibraryView = memo(function DetailLibraryView() {
  const [category, setCategory] = useState<{ name: string; items: string[] } | null>(null);
  const VIEW_TABS = ["Foundation", "Wall", "Floor/Ceiling", "Roof", "Stair", "Finish"];
  const [viewTab, setViewTab] = useState("Foundation");
  const cards = useMemo(() => (DETAIL_TAB_CARDS[viewTab] || []), [viewTab]);
  useEffect(() => { setCategory(null); }, [viewTab]);

  const libTabs = VIEW_TABS.map((t) => ({
    key: t,
    label: t,
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 7h5l2 2h11v11a2 2 0 0 1-2 2H3z" />
        <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  }));

  return (
    <div className="px-6 pt-1 pb-12">
      <div className="mt-1 mb-3">
        <TabsRow tabs={libTabs} active={viewTab} onChange={setViewTab} />
      </div>

      {!category ? (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <button
              key={c.name}
              className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 text-left hover:shadow-sm hover:border-slate-300 transition"
              onClick={() => setCategory(c)}
            >
              <div className="text-slate-800 font-medium">{c.name}</div>
              <div className="text-[12px] text-slate-500 mt-1">{c.items.length} details</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <button
              onClick={() => setCategory(null)}
              aria-label="Back"
              className="inline-flex items-center h-6 px-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-slate-700">{category.name}</span>
          </div>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden bg-white/80 backdrop-blur-sm">
            {category.items.map((it) => (
              <div key={it} className="flex items-center justify-between px-4 py-3">
                <div className="text-[14px] text-slate-800">{it}</div>
                <div className="text-[12px] text-slate-500">PDF • 1.2MB • Sep 2025</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ----------------------------------
// Chat View - Integrated with database
// ----------------------------------
import TeamChatSlim from './TeamChatSlim';
import { useProjects } from '@/lib/api/hooks/useProjects';

interface ChatViewProps {
  resetTrigger?: number;
}

const ChatView = memo(function ChatView({ resetTrigger }: ChatViewProps) {
  const { currentWorkspaceId } = useWorkspaces();
  const { data: projects = [] } = useProjects(currentWorkspaceId || '');

  const [selectedProject, setSelectedProject] = React.useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState<'chat' | 'files'>('chat');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Reset to home/default chat view when component mounts or resetTrigger changes
  React.useEffect(() => {
    setSelectedProject(null);
    setPage('chat');
  }, [resetTrigger]);

  const handleToggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const handleToggleFiles = () => setPage((prev) => prev === 'chat' ? 'files' : 'chat');

  return (
    <div className="flex h-full w-full">
      <TeamChatSlim
        projects={projects}
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
        onToggleSidebar={handleToggleSidebar}
        onToggleFiles={handleToggleFiles}
        onFileSelect={setSelectedFileId}
        page={page}
        onPageChange={setPage}
        showSidePanel={!sidebarCollapsed}
        workspaceId={currentWorkspaceId || undefined}
      />
    </div>
  );
});

// ----------------------------------
// Home View
// ----------------------------------
const HomeView = memo(function HomeView() {
  const VIEW_TABS = ["Overview", "To Do", "Calendar", "Activity"];
  const [viewTab, setViewTab] = useState("Overview");

  const icon = (t: string) =>
    t === "Overview" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="13" rx="1" />
        <rect x="17" y="13" width="4" height="7" rx="1" />
      </svg>
    ) : t === "To Do" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    ) : t === "Calendar" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 7-6-14-3 7H2" />
      </svg>
    );

  const tabs = VIEW_TABS.map((t) => ({ key: t, label: t, icon: icon(t) }));

  return (
    <div className="px-6 pt-1 pb-12">
      <div className="mt-1 mb-3">
        <TabsRow tabs={tabs} active={viewTab} onChange={setViewTab} />
      </div>

      {/* Simple placeholder body */}
      <div className="mt-3 text-sm text-slate-600">Home content placeholder</div>
    </div>
  );
});

// ----------------------------------
// Tasks View — TanStack Table
// ----------------------------------
const TasksView = memo(function TasksView() {
  const VIEW_TABS = ["List", "Board", "Calendar", "View"];
  const [viewTab, setViewTab] = useState("List");

  // mock tasks
  const data = useMemo(
    () => [
      { id: 1, name: "Task 1", status: "IN PROGRESS", assignee: "", due: "", priority: "P3" },
      { id: 2, name: "Task 2", status: "TASK/REDLINE", assignee: "", due: "", priority: "P3" },
      { id: 3, name: "Task 3", status: "TASK/REDLINE", assignee: "", due: "", priority: "P3" },
    ],
    []
  );

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: () => "Name", cell: (ctx) => ctx.getValue() }),
      columnHelper.accessor("assignee", { header: () => "Assignee", cell: (ctx) => ctx.getValue() || "" }),
      columnHelper.accessor("due", { header: () => "Due date", cell: (ctx) => ctx.getValue() || "" }),
      columnHelper.accessor("priority", { header: () => "Priority", cell: (ctx) => ctx.getValue() }),
    ],
    [columnHelper]
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const groups = useMemo(
    () => [
      { key: "IN PROGRESS", color: "#1e88e5" },
      { key: "TASK/REDLINE", color: "#e53935" },
    ],
    []
  );

  const icon = (t: string) =>
    t === "List" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    ) : t === "Board" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="16" rx="1" />
        <rect x="17" y="4" width="4" height="16" rx="1" />
      </svg>
    ) : t === "Calendar" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  const tabs = VIEW_TABS.map((t) => ({ key: t, label: t, icon: icon(t) }));

  return (
    <div className="px-6 pt-1 pb-12 h-full flex flex-col overflow-hidden">
      {/* Sub-header */}
      <div className="mt-1 mb-3 shrink-0 relative z-10">
        <TabsRow tabs={tabs} active={viewTab} onChange={setViewTab} />

        <div className="-mx-6 px-6 mt-3 mb-0 flex items-center justify-between gap-2 text-[12px] h-6">
          <div className="flex items-center gap-2.5 text-slate-600 font-medium">
            <button className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-200 bg-white">
              Group: Status
            </button>
            <button className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-200 bg-white">
              Subtasks
            </button>
            <button className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-200 bg-white">
              Columns
            </button>
          </div>
          <div className="flex items-center gap-2.5 font-medium">
            <button className="h-6 px-2 rounded border border-slate-200 bg-white inline-flex items-center gap-1">
              Save view
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <button className="h-6 px-2 rounded text-slate-600 hover:bg-slate-100">Filter</button>
            <button className="h-6 px-2 rounded text-slate-600 hover:bg-slate-100">Closed</button>
            <button className="h-6 px-2 rounded text-slate-600 hover:bg-slate-100">Assignee</button>
            <button className="h-6 w-6 rounded-full bg-slate-900 text-white grid place-items-center">A</button>
          </div>
        </div>
      </div>

      {/* Only the board/table area scrolls */}
      <div className="flex-1 min-h-0 overflow-auto pt-3">
        {viewTab === "List" ? (
          <div className="text-[13px]">
            {groups.map((g) => {
              const rows = table
                .getRowModel()
                .rows.filter((r: any) => r.original.status === g.key);

              return (
                <section key={g.key} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ boxShadow: "0 0 0 2px white", backgroundColor: g.color }}
                    />
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-800 px-2.5 py-1 font-medium text-[12px] tracking-wide">
                      {g.key}
                      <span className="text-slate-500">{rows.length}</span>
                    </span>
                  </div>

                  {/* header row */}
                  <div className="grid grid-cols-[minmax(280px,1fr)_160px_160px_120px] px-2 py-2 text-[12px] text-slate-500">
                    {table.getFlatHeaders().map((h) => (
                      <div key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-200">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="grid grid-cols-[minmax(280px,1fr)_160px_160px_120px] px-2 py-3 hover:bg-slate-50"
                      >
                        {r.getVisibleCells().map((cell) => (
                          <div key={cell.id} className="truncate text-slate-800">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    ))}

                    <button className="grid grid-cols-[minmax(280px,1fr)_160px_160px_120px] px-2 py-3 text-left text-slate-600 hover:bg-slate-50">
                      Add Task
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 text-sm text-slate-600">
            {viewTab === "Board" && <div>Board view (placeholder)</div>}
            {viewTab === "Calendar" && <div>Calendar view (placeholder)</div>}
            {viewTab === "View" && <div>Custom view (placeholder)</div>}
          </div>
        )}
      </div>
    </div>
  );
});

// Export components for use in page wrappers
export { 
  RehomeDoubleSidebar as TeamDashboardLayout,
  DetailLibraryView,
  TasksView,
  HomeView,
  ChatView,
  TabsRow,
  TopHeader
};
