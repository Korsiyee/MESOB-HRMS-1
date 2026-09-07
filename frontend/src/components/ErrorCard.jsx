import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Error Card Component
 * Displays user-friendly error messages with consistent styling
 */
const ErrorCard = ({ 
  icon: Icon = AlertCircle, 
  title = "Something went wrong", 
  message = "Please try again later or contact support.", 
  color = "#DC2626",
  style = {} 
}) => {
  const cardStyle = {
    background: '#EEF1F0',
    borderRadius: 14,
    border: '1px solid rgba(0,80,60,0.09)',
    boxShadow: '0 2px 12px rgba(0,60,45,0.07)',
    padding: 40,
    textAlign: 'center',
    ...style
  };

  return (
    <div style={cardStyle}>
      <Icon 
        size={48} 
        color={color} 
        style={{ margin: '0 auto 16px', opacity: 0.7, display: 'block' }} 
      />
      <h3 style={{ 
        margin: 0, 
        fontSize: '1.2rem', 
        fontWeight: 700, 
        color: '#1A2E2B',
        fontFamily: 'Poppins, sans-serif'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: '12px 0 0', 
        color: '#2E6058', 
        fontSize: '0.9rem',
        lineHeight: 1.6,
        fontFamily: 'Poppins, sans-serif'
      }}>
        {message}
      </p>
    </div>
  );
};

export default ErrorCard;
