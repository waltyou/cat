import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  variant = 'primary',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`button button-${variant} ${loading ? 'button-loading' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="loading-spinner"></span>
          <span className="loading-text">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
