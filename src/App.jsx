import { useState, useEffect, useCallback } from 'react';
import StaffTable from './components/StaffTable';
import StaffModal from './components/StaffModal';
import { fetchStaff, createStaff, updateStaff, deleteStaff } from './api';

const GROUPS = ['全部', '管理組', '企劃組', '設計組', '基地組'];

export default function App() {
  const [staffList, setStaffList]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeGroup, setActiveGroup] = useState('全部');
  const [showResigned, setShowResigned] = useState(false);
  const [modal, setModal]             = useState(null);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchStaff();
      setStaffList(data);
    } catch (e) {
      showToast('載入失敗：' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = staffList.filter(s => {
    const matchGroup   = activeGroup === '全部' || s.group === activeGroup;
    const matchResigned = showResigned || s.status === '在職';
    const matchSearch  = !search || s.name.includes(search) || s.email.includes(search);
    return matchGroup && matchResigned && matchSearch;
  });

  const activeCount = staffList.filter(s => s.status === '在職').length;

  const handleSave = async (data) => {
    try {
      if (modal.mode === 'add') {
        await createStaff(data);
        showToast('已新增同仁');
      } else {
        await updateStaff(data);
        showToast('已更新資料');
      }
      setModal(null);
      load();
    } catch (e) {
      showToast('操作失敗：' + e.message, 'error');
    }
  };

  const handleResign = async (staff) => {
    if (!confirm(`確定要將「${staff.name}」標記為離職？`)) return;
    try {
      await updateStaff({ ...staff, status: '離職', leaveDate: new Date().toISOString().slice(0, 10) });
      showToast(`${staff.name} 已標記為離職`);
      load();
    } catch (e) {
      showToast('操作失敗：' + e.message, 'error');
    }
  };

  const handleDelete = async (staff) => {
    if (!confirm(`確定要永久刪除「${staff.name}」？此操作無法復原。`)) return;
    try {
      await deleteStaff(staff.id);
      showToast(`${staff.name} 已刪除`);
      load();
    } catch (e) {
      showToast('操作失敗：' + e.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#5c00a8] to-[#7a00df] shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/tools/" className="text-white/60 hover:text-white text-sm transition-colors">← 工具首頁</a>
          <span className="text-white/30">|</span>
          <span className="font-bold text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>同仁管理中心</span>
          <span className="text-xs text-white/80 border border-white/30 rounded-full px-2 py-0.5">Staff</span>
          <span className="text-white/60 text-sm ml-auto">{activeCount} 位在職</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="搜尋姓名或 Email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          />
          <div className="flex gap-1 flex-wrap">
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer
                  ${activeGroup === g
                    ? 'bg-[#7a00df] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              >
                {g}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={showResigned}
              onChange={e => setShowResigned(e.target.checked)}
              className="rounded"
              style={{ accentColor: '#7a00df' }}
            />
            顯示離職
          </label>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="ml-auto bg-[#7a00df] hover:bg-[#5c00a8] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            ＋ 新增同仁
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">載入中…</div>
        ) : (
          <StaffTable
            staffList={filtered}
            onEdit={staff => setModal({ mode: 'edit', staff })}
            onResign={handleResign}
            onDelete={handleDelete}
          />
        )}

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-400 mt-3">
            顯示 {filtered.length} 筆 / 共 {staffList.length} 筆
          </p>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          staff={modal.staff}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
