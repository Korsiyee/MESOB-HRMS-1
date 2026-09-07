const variants = {
  teal:    'bg-teal-100 text-teal-800 border border-teal-200',
  green:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
  amber:   'bg-amber-100 text-amber-800 border border-amber-200',
  red:     'bg-red-100 text-red-700 border border-red-200',
  slate:   'bg-slate-100 text-slate-600 border border-slate-200',
  purple:  'bg-purple-100 text-purple-700 border border-purple-200',
  blue:    'bg-blue-100 text-blue-700 border border-blue-200',
  national:'bg-teal-100 text-teal-800 border border-teal-200',
  religious:'bg-amber-100 text-amber-800 border border-amber-200',
  public:  'bg-blue-100 text-blue-700 border border-blue-200',
};

const Badge = ({ label, variant = 'slate', className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${variants[variant] || variants.slate} ${className}`}>
    {label}
  </span>
);

export default Badge;
