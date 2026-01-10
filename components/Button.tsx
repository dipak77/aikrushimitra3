import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  loading = false,
  icon,
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-bold tracking-wide transition-all duration-300 active:scale-[0.96] disabled:opacity-60 disabled:pointer-events-none rounded-full overflow-hidden";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:from-blue-500 hover:to-violet-500",
    glow: "bg-slate-900 border border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:bg-slate-800",
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
    outline: "border-2 border-slate-600 text-slate-300 bg-transparent hover:border-blue-500 hover:text-blue-400",
    ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white",
    glass: "bg-slate-800/40 backdrop-blur-md border border-white/10 text-white hover:bg-slate-700/50 shadow-lg",
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs uppercase tracking-wider",
    md: "h-12 px-6 text-sm",
    lg: "h-14 px-8 text-base",
    icon: "h-12 w-12 p-0 flex items-center justify-center rounded-full aspect-square",
  };

  return (
    <button 
      className={twMerge(baseStyles, variants[variant], sizes[size], fullWidth && "w-full flex", className)} 
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin mr-2" size={18} />
      ) : icon ? (
        <span className={children ? "mr-2" : ""}>{icon}</span>
      ) : null}
      <span className="relative z-10">{children}</span>
      {variant === 'glow' && <div className="absolute inset-0 bg-cyan-500/10 animate-pulse"></div>}
    </button>
  );
};