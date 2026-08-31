'use client';

import React from 'react';

export interface BrandLoaderProps {
  loaderState: 'black' | 'spinner' | 'fadeout' | 'done';
  logoUrl?: string | null;
  brandName?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export function BrandLoader({
  loaderState,
  logoUrl,
  brandName = 'Psi App',
  gradientStart = '#4F46E5',
  gradientEnd = '#06B6D4',
}: BrandLoaderProps) {
  if (loaderState === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--brand-bg-color, #09090B)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        transition: 'opacity 0.5s ease-in-out',
        opacity: loaderState === 'fadeout' ? 0 : 1,
        pointerEvents: loaderState === 'fadeout' ? 'none' : 'auto',
      }}
    >
      {loaderState !== 'black' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
            animation: 'fadeIn 0.5s ease-out forwards',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              style={{
                maxHeight: '64px',
                maxWidth: '240px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  fontSize: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                }}
              >
                Ψ
              </div>
              <span
                style={{
                  fontSize: '18px',
                  letterSpacing: '0.05em',
                  color: 'var(--brand-text-color, #F4F4F5)',
                }}
              >
                {brandName}
              </span>
            </div>
          )}

          {/* Spinner */}
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: gradientStart,
                borderRightColor: gradientEnd,
                animation: 'spin 1s linear infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
