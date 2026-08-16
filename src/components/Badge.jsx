// Small colored pill for lead/handover/member/GHL-status indicators.
// `variant` maps to a fixed status color from the design system's status
// palette (never a categorical color, since these represent state, not identity).
const VARIANT_CLASS = {
  lead: 'badge badge-lead',
  handover: 'badge badge-handover',
  member: 'badge badge-member',
  'ghl-ok': 'badge badge-ghl-ok',
  'ghl-fail': 'badge badge-ghl-fail',
  neutral: 'badge badge-neutral',
};

export default function Badge({ variant = 'neutral', children }) {
  return <span className={VARIANT_CLASS[variant] || VARIANT_CLASS.neutral}>{children}</span>;
}
