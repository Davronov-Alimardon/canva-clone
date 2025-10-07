import { useState, useRef, useEffect } from "react";
import { useLayersStore } from "@/features/editor/hooks/use-layer-store";
import { ActiveTool, LayerType } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Editor } from "@/features/editor/types";
import { Upload, Brush, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  defaultTab?: "global" | "sectional"; 
}

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
  defaultTab = "global",
}: AiSidebarProps) => {
  const [currentTab, setCurrentTab] = useState<"global" | "sectional">(defaultTab);
  const [isGenerating, setIsGenerating] = useState(false);
  const [maskStrokeWidth, setMaskStrokeWidth] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { layers, activeGlobalLayerId, getActiveGlobalLayer, updateLayer } = useLayersStore();
  
  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const activeGlobalLayer = getActiveGlobalLayer();
  const sectionalLayers = layers.filter(l => 
    l.type === LayerType.Sectional && l.parentId === activeGlobalLayerId
  );
  const activeSectionalLayer = sectionalLayers.length > 0 ? sectionalLayers[0] : null;
  const currentLayer = currentTab === "global" ? activeGlobalLayer : activeSectionalLayer;

  const onClose = () => onChangeActiveTool("select");

  const onPromptChange = (prompt: string) => {
    if (!currentLayer) return;
    updateLayer(currentLayer.id, { prompt }, false);
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGlobalLayer) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updatedReferenceUrls = [...(activeGlobalLayer.referenceImageUrls || []), dataUrl];
      updateLayer(activeGlobalLayer.id, { referenceImageUrls: updatedReferenceUrls }, false);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeReferenceImage = (index: number) => {
    if (!activeGlobalLayer) return;
    const updatedReferenceUrls = activeGlobalLayer.referenceImageUrls.filter((_, i) => i !== index);
    updateLayer(activeGlobalLayer.id, { referenceImageUrls: updatedReferenceUrls }, false);
  };

  const enableMaskingMode = () => {
    if (editor) {
      editor.enableDrawingMode();
      editor.changeStrokeColor("rgba(255,255,255,1)");
      editor.changeStrokeWidth(maskStrokeWidth);
    }
  };

  const handleStrokeWidthChange = (value: number[]) => {
    const newWidth = value[0];
    setMaskStrokeWidth(newWidth);
    if (editor && editor.canvas.isDrawingMode) {
      editor.changeStrokeWidth(newWidth);
    }
  };

  const onGenerate = async () => {
    if (!currentLayer) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  if (!activeGlobalLayer) {
    return null;
  }

  const hasMaskPaths = currentLayer?.objects?.some(
    (o: any) => o.type?.toLowerCase() === "path"
  );
  
  const hasReferenceImages = currentLayer?.referenceImageUrls && currentLayer.referenceImageUrls.length > 0;
  const hasImageData = !!currentLayer?.imageDataUrl;

  let buttonText = "Generate";
  if (currentLayer?.type === LayerType.Global) {
    if (hasMaskPaths && hasImageData) buttonText = "Inpaint Global Layer";
    else if (!hasImageData && hasReferenceImages) buttonText = "Generate Variation";
    else buttonText = "Generate Image";
  } else if (currentLayer?.type === LayerType.Sectional) {
    if (hasMaskPaths) buttonText = "Generate Inpainting";
    else buttonText = "Draw Mask to Inpaint";
  }

  const isButtonDisabled = !currentLayer?.prompt || (currentLayer?.type === LayerType.Sectional && !hasMaskPaths);

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader
        title="AI Generator"
        description="Generate or inpaint using AI"
      />

      {/* Tab Buttons */}
      <div className="grid grid-cols-2 m-4 gap-2">
        <Button
          variant={currentTab === "global" ? "default" : "outline"}
          onClick={() => setCurrentTab("global")}
          className="w-full"
        >
          Global
        </Button>
        <Button
          variant={currentTab === "sectional" ? "default" : "outline"}
          onClick={() => setCurrentTab("sectional")}
          className="w-full"
        >
          Sectional
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Global Tab Content */}
        {currentTab === "global" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={activeGlobalLayer.prompt || ""}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="e.g., A futuristic city skyline at dusk..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Images</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleReferenceImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full rounded-md" // Button has rounded-md (6px)
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Reference Image
              </Button>

              {activeGlobalLayer.referenceImageUrls && activeGlobalLayer.referenceImageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {activeGlobalLayer.referenceImageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md border" // h-20 (80px) for more height, rounded-md to match button
                      />
                      <button
                        onClick={() => removeReferenceImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={onGenerate}
              disabled={isButtonDisabled || isGenerating}
              className="w-full rounded-md"
            >
              {isGenerating ? "Generating..." : buttonText}
            </Button>

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
              <Info className="w-4 h-4 inline mr-1" />
              Global generation will affect the overall image on this layer.
            </div>
          </div>
        )}

        {/* Sectional Tab Content */}
        {currentTab === "sectional" && (
          <div className="space-y-4">
            {activeSectionalLayer ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inpainting Prompt</label>
                  <Textarea
                    value={activeSectionalLayer.prompt || ""}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="e.g., Add a neon sign on the building..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mask Settings</label>
                  <Button
                    onClick={enableMaskingMode}
                    variant="outline"
                    className="w-full rounded-md"
                  >
                    <Brush className="w-4 h-4 mr-2" />
                    {hasMaskPaths ? "Edit Mask" : "Add Mask"}
                  </Button>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Brush Size</span>
                      <span className="text-sm font-medium">{maskStrokeWidth}px</span>
                    </div>
                    <Slider
                      value={[maskStrokeWidth]}
                      onValueChange={handleStrokeWidthChange}
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Small</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onGenerate}
                  disabled={isButtonDisabled || isGenerating}
                  className="w-full rounded-md"
                >
                  {isGenerating ? "Generating..." : buttonText}
                </Button>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                  <Info className="w-4 h-4 inline mr-1" />
                  Mask some areas from the image on the current layer to generate partial edits.
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-8">
                <Brush className="w-12 h-12 text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500">
                  No sectional layer available for the current global layer.
                </p>
                <p className="text-xs text-gray-400">
                  Add a sectional layer using the "+" button in the layers panel.
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};