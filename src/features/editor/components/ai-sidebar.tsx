import { useState } from "react";
import { useLayersStore } from "@/features/editor/hooks/use-layer-store";
import { ActiveTool, LayerType } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Editor } from "@/features/editor/types";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}


export const AiSidebar = ({
  // Wait for AI integration
  editor: _editor,
  activeTool,
  onChangeActiveTool,
}: AiSidebarProps) => {
  const { layers, activeLayerId, updateLayer } = useLayersStore();
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const globalLayer = layers.find((l) => l.type === LayerType.Global);

  const [tab, setTab] = useState<"global" | "sectional">("global");
  const [isGenerating, setIsGenerating] = useState(false);

  const currentLayer =
    tab === "global" ? globalLayer : activeLayer?.type === LayerType.Sectional ? activeLayer : null;

  const onClose = () => onChangeActiveTool("select");

  const onPromptChange = (prompt: string) => {
    if (!currentLayer) return;
    updateLayer(currentLayer.id, { prompt }, false);
  };

  const onGenerate = async () => {
    if (!currentLayer) return;
    setIsGenerating(true);

    // Here you'd trigger AI generation (pseudo-code)
    // const result = await generateImageAPI(currentLayer.prompt, currentLayer.referenceImageUrls);
    // updateLayer(currentLayer.id, { imageDataUrl: result.dataUrl });

    setTimeout(() => {
      setIsGenerating(false);
    }, 1200);
  };

  if (!currentLayer) {
    return null;
  }

  const hasMaskPaths = currentLayer.objects?.some(
    (o) => o.type?.toLowerCase() === "path"
  );
  const hasReferenceImages =
    currentLayer.referenceImageUrls && currentLayer.referenceImageUrls.length > 0;
  const hasImageData = !!currentLayer.imageDataUrl;

  let buttonText = "Generate";
  if (currentLayer.type === LayerType.Global) {
    if (hasMaskPaths && hasImageData) buttonText = "Inpaint Global Layer";
    else if (!hasImageData && hasReferenceImages) buttonText = "Generate Variation";
    else buttonText = "Generate Image";
  } else {
    if (hasMaskPaths) buttonText = "Inpaint Section";
    else buttonText = "Draw Mask to Inpaint";
  }

  const isButtonDisabled =
    !currentLayer.prompt ||
    (currentLayer.type === LayerType.Sectional && !hasMaskPaths);
  const placeholderText =
    currentLayer.type === LayerType.Global
      ? "e.g., A futuristic city skyline at dusk..."
      : "e.g., Add a neon sign on the building...";

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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "global" | "sectional")}
        className="flex flex-col flex-1"
      >
        <TabsList className="grid grid-cols-2 m-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="sectional">Sectional</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-4 space-y-4">
          <TabsContent value="global">
            {globalLayer ? (
              <div className="flex flex-col space-y-4">
                <Textarea
                  value={globalLayer.prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="e.g., A serene beach sunrise..."
                  rows={5}
                />
                <Button
                  onClick={onGenerate}
                  disabled={isButtonDisabled || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? "Generating..." : buttonText}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No global layer found. Please check your layer setup.
              </p>
            )}
          </TabsContent>

          <TabsContent value="sectional">
            {activeLayer && activeLayer.type === LayerType.Sectional ? (
              <div className="flex flex-col space-y-4">
                <Textarea
                  value={activeLayer.prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder={placeholderText}
                  rows={5}
                />
                <Button
                  onClick={onGenerate}
                  disabled={isButtonDisabled || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? "Generating..." : buttonText}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Select a sectional layer to edit its prompt.
              </p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
