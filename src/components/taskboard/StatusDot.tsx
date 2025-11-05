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
    e.preventDefault();
    if (onClick) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 350);
      onClick();
    }
  };

  const getStatusStyles = () => {
    switch (status) {
      case "task_redline":
        return "bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30";
      case "progress_update":
        return "bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/30";
      case "done_completed":
        return "border-green-700 dark:border-green-600 border-solid bg-gradient-to-br from-green-700 via-green-600 to-green-500 dark:from-green-600 dark:via-green-500 dark:to-green-400";
      default:
        return "";
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case "task_redline":
        return "rgb(185, 28, 28)"; // red-700
      case "progress_update":
        return "rgb(30, 64, 175)"; // blue-800
      default:
        return "";
    }
  };

  const getBorderColorDark = () => {
    switch (status) {
      case "task_redline":
        return "rgb(220, 38, 38)"; // red-600
      case "progress_update":
        return "rgb(37, 99, 235)"; // blue-600
      default:
        return "";
    }
  };

  const showCheck = status === "done_completed" || isAnimating;
  const isDashed = status !== "done_completed";

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-350 relative",
        getStatusStyles(),
        className
      )}
    >
      {isDashed && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke={getBorderColor()}
            strokeWidth="2"
            strokeDasharray="2.5 2"
            className="dark:hidden"
          />
          <circle
            cx="8"
            cy="8"
            r="7"
            fill="none"
            stroke={getBorderColorDark()}
            strokeWidth="2"
            strokeDasharray="2.5 2"
            className="hidden dark:block"
          />
        </svg>
      )}
      {showCheck && (
        <Check 
          className={cn(
            "w-3 h-3 text-white transition-opacity duration-350 relative z-10",
            isAnimating ? "animate-in fade-in" : ""
          )} 
          strokeWidth={3}
        />
      )}
    </button>
  );
}
