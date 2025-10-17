export interface Folder {
  id: string;
  short_id: string;
  project_id: string;
  parent_folder_id: string | null;
  name: string;
  is_system_folder: boolean;
  path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileRecord {
  id: string;
  short_id: string;
  project_id: string;
  folder_id: string;
  task_id: string | null;
  parent_file_id: string | null;
  filename: string;
  version_number: number;
  filesize: number | null;
  mimetype: string | null;
  storage_path: string;
  download_count: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TableItem {
  type: 'folder' | 'file';
  id: string;
  name: string;
  modifiedDate?: string;
  filesize?: number;
  mimetype?: string;
  storagePath?: string;
}

export interface UploadingFile {
  id: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
