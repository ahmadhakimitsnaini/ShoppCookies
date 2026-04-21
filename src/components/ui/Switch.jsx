import React from 'react';

export const Switch = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const sizes = {
    sm: {
      width: 'w-8',
      height: 'h-4',
      circle: 'h-3 w-3',
      translate: 'translate-x-4'
    },
    md: {
      width: 'w-11',
      height: 'h-6',
      circle: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      width: 'w-14',
      height: 'h-7',
      circle: 'h-6 w-6',
      translate: 'translate-x-7'
    }
  };

  const currentSize = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gk-primary focus:ring-offset-2
        ${checked ? 'bg-emerald-500' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${currentSize.width} ${currentSize.height}
      `}
    >
      <span className="sr-only">Toggle</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 
          transition duration-200 ease-in-out
          ${checked ? currentSize.translate : 'translate-x-0'}
          ${currentSize.circle}
        `}
      />
    </button>
  );
};
