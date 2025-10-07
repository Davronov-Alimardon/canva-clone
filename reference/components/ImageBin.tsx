
import React from 'react';
import { XIcon } from './icons';

interface ImageBinProps {
  images: string[];
  onImageDelete: (index: number) => void;
}

const ImageBin: React.FC<ImageBinProps> = ({ images, onImageDelete }) => {
  if (!images || images.length === 0) {
    return (
        <div className="bg-gray-800 p-3 rounded-lg">
             <p className="text-xs text-center text-gray-500 mt-1">
                Upload images to this layer to use as references for generation.
             </p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 p-3 rounded-lg">
      <h2 className="text-sm font-bold mb-2">Reference Images</h2>
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
        {images.map((imgSrc, index) => (
          <div key={index} className="relative group aspect-square">
             <div className="w-full h-full bg-gray-700 rounded-md overflow-hidden">
                <img
                    src={imgSrc}
                    alt={`Reference image ${index + 1}`}
                    className="w-full h-full object-cover"
                />
            </div>
            <button
              onClick={(e) => {
                  e.stopPropagation();
                  onImageDelete(index);
              }}
              title="Delete image"
              className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
            >
                <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
       <p className="text-xs text-center text-gray-500 mt-2">
           These images will be used as context for the next generation.
       </p>
    </div>
  );
};

export default ImageBin;
