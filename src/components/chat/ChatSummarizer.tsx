import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { summarizeAIChat, saveSummaryToLedger, saveSummaryAsNote } from "@/ai/summarizer";
import type { ConversationSummary } from "@/ai/summarizer";

interface ChatSummarizerProps {
  threadId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  onSaved?: () => void;
}

export default function ChatSummarizer({
  threadId,
  workspaceId,
  projectId,
  userId,
  messages,
  onSaved,
}: ChatSummarizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [saveMode, setSaveMode] = useState<"ledger" | "note">("ledger");
  const [visibility, setVisibility] = useState("team");
  const [entryType, setEntryType] = useState("chat");
  const { toast } = useToast();

  const handleSummarize = async () => {
    setIsLoading(true);
    try {
      const result = await summarizeAIChat(threadId, messages);
      if (result) {
        setSummary(result);
      } else {
        throw new Error("Failed to generate summary");
      }
    } catch (error: any) {
      toast({
        title: "Error generating summary",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summary) return;

    setIsSaving(true);
    try {
      let result;
      if (saveMode === "ledger") {
        result = await saveSummaryToLedger(
          workspaceId,
          projectId,
          threadId,
          summary,
          entryType,
          visibility,
          userId
        );
      } else {
        result = await saveSummaryAsNote(projectId, threadId, summary, userId);
      }

      if (result.success) {
        toast({
          title: `Saved as ${saveMode}`,
          description: "Your summary has been saved successfully.",
        });
        setIsOpen(false);
        onSaved?.();
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error: any) {
      toast({
        title: "Error saving summary",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!summary) {
      handleSummarize();
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={messages.length === 0}
      >
        <FileText className="h-4 w-4" />
        Summarize Conversation
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary with key points, decisions, and action items
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Generating summary...</span>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={summary.title}
                  onChange={(e) => setSummary({ ...summary, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={summary.summary}
                  onChange={(e) => setSummary({ ...summary, summary: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {summary.key_points.length > 0 && (
                <div>
                  <Label>Key Points</Label>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {summary.key_points.map((point, i) => (
                      <li key={i} className="text-sm">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.pending_items.length > 0 && (
                <div>
                  <Label>Pending Items</Label>
                  <ul className="mt-2 space-y-1">
                    {summary.pending_items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">□</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.action_items.length > 0 && (
                <div>
                  <Label>Action Items</Label>
                  <ul className="mt-2 space-y-2">
                    {summary.action_items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">→</span>
                        <div>
                          <div>{item.task}</div>
                          {(item.assignee || item.due_date) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.assignee && `@${item.assignee}`}
                              {item.assignee && item.due_date && " • "}
                              {item.due_date && `Due: ${item.due_date}`}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {summary.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label>Save as</Label>
                  <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as "ledger" | "note")} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ledger" id="ledger" />
                      <Label htmlFor="ledger" className="font-normal cursor-pointer">
                        Ledger Entry (Official decision log)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="note" id="note" />
                      <Label htmlFor="note" className="font-normal cursor-pointer">
                        Note (Informal thoughts)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {saveMode === "ledger" && (
                  <>
                    <div>
                      <Label htmlFor="entryType">Entry Type</Label>
                      <Select value={entryType} onValueChange={setEntryType}>
                        <SelectTrigger id="entryType" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">Chat Summary</SelectItem>
                          <SelectItem value="decision">Decision</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="visibility">Visibility</Label>
                      <Select value={visibility} onValueChange={setVisibility}>
                        <SelectTrigger id="visibility" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="team">Team Only</SelectItem>
                          <SelectItem value="client">Share with Client</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Summary
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
