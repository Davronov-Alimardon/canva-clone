
import React from 'react';
import { Layer, LayerType } from '../types';
import { GenerateIcon } from './icons';

interface PromptPanelProps {
  layer: Layer;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
}

const PromptPanel: React.FC<PromptPanelProps> = ({
  layer,
  onPromptChange,
  onGenerate,
}) => {
  const isGlobal = layer.type === LayerType.Global;

  let buttonText = 'Generate';
  const hasMaskPaths = layer.objects?.some(o => o.type?.toLowerCase() === 'path');
  const hasReferenceImages = layer.referenceImageUrls && layer.referenceImageUrls.length > 0;
  const hasImageData = !!layer.imageDataUrl;

  if (isGlobal) {
    if (hasMaskPaths && hasImageData) {
      buttonText = 'Inpaint Global Layer';
    } else if (!hasImageData && hasReferenceImages) {
      buttonText = 'Generate Variation';
    } else {
      buttonText = 'Generate Image';
    }
  } else { // Sectional Layer
    if (hasMaskPaths) {
       buttonText = 'Inpaint Section';
    } else {
       buttonText = 'Draw Mask to Inpaint';
    }
  }
  
  const isButtonDisabled = !layer.prompt || (layer.type === LayerType.Sectional && !hasMaskPaths);
  const placeholderText = isGlobal ? 'e.g., A mountain landscape...' : 'e.g., Add a cabin...';

  return (
    <div className="bg-gray-800 p-3 rounded-lg flex flex-col space-y-3">
      <h2 className="text-sm font-bold">{isGlobal ? 'Global Prompt' : `Prompt for ${layer.name}`}</h2>
      <textarea
        value={layer.prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={placeholderText}
        rows={4}
        className="w-full p-2 bg-gray-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <button
        onClick={onGenerate}
        disabled={isButtonDisabled}
        className="flex items-center justify-center w-full p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
      >
        <GenerateIcon className="w-5 h-5 mr-2" />
        {buttonText}
      </button>

      {isGlobal && !hasImageData && (
         <p className="text-xs text-center text-gray-500">
           Use the prompt above or upload reference images to generate a variation.
         </p>
      )}
    </div>
  );
};

export default PromptPanel;