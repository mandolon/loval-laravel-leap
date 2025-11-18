import { useState, useEffect, useRef } from 'react';
import { Project, ProjectAIIdentity } from '@/lib/api/types';

// Constants matching ProjectInfoContent styles
const INPUT =
  "w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 placeholder:text-slate-400 placeholder:text-[13px] px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const SELECT =
  "w-full h-8 rounded-lg border bg-white text-[13px] text-slate-800 px-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
const TEXTAREA =
  "w-full min-h-[140px] rounded-lg border bg-white text-[13px] text-slate-800 p-3 outline-none transition border-slate-200 hover:border-slate-300 focus:border-[#00639b] focus:ring-1 focus:ring-[#9ecafc] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

// EditBar Component - matching ProjectInfoContent
function EditBar({ 
  editing, 
  onStart, 
  onCancel, 
  onSave,
  isSaving
}: { 
  editing: boolean; 
  onStart: () => void; 
  onCancel: () => void; 
  onSave: () => void;
  isSaving?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-end gap-2">
      {!editing ? (
        <button 
          onClick={onStart} 
          className="h-8 px-3 rounded-lg border border-transparent bg-amber-400 hover:bg-amber-500 text-slate-900 text-[13px] font-medium"
        >
          Edit
        </button>
      ) : (
        <>
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg border bg-white text-[13px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg border border-amber-400 bg-amber-400 hover:bg-amber-500 text-slate-900 text-[13px] font-medium disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  );
}

interface AIContextPanelProps {
  project: Project;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onUpdate: (data: ProjectAIIdentity) => Promise<void>;
}

// Helper component for tag input
function SimpleTagInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim() && !disabled) {
      onChange([...value, input.trim()]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      {!disabled && (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`${INPUT} flex-1 border-slate-400 focus:border-slate-500 focus:ring-slate-300`}
          />
          <button
            onClick={handleAdd}
            type="button"
            className="h-8 px-3 rounded-lg border bg-white text-[13px] hover:bg-slate-50 border-slate-200"
          >
            Add
          </button>
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <div
              key={i}
              className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="text-slate-600 hover:text-slate-900 ml-1"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {value.length === 0 && disabled && (
        <div className="text-sm text-slate-500 italic">No items added yet</div>
      )}
    </div>
  );
}

const PROJECT_TYPE_INFO: Record<string, { timeline: number; consultants: string[] }> = {
  adu: {
    timeline: 120,
    consultants: ['Structural Engineer', 'Energy Consultant'],
  },
  remodel: {
    timeline: 90,
    consultants: ['Structural Engineer', 'Energy Consultant'],
  },
  addition: {
    timeline: 110,
    consultants: ['Structural Engineer', 'Energy Consultant'],
  },
  new_construction: {
    timeline: 150,
    consultants: ['Structural Engineer', 'MEP Engineer', 'Civil Engineer', 'Energy Consultant'],
  },
};

export function AIContextPanel({ project, activeTab = 'details', onTabChange, onUpdate }: AIContextPanelProps) {
  // Helper function to initialize data from project
  const initializeData = (proj: Project): ProjectAIIdentity => {
    const existingAddress = proj.address;
    const jurisdiction = existingAddress?.city && existingAddress?.state
      ? `${existingAddress.city}, ${existingAddress.state}`
      : '';

    // Parse lot area from assessor info if available
    const lotSize = proj.assessorParcelInfo?.lotArea
      ? parseInt(proj.assessorParcelInfo.lotArea.replace(/,/g, '')) || 0
      : 0;

    const zoning = proj.assessorParcelInfo?.zoningDesignation || '';

    // Load saved ai_identity if it exists, otherwise create from template
    const savedIdentity = (proj.ai_identity as ProjectAIIdentity) || {} as ProjectAIIdentity;

    return {
      projectType: savedIdentity.projectType || proj.project_type || '',
      jurisdiction: savedIdentity.jurisdiction || jurisdiction,
      projectScope: savedIdentity.projectScope || proj.description || '',

      zoning: savedIdentity.zoning || zoning,
      lotSize: savedIdentity.lotSize || lotSize,
      existingSqft: savedIdentity.existingSqft || 0,
      proposedSqft: savedIdentity.proposedSqft || 0,
      setbacks: savedIdentity.setbacks || { front: 0, rear: 0, side: 0 },
      heightLimit: savedIdentity.heightLimit || 0,

      requiredCompliance: savedIdentity.requiredCompliance || ['title_24', 'local_zoning'],
      requiredConsultants: savedIdentity.requiredConsultants || [],

      nextSteps: savedIdentity.nextSteps || [],
      blockers: savedIdentity.blockers || [],
      openQuestions: savedIdentity.openQuestions || [],
    };
  };

  const [data, setData] = useState<ProjectAIIdentity>(() => initializeData(project));
  const prevProjectIdRef = useRef<string | undefined>(project?.id);
  const backup = useRef<ProjectAIIdentity>(initializeData(project));

  // Sync state when project changes (different project selected)
  useEffect(() => {
    // Update state when switching to a different project
    if (project?.id && project.id !== prevProjectIdRef.current) {
      prevProjectIdRef.current = project.id;
      const newData = initializeData(project);
      setData(newData);
      backup.current = newData;
    }
  }, [project?.id]);

  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(data);
      setEditing(false);
    } catch (error) {
      console.error('Error saving AI context:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setData(backup.current);
    setEditing(false);
  };

  const handleStartEdit = () => {
    backup.current = { ...data };
    setEditing(true);
  };

  const typeInfo = PROJECT_TYPE_INFO[data.projectType as keyof typeof PROJECT_TYPE_INFO];

  return (
    <div onKeyDown={(e) => {
      if (!editing) return;
      if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    }}>
      <EditBar
        editing={editing}
        onStart={handleStartEdit}
        onCancel={handleCancel}
        onSave={handleSave}
        isSaving={isSaving}
      />
      
      {/* TAB 1: PROJECT DETAILS */}
      {activeTab === 'details' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Project Type</label>
            {editing ? (
              <select
                value={data.projectType}
                onChange={(e) => setData({ ...data, projectType: e.target.value })}
                className={`${SELECT} border-slate-400 focus:border-slate-500 focus:ring-slate-300`}
              >
                <option value="">Select type...</option>
                <option value="adu">ADU (Accessory Dwelling Unit)</option>
                <option value="remodel">Remodel / Renovation</option>
                <option value="addition">Addition</option>
                <option value="new_construction">New Construction</option>
                <option value="historic">Historic Preservation</option>
              </select>
            ) : (
              <div className="w-full h-8 rounded-lg border bg-slate-50 text-[13px] text-slate-600 px-3 leading-8 border-slate-200">
                {data.projectType ? data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1).replace('_', ' ') : 'Not set'}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Jurisdiction</label>
            <input
              type="text"
              value={data.jurisdiction}
              onChange={(e) => setData({ ...data, jurisdiction: e.target.value })}
              placeholder="e.g., San Francisco, CA"
              readOnly={!editing}
              className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Project Scope</label>
            <textarea
              value={data.projectScope}
              onChange={(e) => setData({ ...data, projectScope: e.target.value })}
              placeholder="e.g., 500 SF modern ADU addition with wood frame, passive solar orientation, ground floor bedroom/bath"
              readOnly={!editing}
              className={`${TEXTAREA} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
            />
          </div>

          {typeInfo && (
            <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">
                <strong className="text-slate-900">Typical Timeline:</strong> {typeInfo.timeline} days
              </div>
              {typeInfo.consultants.length > 0 && (
                <div className="text-sm text-slate-600">
                  <strong className="text-slate-900">Typical Consultants:</strong> {typeInfo.consultants.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGULATORY */}
      {activeTab === 'regulatory' && (
        <div>
          <div className="mb-4 grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-900 mb-1">Zoning</label>
              <input
                type="text"
                value={data.zoning}
                onChange={(e) => setData({ ...data, zoning: e.target.value })}
                placeholder="e.g., RH-2, R-1"
                readOnly={!editing}
                className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-900 mb-1">Height Limit (ft)</label>
              <input
                type="number"
                value={data.heightLimit || ''}
                onChange={(e) =>
                  setData({ ...data, heightLimit: parseInt(e.target.value) || 0 })
                }
                readOnly={!editing}
                className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
              />
            </div>
          </div>

          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-900 mb-1">Lot Size (SF)</label>
              <input
                type="number"
                value={data.lotSize || ''}
                onChange={(e) =>
                  setData({ ...data, lotSize: parseInt(e.target.value) || 0 })
                }
                readOnly={!editing}
                className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-900 mb-1">Existing Sqft</label>
              <input
                type="number"
                value={data.existingSqft || ''}
                onChange={(e) =>
                  setData({ ...data, existingSqft: parseInt(e.target.value) || 0 })
                }
                readOnly={!editing}
                className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-900 mb-1">Proposed Sqft</label>
              <input
                type="number"
                value={data.proposedSqft || ''}
                onChange={(e) =>
                  setData({ ...data, proposedSqft: parseInt(e.target.value) || 0 })
                }
                readOnly={!editing}
                className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Setbacks (ft)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Front</label>
                <input
                  type="number"
                  value={data.setbacks.front || ''}
                  onChange={(e) =>
                    setData({
                      ...data,
                      setbacks: {
                        ...data.setbacks,
                        front: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  readOnly={!editing}
                  className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Side</label>
                <input
                  type="number"
                  value={data.setbacks.side || ''}
                  onChange={(e) =>
                    setData({
                      ...data,
                      setbacks: {
                        ...data.setbacks,
                        side: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  readOnly={!editing}
                  className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Rear</label>
                <input
                  type="number"
                  value={data.setbacks.rear || ''}
                  onChange={(e) =>
                    setData({
                      ...data,
                      setbacks: {
                        ...data.setbacks,
                        rear: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  readOnly={!editing}
                  className={`${INPUT} ${!editing ? 'bg-slate-50 text-slate-600 hover:border-slate-200 focus:ring-0 focus:border-slate-200' : 'border-slate-400 focus:border-slate-500 focus:ring-slate-300'}`}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Required Compliance</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'title_24', label: 'Title 24 (Energy Code)' },
                { value: 'local_zoning', label: 'Local Zoning Compliance' },
                { value: 'accessibility', label: 'Accessibility (ADA)' },
                { value: 'fire_safety', label: 'Fire Safety Code' },
                { value: 'seismic', label: 'Seismic Requirements' },
                { value: 'environmental', label: 'Environmental Review' },
              ].map((item) => (
                <label key={item.value} className="flex items-center gap-2 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    checked={data.requiredCompliance.includes(item.value)}
                    onChange={(e) =>
                      setData({
                        ...data,
                        requiredCompliance: e.target.checked
                          ? [...data.requiredCompliance, item.value]
                          : data.requiredCompliance.filter((c) => c !== item.value),
                      })
                    }
                    disabled={!editing}
                    className="disabled:opacity-50"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Required Consultants</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'structural_engineer', label: 'Structural Engineer' },
                { value: 'energy_consultant', label: 'Energy Consultant' },
                { value: 'mep_engineer', label: 'MEP Engineer' },
                { value: 'civil_engineer', label: 'Civil Engineer' },
                { value: 'landscape_architect', label: 'Landscape Architect' },
                { value: 'geotechnical_engineer', label: 'Geotechnical Engineer' },
              ].map((item) => (
                <label key={item.value} className="flex items-center gap-2 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    checked={data.requiredConsultants.includes(item.value)}
                    onChange={(e) =>
                      setData({
                        ...data,
                        requiredConsultants: e.target.checked
                          ? [...data.requiredConsultants, item.value]
                          : data.requiredConsultants.filter((c) => c !== item.value),
                      })
                    }
                    disabled={!editing}
                    className="disabled:opacity-50"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURRENT STATUS */}
      {activeTab === 'status' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Immediate Next Steps</label>
            <SimpleTagInput
              value={data.nextSteps}
              onChange={(steps) => setData({ ...data, nextSteps: steps })}
              placeholder="e.g., Structural calculations, site survey, Title 24 analysis"
              disabled={!editing}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Current Blockers</label>
            <SimpleTagInput
              value={data.blockers}
              onChange={(blockers) => setData({ ...data, blockers })}
              placeholder="e.g., Waiting on surveyor report, unclear zoning interpretation"
              disabled={!editing}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-900 mb-1">Open Questions</label>
            <SimpleTagInput
              value={data.openQuestions}
              onChange={(questions) => setData({ ...data, openQuestions: questions })}
              placeholder="e.g., Final material selections, roof type, structural system"
              disabled={!editing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
