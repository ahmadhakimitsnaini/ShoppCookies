import React from 'react';

export const Badge = ({
  status,
  label,
  className = '',
}) => {
  // Determine variant based on status
  // Status: LIVE, OFFLINE, AMAN, EXPIRED
  let variantClass = '';
  let displayLabel = label || status;

  switch (status?.toUpperCase()) {
    case 'LIVE':
      variantClass = 'bg-red-100 text-red-700 border-red-200';
      break;
    case 'OFFLINE':
      variantClass = 'bg-gray-100 text-gray-700 border-gray-200';
      break;
    case 'AMAN':
      variantClass = 'bg-green-100 text-green-700 border-green-200';
      break;
    case 'EXPIRED':
      variantClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      break;
    case 'NEW':
      variantClass = 'bg-blue-50 text-blue-600 border-blue-200';
      break;
    default:
      variantClass = 'bg-gray-100 text-gray-700 border-gray-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-semibold border ${variantClass} ${className}`}>
      {displayLabel}
    </span>
  );
};
