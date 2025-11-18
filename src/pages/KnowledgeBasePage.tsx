import { useState } from 'react';
import { Upload, FileText, FolderTree, Database, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  children?: FileNode[];
  file?: File;
}

interface IngestionProgress {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  chunks?: number;
  error?: string;
}

export default function KnowledgeBasePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useUser();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [ingestionProgress, setIngestionProgress] = useState<IngestionProgress[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch knowledge base files
  const { data: knowledgeFiles, isLoading } = useQuery({
    queryKey: ['knowledge-base', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('file_name, file_path, created_at, created_by')
        .eq('workspace_id', workspaceId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by file
      const fileMap = new Map();
      data.forEach(item => {
        if (!fileMap.has(item.file_name)) {
          fileMap.set(item.file_name, {
            file_name: item.file_name,
            file_path: item.file_path,
            created_at: item.created_at,
            created_by: item.created_by,
            chunk_count: 1
          });
        } else {
          fileMap.get(item.file_name).chunk_count++;
        }
      });

      return Array.from(fileMap.values());
    },
    enabled: !!workspaceId
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    // Build file tree
    const tree = buildFileTree(files);
    setFileTree(tree);
  };

  // Build file tree structure
  const buildFileTree = (files: File[]): FileNode[] => {
    const tree: FileNode[] = [];
    
    files.forEach(file => {
      const parts = file.webkitRelativePath || file.name;
      const pathParts = parts.split('/');
      
      let currentLevel = tree;
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        const isFile = index === pathParts.length - 1;
        
        let existing = currentLevel.find(node => node.name === part);
        
        if (!existing) {
          existing = {
            name: part,
            type: isFile ? 'file' : 'folder',
            path: currentPath,
            size: isFile ? file.size : undefined,
            file: isFile ? file : undefined,
            children: isFile ? undefined : []
          };
          currentLevel.push(existing);
        }
        
        if (!isFile && existing.children) {
          currentLevel = existing.children;
        }
      });
    });
    
    return tree;
  };

  // Ingest files mutation
  const ingestMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setIngestionProgress(prev => [
          ...prev.filter(p => p.fileName !== file.name),
          { fileName: file.name, status: 'processing', progress: 0 }
        ]);

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('workspace_id', workspaceId!);

          // Get auth token for the request
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Not authenticated');
          }

          // Use direct fetch instead of supabase.functions.invoke for FormData
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(`${supabaseUrl}/functions/v1/ingest-knowledge`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Edge Function returned a non-2xx status code: ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();

          setIngestionProgress(prev => prev.map(p => 
            p.fileName === file.name 
              ? { ...p, status: 'completed', progress: 100, chunks: data.chunksCreated }
              : p
          ));

          results.push({ fileName: file.name, success: true, chunks: data.chunksCreated });
        } catch (error: any) {
          console.error(`Error ingesting ${file.name}:`, error);
          
          setIngestionProgress(prev => prev.map(p => 
            p.fileName === file.name 
              ? { ...p, status: 'error', progress: 100, error: error.message || 'Unknown error' }
              : p
          ));

          results.push({ fileName: file.name, success: false, error: error.message || 'Unknown error' });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', workspaceId] });
      toast({
        title: 'Files processed',
        description: 'Files have been added to the knowledge base'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Processing failed',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsIngesting(false);
    }
  });

  const handleIngest = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to upload',
        variant: 'destructive'
      });
      return;
    }

    setIsIngesting(true);
    setIngestionProgress([]);
    ingestMutation.mutate(selectedFiles);
  };

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('workspace_id', workspaceId!)
        .eq('file_name', fileName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base', workspaceId] });
      toast({
        title: 'File removed',
        description: 'File has been removed from knowledge base'
      });
    }
  });

  // Render file tree
  const renderFileTree = (nodes: FileNode[], level = 0): React.ReactNode => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: `${level * 20}px` }} className="py-1">
        <div className="flex items-center gap-2 text-sm">
          {node.type === 'folder' ? (
            <>
              <FolderTree className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{node.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {(node.size! / 1024 / 1024).toFixed(2)} MB
              </span>
            </>
          )}
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload files and folders for MyHome AI to search and reference when answering questions
        </p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Knowledge Base Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : knowledgeFiles?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : knowledgeFiles?.reduce((sum, f) => sum + f.chunk_count, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">Chunks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Upload Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Select files or folders to add to the knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div>
              <Input
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                multiple
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports: PDF, TXT, MD, DOC, DOCX
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedFiles.length} file(s) selected
                  </span>
                  <Button 
                    onClick={handleIngest} 
                    disabled={isIngesting}
                    className="gap-2"
                  >
                    {isIngesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Add to Knowledge Base
                      </>
                    )}
                  </Button>
                </div>

                <ScrollArea className="flex-1 border rounded-md p-4">
                  {fileTree.length > 0 ? (
                    <div className="space-y-1">
                      {renderFileTree(fileTree)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Select files to see structure
                    </p>
                  )}
                </ScrollArea>
              </>
            )}

            {ingestionProgress.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium text-sm">Processing Progress</h3>
                {ingestionProgress.map(progress => (
                  <div key={progress.fileName} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {progress.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {progress.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                        {progress.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {progress.fileName}
                      </span>
                      {progress.chunks && <span className="text-xs text-muted-foreground">{progress.chunks} chunks</span>}
                    </div>
                    {progress.status === 'processing' && <Progress value={progress.progress} />}
                    {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Base Files */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Knowledge Base Files
            </CardTitle>
            <CardDescription>
              Files available to MyHome AI agent
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : knowledgeFiles && knowledgeFiles.length > 0 ? (
                <div className="space-y-2">
                  {knowledgeFiles.map((file, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.chunk_count} chunks
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(file.file_name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No files uploaded yet</p>
                  <p className="text-sm mt-2">Upload files to get started</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}