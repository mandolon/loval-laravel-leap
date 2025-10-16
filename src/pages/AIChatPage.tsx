import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, BarChart3, Users, Code, ChevronDown, ArrowUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AIChatPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [message, setMessage] = useState("");
  const [selectedProject, setSelectedProject] = useState("All Projects");

  const suggestionChips = [
    {
      icon: BarChart3,
      label: "Workspace Updates",
      description: "Get latest project status",
    },
    {
      icon: BarChart3,
      label: "Project Status",
      description: "Check project progress",
    },
    {
      icon: Users,
      label: "Assign Tasks",
      description: "Manage team assignments",
    },
    {
      icon: Code,
      label: "Code Analysis",
      description: "Review code quality",
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      // TODO: Implement AI chat functionality
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Greeting */}
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-medium text-foreground">
            How can I help you today?
          </h1>
        </div>

        {/* Suggestion Chips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mb-12">
          {suggestionChips.map((chip, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto py-4 px-4 flex items-start gap-3 hover:bg-accent/50 transition-colors"
              onClick={() => setMessage(chip.description)}
            >
              <chip.icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex flex-col items-start text-left">
                <span className="font-medium text-foreground">{chip.label}</span>
                <span className="text-sm text-muted-foreground">
                  {chip.description}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto p-4">
          {/* Message Input */}
          <div className="relative bg-background border border-border rounded-lg">
            <Textarea
              placeholder="Message ChatGPT..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none border-0 focus-visible:ring-0 pr-12"
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 rounded-md"
              onClick={handleSend}
              disabled={!message.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {/* Project Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {selectedProject}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedProject("All Projects")}>
                    All Projects
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedProject("Project 1")}>
                    Project 1
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedProject("Project 2")}>
                    Project 2
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Summarize Button */}
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Summarize
              </Button>
            </div>

            {/* Model Indicator */}
            <span className="text-xs text-muted-foreground">ChatGPT 4</span>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-muted-foreground mt-3">
            ChatGPT can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatPage;
