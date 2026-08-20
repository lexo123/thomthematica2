import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
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
  const baseStyle = "rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center";
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-lg",
    lg: "px-8 py-4 text-xl",
  };

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30",
    secondary: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/30",
    danger: "bg-red-500 hover:bg-red-400 text-white shadow-red-500/30"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${widthStyle} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
