import { supabase } from "@/integrations/supabase/client";

export interface ProjectFile {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  lastModified: string;
  version: number;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Read a file from a project
 * Returns string for text files, Blob for binary
 */
export async function readProjectFile(
  projectId: string,
  filePath: string
): Promise<{ content: string | Blob; mimetype: string } | null> {
  try {
    const storagePath = `${projectId}/${filePath}`;

    // Download from storage
    const { data, error } = await supabase.storage
      .from("project-files")
      .download(storagePath);

    if (error || !data) {
      console.error("File read error:", error);
      return null;
    }

    // Get file metadata for mimetype
    const { data: fileRecord } = await supabase
      .from("files")
      .select("mimetype")
      .eq("storage_path", storagePath)
      .single();

    const mimetype = fileRecord?.mimetype || "application/octet-stream";

    // Return as text or Blob based on type
    if (
      ["text/plain", "text/markdown", "application/json", "text/csv"].includes(mimetype)
    ) {
      const content = await data.text();
      return { content, mimetype };
    }

    return { content: data, mimetype };
  } catch (error) {
    console.error("Failed to read file:", error);
    return null;
  }
}

/**
 * List all files in a project
 */
export async function listProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data: files, error } = await supabase
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("folder_id")
    .order("created_at");

  if (error || !files) return [];

  return files.map(f => ({
    id: f.id,
    filename: f.filename,
    path: f.storage_path,
    size: f.filesize || 0,
    mimetype: f.mimetype || "application/octet-stream",
    lastModified: f.updated_at,
    version: f.version_number || 1
  }));
}

/**
 * List files in a specific folder
 */
export async function listFolderFiles(
  projectId: string,
  folder: string
): Promise<ProjectFile[]> {
  // Get folder ID
  const { data: folderRecord } = await supabase
    .from("folders")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", folder)
    .single();

  if (!folderRecord) return [];

  // Get files in folder
  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("folder_id", folderRecord.id)
    .is("deleted_at", null)
    .order("created_at");

  if (!files) return [];

  return files.map(f => ({
    id: f.id,
    filename: f.filename,
    path: f.storage_path,
    size: f.filesize || 0,
    mimetype: f.mimetype || "application/octet-stream",
    lastModified: f.updated_at,
    version: f.version_number || 1
  }));
}

/**
 * Get file by ID
 */
export async function getFile(fileId: string): Promise<ProjectFile | null> {
  const { data: file, error } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (error || !file) return null;

  return {
    id: file.id,
    filename: file.filename,
    path: file.storage_path,
    size: file.filesize || 0,
    mimetype: file.mimetype || "application/octet-stream",
    lastModified: file.updated_at,
    version: file.version_number || 1
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Save a new file to project
 */
export async function saveProjectFile(
  projectId: string,
  filename: string,
  content: string | Blob,
  folder: string,
  userId: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    // Get or create folder
    let { data: folderRecord } = await supabase
      .from("folders")
      .select("id")
      .eq("project_id", projectId)
      .eq("name", folder)
      .single();

    if (!folderRecord) {
      const createFolderResult = await supabase
        .from("folders")
        .insert({
          project_id: projectId,
          name: folder,
          is_system_folder: true,
          path: `/${folder}`,
          created_by: userId
        })
        .select()
        .single();

      if (createFolderResult.error) {
        return {
          success: false,
          error: `Failed to create folder: ${createFolderResult.error.message}`
        };
      }

      folderRecord = createFolderResult.data;
    }

    // Upload to storage
    const storagePath = `${projectId}/${folder}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(storagePath, content, { upsert: false });

    if (uploadError) {
      // If file exists, return error
      if (uploadError.message.includes("already exists")) {
        return {
          success: false,
          error: `File "${filename}" already exists in ${folder}`
        };
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Determine mimetype
    const mimetypeMap: Record<string, string> = {
      ".md": "text/markdown",
      ".txt": "text/plain",
      ".json": "application/json",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".csv": "text/csv"
    };

    const ext = filename.slice(filename.lastIndexOf("."));
    const mimetype = mimetypeMap[ext] || "application/octet-stream";

    // Get file size
    const size = content instanceof Blob ? content.size : new Blob([content]).size;

    // Record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        project_id: projectId,
        folder_id: folderRecord.id,
        filename,
        storage_path: storagePath,
        filesize: size,
        mimetype,
        uploaded_by: userId,
        version_number: 1
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from("project-files").remove([storagePath]);
      return { success: false, error: `Database record failed: ${dbError.message}` };
    }

    return { success: true, fileId: fileRecord.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update existing file (new version)
 */
export async function updateProjectFile(
  fileId: string,
  content: string | Blob,
  userId: string
): Promise<{ success: boolean; newVersion?: number; error?: string }> {
  try {
    // Get current file
    const { data: currentFile, error: fetchError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fetchError || !currentFile) {
      return { success: false, error: "File not found" };
    }

    // Upload new version (overwrites)
    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .update(currentFile.storage_path, content, { upsert: true });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Increment version number
    const newVersion = (currentFile.version_number || 1) + 1;
    const size = content instanceof Blob ? content.size : new Blob([content]).size;

    const { error: dbError } = await supabase
      .from("files")
      .update({
        version_number: newVersion,
        filesize: size,
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    if (dbError) {
      return { success: false, error: `Version update failed: ${dbError.message}` };
    }

    return { success: true, newVersion };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a file (soft delete)
 */
export async function deleteProjectFile(
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("files")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq("id", fileId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
