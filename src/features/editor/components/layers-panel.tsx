import React, { useRef, useState } from "react";
import { useLayersStore } from "@/features/editor/hooks/use-layer-store";
import { LayerType } from "@/features/editor/types";
import {
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Upload,
  GripVertical,
  Layers as Flatten,
  Blend,
} from "lucide-react"; 
import Image from "next/image";

export const LayersPanel = () => {
  const {
    layers,
    activeLayerId,
    addLayer,
    deleteLayer,
    selectLayer,
    toggleVisibility,
    reorderLayers,
    addImageLayer,
  } = useLayersStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isFlattening, setIsFlattening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔹 Add new layer
  const handleAddLayer = () => addLayer();

  // 🔹 Upload image(s)
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) addImageLayer(file, dataUrl);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // 🔹 Drag-and-drop reordering
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

  // 🔹 Flatten visible layers (pseudo for now)
  const handleFlattenAndEnhance = async () => {
    setIsFlattening(true);
    // TODO: implement merge visible layers with Fabric.js, then push to AI
    setTimeout(() => setIsFlattening(false), 1000);
  };

  const canFlatten = layers.filter((l) => l.isVisible && l.type !== LayerType.Global).length > 1;

  const displayedLayers = [...layers].reverse();

  return (
    <div className="bg-gray-800 p-2 rounded-lg text-white h-full flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-bold">Layers</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddLayer}
            title="Add new layer"
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleUploadClick}
            title="Upload image(s)"
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Layer list */}
      <ul className="space-y-1 overflow-y-auto">
        {displayedLayers.map((layer) => {
          const thumbnail = layer.imageDataUrl || layer.referenceImageUrls?.[0];
          const isActive = layer.id === activeLayerId;
          const isDraggable = layer.type !== LayerType.Global;

          return (
            <li
              key={layer.id}
              draggable={isDraggable}
              onDragStart={(e) => isDraggable && handleDragStart(e, layer.id)}
              onDrop={(e) => handleDrop(e, layer.id)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onClick={() => selectLayer(layer.id)}
              className={`flex items-center p-2 rounded-md transition ${
                isActive ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
              } ${draggedId === layer.id ? "opacity-50" : ""}`}
            >
              {isDraggable ? (
                <GripVertical className="w-4 h-4 text-gray-500 mr-2" />
              ) : (
                <div className="w-4 mr-2" />
              )}
              {thumbnail ? (
                <Image
                  fill
                  src={thumbnail}
                  alt={layer.name}
                  className="w-8 h-8 object-cover rounded-sm mr-2 bg-gray-600 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-sm mr-2 bg-gray-600" />
              )}
              <span className="flex-1 text-sm truncate">{layer.name}</span>

              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(layer.id);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  {layer.isVisible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>

                {layer.type !== LayerType.Global && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(layer.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
