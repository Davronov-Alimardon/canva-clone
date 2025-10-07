import React, { useMemo, useState } from "react";
import { useLayersStore, BASE_CANVAS_ID } from "@/features/editor/hooks/use-layer-store";
import { LayerType, Layer } from "@/features/editor/types";
import {
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Minus,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react"; 
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LayersPanelProps {
  className?: string;
  onOpenAiSectional?: () => void;
}

interface LayerTreeNode extends Layer {
  children: Layer[];
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ className, onOpenAiSectional }) => {
  const {
    layers,
    activeGlobalLayerId,
    addGlobalLayer,
    addSectionalLayer,
    deleteLayer,
    setActiveGlobalLayer,
    selectLayer,
    toggleVisibility,
    reorderLayers,
  } = useLayersStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(
    new Set([activeGlobalLayerId]) 
  );

   const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  
  // Build tree structure from flat array
  const layerTree = useMemo((): LayerTreeNode[] => {
    const globals = layers.filter(l => l.type === LayerType.Global);
    const sectionals = layers.filter(l => l.type === LayerType.Sectional);
    
     const baseCanvas = globals.find(l => l.id === BASE_CANVAS_ID);
    const otherGlobals = globals.filter(l => l.id !== BASE_CANVAS_ID);

     const nonEmptyGlobals = otherGlobals.filter(layer => 
      layer.id === BASE_CANVAS_ID || 
      layer.objects.length > 0 || 
      layer.imageDataUrl
    );
    
    // Reverse the order of other globals so top visual layer is at top of panel
    const reversedGlobals = [...nonEmptyGlobals].reverse();
    
    // Combine: reversed globals first, then Base Canvas at bottom
    const sortedGlobals = baseCanvas 
      ? [...reversedGlobals, baseCanvas]
      : reversedGlobals;
    
    return sortedGlobals.map(global => ({
      ...global,
      children: sectionals.filter(s => s.parentId === global.id)
    }));
  }, [layers]);

  const hasGlobalLayers = useMemo(() => 
    layers.some(layer => layer.type === LayerType.Global),
      [layers]
  );

  // Add new global layer
  const handleAddGlobalLayer = () => addGlobalLayer();

  // 🔹 Toggle expand/collapse
  const handleToggleExpand = (layerId: string) => {
    setExpandedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  // 🔹 Select layer (with different behavior for global/sectional)
  const handleSelectLayer = (layer: Layer) => {
    selectLayer(layer.id);
    if (layer.type === LayerType.Global) {
      setActiveGlobalLayer(layer.id);
      // Auto-expand when selecting a global layer
      if (!expandedLayers.has(layer.id)) {
        handleToggleExpand(layer.id);
      }
    }
  };

  // 🔹 Add sectional layer to a global
  const handleAddSectionalLayer = (globalLayerId: string) => {
    addSectionalLayer(globalLayerId);
    // Ensure the parent is expanded
    if (!expandedLayers.has(globalLayerId)) {
      handleToggleExpand(globalLayerId);
    }

    if (onOpenAiSectional) {
      onOpenAiSectional();
    }
  };

  // 🔹 Drag and drop
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  };

   const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropTargetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === dropTargetId) return;

    const reordered = [...layers];
    const from = reordered.findIndex((l) => l.id === draggedId);
    const to = reordered.findIndex((l) => l.id === dropTargetId);
    if (from === -1 || to === -1) return;

    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    reorderLayers(reordered);
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => e.preventDefault();
  const handleDragEnd = () => setDraggedId(null);

   // Render a single layer item
  const renderLayerItem = (layer: Layer, depth: number = 0, isChild: boolean = false) => {
    const thumbnail = layer.imageDataUrl || layer.referenceImageUrls?.[0];
    const isActive = layer.id === activeGlobalLayerId;
    const isGlobal = layer.type === LayerType.Global;
    const isBaseCanvas = layer.id === BASE_CANVAS_ID; 
    const isExpanded = expandedLayers.has(layer.id);
    const hasChildren = isGlobal && 
      (layerTree.find(g => g.id === layer.id)?.children?.length ?? 0) > 0;

  return (
     <div key={layer.id} className="space-y-1">
        {/* Main Layer Row */}
        <li
          draggable={!isChild}
          onDragStart={(e) => !isChild && handleDragStart(e, layer.id)}
          onDrop={(e) => handleDrop(e, layer.id)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onClick={() => handleSelectLayer(layer)}
          className={cn(
            "flex items-center p-2 rounded-md transition cursor-pointer group",
            "hover:border-gray-300",
            isActive 
              ? "bg-gray-800 text-white" 
              : "bg-secondary hover:bg-gray-600/50 text-gray-400",
            draggedId === layer.id && "opacity-50",
            // indentation based on layer type
            !isGlobal && "ml-5",     
          )}
          
        >
          {/* Expand/Collapse Button for Global Layers */}
          {isGlobal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(layer.id);
              }}
              className={cn(
                "w-4 h-4 flex items-center justify-center mr-1 transition",
                isActive ? "text-primary-foreground" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )
              ) : (
                <div className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Drag Handle */}
          {isGlobal ? (
            <GripVertical className={cn(
              "w-4 h-4 mr-1 flex-shrink-0",
              isActive ? "text-white" : "text-gray-500"
            )} />
          ) : (
            <GripVertical className={cn(
    "w-4 h-4 mr-1 flex-shrink-0",
    isActive ? "text-white" : "text-gray-400" 
  )} />
          )}

          {/* Thumbnail */}
          {thumbnail ? (
            <div className="relative w-8 h-8 rounded-sm mr-2 bg-gray-600 flex-shrink-0 overflow-hidden">
              <Image
                fill
                src={thumbnail}
                alt={layer.name}
                className="object-cover"
              />
            </div>
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-sm mr-2",
              isGlobal ? "bg-gray-600" : "bg-gray-500"
            )} />
          )}

          {/* Layer Name */}
          <span className="flex-1 text-sm truncate">{layer.name}</span>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-2">
            {/* Visibility Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(layer.id);
              }}
              className={cn(
                "transition",
                isActive ? "text-white hover:text-gray-200" : "text-gray-400 hover:text-white"
              )}
            >
              {layer.isVisible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>

            {/* Sectional Button (only for global layers and only when there are global layers) */}
            {isGlobal && hasGlobalLayers && !isBaseCanvas && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddSectionalLayer(layer.id);
                }}
                className={cn(
                  "transition",
                  isActive ? "text-white hover:text-gray-200" : "text-gray-400 hover:text-white"
                )}
                title="Add inpaint mask"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

             {/* Delete Button removed for base canvas */}
      {!isBaseCanvas && ( 
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteLayer(layer.id);
          }}
          className={cn(
            "transition",
            isActive ? "text-white hover:text-red-300" : "text-gray-400 hover:text-red-500"
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  </li>

        {/* Render Children if Expanded */}
        {isGlobal && isExpanded && (
          <div className="space-y-1">
            {layerTree
              .find(g => g.id === layer.id)
              ?.children.map(childLayer => 
                renderLayerItem(childLayer, depth + 1, true)
              )}
          </div>
        )}
      </div>
    );
  };

   if (isMinimized) {
    return (
      <div className={cn("bg-white p-2 rounded-lg text-white h-full flex flex-col", className)}>
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-normal text-black">Layers</h2>
          <button
            onClick={toggleMinimize}
            title="Expand layers panel"
            className="p-1 text-gray-400 hover:text-black transition"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white p-2 rounded-lg text-white h-full flex flex-col", className)}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-normal text-black">Layers</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMinimize}
            title="Minimize layers panel"
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Layer Tree */}
      <ul className="space-y-1 overflow-y-auto">
        {layerTree.length === 0 ? (
          <li className="text-center text-sm text-gray-500 py-4">
            No layers yet. Add a global layer to start.
          </li>
        ) : (
          layerTree.map(globalLayer => renderLayerItem(globalLayer))
        )}
      </ul>
    </div>
  );
};
