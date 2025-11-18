import { useState, useEffect, useRef } from 'react';
import { Project, ProjectAIIdentity } from '@/lib/api/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AIContextPanelProps {
  project: Project;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onUpdate: (data: ProjectAIIdentity) => void;
}

// Helper component for tag input
function SimpleTagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      onChange([...value, input.trim()]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleAdd}
          type="button"
          className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <div
              key={i}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-blue-600 hover:text-blue-900"
              >
                ×
              </button>
            </div>
          ))}
        </div>
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
  const [data, setData] = useState<ProjectAIIdentity>(() => {
    // Pre-fill from existing project data
    const existingAddress = project.address;
    const jurisdiction = existingAddress?.city && existingAddress?.state
      ? `${existingAddress.city}, ${existingAddress.state}`
      : '';

    // Parse lot area from assessor info if available
    const lotSize = project.assessorParcelInfo?.lotArea
      ? parseInt(project.assessorParcelInfo.lotArea.replace(/,/g, '')) || 0
      : 0;

    const zoning = project.assessorParcelInfo?.zoningDesignation || '';

    // Load saved ai_identity if it exists, otherwise create from template
    const savedIdentity = (project.ai_identity as ProjectAIIdentity) || {} as ProjectAIIdentity;

    return {
      projectType: savedIdentity.projectType || project.project_type || '',
      jurisdiction: savedIdentity.jurisdiction || jurisdiction,
      projectScope: savedIdentity.projectScope || project.description || '',

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
  });

  const handleSave = () => {
    onUpdate(data);
  };

  const typeInfo = PROJECT_TYPE_INFO[data.projectType as keyof typeof PROJECT_TYPE_INFO];

  return (
    <div className="space-y-6">
      {/* TAB 1: PROJECT DETAILS */}
      {activeTab === 'details' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
              <CardDescription>Auto-filled from project data, edit to customize</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Type</label>
                  <select
                    value={data.projectType}
                    onChange={(e) => setData({ ...data, projectType: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select type...</option>
                    <option value="adu">ADU (Accessory Dwelling Unit)</option>
                    <option value="remodel">Remodel / Renovation</option>
                    <option value="addition">Addition</option>
                    <option value="new_construction">New Construction</option>
                    <option value="historic">Historic Preservation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={data.jurisdiction}
                    onChange={(e) => setData({ ...data, jurisdiction: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project Scope</label>
                <p className="text-xs text-gray-600 mb-2">
                  Detailed description of what's being built or changed
                </p>
                <textarea
                  value={data.projectScope}
                  onChange={(e) => setData({ ...data, projectScope: e.target.value })}
                  placeholder="e.g., 500 SF modern ADU addition with wood frame, passive solar orientation, ground floor bedroom/bath"
                  rows={4}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              {typeInfo && (
                <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm space-y-1">
                  <p>
                    <strong>Typical Timeline:</strong> {typeInfo.timeline} days
                  </p>
                  {typeInfo.consultants.length > 0 && (
                    <p>
                      <strong>Typical Consultants:</strong> {typeInfo.consultants.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: REGULATORY */}
      {activeTab === 'regulatory' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zoning & Physical Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Zoning</label>
                  <input
                    type="text"
                    value={data.zoning}
                    onChange={(e) => setData({ ...data, zoning: e.target.value })}
                    placeholder="e.g., RH-2, R-1"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height Limit (ft)</label>
                  <input
                    type="number"
                    value={data.heightLimit || ''}
                    onChange={(e) =>
                      setData({ ...data, heightLimit: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Lot Size (SF)</label>
                  <input
                    type="number"
                    value={data.lotSize || ''}
                    onChange={(e) =>
                      setData({ ...data, lotSize: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Existing Sqft</label>
                  <input
                    type="number"
                    value={data.existingSqft || ''}
                    onChange={(e) =>
                      setData({ ...data, existingSqft: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proposed Sqft</label>
                  <input
                    type="number"
                    value={data.proposedSqft || ''}
                    onChange={(e) =>
                      setData({ ...data, proposedSqft: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Setbacks (ft)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Front</label>
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
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Side</label>
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
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Rear</label>
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
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance & Consultants</CardTitle>
              <CardDescription>Which codes and specialists apply to this project?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Required Compliance</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'title_24', label: 'Title 24 (Energy Code)' },
                    { value: 'local_zoning', label: 'Local Zoning Compliance' },
                    { value: 'accessibility', label: 'Accessibility (ADA)' },
                    { value: 'fire_safety', label: 'Fire Safety Code' },
                    { value: 'seismic', label: 'Seismic Requirements' },
                    { value: 'environmental', label: 'Environmental Review' },
                  ].map((item) => (
                    <label key={item.value} className="flex items-center gap-2 text-sm">
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
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Required Consultants</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'structural_engineer', label: 'Structural Engineer' },
                    { value: 'energy_consultant', label: 'Energy Consultant' },
                    { value: 'mep_engineer', label: 'MEP Engineer' },
                    { value: 'civil_engineer', label: 'Civil Engineer' },
                    { value: 'landscape_architect', label: 'Landscape Architect' },
                    { value: 'geotechnical_engineer', label: 'Geotechnical Engineer' },
                  ].map((item) => (
                    <label key={item.value} className="flex items-center gap-2 text-sm">
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
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: CURRENT STATUS */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next Steps & Blockers</CardTitle>
              <CardDescription>
                Track immediate action items and current obstacles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Immediate Next Steps</label>
                <SimpleTagInput
                  value={data.nextSteps}
                  onChange={(steps) => setData({ ...data, nextSteps: steps })}
                  placeholder="e.g., Structural calculations, site survey, Title 24 analysis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Current Blockers</label>
                <SimpleTagInput
                  value={data.blockers}
                  onChange={(blockers) => setData({ ...data, blockers })}
                  placeholder="e.g., Waiting on surveyor report, unclear zoning interpretation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Open Questions</label>
                <SimpleTagInput
                  value={data.openQuestions}
                  onChange={(questions) => setData({ ...data, openQuestions: questions })}
                  placeholder="e.g., Final material selections, roof type, structural system"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
          Save Project Context
        </Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </div>
  );
}
