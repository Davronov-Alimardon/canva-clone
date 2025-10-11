import React from "react";

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSaved: Date | null;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  status,
  lastSaved,
}) => {
  const getIndicatorContent = () => {
    switch (status) {
      case "saving":
        return (
          <div className="flex items-center space-x-1 text-blue-600">
            <span className="text-sm">Saving...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <span className="text-sm">All changes saved</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center space-x-1 text-red-600">
            <span className="text-sm">Save failed</span>
          </div>
        );
      case "idle":
      default:
        if (lastSaved) {
          const timeAgo = formatTimeAgo(lastSaved);
          return (
            <div className="flex items-center space-x-1 text-gray-500">
              <span className="text-sm">Saved {timeAgo}</span>
            </div>
          );
        }
        return null;
    }
  };

  const content = getIndicatorContent();
  if (!content) return null;

  return (
    <div className="flex items-center px-2 py-1 rounded-md bg-gray-50 border">
      {content}
    </div>
  );
};

// Helper function to format time
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};
