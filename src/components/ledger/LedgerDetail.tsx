import { useState } from "react";
import { format, parseISO } from "date-fns";
import { X, ExternalLink, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUser } from "@/contexts/UserContext";
import { useDeleteLedgerEntry, type LedgerEntry } from "@/lib/api/hooks/useLedgerEntries";
import { useNavigate } from "react-router-dom";
import { useRoleAwareNavigation } from "@/hooks/useRoleAwareNavigation";

interface LedgerDetailProps {
  entry: LedgerEntry;
  onClose: () => void;
}

export default function LedgerDetail({ entry, onClose }: LedgerDetailProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const { role } = useRoleAwareNavigation();
  const deleteMutation = useDeleteLedgerEntry();
  const [actionStates, setActionStates] = useState<Record<number, boolean>>({});

  const isOwner = user?.id === entry.created_by;
  const details = entry.details || {};

  const handleDelete = () => {
    if (!user || !confirm("Are you sure you want to delete this ledger entry?")) return;
    
    deleteMutation.mutate(
      { id: entry.id, userId: user.id },
      { onSuccess: () => onClose() }
    );
  };

  const handleGoToSource = () => {
    if (entry.source_thread_id) {
      navigate(`/${role}/workspace/${entry.workspace_id}/ai`);
    }
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{entry.entry_type}</Badge>
                {entry.visibility !== "team" && (
                  <Badge variant="outline">{entry.visibility}</Badge>
                )}
              </div>
              <SheetTitle className="text-xl">{entry.title}</SheetTitle>
              <SheetDescription className="text-sm mt-2">
                Created {format(parseISO(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Summary */}
          <div>
            <h4 className="font-semibold mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {entry.summary}
            </p>
          </div>

          {/* Key Points */}
          {details.key_points && details.key_points.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Key Points</h4>
              <ul className="space-y-2">
                {details.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pending Items */}
          {details.pending_items && details.pending_items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Pending Items</h4>
              <ul className="space-y-2">
                {details.pending_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id={`pending-${i}`}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`pending-${i}`}
                      className="flex-1 cursor-pointer"
                    >
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {details.action_items && details.action_items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Action Items</h4>
              <ul className="space-y-3">
                {details.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id={`action-${i}`}
                      className="mt-0.5"
                      checked={actionStates[i] || false}
                      onCheckedChange={(checked) =>
                        setActionStates({ ...actionStates, [i]: checked as boolean })
                      }
                    />
                    <label
                      htmlFor={`action-${i}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div>{item.task}</div>
                      {(item.assignee || item.due_date) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.assignee && `@${item.assignee}`}
                          {item.assignee && item.due_date && " • "}
                          {item.due_date && `Due: ${item.due_date}`}
                        </div>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag, i) => (
                  <Badge key={i} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source */}
          {entry.source_thread_id && (
            <div>
              <h4 className="font-semibold mb-2">Source</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToSource}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View AI Conversation
              </Button>
            </div>
          )}

          {/* Actions */}
          {isOwner && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="gap-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
