import React, { useState, useEffect } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

export default function ExcalidrawTestPage() {
  const [initialData, setInitialData] = useState<any>(null);
  
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('excalidraw-test-data');
    if (saved) {
      try {
        setInitialData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data:', e);
      }
    }
  }, []);
  
  const handleChange = (elements: any, appState: any, files: any) => {
    // Save to localStorage (debounced by Excalidraw internally)
    const data = { elements, appState, files };
    localStorage.setItem('excalidraw-test-data', JSON.stringify(data));
  };
  
  return (
    <div className="h-screen w-screen bg-white">
      <Excalidraw
        initialData={initialData || { elements: [], appState: {}, files: {} }}
        onChange={handleChange}
      />
    </div>
  );
}
