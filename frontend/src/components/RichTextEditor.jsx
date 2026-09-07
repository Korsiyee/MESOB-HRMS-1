import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Type, Minus 
} from 'lucide-react';

/**
 * Rich Text Editor Component
 * Provides basic formatting options similar to ChatGPT editor:
 * - Bold, Italic, Underline
 * - Bullet and numbered lists
 * - Text alignment (left, center, right)
 * - Line breaks and paragraph spacing
 * 
 * Uses contentEditable div for WYSIWYG editing
 */
const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  minHeight = '150px',
  disabled = false 
}) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Trigger onChange after command
  };

  const formatButtons = [
    { icon: Bold, command: 'bold', tooltip: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', tooltip: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', tooltip: 'Underline (Ctrl+U)' },
    { type: 'separator' },
    { icon: List, command: 'insertUnorderedList', tooltip: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', tooltip: 'Numbered List' },
    { type: 'separator' },
    { icon: AlignLeft, command: 'justifyLeft', tooltip: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', tooltip: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', tooltip: 'Align Right' },
    { type: 'separator' },
    { icon: Minus, command: 'insertHorizontalRule', tooltip: 'Insert Horizontal Line' },
  ];

  const buttonStyle = {
    background: 'none',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '6px 8px',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    color: disabled ? '#aaa' : '#4a5568',
    opacity: disabled ? 0.5 : 1,
  };

  const editorContainerStyle = {
    border: `2px solid ${isFocused ? '#0F766E' : 'rgba(0,80,60,0.12)'}`,
    borderRadius: 8,
    overflow: 'hidden',
    background: disabled ? '#f5f5f5' : 'white',
    transition: 'all 0.2s',
    boxShadow: isFocused ? '0 0 0 3px rgba(15,118,110,0.1)' : 'none',
  };

  const toolbarStyle = {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    background: 'rgba(0,80,60,0.02)',
    borderBottom: '1px solid rgba(0,80,60,0.08)',
    flexWrap: 'wrap',
  };

  const contentStyle = {
    padding: '12px 14px',
    minHeight,
    outline: 'none',
    fontSize: '0.9rem',
    lineHeight: 1.7,
    color: '#1A2E2B',
    fontFamily: 'inherit',
    overflowY: 'auto',
    maxHeight: '400px',
  };

  return (
    <div style={editorContainerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        {formatButtons.map((btn, idx) => {
          if (btn.type === 'separator') {
            return (
              <div
                key={`sep-${idx}`}
                style={{
                  width: 1,
                  height: 24,
                  background: 'rgba(0,80,60,0.12)',
                  margin: '0 4px',
                }}
              />
            );
          }

          const Icon = btn.icon;
          return (
            <button
              key={btn.command}
              type="button"
              onClick={() => !disabled && execCommand(btn.command)}
              title={btn.tooltip}
              disabled={disabled}
              style={buttonStyle}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = 'rgba(15,118,110,0.1)';
                  e.currentTarget.style.color = '#0F766E';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#4a5568';
                }
              }}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={contentStyle}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }
        [contenteditable]:focus:before {
          content: '';
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 8px 0;
          padding-left: 24px;
        }
        [contenteditable] li {
          margin: 4px 0;
        }
        [contenteditable] p {
          margin: 8px 0;
        }
        [contenteditable] hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 12px 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
