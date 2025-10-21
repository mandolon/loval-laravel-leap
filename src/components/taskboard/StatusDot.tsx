import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "task_redline" | "progress_update" | "done_completed";
  onClick?: () => void;
  className?: string;
}

export function StatusDot({ status, onClick, className }: StatusDotProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 350);
      onClick();
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case "task_redline":
        return "border-red-700 dark:border-red-600 border-dashed bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30";
      case "progress_update":
        return "border-blue-800 dark:border-blue-600 border-dashed bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/30";
      case "done_completed":
        return "border-green-700 dark:border-green-600 border-solid bg-gradient-to-br from-green-700 via-green-600 to-green-500 dark:from-green-600 dark:via-green-500 dark:to-green-400";
      default:
        return "";
    }
  };

  const showCheck = status === "done_completed" || isAnimating;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-350",
        getStatusStyles(),
        className
      )}
    >
      {showCheck && (
        <Check 
          className={cn(
            "w-3 h-3 text-white transition-opacity duration-350",
            isAnimating ? "animate-in fade-in" : ""
          )} 
          strokeWidth={3}
        />
      )}
    </button>
  );
}
