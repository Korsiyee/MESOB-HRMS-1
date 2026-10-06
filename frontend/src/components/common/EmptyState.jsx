/**
 * EmptyState Component
 * 
 * Display when there's no data to show
 */

import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No data found',
  message = 'Get started by creating your first item.',
  actionLabel,
  onAction,
  className = '',
  style = {}
}) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    fontFamily: 'Poppins, sans-serif',
    ...style
  };

  const iconStyle = {
    width: 64,
    height: 64,
    color: '#d1d5db',
    marginBottom: '16px'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e3a37',
    marginBottom: '8px'
  };

  const messageStyle = {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: actionLabel ? '24px' : 0,
    maxWidth: '400px'
  };

  return (
    <div style={containerStyle} className={className}>
      <Icon style={iconStyle} />
      <h3 style={titleStyle}>{title}</h3>
      <p style={messageStyle}>{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
