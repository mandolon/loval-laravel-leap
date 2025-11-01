import { Skeleton } from "@/components/ui/skeleton";

export function DrawingLoadingSkeleton() {
  return (
    <div className="h-full w-full bg-muted/20 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl max-h-[800px] p-8 space-y-6">
        {/* Toolbar skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <div className="w-px h-10 bg-border mx-2" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
        
        {/* Canvas skeleton */}
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-8 rounded-full mx-auto animate-spin" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-3 w-64 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
