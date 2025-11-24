"use client";
export function Button({ className = "", variant = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2 ring-offset-white";
  const variants = {
    default: "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-600",
    outline: "border border-gray-300 hover:bg-gray-100 focus-visible:ring-sky-600",
    ghost: "hover:bg-gray-100 focus-visible:ring-sky-600",
  };
  const cls = `${base} ${variants[variant] ?? variants.default} ${className}`;
  return <button className={cls} {...props} />;
}


