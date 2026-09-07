const LoadingBlock = ({ text = "Loading..." }) => {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-900" />
      <span>{text}</span>
    </div>
  );
};

export default LoadingBlock;
