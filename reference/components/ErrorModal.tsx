
import React from 'react';
import { XIcon, ErrorIcon } from './icons';

interface ErrorModalProps {
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-md w-full border border-red-500/50"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ErrorIcon className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-gray-100">An Error Occurred</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="text-gray-300 text-sm">
          <p>{message}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
