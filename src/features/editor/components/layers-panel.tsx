// layers-panel.tsx - simplified version
import React, { useMemo, useState, useEffect } from "react";
import {
  useLayersStore,
  BASE_CANVAS_ID,
} from "@/features/editor/hooks/use-layer-store";
import { LayerType, Layer } from "@/features/editor/types";
import {
  Eye,
  EyeOff,
  Trash2,
  Minus,
  GripVertical,
  Folder,
  Brush,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LayersPanelProps {
  className?: string;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const {
    layers,
    activeGlobalLayerId,
    activeSectionalLayerId,
    deleteLayer,
    setActiveGlobalLayer,
    selectLayer,
    toggleVisibility,
    reorderLayers,
    getLayerTree,
  } = useLayersStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Build hierarchical layer list with sectional layers
  const layerList = useMemo((): Layer[] => {
    const layerTree = getLayerTree();
    const flattenedLayers: Layer[] = [];

    const allGlobals = layerTree.filter((l) => l.type === LayerType.Global);
    const visibleGlobals = allGlobals.filter((layer) => layer.isVisible);

    // Reverse the order so top visual layer is at top of panel
    const reversedGlobals = [...visibleGlobals].reverse();

    reversedGlobals.forEach((globalLayer) => {
      flattenedLayers.push(globalLayer);

      // Add sectional layers as children
      if (globalLayer.children && globalLayer.children.length > 0) {
        globalLayer.children.forEach((sectionalLayer) => {
          if (sectionalLayer.isVisible) {
            flattenedLayers.push({
              ...sectionalLayer,
              isChild: true,
            });
          }
        });
      }
    });

    return flattenedLayers;
  }, [layers, getLayerTree]);

  const handleSelectLayer = (layer: Layer) => {
    selectLayer(layer.id);
    if (layer.type === LayerType.Global) {
      setActiveGlobalLayer(layer.id);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLLIElement>,
    dropTargetId: string
  ) => {
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

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) =>
    e.preventDefault();
  const handleDragEnd = () => setDraggedId(null);

  // Render a single layer item
  const renderLayerItem = (layer: Layer) => {
    const thumbnail = layer.imageDataUrl || layer.referenceImageUrls?.[0];
    const isActive =
      layer.type === LayerType.Global
        ? layer.id === activeGlobalLayerId
        : layer.id === activeSectionalLayerId;
    const isBaseCanvas = layer.id === BASE_CANVAS_ID;
    const isChild = layer.isChild || layer.type === LayerType.Sectional;

    const shouldReduceOpacity =
      layer.type === LayerType.Global &&
      activeSectionalLayerId &&
      layers.find((l) => l.id === activeSectionalLayerId)?.parentId ===
        layer.id;

    const layerElement = (
      <li
        key={layer.id}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, layer.id)}
        onDrop={(e) => handleDrop(e, layer.id)}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onClick={() => handleSelectLayer(layer)}
        className={cn(
          "flex items-center p-2 rounded-md transition cursor-pointer group",
          "hover:border-gray-300",
          isActive
            ? "bg-gray-800 text-white"
            : "bg-secondary hover:bg-gray-600/50 text-gray-400 border-transparent",
          draggedId === layer.id && "opacity-50",
          isChild && "ml-6",
          shouldReduceOpacity && "opacity-80"
        )}
      >
        {/* Layer Type Icon */}
        {isChild ? (
          <Brush
            className={cn(
              "w-4 h-4 mr-2 flex-shrink-0",
              isActive ? "text-white" : "text-orange-500"
            )}
          />
        ) : (
          <Folder
            className={cn(
              "w-4 h-4 mr-2 flex-shrink-0",
              isActive ? "text-white" : "text-blue-500"
            )}
          />
        )}

        {/* Drag Handle */}
        <GripVertical
          className={cn(
            "w-4 h-4 mr-2 flex-shrink-0",
            isActive ? "text-white" : "text-gray-500"
          )}
        />

        {/* Thumbnail */}
        {thumbnail ? (
          <div className="relative w-8 h-8 rounded-sm mr-2 bg-gray-600 flex-shrink-0 overflow-hidden">
            <img src={thumbnail} alt={layer.name} className="object-cover" />
          </div>
        ) : (
          <div className={cn("w-8 h-8 rounded-sm mr-2", "bg-gray-600")} />
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
              isActive
                ? "text-white hover:text-gray-200"
                : "text-gray-400 hover:text-white"
            )}
          >
            {layer.isVisible ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>

          {/* Delete Button removed for base canvas */}
          {!isBaseCanvas && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteLayer(layer.id);
              }}
              className={cn(
                "transition",
                isActive
                  ? "text-white hover:text-red-300"
                  : "text-gray-400 hover:text-red-500"
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </li>
    );

    return layerElement;
  };

  if (isMinimized) {
    return (
      <div
        className={cn(
          "bg-white p-2 rounded-lg text-white h-full flex flex-col",
          className
        )}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-normal text-black">Layers</h2>
          <button
            onClick={toggleMinimize}
            title="Expand layers panel"
            className="p-1 text-gray-400 hover:text-black transition"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white p-2 rounded-lg text-white h-full flex flex-col",
        className
      )}
    >
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

      {/* Layer List */}
      <ul className="space-y-1 overflow-y-auto">
        {layerList.length === 0 ? (
          <li className="text-center text-sm text-gray-500 py-4">
            No layers yet. Add a global layer to start.
          </li>
        ) : (
          layerList.map((layer) => renderLayerItem(layer))
        )}
      </ul>
    </div>
  );
};
