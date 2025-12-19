import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'glass' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden rounded-2xl font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group cursor-pointer";
  
  const variants = {
    primary: "bg-emerald-600 text-white shadow-xl shadow-emerald-200/50 hover:bg-emerald-700 hover:shadow-emerald-300/60",
    secondary: "bg-amber-500 text-white shadow-xl shadow-amber-200/50 hover:bg-amber-600",
    outline: "border-2 border-emerald-600/30 text-emerald-700 bg-white/50 backdrop-blur-sm hover:bg-emerald-50 hover:border-emerald-600",
    danger: "bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600",
    glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30",
    dark: "bg-slate-900 text-white hover:bg-black shadow-2xl"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3.5 text-base",
    lg: "px-8 py-4.5 text-lg",
    xl: "px-10 py-6 text-xl"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`} 
      {...props}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
};