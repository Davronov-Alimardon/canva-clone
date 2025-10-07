import React from 'react';

interface ToolbarButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  title,
  onClick,
  disabled = false,
  isActive = false,
  children,
}) => {
  const baseClasses = 'p-2 rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10';
  const activeClasses = 'bg-blue-600 text-white';
  const inactiveClasses = 'bg-gray-700 hover:bg-gray-600';
  const disabledClasses = 'disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed';

  const finalClasses = [
    baseClasses,
    isActive ? activeClasses : inactiveClasses,
    disabledClasses,
  ].join(' ');

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={finalClasses}
    >
      {children}
    </button>
  );
};

export default ToolbarButton;
