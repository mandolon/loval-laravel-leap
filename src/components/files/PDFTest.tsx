import SimplePDFViewer from './SimplePDFViewer';

export default function PDFTest() {
  // Test with Wikipedia sample PDF
  const testUrl = 'https://upload.wikimedia.org/wikipedia/commons/5/57/Farmhouse_Drawing_Set_V-001.pdf';
  
  return (
    <div className="h-screen">
      <SimplePDFViewer 
        fileUrl={testUrl}
        fileName="Test PDF"
      />
    </div>
  );
}
