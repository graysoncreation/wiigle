import React, { useState, useRef } from 'react';
import {
  getGetWiithubSiteQueryKey,
  useGetWiithubSite,
  usePublishWiithubSite,
  type WiithubSite,
} from '@workspace/api-client-react';
import { formatBytes } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  UploadCloud, 
  File as FileIcon, 
  Folder, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MAX_FILES = 25;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

interface ParsedFile {
  path: string;
  contentBase64: string;
  contentType: string;
  size: number;
  originalFile: File;
}

type Step = 'upload' | 'review' | 'publish' | 'success';

export default function Studio() {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  
  const [siteId, setSiteId] = useState('');
  const [publishedSite, setPublishedSite] = useState<WiithubSite | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const addFilesInputRef = useRef<HTMLInputElement>(null);

  const publishMutation = usePublishWiithubSite();
  const siteIdIsValid = /^[a-z0-9][a-z0-9-]{2,31}$/.test(siteId);
  const idLookup = useGetWiithubSite(siteId, {
    query: {
      queryKey: getGetWiithubSiteQueryKey(siteId),
      enabled: step === 'publish' && siteIdIsValid,
      retry: false,
    },
  });
  const idIsTaken = Boolean(idLookup.data);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: File[], append = false) => {
    setIsParsing(true);
    try {
      // Ignore hidden files / directories commonly added by OS
      const validFiles = files.filter(f => !f.name.startsWith('.') && !f.webkitRelativePath.includes('/.'));

      if (validFiles.length === 0) {
        toast.error("No valid files selected.");
        setIsParsing(false);
        return;
      }

      // Determine common root to strip it
      let commonRoot = "";
      const paths = validFiles.map(f => f.webkitRelativePath || f.name);
      
      // If there's at least one file with a directory path
      if (paths.some(p => p.includes('/'))) {
        const firstPathParts = paths[0].split('/');
        if (firstPathParts.length > 1) {
          const potentialRoot = firstPathParts[0] + '/';
          if (paths.every(p => p.startsWith(potentialRoot))) {
            commonRoot = potentialRoot;
          }
        }
      }

      const results: ParsedFile[] = [];
      
      for (const file of validFiles) {
        let path = file.webkitRelativePath || file.name;
        if (commonRoot && path.startsWith(commonRoot)) {
          path = path.substring(commonRoot.length);
        }
        
        // Strip any leading slashes just in case
        path = path.replace(/^\/+/, '');

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        results.push({
          path,
          contentBase64: base64,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          originalFile: file
        });
      }

      setParsedFiles((current) => {
        if (!append) return results;

        const merged = new Map(current.map((file) => [file.path, file]));
        results.forEach((file) => merged.set(file.path, file));
        return Array.from(merged.values());
      });
      setStep('review');
    } catch (error) {
      console.error(error);
      toast.error("Failed to read files. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // We only have simple file drop in standard HTML unless we use webkitGetAsEntry
    // For robust folder drop, it's complex. Let's just grab files from dataTransfer.
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    // reset so they can re-select the same if needed
    if (e.target) e.target.value = '';
  };

  // Validation
  const hasIndexHtml = parsedFiles.some(f => f.path.toLowerCase() === 'index.html');
  const totalBytes = parsedFiles.reduce((sum, f) => sum + f.size, 0);
  const isValidSize = totalBytes <= MAX_BYTES;
  const isValidCount = parsedFiles.length <= MAX_FILES;
  
  const canProceedToPublish = hasIndexHtml && isValidSize && isValidCount && parsedFiles.length > 0;

  const handlePublish = () => {
    if (!siteIdIsValid) {
      toast.error("Invalid ID format. Use 3-32 lowercase letters, numbers, or hyphens.");
      return;
    }
    if (idIsTaken) {
      toast.error("That ID is already taken.");
      return;
    }

    publishMutation.mutate({
      data: {
        id: siteId,
        files: parsedFiles.map(f => ({
          path: f.path,
          contentBase64: f.contentBase64,
          contentType: f.contentType,
          size: f.size
        }))
      }
    }, {
      onSuccess: (data) => {
        setPublishedSite(data);
        setStep('success');
        toast.success("Site published successfully!");
      },
      onError: (error) => {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          typeof (error as { data?: { error?: string } }).data?.error === 'string'
            ? (error as unknown as { data: { error: string } }).data.error
            : "Failed to publish site. Please try again.";
        toast.error(message);
      }
    });
  };

  const reset = () => {
    setParsedFiles([]);
    setSiteId('');
    setPublishedSite(null);
    setStep('upload');
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="h-16 border-b flex items-center px-6 lg:px-8 bg-card shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <Globe className="w-6 h-6" />
          Wiithub Studio
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
          
          {/* Stepper */}
          <div className="flex items-center justify-center mb-12 max-w-xl mx-auto">
            <div className={`flex flex-col items-center ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${step === 'upload' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted'}`}>1</div>
              <span className="text-sm font-medium">Select</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-muted rounded-full overflow-hidden">
              <div className={`h-full bg-primary transition-all duration-500 ${(step === 'review' || step === 'publish' || step === 'success') ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex flex-col items-center ${step === 'review' ? 'text-primary' : (step === 'publish' || step === 'success' ? 'text-muted-foreground' : 'text-muted-foreground opacity-50')}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${step === 'review' ? 'bg-primary text-primary-foreground shadow-md' : ((step === 'publish' || step === 'success') ? 'bg-muted' : 'bg-muted opacity-50')}`}>2</div>
              <span className="text-sm font-medium">Review</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-muted rounded-full overflow-hidden">
              <div className={`h-full bg-primary transition-all duration-500 ${(step === 'publish' || step === 'success') ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex flex-col items-center ${step === 'publish' ? 'text-primary' : (step === 'success' ? 'text-muted-foreground' : 'text-muted-foreground opacity-50')}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${step === 'publish' ? 'bg-primary text-primary-foreground shadow-md' : (step === 'success' ? 'bg-muted' : 'bg-muted opacity-50')}`}>3</div>
              <span className="text-sm font-medium">Publish</span>
            </div>
          </div>

          {step === 'upload' && (
            <Card className="border-dashed border-2 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
              <CardContent className="p-12">
                <div 
                  className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl transition-all duration-200 ${isDragging ? 'bg-primary/10 border-primary scale-[1.02]' : 'bg-transparent'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Drop your website here</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm">
                    Drag and drop your static site files or folders, or select them from your device.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <Button 
                      size="lg" 
                      onClick={() => folderInputRef.current?.click()}
                      disabled={isParsing}
                      className="gap-2"
                    >
                      <Folder className="w-5 h-5" />
                      Select Folder
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="gap-2"
                    >
                      <FileIcon className="w-5 h-5" />
                      Select Files
                    </Button>
                  </div>

                  {/* Hidden inputs */}
                  {/* @ts-ignore - webkitdirectory is non-standard but works in modern browsers */}
                  <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" multiple onChange={handleFileInput} />
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileInput} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">Review Files</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1 text-sm">{parsedFiles.length} files</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={isParsing}
                      onClick={() => addFilesInputRef.current?.click()}
                    >
                      <Plus className="w-4 h-4" />
                      {isParsing ? 'Adding...' : 'Add Files'}
                    </Button>
                    <input
                      ref={addFilesInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(event) => {
                        if (event.target.files?.length) {
                          void processFiles(Array.from(event.target.files), true);
                        }
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-0 overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                            <th className="px-6 py-4 font-medium">Path</th>
                            <th className="px-6 py-4 font-medium w-32 text-right">Size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {parsedFiles.map((file, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-3 font-medium flex items-center gap-3">
                                <FileIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="truncate max-w-[300px]" title={file.path}>
                                  {file.path}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right text-muted-foreground whitespace-nowrap">
                                {formatBytes(file.size)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      {hasIndexHtml ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${!hasIndexHtml ? 'text-destructive' : ''}`}>Must contain index.html</p>
                        {!hasIndexHtml && <p className="text-sm text-muted-foreground mt-1">An entry file at the root is required.</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      {isValidSize ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${!isValidSize ? 'text-destructive' : ''}`}>Under 2 MB total size</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current: {formatBytes(totalBytes)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {isValidCount ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${!isValidCount ? 'text-destructive' : ''}`}>Under 25 files</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Current: {parsedFiles.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-3 pt-2">
                    <Button 
                      className="w-full gap-2" 
                      size="lg"
                      disabled={!canProceedToPublish}
                      onClick={() => setStep('publish')}
                    >
                      Continue to Publish
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={reset}
                    >
                      Cancel & Start Over
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}

          {step === 'publish' && (
            <div className="max-w-md mx-auto animate-in zoom-in-95 duration-300">
              <Card>
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-3xl">Choose an ID</CardTitle>
                  <CardDescription className="text-base mt-2">
                    This will be your site's permanent public address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 pb-8 space-y-6">
                  <div className="space-y-3">
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-muted-foreground font-medium selection:bg-transparent">
                        wiithub.net /
                      </span>
                      <Input 
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="pl-[104px] text-lg font-medium h-14"
                        placeholder="my-cool-site"
                        maxLength={32}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      3-32 lowercase letters, numbers, or hyphens. Must start with a letter or number.
                    </p>
                    {siteIdIsValid && idLookup.isLoading && (
                      <p className="text-sm text-muted-foreground text-center">Checking availability...</p>
                    )}
                    {siteIdIsValid && idIsTaken && (
                      <p className="text-sm text-destructive text-center font-medium">That ID is already taken.</p>
                    )}
                    {siteIdIsValid && idLookup.isError && (
                      <p className="text-sm text-emerald-600 text-center font-medium">That ID is available.</p>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="flex-1"
                      onClick={() => setStep('review')}
                      disabled={publishMutation.isPending}
                    >
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      className="flex-1 gap-2"
                      disabled={!siteIdIsValid || idIsTaken || idLookup.isLoading || publishMutation.isPending}
                      onClick={handlePublish}
                    >
                      {publishMutation.isPending ? 'Publishing...' : 'Publish Site'}
                      {!publishMutation.isPending && <ArrowRight className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'success' && publishedSite && (
            <div className="max-w-lg mx-auto animate-in zoom-in-95 duration-500 delay-100">
              <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/5 shadow-xl">
                <CardHeader className="text-center pt-10 pb-6">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-3xl font-bold text-foreground">Site Published!</CardTitle>
                  <CardDescription className="text-lg mt-2">
                    Your creation is now live on Wiithub.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-10">
                  <div className="bg-card rounded-xl border p-6 space-y-4 shadow-sm">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Public URL</p>
                      <a 
                        href={publishedSite.runUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <span className="font-mono text-primary font-medium truncate pr-4">
                          {publishedSite.runUrl}
                        </span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </a>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">ID</p>
                        <p className="font-medium">{publishedSite.id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Size</p>
                        <p className="font-medium">{formatBytes(publishedSite.totalBytes)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Files</p>
                        <p className="font-medium">{publishedSite.fileCount}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
                        <p className="font-medium">{new Date(publishedSite.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full mt-8 gap-2"
                    onClick={reset}
                  >
                    <Plus className="w-4 h-4" />
                    Publish Another Site
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
