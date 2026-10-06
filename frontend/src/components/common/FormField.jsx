/**
 * FormField Component
 * 
 * Consistent form field wrapper with label, error, and help text
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormField = ({
  label,
  required = false,
  error,
  helpText,
  children,
  htmlFor,
  className = '',
  style = {}
}) => {
  const containerStyle = {
    marginBottom: '20px',
    fontFamily: 'Poppins, sans-serif',
    ...style
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px'
  };

  const requiredStyle = {
    color: '#EF4444',
    marginLeft: '4px'
  };

  const errorStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
    fontSize: '13px',
    color: '#EF4444'
  };

  const helpTextStyle = {
    marginTop: '6px',
    fontSize: '13px',
    color: '#6b7280'
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label htmlFor={htmlFor} style={labelStyle}>
          {label}
          {required && <span style={requiredStyle}>*</span>}
        </label>
      )}
      
      {children}
      
      {error && (
        <div style={errorStyle}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {!error && helpText && (
        <div style={helpTextStyle}>
          {helpText}
        </div>
      )}
    </div>
  );
};

export default FormField;
