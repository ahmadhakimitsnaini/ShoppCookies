import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for transition before unmounting
      }, duration);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const types = {
    success: {
      icon: <CheckCircle className="w-5 h-5 text-gk-success" />,
      bg: 'bg-white',
      border: 'border-l-4 border-gk-success',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-gk-warning" />,
      bg: 'bg-white',
      border: 'border-l-4 border-gk-warning',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-gk-danger" />,
      bg: 'bg-white',
      border: 'border-l-4 border-gk-danger',
    },
    info: {
      icon: <CheckCircle className="w-5 h-5 text-gk-info" />,
      bg: 'bg-white',
      border: 'border-l-4 border-gk-info',
    }
  };

  const currentType = types[type] || types.info;

  return (
    <div 
      className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded shadow-lg transition-standard transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'} ${currentType.bg} ${currentType.border} max-w-sm w-full border border-r-gk-border border-t-gk-border border-b-gk-border`}
    >
      <div className="flex-shrink-0 mr-3">
        {currentType.icon}
      </div>
      <div className="flex-1 text-sm font-medium text-gk-text-main line-clamp-2">
        {message}
      </div>
      <button 
        onClick={handleClose}
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 transition-standard"
      >
        <span className="sr-only">Close</span>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-0 right-0 p-4 z-50 space-y-4 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast 
            message={toast.message} 
            type={toast.type} 
            duration={toast.duration} 
            onClose={() => removeToast(toast.id)} 
          />
        </div>
      ))}
    </div>
  );
};
