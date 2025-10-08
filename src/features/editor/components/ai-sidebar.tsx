// AISidebar.tsx - keep UI but remove AI generation logic
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
import { Upload, Brush, Eraser, Move, Info } from "lucide-react";
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
  console.log('🔍 AI Sidebar - Current activeTool:', activeTool);
  const [currentTab, setCurrentTab] = useState<"global" | "sectional">(defaultTab);
  const [isGenerating, setIsGenerating] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    layers, 
    activeGlobalLayerId, 
    getActiveGlobalLayer, 
    updateLayer, 
    setActiveSectionalLayer, 
    addSectionalLayer,
    activeSectionalLayerId,
    getActiveSectionalLayer 
  } = useLayersStore();
  
  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const activeGlobalLayer = getActiveGlobalLayer();
  console.log('🔍 AI Sidebar - activeGlobalLayer:', activeGlobalLayer);
  
  // This condition might be returning null
  if (!activeGlobalLayer) {
    console.log('❌ AI Sidebar returning null because no activeGlobalLayer');
    return null;
  }
  const activeSectionalLayer = getActiveSectionalLayer();
  const sectionalLayers = layers.filter(l => 
    l.type === LayerType.Sectional && l.parentId === activeGlobalLayerId
  );
  const currentLayer = currentTab === "global" ? activeGlobalLayer : activeSectionalLayer;

  // Update the tool selection to ensure proper layer activation
  const handleToolSelect = (tool: ActiveTool) => {
    console.log('🛠️ Tool selected:', tool, 'on tab:', currentTab);

    console.log('🎯 Current layer:', currentLayer);
    console.log('🎯 Layer has image:', !!currentLayer?.imageDataUrl);
    console.log('🎯 Layer objects count:', currentLayer?.objects?.length || 0);
    
    if (editor?.canvas) {
      const objects = editor.canvas.getObjects();
      console.log('🎨 Canvas objects:', objects.map(obj => ({
        type: obj.type,
        layerId: (obj as any).layerId,
        name: obj.name,
        visible: obj.visible
      })));
    }
    
    // Handle brush tool in sectional tab
    if (currentTab === "sectional" && tool === "brush") {
      if (!activeSectionalLayer && activeGlobalLayerId) {
        const newSectionalLayerId = addSectionalLayer(activeGlobalLayerId);
        if (newSectionalLayerId) {
          setActiveSectionalLayer(newSectionalLayerId);
        }
      }
    }
    
    // Simply change the tool - let parent handle the rest
    onChangeActiveTool(tool);
  };

  const onClose = () => {
    // Disable drawing before closing
    if (editor) {
      editor.disableDrawingMode();
    }
    onChangeActiveTool("select");
  };

  const handleTabChange = (tab: "global" | "sectional") => {
    setCurrentTab(tab);
    
    // Clear sectional layer when switching to global tab
    if (tab === "global") {
      console.log('🎯 Clearing sectional layer activation');
      setActiveSectionalLayer(null);
    }
  };

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

  const handleBrushSizeChange = (value: number[]) => {
    const newWidth = value[0];
    setBrushSize(newWidth);
    // Update canvas brush size if in brush mode
    if (editor && activeTool === "brush") {
      editor.changeStrokeWidth(newWidth);
    }
  };

  const onGenerate = async () => {
    if (!currentLayer || !editor?.canvas) return;
    setIsGenerating(true);
    
    try {
      // AI generation logic removed - keeping UI only
      console.log('AI Generation requested but functionality disabled');
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('AI generation functionality is currently disabled');
      
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI generation is currently unavailable');
    } finally {
      setIsGenerating(false);
    }
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
        activeTool === "ai"  || ["brush", "eraser", "pan", "draw"].includes(activeTool) ? "visible" : "hidden"
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
          onClick={() => handleTabChange("global")}
          className="w-full"
        >
          Global
        </Button>
        <Button
          variant={currentTab === "sectional" ? "default" : "outline"}
          onClick={() => handleTabChange("sectional")}
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
                className="w-full rounded-md"
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
                        className="w-full h-20 object-cover rounded-md border"
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

                <div className="space-y-4">
                  <label className="text-sm font-medium">Masking Tools</label>
                  
                  {/* Tool Selection */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={activeTool === "brush" ? "default" : "outline"}
                      onClick={() => handleToolSelect("brush")}
                      size="sm"
                      className="flex flex-col items-center h-12"
                    >
                      <Brush className="w-4 h-4 mb-1" />
                      <span className="text-xs">Brush</span>
                    </Button>
                    <Button
                      variant={activeTool === "eraser" ? "default" : "outline"}
                      onClick={() => handleToolSelect("eraser")}
                      size="sm"
                      className="flex flex-col items-center h-12"
                    >
                      <Eraser className="w-4 h-4 mb-1" />
                      <span className="text-xs">Eraser</span>
                    </Button>
                    <Button
                      variant={activeTool === "pan" ? "default" : "outline"}
                      onClick={() => handleToolSelect("pan")}
                      size="sm"
                      className="flex flex-col items-center h-12"
                    >
                      <Move className="w-4 h-4 mb-1" />
                      <span className="text-xs">Pan</span>
                    </Button>
                  </div>

                  {/* Brush Size Control */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Brush Size</span>
                      <span className="text-sm font-medium">{brushSize}px</span>
                    </div>
                    <Slider
                      value={[brushSize]}
                      onValueChange={handleBrushSizeChange}
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

                  {/* Mask Status */}
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                    {hasMaskPaths ? (
                      <span>✓ Mask ready for inpainting</span>
                    ) : (
                      <span>Use Brush tool to draw mask areas</span>
                    )}
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
              <div className="text-center space-y-4 py-8">
                <Brush className="w-12 h-12 text-gray-300 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    No active inpainting mask
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Click the Brush tool to create a new inpainting mask
                  </p>
                </div>
                
                {/* Tool Selection for creating first mask */}
                <div className="space-y-3">
                  <label className="text-sm font-medium block text-left">Start Masking</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={activeTool === "brush" ? "default" : "outline"}
                      onClick={() => handleToolSelect("brush")}
                      size="sm"
                      className="flex flex-col items-center h-12"
                    >
                      <Brush className="w-4 h-4 mb-1" />
                      <span className="text-xs">Brush</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center h-12 opacity-50"
                      disabled
                    >
                      <Eraser className="w-4 h-4 mb-1" />
                      <span className="text-xs">Eraser</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex flex-col items-center h-12 opacity-50"
                      disabled
                    >
                      <Move className="w-4 h-4 mb-1" />
                      <span className="text-xs">Pan</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Brush tool will automatically create a new inpainting layer
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};