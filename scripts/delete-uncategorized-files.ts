// Script to delete all uncategorized files from detail library
// Run this with: npx tsx scripts/delete-uncategorized-files.ts
// Or paste into browser console on the detail library page

import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteUncategorizedFiles() {
  console.log('Fetching uncategorized files...');
  
  // Fetch all uncategorized files (subfolder_id IS NULL and not soft deleted)
  const { data: files, error: fetchError } = await supabase
    .from('detail_library_files')
    .select('id, storage_path, title')
    .is('subfolder_id', null)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Error fetching files:', fetchError);
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

  // Delete files from storage
  const storagePaths = files
    .map(f => f.storage_path)
    .filter(path => path && path.trim() !== ''); // Only delete files with valid storage paths

  if (storagePaths.length > 0) {
    console.log(`\nDeleting ${storagePaths.length} file(s) from storage...`);
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
  console.log(`\nDeleting ${fileIds.length} file record(s) from database...`);
  
  const { error: deleteError } = await supabase
    .from('detail_library_files')
    .delete()
    .in('id', fileIds);

  if (deleteError) {
    console.error('❌ Error deleting files from database:', deleteError);
    return;
  }

  console.log(`✓ Successfully deleted ${fileIds.length} uncategorized file(s) from database`);
  console.log('\nDone!');
}

// Run the script
deleteUncategorizedFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

