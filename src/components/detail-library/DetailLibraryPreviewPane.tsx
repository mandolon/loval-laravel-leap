import SimplePDFViewer from './SimplePDFViewer';
import SimpleImageViewer from './SimpleImageViewer';

interface DetailLibraryPreviewPaneProps {
  file: { url: string; mimetype: string; name?: string } | null;
}

const DetailLibraryPreviewPane = ({ file }: DetailLibraryPreviewPaneProps) => {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a detail to preview
      </div>
    );
  }

  const isPDF = file.mimetype === 'application/pdf';

  return isPDF ? (
    <SimplePDFViewer file={file} className="h-full" />
  ) : (
    <SimpleImageViewer file={file} className="h-full" />
  );
};

export default DetailLibraryPreviewPane;
