"use client";
export function Card({ className = "", ...props }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`} {...props} />
  );
}

export function CardHeader({ className = "", ...props }) {
  return <div className={`p-6 border-b border-gray-100 flex justify-between ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return <h2 className={`text-lg font-semibold ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={`p-6 space-y-4 ${className}`} {...props} />;
}


