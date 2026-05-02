import { useState } from 'react';
import StatusBadge from './StatusBadge';

export default function StaffTable({ staffList, onEdit, onResign, onDelete }) {
  const [openMenu, setOpenMenu] = useState(null);

  if (staffList.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
        沒有符合條件的同仁
      </div>
    );
  }

  const groups = [...new Set(staffList.map(s => s.group).filter(Boolean))];
  const ungrouped = staffList.filter(s => !s.group);
  const showHeader = groups.length > 1 || (groups.length === 1 && ungrouped.length > 0);

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <div key={g}>
          {showHeader && (
            <div className="text-xs font-semibold text-gray-400 tracking-widest mb-3 uppercase">{g}</div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {staffList.filter(s => s.group === g).map(s => (
              <StaffCard key={s.id} s={s} openMenu={openMenu} setOpenMenu={setOpenMenu} onEdit={onEdit} onResign={onResign} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {ungrouped.map(s => (
            <StaffCard key={s.id} s={s} openMenu={openMenu} setOpenMenu={setOpenMenu} onEdit={onEdit} onResign={onResign} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function StaffCard({ s, openMenu, setOpenMenu, onEdit, onResign, onDelete }) {
  const contact = [s.phone, s.email].filter(Boolean).join(' ‧ ');

  return (
    <div className={`bg-white border-[1.5px] rounded-xl p-4 flex items-center gap-3 transition-colors
      ${s.status === '離職' ? 'opacity-50 border-gray-100' : 'border-gray-200 hover:border-[#c4a0f5]'}`}>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full bg-purple-50 text-[#7a00df] font-bold text-base flex items-center justify-center flex-shrink-0"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {s.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-gray-900">{s.name}</span>
          <StatusBadge status={s.status} />
        </div>
        <div className="text-xs text-gray-400">{s.title || s.group}</div>
        {contact && (
          <div className="text-xs text-gray-300 truncate mt-0.5">{contact}</div>
        )}
      </div>

      {/* ••• menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
          className="text-gray-300 hover:text-gray-500 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-base leading-none"
        >
          •••
        </button>
        {openMenu === s.id && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
            <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-lg shadow-lg z-20 w-32 overflow-hidden">
              <button
                onClick={() => { onEdit(s); setOpenMenu(null); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                ✏️ 編輯
              </button>
              {s.status === '在職' && (
                <button
                  onClick={() => { onResign(s); setOpenMenu(null); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-orange-600"
                >
                  🚪 標記離職
                </button>
              )}
              <button
                onClick={() => { onDelete(s); setOpenMenu(null); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 transition-colors text-red-600"
              >
                🗑 刪除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
