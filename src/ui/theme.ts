import type React from 'react';

/**
 * Nova design tokens — WhatsApp-native commerce, flat matte.
 * accent (#C8F135) for primary CTAs only.
 * success (#25D366) reserved for WhatsApp-native states.
 * Never purple / indigo / mesh / glass / rainbow.
 */
export const tokens = {
  bg: '#0B0C0B',
  surface: '#161816',
  surface2: '#1C1F1C',
  text: '#EEF1ED',
  muted: '#8B9A92',
  border: '#24302C',
  accent: '#C8F135',
  accentDim: '#A8C92A',
  success: '#25D366',
  warn: '#F5C542',
  danger: '#FF6B6B',
  radius: 12,
  font:
    'system-ui, "Segoe UI", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

export type Tokens = typeof tokens;

export const fontFamily = tokens.font;

export const appShell: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '24px 16px',
  fontFamily: tokens.font,
  color: tokens.text,
  background: tokens.bg,
  minHeight: '100vh',
};

export const card: React.CSSProperties = {
  background: tokens.surface,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  padding: 20,
};

export const cardTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: '0 0 4px',
  color: tokens.text,
  letterSpacing: '-0.01em',
};

export const cardDesc: React.CSSProperties = {
  fontSize: 13,
  color: tokens.muted,
  margin: '0 0 16px',
};

export const label: React.CSSProperties = {
  fontSize: 13,
  color: tokens.muted,
  fontWeight: 500,
};

export const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: tokens.bg,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  color: tokens.text,
  fontSize: 14,
  fontFamily: tokens.font,
  outline: 'none',
  boxSizing: 'border-box',
};

/** Primary CTA — lime accent only. Flat matte, no gradient. */
export const primaryBtn: React.CSSProperties = {
  padding: '12px 20px',
  background: tokens.accent,
  border: 'none',
  borderRadius: 8,
  color: '#0B0C0B',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: tokens.font,
  cursor: 'pointer',
};

export const primaryBtnDisabled: React.CSSProperties = {
  opacity: 0.55,
  cursor: 'not-allowed',
};

export const secondaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  background: tokens.surface2,
  color: tokens.text,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: tokens.font,
};

export const dangerBtn: React.CSSProperties = {
  background: 'transparent',
  color: tokens.danger,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: tokens.font,
};

export const successBtn: React.CSSProperties = {
  background: 'transparent',
  color: tokens.success,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: '8px 14px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: tokens.font,
};

export const badge: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: tokens.surface2,
  color: tokens.muted,
  fontWeight: 500,
};

export const badgeAccent: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: tokens.surface2,
  color: tokens.accent,
  border: `1px solid ${tokens.border}`,
  fontWeight: 600,
};

/** WhatsApp-native status pill — success green only here. */
export const badgeWhatsApp: React.CSSProperties = {
  fontSize: 11,
  padding: '3px 8px',
  borderRadius: 6,
  background: tokens.surface2,
  color: tokens.success,
  border: `1px solid ${tokens.border}`,
  fontWeight: 600,
};

export const errorBanner: React.CSSProperties = {
  background: tokens.surface2,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: tokens.danger,
  fontSize: 13,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

export const warnBanner: React.CSSProperties = {
  background: tokens.surface2,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: '10px 12px',
  color: tokens.warn,
  fontSize: 13,
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

export const successBanner: React.CSSProperties = {
  background: tokens.surface2,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

export const mutedText: React.CSSProperties = {
  color: tokens.muted,
  fontSize: 13,
};

export const insetPanel: React.CSSProperties = {
  background: tokens.bg,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  padding: 12,
};

export const preBlock: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  background: tokens.bg,
  border: `1px solid ${tokens.border}`,
  borderRadius: 8,
  fontSize: 12,
  color: tokens.muted,
  overflow: 'auto',
  maxHeight: 200,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

export function withDisabled(
  base: React.CSSProperties,
  disabled: boolean,
): React.CSSProperties {
  return disabled ? { ...base, ...primaryBtnDisabled } : base;
}
