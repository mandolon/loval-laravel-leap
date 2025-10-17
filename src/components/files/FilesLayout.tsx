import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileExplorer } from './FileExplorer';
import FileViewerPane from './FileViewerPane';
import { FileRecord } from './types';

interface FilesLayoutProps {
  projectId: string;
  projectName: string;
}

export default function FilesLayout({ projectId, projectName }: FilesLayoutProps) {
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const queryClient = useQueryClient();

  // Mutation: Download file
  const downloadFileMutation = useMutation({
    mutationFn: async (file: FileRecord) => {
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.storage_path, 60);

      if (error) throw error;
      if (!data) throw new Error('No signed URL');

      // Increment download count
      await supabase
        .from('files')
        .update({ download_count: file.download_count + 1 })
        .eq('id', file.id);

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.filename;
      link.click();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      toast.success('Download started');
    },
  });

  const handleDownload = (file: FileRecord) => {
    downloadFileMutation.mutate(file);
  };

  const handleShare = (file: FileRecord) => {
    // TODO: implement share functionality
    toast.info('Share functionality coming soon');
  };

  const handleMaximize = (file: FileRecord) => {
    // TODO: implement fullscreen/maximize
    toast.info('Fullscreen functionality coming soon');
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* VIEWER PANE - Top 75% */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <FileViewerPane
          file={selectedFile}
          onDownload={handleDownload}
          onShare={handleShare}
          onMaximize={handleMaximize}
        />
      </div>

      {/* EXPLORER PANE - Bottom 25% */}
      <div className="h-[320px] flex-shrink-0">
        <FileExplorer
          projectId={projectId}
          onFileSelect={setSelectedFile}
          selectedFileId={selectedFile?.id}
        />
      </div>
    </div>
  );
}
