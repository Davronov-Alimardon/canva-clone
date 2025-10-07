
import React, { useRef, useState } from 'react';
import { Layer, LayerType } from '../types';
import { EyeIcon, EyeOffIcon, TrashIcon, PlusIcon, UploadIcon, GripVerticalIcon, BlendIcon, FlattenIcon } from './icons';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onSelectLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onImageUpload: (files: FileList) => void;
  onReorderLayers: (layers: Layer[]) => void;
  onBlendLayer: (id: string) => void;
  onFlattenAndEnhanceRequest: () => void;
  canFlatten: boolean;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onAddLayer,
  onSelectLayer,
  onDeleteLayer,
  onToggleVisibility,
  onImageUpload,
  onReorderLayers,
  onBlendLayer,
  onFlattenAndEnhanceRequest,
  canFlatten,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Handler/helpers

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImageUpload(files);
      event.target.value = '';
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropTargetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null);
      return;
    }

    const reorderedLayers = [...layers];
    const fromIndex = reorderedLayers.findIndex(l => l.id === draggedId);
    let toIndex = reorderedLayers.findIndex(l => l.id === dropTargetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }

    // If the drop target is the global layer, interpret this as moving the dragged layer
    // to the position just above the global layer (index 1 in the state array).
    if (reorderedLayers[toIndex]?.type === LayerType.Global) {
      // If we are dragging the layer that is already at index 1, do nothing.
      if (fromIndex === 1) {
        setDraggedId(null);
        return;
      }
      toIndex = 1;
    }

    const [removed] = reorderedLayers.splice(fromIndex, 1);
    reorderedLayers.splice(toIndex, 0, removed);
    
    onReorderLayers(reorderedLayers);
    setDraggedId(null);
  };


  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Reverse the array for display purposes (top layer on top)
  const displayedLayers = [...layers].reverse();

  return (
    <div className="bg-gray-800 p-2 rounded-lg">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        multiple
      />
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-bold">Layers</h2>
        <div className="flex items-center space-x-2">
            <button onClick={onAddLayer} title="Add Sectional Layer" className="p-1 text-gray-400 hover:text-white transition">
                <PlusIcon className="w-5 h-5" />
            </button>
            <button onClick={handleUploadClick} title="Upload Images to Active Layer" className="p-1 text-gray-400 hover:text-white transition">
                <UploadIcon className="w-5 h-5" />
            </button>
             <button onClick={onFlattenAndEnhanceRequest} disabled={!canFlatten} title="Flatten Visible Layers and Enhance with AI" className="p-1 text-gray-400 hover:text-white transition disabled:text-gray-600 disabled:cursor-not-allowed">
                <FlattenIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      <ul className="space-y-1">
        {displayedLayers.map((layer) => {
            const thumbnailData = layer.imageDataUrl || (layer.referenceImageUrls && layer.referenceImageUrls[0]);
            const isDraggable = layer.type !== LayerType.Global;
            return (
              <li
                key={layer.id}
                draggable={isDraggable}
                onDragStart={(e) => isDraggable && handleDragStart(e, layer.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectLayer(layer.id)}
                className={`flex items-center p-2 rounded-md transition ${
                  activeLayerId === layer.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                } ${isDraggable ? 'cursor-grab' : 'cursor-pointer'} ${draggedId === layer.id ? 'opacity-50' : ''}`}
              >
                {isDraggable && (
                   <span className="text-gray-500 mr-2 cursor-grab" onMouseDown={(e) => e.stopPropagation()}>
                       <GripVerticalIcon className="w-4 h-4" />
                   </span>
                )}
                 {!isDraggable && <div className="w-4 mr-2"></div>}
                
                {thumbnailData ? (
                    <img 
                        src={thumbnailData} 
                        alt={layer.name} 
                        className="w-8 h-8 object-cover rounded-sm mr-2 bg-gray-600 flex-shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-sm mr-2 bg-gray-600 flex-shrink-0"></div>
                )}
                <span className="flex-1 text-sm truncate">{layer.name}</span>
                <div className="flex items-center space-x-2 ml-2">
                  <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} className="text-gray-400 hover:text-white">
                    {layer.isVisible ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                  </button>
                  {layer.type !== LayerType.Global && layer.isVisible && (
                    <button onClick={(e) => { e.stopPropagation(); onBlendLayer(layer.id); }} title="Blend Layer Down" className="text-gray-400 hover:text-green-400">
                      <BlendIcon className="w-4 h-4" />
                    </button>
                  )}
                  {layer.type !== LayerType.Global && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }} className="text-gray-400 hover:text-red-500">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            )
        })}
      </ul>
    </div>
  );
};

export default LayersPanel;
