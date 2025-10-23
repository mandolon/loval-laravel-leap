import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import { FileRecord } from './types';

interface FileViewerPaneProps {
  file: FileRecord | null;
  onDownload?: (file: FileRecord) => void;
  onShare?: (file: FileRecord) => void;
  onMaximize?: (file: FileRecord) => void;
}

export default function FileViewerPane({ 
  file, 
  onDownload,
  onShare,
  onMaximize 
}: FileViewerPaneProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  
  console.log('[FileViewerPane] Rendering. annotationMode:', annotationMode);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }

    const loadFileUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('project-files')
          .createSignedUrl(file.storage_path, 3600);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error('No signed URL');

        let cleanUrl = data.signedUrl.trim().replace(/:\d+$/, '');
        setFileUrl(cleanUrl);
        console.log('📄 File URL loaded:', file.filename);
      } catch (error) {
        console.error('Failed to load file URL:', error);
        setFileUrl(null);
      }
    };

    loadFileUrl();
  }, [file]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/30">
        <div className="text-center">
          <p className="text-lg">No file selected</p>
          <p className="text-sm mt-2">Select a file from the explorer below</p>
        </div>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2" />
          <div>Loading file...</div>
        </div>
      </div>
    );
  }

  const isPdf = file.mimetype === 'application/pdf';
  const isImage = file.mimetype?.startsWith('image/');

  if (isPdf) {
    return (
      <PDFViewer
        file={{ url: fileUrl, name: file.filename, size: file.filesize, modified: file.updated_at }}
        annotationMode={annotationMode}
        onAnnotationModeChange={setAnnotationMode}
      />
    );
  }

  if (isImage) {
    return (
      <ImageViewer
        file={{ url: fileUrl, name: file.filename, size: file.filesize, modified: file.updated_at }}
      />
    );
  }

  return (
    <div className="h-full flex items-center justify-center bg-muted/30">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">Preview Not Available</p>
        <p className="text-sm mt-2">{file.mimetype || 'Unknown file type'}</p>
      </div>
    </div>
  );
}
