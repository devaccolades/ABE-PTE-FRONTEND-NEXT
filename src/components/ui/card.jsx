"use client";

export function Card({ className = "", ...props }) {
  return (
    <div 
      className={`rounded-none sm:rounded-xl border-y sm:border border-gray-200 bg-white shadow-sm ${className}`} 
      {...props} 
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div 
      className={`p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`} 
      {...props} 
    />
  );
}

export function CardTitle({ className = "", ...props }) {
  return (
    <h3 
      className={`text-base md:text-lg font-bold text-gray-900 leading-tight ${className}`} 
      {...props} 
    />
  );
}

export function CardContent({ className = "", ...props }) {
  return (
    <div 
      className={`p-4 md:p-6 space-y-4 md:space-y-6 ${className}`} 
      {...props} 
    />
  );
}