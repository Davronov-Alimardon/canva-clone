
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';
import { Layer, LayerType, Tool, AspectRatio } from './types';
import LayersPanel from './components/LayersPanel';
import PromptPanel from './components/PromptPanel';
import Toolbar from './components/Toolbar';
import CanvasComponent from './components/CanvasComponent';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorModal from './components/ErrorModal';
import ConfirmationModal from './components/ConfirmationModal';
import ImageBin from './components/ImageBin';
import { refinePrompt, editImage, generateImage, generateImageVariation, isGeminiApiError, refinePromptWithVisualContext, enhanceImage, generateInpaintedSection } from './services/geminiService';
import { fileToBase64, getCompositeImage, generateMaskFromObjects, resizeImage, cropImage, getBoundingBoxFromDataUrl } from './utils/imageUtils';

const initialGlobalLayer: Layer = {
  id: uuidv4(),
  name: 'Global Layer',
  type: LayerType.Global,
  imageDataUrl: null,
  referenceImageUrls: [],
  maskDataUrl: null,
  isVisible: true,
  prompt: '',
  objects: [],
};

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([initialGlobalLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0].id);
  const [currentTool, setCurrentTool] = useState<Tool>(Tool.Pan);
  const [brushSize, setBrushSize] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, { past: any[][], future: any[][] }>>({});
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [isFlattenConfirmOpen, setIsFlattenConfirmOpen] = useState(false);


  const canvasDimensions = useMemo(() => {
    const MAX_DIMENSION = 800;
    switch (aspectRatio) {
      case '9:16':
        return { width: Math.round(MAX_DIMENSION * 9 / 16), height: MAX_DIMENSION };
      case '4:5':
        return { width: Math.round(MAX_DIMENSION * 4 / 5), height: MAX_DIMENSION };
      case '1:1':
      default:
        return { width: MAX_DIMENSION, height: MAX_DIMENSION };
    }
  }, [aspectRatio]);

  const activeLayer = useMemo(() => layers.find(l => l.id === activeLayerId) ?? layers[0], [layers, activeLayerId]);

  const updateLayer = (id: string, updates: Partial<Layer>, options?: { addToHistory?: boolean }) => {
    const { addToHistory = true } = options || {};

    setLayers(prevLayers => {
      if (addToHistory && 'objects' in updates) {
        const layerToUpdate = prevLayers.find(l => l.id === id);
        if (layerToUpdate) {
          const previousObjects = layerToUpdate.objects;
          setHistory(prevHistory => {
            const layerHistory = prevHistory[id] || { past: [], future: [] };
            
            const lastPastState = layerHistory.past[layerHistory.past.length - 1];
            if (JSON.stringify(lastPastState) !== JSON.stringify(previousObjects)) {
               return {
                ...prevHistory,
                [id]: {
                  past: [...layerHistory.past, previousObjects],
                  future: [],
                },
              };
            }
            return prevHistory;
          });
        }
      }
      
      return prevLayers.map(l => (l.id === id ? { ...l, ...updates } : l));
    });
  };
  
  const handleAddLayer = useCallback(() => {
    const newLayer: Layer = {
      id: uuidv4(),
      name: `Layer ${layers.length}`,
      type: LayerType.Sectional,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      prompt: '',
      objects: [],
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    setCurrentTool(Tool.Brush);
  }, [layers.length]);

  const handleSelectLayer = useCallback((id: string) => {
    setActiveLayerId(id);
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
    setLayers(prevLayers => {
      if (prevLayers.length <= 1) return prevLayers;

      const layerToDelete = prevLayers.find(l => l.id === id);
      if (!layerToDelete || layerToDelete.type === LayerType.Global) return prevLayers;

      if (activeLayerId === id) {
        const globalLayerId = prevLayers.find(l => l.type === LayerType.Global)?.id || prevLayers[0].id;
        setActiveLayerId(globalLayerId);
      }
      return prevLayers.filter(l => l.id !== id);
    });
    
    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      delete newHistory[id];
      return newHistory;
    });

  }, [activeLayerId]);
  
  const handleReorderLayers = useCallback((reorderedLayers: Layer[]) => {
    setLayers(reorderedLayers);
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setLayers(prevLayers =>
      prevLayers.map(l =>
        l.id === id ? { ...l, isVisible: !l.isVisible } : l
      )
    );
  }, []);
  
  const handlePromptChange = (prompt: string) => {
    updateLayer(activeLayerId, { prompt }, { addToHistory: false });
  };
  
  // const handleBlendLayer = useCallback(async (layerIdToBlend: string) => {
  //     const globalLayer = layers.find(l => l.type === LayerType.Global);
  //     const layerToBlend = layers.find(l => l.id === layerIdToBlend);

  //     if (!globalLayer || !layerToBlend || !layerToBlend.isVisible || layerToBlend.objects.length === 0) {
  //       // If there's nothing to blend, just delete the layer.
  //       handleDeleteLayer(layerIdToBlend);
  //       return;
  //     }

  //     setIsLoading(true);
  //     setLoadingMessage('Blending layer...');

  //     try {
  //       const newCompositeUrl = await getCompositeImage(
  //           [layerToBlend],
  //           canvasDimensions.width,
  //           canvasDimensions.height,
  //           globalLayer.imageDataUrl
  //       );

  //       if (newCompositeUrl) {
  //           updateLayer(globalLayer.id, { imageDataUrl: newCompositeUrl }, { addToHistory: false });
  //       }
        
  //       // After blending, remove the sectional layer
  //       handleDeleteLayer(layerIdToBlend);

  //     } catch (err) {
  //         console.error("Blending Error:", err);
  //         setError(err instanceof Error ? err.message : "An unknown error occurred during the blend operation.");
  //     } finally {
  //         setIsLoading(false);
  //         setLoadingMessage('');
  //     }
  // }, [layers, canvasDimensions, handleDeleteLayer]);

  const handleImageUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setLoadingMessage(`Uploading and resizing ${files.length} image(s)...`);
    try {
      const uploadPromises = Array.from(files).map(file => fileToBase64(file));
      const base64Images = await Promise.all(uploadPromises);
      const resizePromises = base64Images.map(base64 => resizeImage(base64, canvasDimensions.width, canvasDimensions.height));
      const resizedImages = await Promise.all(resizePromises);
      
      setLayers(prevLayers => prevLayers.map(l => {
        if (l.id === activeLayerId) {
          return { ...l, referenceImageUrls: [...l.referenceImageUrls, ...resizedImages] };
        }
        return l;
      }));
    } catch (error) {
       console.error("Error uploading images:", error);
       setError(`An error occurred during upload: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsLoading(false);
    }
  }, [activeLayerId, canvasDimensions]);
  
  const handleDeleteUploadedImage = useCallback((indexToDelete: number) => {
    setLayers(prevLayers => prevLayers.map(l => {
      if (l.id === activeLayerId) {
        return { ...l, referenceImageUrls: l.referenceImageUrls.filter((_, index) => index !== indexToDelete) };
      }
      return l;
    }));
  }, [activeLayerId]);


  // const handleGenerate = useCallback(async () => {
  //   if (!activeLayer || !activeLayer.prompt) return;

  //   setIsLoading(true);
    
  //   const maskObjects = activeLayer.objects.filter(o => o.type?.toLowerCase() === 'path');
  //   const isSectionalInpaint = activeLayer.type === LayerType.Sectional && maskObjects.length > 0;
  //   const isGlobalInpaint = activeLayer.type === LayerType.Global && maskObjects.length > 0 && !!activeLayer.imageDataUrl;
  //   const isVariation = activeLayer.type === LayerType.Global && !activeLayer.imageDataUrl && activeLayer.referenceImageUrls.length > 0;
    
  //   try {
  //     if (isSectionalInpaint) {
  //       setLoadingMessage('Preparing for generation...');

  //       const userDrawnMaskUrl = await generateMaskFromObjects(maskObjects, canvasDimensions.width, canvasDimensions.height);
  //       if (!userDrawnMaskUrl) throw new Error('Mask is missing for generation.');
        
  //       const layersForComposite = layers.filter(l => l.isVisible && layers.indexOf(l) < layers.indexOf(activeLayer));
  //       const globalLayer = layers.find(l => l.type === LayerType.Global);
  //       const baseImage = await getCompositeImage(layersForComposite, canvasDimensions.width, canvasDimensions.height, globalLayer?.imageDataUrl ?? null);

  //       if (!baseImage) throw new Error('Cannot generate without a source image to reference.');

  //       setLoadingMessage('Analyzing mask area...');
  //       const boundingBox = await getBoundingBoxFromDataUrl(
  //           userDrawnMaskUrl,
  //           canvasDimensions.width,
  //           canvasDimensions.height
  //       );
        
  //       if (!boundingBox) {
  //           console.warn("No content found in mask. Clearing mask.");
  //           updateLayer(activeLayer.id, {
  //               objects: activeLayer.objects.filter(o => o.type?.toLowerCase() !== 'path'),
  //               prompt: '',
  //           }, { addToHistory: false });
  //           return;
  //       }
        
  //       const cropBox = {
  //           left: boundingBox.left,
  //           top: boundingBox.top,
  //           width: (boundingBox.right - boundingBox.left) + 1,
  //           height: (boundingBox.bottom - boundingBox.top) + 1,
  //       };

  //       if (cropBox.width <= 0 || cropBox.height <= 0) {
  //         console.warn("Invalid mask dimensions. Clearing mask.");
  //         updateLayer(activeLayer.id, {
  //             objects: activeLayer.objects.filter(o => o.type?.toLowerCase() !== 'path'),
  //             prompt: '',
  //         }, { addToHistory: false });
  //         return;
  //       }

  //       setLoadingMessage('Creating visual context from selection...');
  //       const croppedReferenceImage = await cropImage(baseImage, cropBox);

  //       setLoadingMessage('Generating new image with AI...');
  //       const generatedImageUrl = await generateInpaintedSection(activeLayer.prompt, croppedReferenceImage);
  //       const resizedGeneratedImage = await resizeImage(generatedImageUrl, cropBox.width, cropBox.height);

  //       setLoadingMessage('Placing generated image...');
        
  //       const img = await fabric.Image.fromURL(resizedGeneratedImage, { crossOrigin: 'anonymous' }).catch(() => {
  //           throw new Error('Failed to load generated AI result into fabric object.');
  //       });
        
  //       img.set({
  //           left: cropBox.left,
  //           top: cropBox.top,
  //           originX: 'left',
  //           originY: 'top',
  //           // @ts-ignore
  //           layerId: activeLayer.id,
  //           selectable: true,
  //           evented: true,
  //       });
        
  //       const newImageObject = img.toObject(['layerId'] as any);
  //       const existingImageObjects = activeLayer.objects.filter(o => o.type?.toLowerCase() !== 'path');

  //       updateLayer(activeLayer.id, {
  //           imageDataUrl: resizedGeneratedImage, // Used for thumbnail
  //           maskDataUrl: null, // Mask is used up, clear it from state
  //           objects: [...existingImageObjects, newImageObject],
  //           prompt: '', // Clear prompt
  //       });
  //     } else if (isGlobalInpaint) {
  //       setLoadingMessage('Preparing for inpainting...');

  //       const userDrawnMaskUrl = await generateMaskFromObjects(maskObjects, canvasDimensions.width, canvasDimensions.height, { scale: 0.95 });
  //       if (!userDrawnMaskUrl) throw new Error('Mask is missing for inpainting.');
        
  //       const visibleSectionalLayers = layers.filter(l => l.type === LayerType.Sectional && l.isVisible);
  //       const baseImage = await getCompositeImage(visibleSectionalLayers, canvasDimensions.width, canvasDimensions.height, activeLayer.imageDataUrl);

  //       if (!baseImage) throw new Error('Cannot inpaint without a source image.');

  //       let refinedPrompt: string;
        
  //       setLoadingMessage('Analyzing image context...');
  //       refinedPrompt = await refinePromptWithVisualContext(
  //         baseImage,
  //         userDrawnMaskUrl,
  //         canvasDimensions.width,
  //         canvasDimensions.height,
  //         activeLayer.prompt,
  //         layers[0].prompt
  //       );
        
  //       setLoadingMessage('Inpainting with AI...');
  //       const editedImageFromApi = await editImage(baseImage, refinedPrompt, userDrawnMaskUrl);
  //       const resizedEditedImage = await resizeImage(editedImageFromApi, canvasDimensions.width, canvasDimensions.height);

  //        updateLayer(activeLayer.id, {
  //            imageDataUrl: resizedEditedImage,
  //            maskDataUrl: null,
  //            objects: [], // Clear mask paths
  //            prompt: '',
  //        });
  //     } else if (isVariation) {
  //       setLoadingMessage('Refining prompt...');
  //       const refinedPrompt = await refinePrompt(activeLayer.prompt, layers[0].prompt);
  //       setLoadingMessage('Generating variation...');
  //       const generatedImageUrl = await generateImageVariation(refinedPrompt, activeLayer.referenceImageUrls);
  //       const resizedGeneratedImage = await resizeImage(generatedImageUrl, canvasDimensions.width, canvasDimensions.height);
        
  //       updateLayer(activeLayer.id, { 
  //           imageDataUrl: resizedGeneratedImage, 
  //           objects: [],
  //           prompt: '' 
  //       });
  //     } else { // Standard text-to-image for global layer
  //       setLoadingMessage('Generating image with AI...');
  //       const generatedImageUrl = await generateImage(activeLayer.prompt, aspectRatio);
  //       const resizedGeneratedImage = await resizeImage(generatedImageUrl, canvasDimensions.width, canvasDimensions.height);
        
  //       updateLayer(activeLayer.id, { 
  //           imageDataUrl: resizedGeneratedImage, 
  //           objects: [],
  //           prompt: '' 
  //       });
  //     }
  //   } catch (err) {
  //     console.error("AI Generation Error:", err);
  //     if (isGeminiApiError(err)) {
  //       setError(`AI API Error: ${err.error.message}`);
  //     } else {
  //       setError(err instanceof Error ? err.message : "An unknown error occurred during generation.");
  //     }
  //   } finally {
  //     setIsLoading(false);
  //     setLoadingMessage('');
  //   }
  // }, [activeLayer, layers, canvasDimensions, aspectRatio]);
  
  const handleUndo = useCallback(() => {
    const layerHistory = history[activeLayerId];
    if (layerHistory && layerHistory.past.length > 0) {
      const previous = layerHistory.past[layerHistory.past.length - 1];
      const newPast = layerHistory.past.slice(0, layerHistory.past.length - 1);
      
      setHistory(prev => ({
        ...prev,
        [activeLayerId]: { past: newPast, future: [activeLayer.objects, ...layerHistory.future] }
      }));
      
      setLayers(prevLayers =>
        prevLayers.map(l => (l.id === activeLayerId ? { ...l, objects: previous } : l))
      );
    }
  }, [history, activeLayerId, activeLayer.objects]);

  const handleRedo = useCallback(() => {
    const layerHistory = history[activeLayerId];
    if (layerHistory && layerHistory.future.length > 0) {
      const next = layerHistory.future[0];
      const newFuture = layerHistory.future.slice(1);

      setHistory(prev => ({
        ...prev,
        [activeLayerId]: { past: [...layerHistory.past, activeLayer.objects], future: newFuture }
      }));

       setLayers(prevLayers =>
        prevLayers.map(l => (l.id === activeLayerId ? { ...l, objects: next } : l))
      );
    }
  }, [history, activeLayerId, activeLayer.objects]);
  
  const handleBringForward = useCallback(() => {
    const layerId = activeLayerId;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === LayerType.Global) return;

    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex >= layers.length - 1) return;

    const reorderedLayers = [...layers];
    const layerToMove = reorderedLayers.splice(layerIndex, 1)[0];
    reorderedLayers.splice(layerIndex + 1, 0, layerToMove);

    setLayers(reorderedLayers);
  }, [activeLayerId, layers]);

  const handleSendBackward = useCallback(() => {
    const layerId = activeLayerId;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === LayerType.Global) return;

    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex <= 1) return;

    const reorderedLayers = [...layers];
    const layerToMove = reorderedLayers.splice(layerIndex, 1)[0];
    reorderedLayers.splice(layerIndex - 1, 0, layerToMove);
    
    setLayers(reorderedLayers);
  }, [activeLayerId, layers]);

  const handleBringToFront = useCallback(() => {
    const layerId = activeLayerId;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === LayerType.Global) return;

    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex === layers.length - 1) return;

    const reorderedLayers = [...layers];
    const layerToMove = reorderedLayers.splice(layerIndex, 1)[0];
    reorderedLayers.push(layerToMove);

    setLayers(reorderedLayers);
  }, [activeLayerId, layers]);

  const handleSendToBack = useCallback(() => {
    const layerId = activeLayerId;
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === LayerType.Global) return;
    
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex <= 1) return;

    const reorderedLayers = [...layers];
    const layerToMove = reorderedLayers.splice(layerIndex, 1)[0];
    reorderedLayers.splice(1, 0, layerToMove);

    setLayers(reorderedLayers);
  }, [activeLayerId, layers]);
  
  // const handleFlattenAndEnhance = useCallback(async () => {
  //   setIsFlattenConfirmOpen(false);
  //   setIsLoading(true);

  //   const visibleLayers = layers.filter(l => l.isVisible);
  //   if (visibleLayers.length <= 1) {
  //     setError("At least two layers must be visible to flatten and enhance.");
  //     setIsLoading(false);
  //     return;
  //   }

  //   try {
  //     setLoadingMessage('Compositing visible layers...');
  //     const globalLayer = layers.find(l => l.type === LayerType.Global);
  //     const visibleSectionalLayers = layers.filter(l => l.type === LayerType.Sectional && l.isVisible);

  //     const compositeImageUrl = await getCompositeImage(
  //       visibleSectionalLayers,
  //       canvasDimensions.width,
  //       canvasDimensions.height,
  //       globalLayer?.imageDataUrl ?? null
  //     );

  //     if (!compositeImageUrl) {
  //       throw new Error("Could not create a composite image from the visible layers.");
  //     }

  //     setLoadingMessage('Enhancing blended image with AI...');
  //     const enhancedImageUrl = await enhanceImage(compositeImageUrl);
  //     const resizedEnhancedImage = await resizeImage(enhancedImageUrl, canvasDimensions.width, canvasDimensions.height);

  //     setLoadingMessage('Finalizing new image...');
  //     const newGlobalLayer: Layer = {
  //       id: uuidv4(),
  //       name: 'Global Layer',
  //       type: LayerType.Global,
  //       imageDataUrl: resizedEnhancedImage,
  //       referenceImageUrls: [],
  //       maskDataUrl: null,
  //       isVisible: true,
  //       prompt: globalLayer?.prompt || 'Enhanced composite image',
  //       objects: [],
  //     };

  //     setLayers([newGlobalLayer]);
  //     setActiveLayerId(newGlobalLayer.id);
  //     setHistory({});

  //   } catch (err) {
  //     console.error("Flatten and Enhance Error:", err);
  //     if (isGeminiApiError(err)) {
  //       setError(`AI API Error: ${err.error.message}`);
  //     } else {
  //       setError(err instanceof Error ? err.message : "An unknown error occurred during the flatten and enhance operation.");
  //     }
  //   } finally {
  //     setIsLoading(false);
  //     setLoadingMessage('');
  //   }
  // }, [layers, canvasDimensions]);

  const canUndo = history[activeLayerId]?.past.length > 0;
  const canRedo = history[activeLayerId]?.future.length > 0;
  const isDrawableLayerActive = activeLayer.type === LayerType.Sectional || activeLayer.type === LayerType.Global;
  const isArrangeableLayerActive = activeLayer.type === LayerType.Sectional;
  const canFlatten = layers.filter(l => l.isVisible).length > 1;

  return (
    <div className="flex flex-col h-screen font-sans">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      {error && <ErrorModal message={error} onClose={() => setError(null)} />}
      {isFlattenConfirmOpen && (
        <ConfirmationModal
          title="Flatten & Enhance Layers"
          message="This will merge all visible layers into a single new background layer. All current layers and their undo history will be lost. This action cannot be undone. Are you sure?"
          confirmText="Yes, Flatten & Enhance"
          isOpen={isFlattenConfirmOpen}
          onClose={() => setIsFlattenConfirmOpen(false)}
          onConfirm={handleFlattenAndEnhance}
        />
      )}


      <header className="bg-gray-900 shadow-md z-10">
        <Toolbar
          currentTool={currentTool} setCurrentTool={setCurrentTool}
          brushSize={brushSize} setBrushSize={setBrushSize}
          isDrawableLayerActive={isDrawableLayerActive}
          isArrangeableLayerActive={isArrangeableLayerActive}
          onUndo={handleUndo} onRedo={handleRedo}
          canUndo={canUndo} canRedo={canRedo}
          aspectRatio={aspectRatio} onAspectRatioChange={setAspectRatio}
          onBringForward={handleBringForward} onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront} onSendToBack={handleSendToBack}
        />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-900 p-3 flex flex-col space-y-4 overflow-y-auto">
          <LayersPanel
            layers={layers} activeLayerId={activeLayerId}
            onAddLayer={handleAddLayer} onSelectLayer={handleSelectLayer}
            onDeleteLayer={handleDeleteLayer} onToggleVisibility={handleToggleVisibility}
            onImageUpload={handleImageUpload} onReorderLayers={handleReorderLayers}
            onBlendLayer={handleBlendLayer}
            onFlattenAndEnhanceRequest={() => setIsFlattenConfirmOpen(true)}
            canFlatten={canFlatten}
          />
        </aside>

        <main className="flex-1 flex items-center justify-center bg-gray-800 p-4 overflow-auto">
           <div className="shadow-2xl">
            <CanvasComponent
              layers={layers} activeLayer={activeLayer}
              tool={currentTool} brushSize={brushSize}
              onLayerUpdate={updateLayer}
              width={canvasDimensions.width} height={canvasDimensions.height}
              onCanvasReady={setCanvas}
              onSelectionChange={setSelectedObject}
            />
           </div>
        </main>

        <aside className="w-80 bg-gray-900 p-3 flex flex-col space-y-4 overflow-y-auto">
          <PromptPanel
            layer={activeLayer} onPromptChange={handlePromptChange} onGenerate={handleGenerate}
          />
          <ImageBin
            images={activeLayer.referenceImageUrls} onImageDelete={handleDeleteUploadedImage}
          />
        </aside>
      </div>
    </div>
  );
};

export default App;
