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

    console.log('Deleting user record...');
    
    // Delete main user record - database will handle the rest via SET NULL constraints
    // All user content (projects, tasks, files, messages, etc.) will be preserved
    // Memberships, preferences, and roles will cascade delete automatically
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log('Deleting auth record...');
    
    // Delete from auth.users if auth_id exists
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
