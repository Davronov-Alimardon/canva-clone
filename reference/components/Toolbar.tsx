
import React from 'react';
import { Tool, AspectRatio } from '../types';
import { BrushIcon, EraserIcon, PanIcon, RedoIcon, UndoIcon, BringForwardIcon, SendBackwardIcon, BringToFrontIcon, SendToBackIcon } from './icons';
import ToolbarButton from './ToolbarButton';

interface ToolbarProps {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isDrawableLayerActive: boolean;
  isArrangeableLayerActive: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setCurrentTool,
  brushSize,
  setBrushSize,
  isDrawableLayerActive,
  isArrangeableLayerActive,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  aspectRatio,
  onAspectRatioChange,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  className,
}) => {
  return (
    <div className={`bg-gray-900 p-2 flex items-center gap-x-3 ${className}`}>
      {/* Tools Group */}
      <div className="flex items-center gap-x-1 p-1 bg-gray-800 rounded-lg">
        <ToolbarButton title="Pan" onClick={() => setCurrentTool(Tool.Pan)} isActive={currentTool === Tool.Pan}>
          <PanIcon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton title="Brush" onClick={() => setCurrentTool(Tool.Brush)} isActive={currentTool === Tool.Brush} disabled={!isDrawableLayerActive}>
          <BrushIcon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton title="Eraser" onClick={() => setCurrentTool(Tool.Eraser)} isActive={currentTool === Tool.Eraser} disabled={!isDrawableLayerActive}>
          <EraserIcon className="w-5 h-5" />
        </ToolbarButton>
      </div>

      <div className="h-6 w-px bg-gray-700" />

      {/* Aspect Ratio Group */}
      <div className="flex items-center gap-x-1 p-1 bg-gray-800 rounded-lg">
        <ToolbarButton title="1:1" onClick={() => onAspectRatioChange('1:1')} isActive={aspectRatio === '1:1'}>
          <span className="text-xs font-semibold px-1">1:1</span>
        </ToolbarButton>
        <ToolbarButton title="9:16" onClick={() => onAspectRatioChange('9:16')} isActive={aspectRatio === '9:16'}>
          <span className="text-xs font-semibold px-1">9:16</span>
        </ToolbarButton>
        <ToolbarButton title="4:5" onClick={() => onAspectRatioChange('4:5')} isActive={aspectRatio === '4:5'}>
          <span className="text-xs font-semibold px-1">4:5</span>
        </ToolbarButton>
      </div>

      <div className="h-6 w-px bg-gray-700" />

      {/* History Group */}
      <div className="flex items-center gap-x-1 p-1 bg-gray-800 rounded-lg">
        <ToolbarButton title="Undo" onClick={onUndo} disabled={!canUndo}>
          <UndoIcon className="w-5 h-5" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={onRedo} disabled={!canRedo}>
          <RedoIcon className="w-5 h-5" />
        </ToolbarButton>
      </div>

      {/* Arrange Group - Only shows when a sectional layer is active */}
      {isArrangeableLayerActive && (
        <>
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center gap-x-1 p-1 bg-gray-800 rounded-lg">
            <ToolbarButton title="Bring Forward" onClick={onBringForward}>
              <BringForwardIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton title="Send Backward" onClick={onSendBackward}>
              <SendBackwardIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton title="Bring to Front" onClick={onBringToFront}>
              <BringToFrontIcon className="w-5 h-5" />
            </ToolbarButton>
            <ToolbarButton title="Send to Back" onClick={onSendToBack}>
              <SendToBackIcon className="w-5 h-5" />
            </ToolbarButton>
          </div>
        </>
      )}

      {/* Brush Size Slider */}
      {(currentTool === Tool.Brush || currentTool === Tool.Eraser) && isDrawableLayerActive && (
        <>
          <div className="h-6 w-px bg-gray-700" />
          <div className="flex items-center space-x-2">
            <label htmlFor="brushSize" className="text-sm">Size:</label>
            <input id="brushSize" type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32" />
            <span className="text-sm w-8 text-center">{brushSize}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default Toolbar;
