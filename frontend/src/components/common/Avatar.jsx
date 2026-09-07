import React from 'react';
import { User } from 'lucide-react';

/**
 * Avatar Component
 * 
 * Displays user profile image or falls back to initials
 * 
 * @param {string} imageUrl - URL of the profile image
 * @param {string} name - Full name for generating initials
 * @param {number} size - Size of avatar in pixels (default: 40)
 * @param {string} borderColor - Optional border color
 * @param {string} borderWidth - Optional border width (default: '2px')
 * @param {object} style - Additional inline styles
 * @param {string} fallbackBg - Background gradient for fallback (default: gradient)
 */
const Avatar = ({
  imageUrl,
  name = '',
  size = 40,
  borderColor = 'rgba(255,255,255,0.2)',
  borderWidth = '2px',
  style = {},
  fallbackBg = 'linear-gradient(135deg, #14B8A6 0%, #0f766e 100%)',
  fontSize,
  iconSize,
}) => {
  // Generate initials from name
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(name);
  const calculatedFontSize = fontSize || `${size * 0.35}px`;
  const calculatedIconSize = iconSize || size * 0.5;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `${borderWidth} solid ${borderColor}`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...style,
  };

  // If we have a valid image URL, show the image
  if (imageUrl) {
    return (
      <div style={containerStyle}>
        <img
          src={imageUrl}
          alt={name || 'Profile'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            // On error, hide the image and show fallback
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `
              <div style="
                width: 100%;
                height: 100%;
                background: ${fallbackBg};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${calculatedFontSize};
                font-weight: 700;
                color: white;
                font-family: Poppins, sans-serif;
              ">
                ${initials}
              </div>
            `;
          }}
        />
      </div>
    );
  }

  // Fallback: show initials or icon
  return (
    <div
      style={{
        ...containerStyle,
        background: fallbackBg,
      }}
    >
      {name ? (
        <span
          style={{
            fontSize: calculatedFontSize,
            fontWeight: 700,
            color: 'white',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {initials}
        </span>
      ) : (
        <User size={calculatedIconSize} color="rgba(255,255,255,0.9)" />
      )}
    </div>
  );
};

export default Avatar;
