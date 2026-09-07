import React from 'react';
import logo from '../../../assets/Logo.png';

const year = new Date().getFullYear();

const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const Footer = () => (
  <footer style={{
    marginTop: 'auto',
    background: '#116862',
    borderTop: '1px solid rgba(0,0,0,0.12)',
    fontFamily: 'Poppins, sans-serif',
  }}>
    {/* Top section — logo, name, tagline, social */}
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 24px 32px', gap: 14, textAlign: 'center',
    }}>
      {/* Logo with continuous spin */}
      <img
        src={logo}
        alt="MESOB Logo"
        style={{
          width: 60, height: 60, objectFit: 'contain',
          animation: 'continuousSpin 8s linear infinite',
          filter: 'drop-shadow(0 2px 8px rgba(0,80,60,0.2))',
        }}
      />

      {/* Brand name */}
      <h2 style={{
        margin: 0, fontSize: '1.15rem', fontWeight: 700,
        color: '#F0F5F4', letterSpacing: 0.3,
      }}>
        FDRE MESOB Service
      </h2>

      {/* Tagline */}
      <p style={{
        margin: 0, fontSize: '0.82rem', color: '#D4E4E1',
        maxWidth: 360, lineHeight: 1.6,
      }}>
        Modern Ethiopian Services for Organized Benefit.
      </p>

      {/* Social icons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {[
          { icon: <LinkedInIcon />, label: 'LinkedIn', href: 'https://www.linkedin.com/company/mesob-center' },
          { icon: <XIcon />,        label: 'X',        href: 'https://x.com/MesobCenter' },
        ].map(({ icon, label, href }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: 40, height: 40, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#F0F5F4', textDecoration: 'none',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {icon}
          </a>
        ))}
      </div>
    </div>

    {/* Divider */}
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', margin: '0 24px' }} />

    {/* Bottom copyright bar */}
    <div style={{
      padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{
        margin: 0, fontSize: '0.75rem', color: '#D4E4E1',
      }}>
        Copyright © {year} MESOB Center. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
