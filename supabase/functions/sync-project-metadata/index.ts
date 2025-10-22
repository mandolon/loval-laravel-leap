import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function generateProjectMetadata(project: any): string {
  const formatAddress = (addr: any) => {
    if (!addr) return 'No address';
    const parts = [addr.streetNumber, addr.streetName, addr.city, addr.state, addr.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  };

  return `---
title: ${project.name || 'Untitled Project'}
shortId: ${project.short_id}
phase: ${project.phase}
status: ${project.status}
progress: ${project.progress || 0}%
budget: $${project.estimated_amount || 0}
dueDate: ${project.due_date || 'N/A'}
---

# ${project.name || 'Untitled Project'}

**Project ID:** ${project.short_id}
**Status:** ${project.status}
**Phase:** ${project.phase}
**Progress:** ${project.progress || 0}%

## Location
${formatAddress(project.address)}

## Primary Client
${project.primary_client_first_name || ''} ${project.primary_client_last_name || ''}
Email: ${project.primary_client_email || 'N/A'}
Phone: ${project.primary_client_phone || 'N/A'}

## Secondary Client
${project.secondary_client_first_name || ''} ${project.secondary_client_last_name || ''}
Email: ${project.secondary_client_email || 'N/A'}
Phone: ${project.secondary_client_phone || 'N/A'}

## Budget & Timeline
**Budget:** $${project.estimated_amount || 0}
**Due Date:** ${project.due_date || 'N/A'}

## Project Folders
- Pre-Design
- Design
- Permit
- Build
- Plans
- Photos
- Attachments

Last Updated: ${new Date().toISOString()}
`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, userId } = await req.json();

    console.log('[sync-project-metadata] Request:', { projectId, userId });

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[sync-project-metadata] Project error:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync-project-metadata] Project found:', project.name);

    // Generate metadata
    const metadata = generateProjectMetadata(project);

    // Get Pre-Design folder
    const { data: preDesignFolder } = await supabase
      .from('folders')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', 'Pre-Design')
      .maybeSingle();

    if (!preDesignFolder) {
      console.error('[sync-project-metadata] Pre-Design folder not found');
      return new Response(
        JSON.stringify({ error: 'Pre-Design folder not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if metadata file exists
    const { data: existingFile } = await supabase
      .from('files')
      .select('id, version_number')
      .eq('project_id', projectId)
      .eq('filename', 'project.meta.md')
      .maybeSingle();

    let fileData: any;

    if (existingFile) {
      console.log('[sync-project-metadata] Updating existing file:', existingFile.id);
      
      // Update existing file
      const newVersion = (existingFile.version_number || 0) + 1;
      
      const { data, error } = await supabase
        .from('files')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFile.id)
        .select()
        .single();

      if (error) {
        console.error('[sync-project-metadata] Update error:', error);
        throw error;
      }
      
      fileData = data;
      console.log('[sync-project-metadata] File updated to version', newVersion);
    } else {
      console.log('[sync-project-metadata] Creating new file');
      
      // Generate storage path
      const storagePath = `${projectId}/Pre-Design/project.meta.md`;
      
      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, metadata, {
          contentType: 'text/markdown',
          upsert: true
        });

      if (storageError) {
        console.error('[sync-project-metadata] Storage error:', storageError);
        throw storageError;
      }

      // Create file record
      const size = new Blob([metadata]).size;
      const { data, error } = await supabase
        .from('files')
        .insert({
          project_id: projectId,
          folder_id: preDesignFolder.id,
          filename: 'project.meta.md',
          storage_path: storagePath,
          mimetype: 'text/markdown',
          filesize: size,
          uploaded_by: userId,
          version_number: 1
        })
        .select()
        .single();

      if (error) {
        console.error('[sync-project-metadata] Insert error:', error);
        throw error;
      }
      
      fileData = data;
      console.log('[sync-project-metadata] File created:', fileData.id);
    }

    // Log activity
    if (userId) {
      await supabase.from('activity_log').insert({
        workspace_id: project.workspace_id,
        project_id: projectId,
        user_id: userId,
        action: existingFile ? 'updated' : 'created',
        resource_type: 'file',
        resource_id: fileData.id,
        change_summary: 'Synced project metadata from Excel tab',
        created_at: new Date().toISOString()
      });
      console.log('[sync-project-metadata] Activity logged');
    }

    return new Response(
      JSON.stringify({
        success: true,
        file: fileData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[sync-project-metadata] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
