
import React from 'react';

type IconProps = React.HTMLAttributes<HTMLElement>;

export const EyeIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-eye ${className || ''}`.trim()} {...rest} />
);

export const EyeOffIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-eye-slash ${className || ''}`.trim()} {...rest} />
);

export const TrashIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-trash-can ${className || ''}`.trim()} {...rest} />
);

export const PlusIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-plus ${className || ''}`.trim()} {...rest} />
);

export const GenerateIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-wand-magic-sparkles ${className || ''}`.trim()} {...rest} />
);

export const UploadIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-arrow-up-from-bracket ${className || ''}`.trim()} {...rest} />
);

export const PanIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-up-down-left-right ${className || ''}`.trim()} {...rest} />
);

export const BrushIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-paintbrush ${className || ''}`.trim()} {...rest} />
);

export const EraserIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-eraser ${className || ''}`.trim()} {...rest} />
);

export const UndoIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-rotate-left ${className || ''}`.trim()} {...rest} />
);

export const RedoIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-rotate-right ${className || ''}`.trim()} {...rest} />
);

export const XIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-xmark ${className || ''}`.trim()} {...rest} />
);

export const ErrorIcon: React.FC<IconProps> = ({ className, ...rest }) => (
  <i className={`fa-solid fa-triangle-exclamation ${className || ''}`.trim()} {...rest} />
);

export const GripVerticalIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-grip-vertical ${className || ''}`.trim()} {...rest} />
);

export const BringForwardIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-arrow-up ${className || ''}`.trim()} {...rest} />
);

export const SendBackwardIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-arrow-down ${className || ''}`.trim()} {...rest} />
);

export const BringToFrontIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-angles-up ${className || ''}`.trim()} {...rest} />
);

export const SendToBackIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-angles-down ${className || ''}`.trim()} {...rest} />
);

export const BlendIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-layer-group ${className || ''}`.trim()} {...rest} />
);

export const FlattenIcon: React.FC<IconProps> = ({ className, ...rest }) => (
    <i className={`fa-solid fa-compress ${className || ''}`.trim()} {...rest} />
);
