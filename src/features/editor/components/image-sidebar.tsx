import { useState } from "react";
import { useLayersStore } from "@/features/editor/hooks/use-layer-store";
import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Multi-upload Image Sidebar — each uploaded image auto-creates a new layer.
 */
interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: ImageSidebarProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { addMultipleImageLayers } = useLayersStore();

  const onClose = () => {
    setSelectedFiles([]); // Clear selection when closing
    onChangeActiveTool("select");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setIsUploading(true);

    try {
      await addMultipleImageLayers(fileArray);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
      setSelectedFiles([]); // Clear selection after upload

       const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (fileInput) {
    fileInput.value = '';
  }
    }
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="Upload Images"
        description="Upload one or more images — each will automatically create a new layer."
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <label className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              disabled={isUploading}
              className="hidden"
            />
            <p className="text-sm text-gray-600">
              {isUploading ? "Uploading..." : "Click or drag multiple images here"}
            </p>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
              </p>
            )}
          </label>

          <Button
            type="button"
            disabled={isUploading}
            onClick={() =>
              document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
            }
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Select Images"}
          </Button>
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};