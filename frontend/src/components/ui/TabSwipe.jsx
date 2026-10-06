import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * TabSwipe - A modern tabbed interface with smooth swipe animations
 * 
 * Features:
 * - Smooth swipe transitions between tabs
 * - URL-based tab state (shareable URLs)
 * - Touch/mouse drag support
 * - Keyboard navigation (Arrow keys)
 * - Responsive design
 * 
 * @param {Array} tabs - Array of tab objects: [{ key: 'overview', label: 'Overview', path: '/path', content: <Component /> }]
 * @param {string} defaultTab - Default tab key to show
 */

const C = {
  primary: '#0F766E',
  primaryHov: '#14B8A6',
  textMain: '#1A2E2B',
  textSub: '#1E4A42',
  textMuted: '#2E6058',
  card: '#EEF1F0',
  border: 'rgba(0,80,60,0.12)',
};

const TabSwipe = ({ tabs, defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  
  // Determine active tab from URL
  const getActiveTabIndex = () => {
    const currentPath = location.pathname;
    const index = tabs.findIndex(tab => tab.path === currentPath);
    return index >= 0 ? index : tabs.findIndex(tab => tab.key === defaultTab) || 0;
  };

  const [activeTab, setActiveTab] = useState(getActiveTabIndex());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Update active tab when URL changes
  useEffect(() => {
    const newIndex = getActiveTabIndex();
    if (newIndex !== activeTab) {
      setActiveTab(newIndex);
      setTranslateX(0);
      setDragOffset(0);
    }
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (index) => {
    if (index >= 0 && index < tabs.length && index !== activeTab) {
      const tab = tabs[index];
      navigate(tab.path);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && activeTab > 0) {
        e.preventDefault();
        handleTabChange(activeTab - 1);
      } else if (e.key === 'ArrowRight' && activeTab < tabs.length - 1) {
        e.preventDefault();
        handleTabChange(activeTab + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, tabs.length]);

  // Mouse/Touch drag handlers
  const handleDragStart = (clientX) => {
    setIsDragging(true);
    setStartX(clientX);
    setDragOffset(0);
  };

  const handleDragMove = (clientX) => {
    if (!isDragging) return;
    
    const diff = clientX - startX;
    setDragOffset(diff);
    
    // Add resistance at boundaries
    const containerWidth = contentRef.current?.offsetWidth || 0;
    let offset = diff;
    
    if (activeTab === 0 && diff > 0) {
      offset = diff * 0.3; // Resistance when dragging right on first tab
    } else if (activeTab === tabs.length - 1 && diff < 0) {
      offset = diff * 0.3; // Resistance when dragging left on last tab
    }
    
    setTranslateX(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 80; // Minimum drag distance to switch tabs
    
    if (dragOffset < -threshold && activeTab < tabs.length - 1) {
      // Swipe left - next tab
      handleTabChange(activeTab + 1);
    } else if (dragOffset > threshold && activeTab > 0) {
      // Swipe right - previous tab
      handleTabChange(activeTab - 1);
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    setDragOffset(0);
  };

  // Mouse events
  const onMouseDown = (e) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const onMouseMove = (e) => {
    handleDragMove(e.clientX);
  };

  const onMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const onTouchStart = (e) => {
    handleDragStart(e.touches[0].clientX);
  };

  const onTouchMove = (e) => {
    handleDragMove(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  // Add global mouse/touch listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);

      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, [isDragging, startX, dragOffset]);

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Tab Headers */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        borderBottom: `2px solid ${C.border}`,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        <style>{`
          .tab-container::-webkit-scrollbar { display: none; }
        `}</style>
        
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(index)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                color: isActive ? C.primary : C.textMuted,
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderBottom: `3px solid ${isActive ? C.primary : 'transparent'}`,
                whiteSpace: 'nowrap',
                fontFamily: 'Poppins, sans-serif',
                position: 'relative',
                top: 2,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = C.primaryHov;
                  e.currentTarget.style.background = 'rgba(15,118,110,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = C.textMuted;
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content with Swipe */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: isDragging ? 'none' : 'auto',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div
          ref={contentRef}
          style={{
            display: 'flex',
            transform: `translateX(calc(-${activeTab * 100}% + ${translateX}px))`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.key}
              style={{
                minWidth: '100%',
                width: '100%',
                opacity: Math.abs(index - activeTab) <= 1 ? 1 : 0.3,
                transition: isDragging ? 'none' : 'opacity 0.3s ease',
              }}
            >
              {/* Only render current and adjacent tabs for performance */}
              {Math.abs(index - activeTab) <= 1 && tab.content}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots (optional, for mobile) */}
      {tabs.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginTop: 24,
          padding: '8px 0',
        }}>
          {tabs.map((_, index) => (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              aria-label={`Go to ${tabs[index].label}`}
              style={{
                width: index === activeTab ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: index === activeTab ? C.primary : 'rgba(0,80,60,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TabSwipe;
