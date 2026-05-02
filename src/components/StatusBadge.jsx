export default function StatusBadge({ status }) {
  if (status === '在職') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        在職
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      離職
    </span>
  );
}
