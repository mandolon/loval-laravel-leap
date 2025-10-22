import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useProject } from '@/lib/api/hooks/useProjects';
import { EditableCell } from './EditableCell';
import { toast } from 'sonner';

interface MetadataRow {
  field: string;
  label: string;
  value: any;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select';
  editable: boolean;
  selectOptions?: string[];
}

const METADATA_FIELDS: Omit<MetadataRow, 'value'>[] = [
  { field: 'name', label: 'Project Name', type: 'text', editable: true },
  
  // Address
  { field: 'address.streetNumber', label: 'Street Number', type: 'text', editable: true },
  { field: 'address.streetName', label: 'Street Name', type: 'text', editable: true },
  { field: 'address.city', label: 'City', type: 'text', editable: true },
  { field: 'address.state', label: 'State', type: 'text', editable: true },
  { field: 'address.zipCode', label: 'Zip Code', type: 'text', editable: true },
  
  // Primary Client
  { field: 'primaryClient.firstName', label: 'Primary Client First', type: 'text', editable: true },
  { field: 'primaryClient.lastName', label: 'Primary Client Last', type: 'text', editable: true },
  { field: 'primaryClient.email', label: 'Primary Client Email', type: 'email', editable: true },
  { field: 'primaryClient.phone', label: 'Primary Client Phone', type: 'phone', editable: true },
  
  // Secondary Client
  { field: 'secondaryClient.firstName', label: 'Secondary Client First', type: 'text', editable: true },
  { field: 'secondaryClient.lastName', label: 'Secondary Client Last', type: 'text', editable: true },
  { field: 'secondaryClient.email', label: 'Secondary Client Email', type: 'email', editable: true },
  { field: 'secondaryClient.phone', label: 'Secondary Client Phone', type: 'phone', editable: true },
  
  // Project Details
  { field: 'estimatedAmount', label: 'Budget', type: 'number', editable: true },
  { field: 'dueDate', label: 'Due Date', type: 'date', editable: true },
  { field: 'phase', label: 'Phase', type: 'select', editable: true, selectOptions: ['Pre-Design', 'Design', 'Permit', 'Build'] },
  { field: 'status', label: 'Status', type: 'select', editable: true, selectOptions: ['pending', 'active', 'completed', 'archived'] },
  { field: 'progress', label: 'Progress %', type: 'number', editable: true }
];

export function ExcelTab({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: project, isLoading } = useProject(projectId);

  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Helper: Get nested value
  function getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  // Helper: Set nested value
  function setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = current[keys[i]] || {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Populate rows on project load
  useEffect(() => {
    if (project) {
      const populated = METADATA_FIELDS.map(field => ({
        ...field,
        value: getNestedValue(project, field.field)
      }));
      setRows(populated);
      setHasChanges(false);
    }
  }, [project]);

  // Handle cell edit
  function handleCellChange(fieldName: string, newValue: any) {
    setRows(rows.map(row =>
      row.field === fieldName ? { ...row, value: newValue } : row
    ));
    setHasChanges(true);
  }

  // Save to database
  async function handleSave() {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsSaving(true);
    try {
      // Build updates object from rows - convert nested Project type back to flat database columns
      const updates: any = {};
      rows.forEach(row => {
        if (row.field.startsWith('primaryClient.')) {
          // Convert primaryClient.firstName -> primary_client_first_name
          const clientField = row.field.replace('primaryClient.', '');
          const dbField = `primary_client_${clientField.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
          updates[dbField] = row.value;
        } else if (row.field.startsWith('secondaryClient.')) {
          // Convert secondaryClient.firstName -> secondary_client_first_name
          const clientField = row.field.replace('secondaryClient.', '');
          const dbField = `secondary_client_${clientField.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
          updates[dbField] = row.value;
        } else if (row.field === 'estimatedAmount') {
          updates.estimated_amount = row.value;
        } else if (row.field === 'dueDate') {
          updates.due_date = row.value;
        } else if (row.field.includes('.')) {
          // Handle other nested fields (e.g., address.streetNumber)
          const parts = row.field.split('.');
          if (!updates[parts[0]]) {
            updates[parts[0]] = {};
          }
          updates[parts[0]][parts[1]] = row.value;
        } else {
          updates[row.field] = row.value;
        }
      });

      // Add metadata
      updates.updated_by = user.id;
      updates.updated_at = new Date().toISOString();

      // Update database
      const { error: updateError } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Sync metadata file
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-project-metadata', {
          body: { projectId, userId: user.id }
        });
        
        if (syncError) {
          console.warn('Metadata sync warning:', syncError);
        }
      } catch (syncError) {
        console.warn('Metadata sync warning:', syncError);
        // Don't fail if metadata sync has issues
      }

      // Refresh project query
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      setHasChanges(false);
      toast.success('Project saved! Metadata updated for AI.');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Project Data</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edit project information. AI will see these values in metadata.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">● Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save to Database'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-sm text-foreground w-1/3">Field</th>
              <th className="text-left px-4 py-3 font-semibold text-sm text-foreground">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.field}
                className={`border-b border-border hover:bg-muted/50 transition-colors ${
                  idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                }`}
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-sm">
                  {row.editable ? (
                    <EditableCell
                      type={row.type}
                      value={row.value}
                      onChange={(val) => handleCellChange(row.field, val)}
                      selectOptions={row.selectOptions}
                    />
                  ) : (
                    <span className="text-muted-foreground">{row.value}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1 mt-6 bg-muted/50 p-3 rounded">
        <p>ℹ️ Edit fields directly in the table</p>
        <p>ℹ️ Click "Save to Database" to sync changes</p>
        <p>ℹ️ Project metadata file regenerates automatically</p>
        <p>ℹ️ AI assistant will see updated values in next conversation</p>
      </div>
    </div>
  );
}
