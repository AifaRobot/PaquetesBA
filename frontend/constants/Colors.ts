/**
 * PaquetesBA brand color palette.
 *
 * Primary:   #FF6B35  — vibrant orange (brand / CTA)
 * Secondary: #2C3E50  — dark navy blue (headers / text)
 * Success:   #27AE60  — green (delivered, confirmed)
 * Error:     #E74C3C  — red (failed, cancelled)
 * Warning:   #F39C12  — amber (pending, in transit)
 * Info:      #2980B9  — blue (informational)
 */

const brand = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A24',

  secondary: '#2C3E50',
  secondaryLight: '#3D5166',
  secondaryDark: '#1A252F',

  success: '#27AE60',
  successLight: '#2ECC71',
  successDark: '#1E8449',

  error: '#E74C3C',
  errorLight: '#EC7063',
  errorDark: '#CB4335',

  warning: '#F39C12',
  warningLight: '#F5B041',
  warningDark: '#D68910',

  info: '#2980B9',
  infoLight: '#5DADE2',
  infoDark: '#1A6EA8',
};

const Colors = {
  // ─── Brand shortcuts (theme-agnostic) ──────────────────────────────────────
  brand,

  // ─── Light theme ───────────────────────────────────────────────────────────
  light: {
    // Typography
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Surfaces
    background: '#F9FAFB',
    card: '#FFFFFF',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    divider: '#F3F4F6',

    // Brand
    tint: brand.primary,
    primary: brand.primary,
    primaryLight: brand.primaryLight,
    secondary: brand.secondary,

    // Semantic
    success: brand.success,
    error: brand.error,
    warning: brand.warning,
    info: brand.info,

    // Tabs / navigation
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brand.primary,
    tabBackground: '#FFFFFF',

    // Status badge backgrounds (lighter tints)
    statusPendingBg: '#FEF3C7',
    statusPendingText: '#92400E',
    statusConfirmedBg: '#DBEAFE',
    statusConfirmedText: '#1E40AF',
    statusPickedUpBg: '#EDE9FE',
    statusPickedUpText: '#5B21B6',
    statusInTransitBg: '#FFF7ED',
    statusInTransitText: '#9A3412',
    statusOutForDeliveryBg: '#FFEDD5',
    statusOutForDeliveryText: '#C2410C',
    statusDeliveredBg: '#D1FAE5',
    statusDeliveredText: '#065F46',
    statusFailedBg: '#FEE2E2',
    statusFailedText: '#991B1B',
    statusCancelledBg: '#F3F4F6',
    statusCancelledText: '#374151',
  },

  // ─── Dark theme ────────────────────────────────────────────────────────────
  dark: {
    // Typography
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textDisabled: '#6B7280',
    textInverse: '#1A1A1A',

    // Surfaces
    background: '#0F172A',
    card: '#1E293B',
    surface: '#1E293B',
    border: '#334155',
    divider: '#1E293B',

    // Brand
    tint: brand.primaryLight,
    primary: brand.primaryLight,
    primaryLight: brand.primary,
    secondary: '#CBD5E1',

    // Semantic
    success: brand.successLight,
    error: brand.errorLight,
    warning: brand.warningLight,
    info: brand.infoLight,

    // Tabs / navigation
    tabIconDefault: '#64748B',
    tabIconSelected: brand.primaryLight,
    tabBackground: '#1E293B',

    // Status badge backgrounds (darker tints)
    statusPendingBg: '#451A03',
    statusPendingText: '#FCD34D',
    statusConfirmedBg: '#1E3A5F',
    statusConfirmedText: '#93C5FD',
    statusPickedUpBg: '#2E1065',
    statusPickedUpText: '#C4B5FD',
    statusInTransitBg: '#431407',
    statusInTransitText: '#FDBA74',
    statusOutForDeliveryBg: '#431407',
    statusOutForDeliveryText: '#FB923C',
    statusDeliveredBg: '#064E3B',
    statusDeliveredText: '#6EE7B7',
    statusFailedBg: '#450A0A',
    statusFailedText: '#FCA5A5',
    statusCancelledBg: '#1F2937',
    statusCancelledText: '#9CA3AF',
  },
};

export default Colors;
