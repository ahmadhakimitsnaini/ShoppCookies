import React from 'react';
import { Badge } from './Badge';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-gk-surface  rounded-xl border border-gk-border  shadow-sm overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-100  ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-h3 font-semibold text-gk-text-main ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 bg-gray-50  border-t border-gray-100  ${className}`}>
    {children}
  </div>
);

// Specific Card Variants

export const StatCard = ({ title, value, icon, trend, trendValue }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-small font-semibold text-gk-text-muted uppercase tracking-wider mb-1">{title}</p>
            <h2 className="text-h1 font-bold text-gk-text-main mb-2">{value}</h2>
            {trend && (
              <p className={`text-small flex items-center ${trend === 'up' ? 'text-gk-success' : 'text-gk-danger'}`}>
                <span className="font-semibold mr-1">{trendValue}</span> 
                <span className="text-gk-text-muted">dari bulan lalu</span>
              </p>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-gk-primary bg-opacity-10 rounded-lg text-gk-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const StudioCard = ({ name, status, revenue, onClickAction }) => {
  return (
    <Card className="hover:shadow-md transition-standard cursor-pointer" onClick={onClickAction}>
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg text-gk-text-main truncate max-w-[70%]">{name}</h3>
          <Badge status={status} />
        </div>
        <div className="mb-4">
          <p className="text-small text-gk-text-muted mb-1">Total Omzet</p>
          <p className="font-semibold text-body text-gk-primary">{revenue}</p>
        </div>
        <div className="flex space-x-2">
           <span className="text-caption text-gk-text-muted bg-gray-100  px-2 py-1 rounded">Cookies: Aman</span>
        </div>
      </CardContent>
    </Card>
  );
};
