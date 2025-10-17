import { useState } from "react";
import { format, parseISO } from "date-fns";
import { FileText, Calendar, Users, MessageSquare, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedgerEntries, type LedgerEntry } from "@/lib/api/hooks/useLedgerEntries";
import LedgerDetail from "./LedgerDetail";

interface LedgerTimelineProps {
  projectId: string;
}

export default function LedgerTimeline({ projectId }: LedgerTimelineProps) {
  const { data: entries = [], isLoading } = useLedgerEntries(projectId);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "decision":
        return <Target className="h-4 w-4" />;
      case "milestone":
        return <Calendar className="h-4 w-4" />;
      case "meeting":
        return <Users className="h-4 w-4" />;
      case "chat":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case "decision":
        return "bg-blue-500";
      case "milestone":
        return "bg-green-500";
      case "meeting":
        return "bg-purple-500";
      case "chat":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredEntries = filterType === "all" 
    ? entries 
    : entries.filter((e) => e.entry_type === filterType);

  // Group by month
  const groupedEntries = filteredEntries.reduce((groups, entry) => {
    const month = format(parseISO(entry.created_at), "MMMM yyyy");
    if (!groups[month]) groups[month] = [];
    groups[month].push(entry);
    return groups;
  }, {} as Record<string, LedgerEntry[]>);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading ledger...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No ledger entries yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use the AI chat to summarize conversations and create entries
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </Badge>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="decision">Decisions</SelectItem>
              <SelectItem value="milestone">Milestones</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="chat">Chat Summaries</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([month, monthEntries]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 pl-12">
                  {month}
                </h3>
                <div className="space-y-4">
                  {monthEntries.map((entry) => (
                    <div key={entry.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2.5 w-3 h-3 rounded-full ${getEntryColor(
                          entry.entry_type
                        )}`}
                      />

                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="gap-1">
                                  {getEntryIcon(entry.entry_type)}
                                  {entry.entry_type}
                                </Badge>
                                {entry.visibility !== "team" && (
                                  <Badge variant="outline">
                                    {entry.visibility}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold">{entry.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(parseISO(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm line-clamp-2">{entry.summary}</p>
                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {entry.tags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {entry.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{entry.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedEntry && (
        <LedgerDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
  );
}
