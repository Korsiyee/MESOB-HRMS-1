/**
 * Card Component
 * 
 * Reusable container with consistent styling
 */

import React from 'react';

const Card = ({
  children,
  header,
  footer,
  padding = '24px',
  className = '',
  style = {}
}) => {
  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    fontFamily: 'Poppins, sans-serif',
    ...style
  };

  const headerStyle = {
    padding: padding,
    borderBottom: '1px solid #e5e7eb',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e3a37'
  };

  const bodyStyle = {
    padding: padding
  };

  const footerStyle = {
    padding: padding,
    borderTop: '1px solid #e5e7eb',
    background: '#f9fafb'
  };

  return (
    <div style={cardStyle} className={className}>
      {header && (
        <div style={headerStyle}>
          {header}
        </div>
      )}
      
      <div style={bodyStyle}>
        {children}
      </div>
      
      {footer && (
        <div style={footerStyle}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
