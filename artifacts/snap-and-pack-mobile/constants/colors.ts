/**
 * Semantic design tokens for Snap & Pack.
 *
 * Brand parity with the Flutter app (flutter-app/lib): monochrome look,
 * Material seed #1A1A1A, warm white surfaces, black accents, and the
 * green/red full-screen result colors.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1A1A1A',
    tint: '#1A1A1A',

    // Core surfaces (Flutter scaffold background #F7F7F5)
    background: '#F7F7F5',
    foreground: '#1A1A1A',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1A1A1A',

    // Primary action color (black filled buttons in the Flutter app)
    primary: '#1A1A1A',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EFEFEC',
    secondaryForeground: '#1A1A1A',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EFEFEC',
    mutedForeground: '#6B6B6B',

    // Accent highlights
    accent: '#EFEFEC',
    accentForeground: '#1A1A1A',

    // Destructive / "MISSING!!" screen red (Flutter 0xFFC62828)
    destructive: '#C62828',
    destructiveForeground: '#FFFFFF',

    // "GOOD TO GO!" screen green (Flutter 0xFF1B7F3B)
    success: '#1B7F3B',
    successForeground: '#FFFFFF',

    // Borders and input outlines (Flutter 0xFFE3E3E0 / 0xFFC9C9C4)
    border: '#E3E3E0',
    input: '#C9C9C4',

    // Subtle icon gray (Flutter 0xFF9A9A9A / 0xFFB0B0AC)
    iconMuted: '#9A9A9A',
    // Time label on black event cards (Flutter 0xFFB9B9B4)
    onPrimaryMuted: '#B9B9B4',
  },

  // Border radius (in px) — Flutter uses 12-16 rounded corners.
  radius: 14,
};

export default colors;
