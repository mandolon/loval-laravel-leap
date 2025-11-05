import React from 'react';
import { useProject } from '@/lib/api/hooks/useProjects';

interface ProjectInfoProps {
  projectId: string;
}

export default function ProjectInfo({ projectId }: ProjectInfoProps) {
  const { data: project, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500">Loading project information...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-500">Error loading project information</div>
      </div>
    );
  }

  const formatAddress = (address: any): string => {
    if (!address || typeof address !== 'object') return '—';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  const formatClientName = (client: { firstName?: string; lastName?: string } | undefined): string => {
    if (!client) return '—';
    const parts = [client.firstName, client.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full overflow-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-8">{project.name}</h1>

        <div className="space-y-8">
          {/* Basic Information */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Name</label>
                  <div className="mt-1 text-sm text-slate-900">{project.name}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project ID</label>
                  <div className="mt-1 text-sm text-slate-900">{project.shortId}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                  <div className="mt-1 text-sm text-slate-900 capitalize">{project.status}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phase</label>
                  <div className="mt-1 text-sm text-slate-900">{project.phase}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Progress</label>
                  <div className="mt-1 text-sm text-slate-900">{project.progress ?? 0}%</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</label>
                  <div className="mt-1 text-sm text-slate-900">{formatDate(project.dueDate)}</div>
                </div>
              </div>
              {project.description && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</label>
                  <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{project.description}</div>
                </div>
              )}
            </div>
          </section>

          {/* Project Address */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Address</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="text-sm text-slate-900">{formatAddress(project.address)}</div>
            </div>
          </section>

          {/* Primary Client */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Primary Client</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                  <div className="mt-1 text-sm text-slate-900">{formatClientName(project.primaryClient)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                  <div className="mt-1 text-sm text-slate-900">{project.primaryClient?.email || '—'}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
                  <div className="mt-1 text-sm text-slate-900">{project.primaryClient?.phone || '—'}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                  <div className="mt-1 text-sm text-slate-900">{formatAddress(project.primaryClient?.address)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Secondary Client */}
          {project.secondaryClient && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Secondary Client</h2>
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                    <div className="mt-1 text-sm text-slate-900">{formatClientName(project.secondaryClient)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                    <div className="mt-1 text-sm text-slate-900">{project.secondaryClient?.email || '—'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
                    <div className="mt-1 text-sm text-slate-900">{project.secondaryClient?.phone || '—'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                    <div className="mt-1 text-sm text-slate-900">{formatAddress(project.secondaryClient?.address)}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Financial Information */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Information</h2>
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estimated Amount</label>
                  <div className="mt-1 text-sm text-slate-900">{formatCurrency(project.estimatedAmount)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Assessor Parcel Info */}
          {project.assessorParcelInfo && Object.keys(project.assessorParcelInfo).length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Assessor Parcel Information</h2>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="text-sm text-slate-900">
                  <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(project.assessorParcelInfo, null, 2)}</pre>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

