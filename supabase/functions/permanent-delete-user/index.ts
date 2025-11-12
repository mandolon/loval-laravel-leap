import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('auth_id', user.id)
      .single();

    if (!adminCheck?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Starting permanent deletion for user:', userId);

    // Get user's auth_id before deletion
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    const authId = userData?.auth_id;

    // SIMPLIFIED DELETION: Keep all user-created content (projects, tasks, files, messages, etc.)
    // Only delete user-specific records and the user itself
    
    console.log('Step 1: Deleting user-specific data (read receipts, memberships)...');
    
    // 1. Delete user-specific tracking data (not content)
    await supabaseAdmin.from('chat_read_receipts').delete().eq('user_id', userId);
    
    // 2. Delete memberships (not the content they created)
    await supabaseAdmin.from('project_members').delete().eq('user_id', userId);
    await supabaseAdmin.from('workspace_members').delete().eq('user_id', userId);

    console.log('Step 2: Deleting user metadata...');
    
    // 3. Delete user metadata
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_preferences').delete().eq('user_id', userId);

    console.log('Step 3: Deleting main user record...');
    
    // 4. Delete main user record
    await supabaseAdmin.from('users').delete().eq('id', userId);

    console.log('Step 4: Deleting auth record...');
    
    // 5. Delete from auth.users if auth_id exists
    if (authId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authId);
        console.log('Deleted auth user:', authId);
      } catch (authDeleteError) {
        console.error('Failed to delete auth user:', authDeleteError);
        // Continue even if auth deletion fails
      }
    }
    
    console.log('User deletion completed. All user-created content (projects, files, messages, etc.) has been preserved.');

    console.log('Permanent deletion completed for user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User permanently deleted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in permanent-delete-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
