// AISidebar.tsx - cleaned up version
import { useState, useRef, useEffect, useMemo } from "react";
import { fabric } from "fabric";
import { useLayersStore } from "@/features/editor/hooks/use-layer-store";
import {
  ActiveTool,
  LayerType,
  FabricObjectWithLayer,
  LayerObjectData,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Editor } from "@/features/editor/types";
import { Upload, Brush, Eraser, Move, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import { tagFabricObjectWithLayer } from "@/features/editor/utils";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
  defaultTab?: "global" | "sectional";
}

interface GenerationPayload {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  width?: number;
  height?: number;
  seed?: string | number;
  model?: string;
  mode?: string;
  image?: string;
  strength?: number;
  output_format?: "png" | "jpg" | "jpeg" | "webp";
  mask?: string;
}

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
  defaultTab = "global",
}: AiSidebarProps) => {
  const [currentTab, setCurrentTab] = useState<"global" | "sectional">(
    defaultTab
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    layers,
    getActiveGlobalLayer,
    updateLayer,
    getActiveSectionalLayer,
    setActiveSectionalLayer,
  } = useLayersStore();

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  const activeGlobalLayer = getActiveGlobalLayer();
  const activeSectionalLayer = getActiveSectionalLayer();

  const currentLayer = useMemo(() => {
    if (currentTab === "global") {
      return activeGlobalLayer;
    } else {
      return activeSectionalLayer || activeGlobalLayer;
    }
  }, [currentTab, activeGlobalLayer, activeSectionalLayer]);

  const hasMaskPaths = useMemo(() => {
    const hasLayerPaths = currentLayer?.objects?.some(
      (o: LayerObjectData) => o.type?.toLowerCase() === "path"
    );

    if (!hasLayerPaths && editor?.canvas && currentLayer?.id) {
      const canvasObjects = editor.canvas.getObjects();
      const layerPathsOnCanvas = canvasObjects.filter((obj) => {
        const layerAwareObj = obj as FabricObjectWithLayer;
        return (
          layerAwareObj.layerId === currentLayer.id &&
          obj.type?.toLowerCase() === "path" &&
          obj.name !== "clip"
        );
      });

      if (layerPathsOnCanvas.length > 0) {
        setTimeout(() => {
          const { syncLayerObjectsFromCanvas } = useLayersStore.getState();
          syncLayerObjectsFromCanvas(currentLayer.id);
        }, 100);
        return true;
      }
    }

    return hasLayerPaths || false;
  }, [currentLayer?.objects, currentLayer?.id, editor?.canvas]);

  if (!activeGlobalLayer) {
    return null;
  }

  // Helper function to enable brush drawing
  const enableBrushDrawing = async () => {
    // Ensure we have a sectional layer before enabling brush mode
    let sectionalLayerId = activeSectionalLayer?.id;

    if (!sectionalLayerId && activeGlobalLayer) {
      const { addSectionalLayer } = useLayersStore.getState();

      try {
        sectionalLayerId =
          (await addSectionalLayer(activeGlobalLayer.id)) || undefined;
        if (!sectionalLayerId) {
          return;
        }
      } catch (error) {
        return;
      }
    }

    // Set brush mode with the sectional layer ID
    useLayersStore.getState().setBrushMode(true, sectionalLayerId);

    setTimeout(() => {
      if (editor?.canvas) {
        editor.canvas.defaultCursor = "crosshair";
        editor.canvas.selection = false;
        editor.canvas.renderAll();
      }

      if (editor) {
        editor.enableMaskDrawingMode();
        // Mask tool now manages its own color and width state
        editor.changeMaskToolWidth(brushSize);
      }
    }, 100);
  };

  const onClose = () => {
    // Reset brush mode state first
    useLayersStore.getState().setBrushMode(false);

    // Disable drawing before closing
    if (editor) {
      editor.disableDrawingMode();
    }
    onChangeActiveTool("select");
  };

  const handleToolSelect = async (tool: ActiveTool) => {
    if (tool === "brush") {
      // Clean up any existing drawing mode first
      if (editor) {
        editor.disableDrawingMode();
      }

      // For sectional tab, clear any previous active layer and enable drawing mode
      setActiveSectionalLayer(null);
      onChangeActiveTool("brush");

      // Wait a bit for state to update, then enable brush drawing
      setTimeout(async () => {
        await enableBrushDrawing();
      }, 100);
    } else {
      // Clean up any existing drawing mode first
      if (editor) {
        editor.disableDrawingMode();
      }
      onChangeActiveTool(tool);
    }
  };

  const handleTabChange = (tab: "global" | "sectional") => {
    if (activeTool === "brush") {
      useLayersStore.getState().setBrushMode(false);
      if (editor) {
        editor.disableDrawingMode();
      }
    }
    setCurrentTab(tab);

    // Clear sectional layer when switching to global tab
    if (tab === "global") {
      setActiveSectionalLayer(null);
    }
  };

  const onPromptChange = (prompt: string) => {
    if (!currentLayer) return;

    // If we're in sectional tab but no sectional layer exists yet,
    // save the prompt to global layer temporarily - it will be transferred when sectional layer is created
    if (currentTab === "sectional" && !activeSectionalLayer) {
      // Save to global layer as temporary storage
      updateLayer(activeGlobalLayer.id, { sectionalPrompt: prompt }, false);
    } else {
      // Normal case: save to the current layer
      updateLayer(currentLayer.id, { prompt }, false);
    }
  };

  const handleReferenceImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeGlobalLayer) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updatedReferenceUrls = [
        ...(activeGlobalLayer.referenceImageUrls || []),
        dataUrl,
      ];
      updateLayer(
        activeGlobalLayer.id,
        { referenceImageUrls: updatedReferenceUrls },
        false
      );
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeReferenceImage = (index: number) => {
    if (!activeGlobalLayer) return;
    const updatedReferenceUrls = activeGlobalLayer.referenceImageUrls.filter(
      (_, i) => i !== index
    );
    updateLayer(
      activeGlobalLayer.id,
      { referenceImageUrls: updatedReferenceUrls },
      false
    );
  };

  const handleBrushSizeChange = (value: number[]) => {
    const newWidth = value[0];
    setBrushSize(newWidth);
    // Update mask tool brush size if in brush mode
    if (editor && activeTool === "brush") {
      editor.changeMaskToolWidth(newWidth);
    }
  };

  const onGenerate = async () => {
    if (!currentLayer || !editor?.canvas) return;

    if (!currentLayer.prompt.trim()) {
      alert("Please enter a prompt before generating");
      return;
    }

    setIsGenerating(true);

    try {
      if (currentTab === "global") {
        await handleGlobalGeneration();
      } else {
        await handleSectionalGeneration();
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      alert(
        `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGlobalGeneration = async () => {
    if (!activeGlobalLayer || !editor?.canvas) return;

    const payload: GenerationPayload = {
      prompt: activeGlobalLayer.prompt.trim(),
      strength: 0.5,
      output_format: "webp" as const,
    };

    // Add reference image if available (image+text mode)
    if (
      activeGlobalLayer.referenceImageUrls &&
      activeGlobalLayer.referenceImageUrls.length > 0
    ) {
      payload.image = activeGlobalLayer.referenceImageUrls[0];
      payload.mode = "image-to-image";
    }

    // Get canvas dimensions for aspect ratio
    const canvas = editor.canvas;
    if (canvas) {
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      payload.width = canvasWidth;
      payload.height = canvasHeight;
    }

    // Call Stability AI API directly
    const response = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success || !result.image_url) {
      throw new Error(result.error || "No image received from API");
    }

    const imageDataUrl = result.image_url;

    // Create a new global layer for the generated image
    const { addGlobalLayer, updateLayer, syncLayerObjectsFromCanvas } =
      useLayersStore.getState();

    // Generate layer name based on prompt
    const promptPreview = activeGlobalLayer.prompt.trim().slice(0, 25);
    const layerName = promptPreview
      ? `Generated: ${promptPreview}${promptPreview.length >= 25 ? "..." : ""}`
      : "Generated Image";

    // Add new global layer
    await addGlobalLayer(layerName);

    // Get the newly created layer (should be the active one now)
    const { activeGlobalLayerId, layers: currentLayers } =
      useLayersStore.getState();
    const newLayer = currentLayers.find((l) => l.id === activeGlobalLayerId);

    if (!newLayer) {
      throw new Error("Failed to create new layer for AI generation");
    }

    // Update the new layer with generated image
    updateLayer(
      newLayer.id,
      {
        imageDataUrl: imageDataUrl,
        prompt: activeGlobalLayer.prompt,
      },
      true
    );

    // Load the generated image onto canvas
    await loadImageToCanvas(imageDataUrl, newLayer.id);

    // Update layer objects array after canvas addition
    syncLayerObjectsFromCanvas(newLayer.id);
  };

  const handleSectionalGeneration = async () => {
    if (!activeSectionalLayer || !editor?.canvas) return;

    // Import compositing and image utility functions
    const {
      getCompositeImage,
      generateMaskFromObjects,
      getBoundingBoxFromDataUrl,
      cropImage,
      resizeImage,
    } = await import("../utils");

    // Get visible layers for compositing
    const visibleLayers = layers.filter(
      (layer) => layer.isVisible && layer.objects && layer.objects.length > 0
    );

    if (visibleLayers.length === 0) {
      throw new Error(
        "No visible layers found for sectional generation. Please add some content to the canvas first."
      );
    }

    // Generate composite image from all visible layers
    const canvas = editor.canvas;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const compositeImageUrl = await getCompositeImage(
      visibleLayers,
      canvasWidth,
      canvasHeight,
      null,
      { format: "png" }
    );

    if (!compositeImageUrl) {
      throw new Error("Failed to generate composite image from canvas layers");
    }

    // Generate mask from sectional layer objects (brush strokes)
    let maskImageUrl: string | null = null;
    if (
      activeSectionalLayer.objects &&
      activeSectionalLayer.objects.length > 0
    ) {
      maskImageUrl = await generateMaskFromObjects(
        activeSectionalLayer.objects,
        canvasWidth,
        canvasHeight
      );
    }

    if (!maskImageUrl) {
      throw new Error(
        "No mask found for sectional generation. Please draw mask areas first."
      );
    }

    // Get bounding box of the mask to determine crop area
    const boundingBox = await getBoundingBoxFromDataUrl(maskImageUrl, {
      width: canvasWidth,
      height: canvasHeight,
    });

    if (!boundingBox) {
      throw new Error(
        "No content found in mask. Please draw mask areas first."
      );
    }

    // Create crop box using exact mask bounding box (no padding) - matches reference implementation
    const cropBox = {
      left: boundingBox.left,
      top: boundingBox.top,
      width: boundingBox.right - boundingBox.left + 1,
      height: boundingBox.bottom - boundingBox.top + 1,
    };

    if (cropBox.width <= 0 || cropBox.height <= 0) {
      throw new Error("Invalid mask dimensions for sectional generation.");
    }

    // Crop the composite image to the exact mask bounding box area
    const croppedCompositeImageUrl = await cropImage(
      compositeImageUrl,
      cropBox
    );

    // Crop the mask to the same exact area
    const croppedMaskImageUrl = await cropImage(maskImageUrl, cropBox);

    // Prepare inpainting payload with cropped images
    const payload: GenerationPayload = {
      prompt: activeSectionalLayer.prompt.trim(),
      image: croppedCompositeImageUrl,
      mask: croppedMaskImageUrl,
      strength: 0.5,
      output_format: "webp" as const,
      mode: "image-to-image",
    };

    // Call Stability AI inpaint API directly
    const response = await fetch("/api/ai/inpaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success || !result.image_url) {
      throw new Error(result.error || "No image received from inpaint API");
    }

    const generatedImageUrl = result.image_url;

    // Resize the generated image to match exact crop box dimensions - matches reference implementation
    const resizedGeneratedImage = await resizeImage(
      generatedImageUrl,
      cropBox.width,
      cropBox.height
    );

    // Create a fabric.Image object positioned at the exact bounding box coordinates
    const img: HTMLImageElement = document.createElement("img");
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        try {
          const fabricImage = new fabric.Image(img, {
            left: cropBox.left,
            top: cropBox.top,
            originX: "left",
            originY: "top",
            selectable: true,
            evented: true,
          });

          // Tag with layer ID and unique object ID
          tagFabricObjectWithLayer(
            fabricImage,
            activeSectionalLayer.id,
            `inpaint-generated-${Date.now()}`
          );

          // Add to canvas
          editor.canvas.add(fabricImage);
          editor.canvas.renderAll();

          // SYNC: Update layer objects array after canvas addition
          const { syncLayerObjectsFromCanvas } = useLayersStore.getState();
          syncLayerObjectsFromCanvas(activeSectionalLayer.id);

          // Update sectional layer to save resized generated image for thumbnail display
          updateLayer(
            activeSectionalLayer.id,
            {
              imageDataUrl: resizedGeneratedImage,
            },
            true
          );

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load generated inpaint image"));
      };

      img.src = resizedGeneratedImage;
    });
  };

  const loadImageToCanvas = async (
    imageDataUrl: string,
    layerId: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!editor?.canvas) {
        reject(new Error("Canvas not available"));
        return;
      }

      const img: HTMLImageElement = document.createElement("img");
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const fabricImage = new fabric.Image(img, {
            left: 0,
            top: 0,
            selectable: true,
            name: `generated-image-${layerId}`,
          });

          // Tag with layer ID
          tagFabricObjectWithLayer(
            fabricImage,
            layerId,
            `generated-${Date.now()}`
          );

          // Add to canvas
          editor.canvas.add(fabricImage);
          editor.canvas.renderAll();

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load generated image"));
      };

      img.src = imageDataUrl;
    });
  };

  const hasReferenceImages =
    currentLayer?.referenceImageUrls &&
    currentLayer.referenceImageUrls.length > 0;

  const hasImageData = !!currentLayer?.imageDataUrl;

  let buttonText = "Generate";
  if (isGenerating) {
    buttonText = "Generating...";
  } else if (currentLayer?.type === LayerType.Global) {
    if (hasMaskPaths && hasImageData) buttonText = "Inpaint Global Layer";
    else if (!hasImageData && hasReferenceImages)
      buttonText = "Generate Variation";
    else buttonText = "Generate Image";
  } else if (currentLayer?.type === LayerType.Sectional) {
    if (hasMaskPaths) buttonText = "Generate Inpainting";
    else buttonText = "Draw Mask to Inpaint";
  }

  // Check if we have a prompt (either on current layer or stored as sectionalPrompt)
  const hasPrompt =
    currentTab === "sectional"
      ? activeSectionalLayer?.prompt || activeGlobalLayer.sectionalPrompt
      : currentLayer?.prompt;

  const isButtonDisabled =
    isGenerating || !hasPrompt || (currentTab === "sectional" && !hasMaskPaths);

  return (
    <aside
      className={cn(
        "absolute left-[100px] top-0 bg-white border-r z-[60] w-[360px] h-full flex flex-col shadow-lg",
        activeTool === "ai" || ["brush", "eraser", "pan"].includes(activeTool)
          ? "visible"
          : "hidden"
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

              {activeGlobalLayer.referenceImageUrls &&
                activeGlobalLayer.referenceImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {activeGlobalLayer.referenceImageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={url}
                          alt={`Reference ${index + 1}`}
                          width={160}
                          height={80}
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
                {/* Active Layer Info */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">
                    Active Mask Layer
                  </p>
                  <p className="text-xs text-blue-600">
                    {activeSectionalLayer.name}
                  </p>
                  <p className="text-xs text-blue-500">
                    Masks drawn will be saved to this layer
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Inpainting Prompt
                  </label>
                  <Textarea
                    value={
                      activeSectionalLayer
                        ? activeSectionalLayer.prompt || ""
                        : activeGlobalLayer.sectionalPrompt || ""
                    }
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
                  Mask some areas from the image on the current layer to
                  generate partial edits.
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
                  <label className="text-sm font-medium block text-left">
                    Start Masking
                  </label>
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
