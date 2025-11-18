import { useState } from 'react';
import { Upload, FileText, FolderTree, Database, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  children?: FileNode[];
}

interface IngestionProgress {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  chunks?: number;
  error?: string;
}

interface BuildingCodeStats {
  totalChunks: number;
  byCodeType: Record<string, number>;
  byYear: Record<string, number>;
  byJurisdiction: Record<string, number>;
}

export default function BuildingCodesPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [ingestionProgress, setIngestionProgress] = useState<IngestionProgress[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch building codes stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['building-codes-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('building_codes')
        .select('code_type, year, jurisdiction')
        .is('deleted_at', null);

      if (error) throw error;

      const stats: BuildingCodeStats = {
        totalChunks: data.length,
        byCodeType: {},
        byYear: {},
        byJurisdiction: {}
      };

      data.forEach(item => {
        stats.byCodeType[item.code_type] = (stats.byCodeType[item.code_type] || 0) + 1;
        stats.byYear[item.year] = (stats.byYear[item.year] || 0) + 1;
        stats.byJurisdiction[item.jurisdiction] = (stats.byJurisdiction[item.jurisdiction] || 0) + 1;
      });

      return stats;
    }
  });

  // Fetch recent files
  const { data: recentFiles } = useQuery({
    queryKey: ['building-codes-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('building_codes')
        .select('source_file, created_at, code_type, year')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique files
      const uniqueFiles = Array.from(
        new Map(data.map(item => [item.source_file, item])).values()
      );

      return uniqueFiles;
    }
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length < files.length) {
      toast({
        title: 'Some files skipped',
        description: 'Only PDF files are supported',
        variant: 'destructive'
      });
    }

    setSelectedFiles(pdfFiles);
    
    // Build file tree
    const tree = buildFileTree(pdfFiles);
    setFileTree(tree);
  };

  // Build file tree structure from flat file list
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
          // Upload file and trigger ingestion via edge function
          const formData = new FormData();
          formData.append('file', file);

          const { data, error } = await supabase.functions.invoke('ingest-building-code', {
            body: formData
          });

          if (error) throw error;

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
              ? { ...p, status: 'error', progress: 100, error: error.message }
              : p
          ));

          results.push({ fileName: file.name, success: false, error: error.message });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-codes-stats'] });
      queryClient.invalidateQueries({ queryKey: ['building-codes-recent'] });
      toast({
        title: 'Ingestion complete',
        description: 'Building codes have been processed and indexed'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ingestion failed',
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
        description: 'Please select PDF files to ingest',
        variant: 'destructive'
      });
      return;
    }

    setIsIngesting(true);
    setIngestionProgress([]);
    ingestMutation.mutate(selectedFiles);
  };

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
        <h1 className="text-3xl font-bold mb-2">Building Codes AI Agent</h1>
        <p className="text-muted-foreground">
          Upload and manage building code PDFs for AI-powered search and analysis
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.totalChunks.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Code Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : Object.keys(stats?.byCodeType || {}).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Years</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : Object.keys(stats?.byYear || {}).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Jurisdictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : Object.keys(stats?.byJurisdiction || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Upload Section */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Building Codes
            </CardTitle>
            <CardDescription>
              Select PDF files or folders containing building code documents
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div>
              <Input
                type="file"
                accept=".pdf"
                multiple
                // @ts-ignore - webkitdirectory is not in the types
                webkitdirectory=""
                directory=""
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports: PDF files | Expected structure: /jurisdiction/year/CodeName.pdf
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
                        Ingesting...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Start Ingestion
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
                <h3 className="font-medium text-sm">Ingestion Progress</h3>
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

        {/* Database View */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Structure
            </CardTitle>
            <CardDescription>
              Complete view of indexed building codes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {stats && (
              <ScrollArea className="flex-1 border rounded-md p-4">
                <div className="space-y-6">
                  {/* By Code Type */}
                  <div>
                    <h3 className="font-medium text-sm mb-3">By Code Type</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byCodeType)
                        .sort((a, b) => b[1] - a[1])
                        .filter(([code]) => !searchQuery || code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(([code, count]) => (
                          <div key={code} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Badge variant="outline">{code}</Badge>
                            </span>
                            <span className="text-muted-foreground">{count.toLocaleString()} chunks</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* By Year */}
                  <div>
                    <h3 className="font-medium text-sm mb-3">By Year</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byYear)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([year, count]) => (
                          <div key={year} className="flex items-center justify-between text-sm">
                            <span>{year}</span>
                            <span className="text-muted-foreground">{count.toLocaleString()} chunks</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* By Jurisdiction */}
                  <div>
                    <h3 className="font-medium text-sm mb-3">By Jurisdiction</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byJurisdiction)
                        .sort((a, b) => b[1] - a[1])
                        .map(([jurisdiction, count]) => (
                          <div key={jurisdiction} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{jurisdiction}</span>
                            <span className="text-muted-foreground">{count.toLocaleString()} chunks</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recent Files */}
                  {recentFiles && recentFiles.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm mb-3">Recently Added</h3>
                      <div className="space-y-2">
                        {recentFiles.map((file, index) => (
                          <div key={index} className="flex items-start justify-between text-sm">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{file.source_file}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.code_type} · {file.year}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}