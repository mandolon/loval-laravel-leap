import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectViewContextType {
  selectedFile: any | null;
  selectedWhiteboard: { pageId: string; pageName: string; versionTitle: string } | null;
  selectedModel: { versionId: string; versionNumber: string; modelFile: any; settings: any } | null;
  setSelectedFile: (file: any | null) => void;
  setSelectedWhiteboard: (wb: { pageId: string; pageName: string; versionTitle: string } | null) => void;
  setSelectedModel: (model: { versionId: string; versionNumber: string; modelFile: any; settings: any } | null) => void;
}

const ProjectViewContext = createContext<ProjectViewContextType | undefined>(undefined);

export function ProjectViewProvider({ children }: { children: ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<{ pageId: string; pageName: string; versionTitle: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ versionId: string; versionNumber: string; modelFile: any; settings: any } | null>(null);

  return (
    <ProjectViewContext.Provider
      value={{
        selectedFile,
        selectedWhiteboard,
        selectedModel,
        setSelectedFile,
        setSelectedWhiteboard,
        setSelectedModel,
      }}
    >
      {children}
    </ProjectViewContext.Provider>
  );
}

export function useProjectView() {
  const context = useContext(ProjectViewContext);
  if (context === undefined) {
    throw new Error('useProjectView must be used within a ProjectViewProvider');
  }
  return context;
}
