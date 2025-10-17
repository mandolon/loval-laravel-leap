import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauriApp } from '@/lib/tauri';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Only check for updates in Tauri desktop app
    if (!isTauriApp()) return;

    let isCancelled = false;

    const checkForUpdates = async () => {
      try {
        const update = await check();
        
        if (isCancelled) return;

        if (update?.available) {
          setUpdateInfo(update);
          setUpdateAvailable(true);
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Check for updates on mount
    checkForUpdates();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleDownloadAndInstall = async () => {
    if (!updateInfo) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Download and install the update
      await updateInfo.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            break;
          case 'Progress':
            setDownloadProgress(Math.round((event.data.downloaded / event.data.contentLength) * 100));
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      toast.success('Update installed! Restarting app...');
      
      // Relaunch the app
      setTimeout(async () => {
        await relaunch();
      }, 1000);
    } catch (error) {
      console.error('Failed to install update:', error);
      toast.error('Failed to install update. Please try again later.');
      setDownloading(false);
      setShowDialog(false);
    }
  };

  const handleSkip = () => {
    setShowDialog(false);
    setUpdateAvailable(false);
  };

  if (!isTauriApp() || !updateAvailable) {
    return null;
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {downloading ? 'Downloading Update...' : 'Update Available'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {!downloading ? (
                <>
                  <p>
                    Version <strong>{updateInfo?.version}</strong> is now available.
                    You are currently using version <strong>{updateInfo?.currentVersion}</strong>.
                  </p>
                  {updateInfo?.body && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">What's New:</p>
                      <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-[200px] overflow-y-auto">
                        {updateInfo.body}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p>Downloading and installing update...</p>
                  <Progress value={downloadProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    {downloadProgress}%
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!downloading && (
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkip}>
              Skip This Version
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDownloadAndInstall}>
              Download & Install
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
