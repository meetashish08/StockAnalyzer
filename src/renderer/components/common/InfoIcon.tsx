import React, { useState, useEffect } from 'react';

interface InfoIconProps {
  title: string;
  explanation: string;
}

export default function InfoIcon({ title, explanation }: InfoIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      {/* Info Icon Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-colors duration-200 cursor-pointer ml-1"
        aria-label={`More information about ${title}`}
      >
        i
      </button>

      {/* Explanation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
          onClick={handleBackdropClick}
        >
          <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-md border border-slate-700 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-slate-300 leading-relaxed text-sm">
                {explanation}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-slate-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
