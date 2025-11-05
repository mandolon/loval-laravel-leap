// Browser Console Script - Paste this into your browser console on the detail library page
// This will delete ALL uncategorized files (files without a subfolder_id)

(async function deleteUncategorizedFiles() {
  // Get supabase client from the app
  const supabaseModule = await import('/src/integrations/supabase/client.ts');
  const supabase = supabaseModule.supabase;
  
  console.log('🔍 Fetching uncategorized files...');
  
  // Fetch all uncategorized files (subfolder_id IS NULL and not soft deleted)
  const { data: files, error: fetchError } = await supabase
    .from('detail_library_files')
    .select('id, storage_path, title')
    .is('subfolder_id', null)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('❌ Error fetching files:', fetchError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('✓ No uncategorized files found.');
    return;
  }

  console.log(`Found ${files.length} uncategorized file(s):`);
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.title} (${file.id})`);
  });

  // Confirm deletion
  const confirmed = confirm(`Are you sure you want to delete ${files.length} uncategorized file(s)?\n\nThis action cannot be undone.`);
  if (!confirmed) {
    console.log('❌ Deletion cancelled.');
    return;
  }

  // Delete files from storage
  const storagePaths = files
    .map(f => f.storage_path)
    .filter(path => path && path.trim() !== ''); // Only delete files with valid storage paths

  if (storagePaths.length > 0) {
    console.log(`\n🗑️  Deleting ${storagePaths.length} file(s) from storage...`);
    const { error: storageError } = await supabase.storage
      .from('detail-library')
      .remove(storagePaths);

    if (storageError) {
      console.error('⚠️  Error deleting files from storage:', storageError);
      console.error('Continuing with database deletion...');
    } else {
      console.log(`✓ ${storagePaths.length} file(s) deleted from storage`);
    }
  } else {
    console.log('No files to delete from storage (all are placeholders)');
  }

  // Hard delete from database
  const fileIds = files.map(f => f.id);
  console.log(`\n🗑️  Deleting ${fileIds.length} file record(s) from database...`);
  
  const { error: deleteError } = await supabase
    .from('detail_library_files')
    .delete()
    .in('id', fileIds);

  if (deleteError) {
    console.error('❌ Error deleting files from database:', deleteError);
    return;
  }

  console.log(`✓ Successfully deleted ${fileIds.length} uncategorized file(s) from database`);
  console.log('\n✅ Done! Refresh the page to see the changes.');
})();

