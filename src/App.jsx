import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import StaffTable from './components/StaffTable';
import StaffModal from './components/StaffModal';
import StaffDrawer from './components/StaffDrawer';
import { fetchStaff, createStaff, updateStaff, deleteStaff } from './api';

const GROUPS = ['全部', '管理組', '企劃組', '設計組', '基地組'];

export default function App() {
  const [staffList, setStaffList]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeGroup, setActiveGroup] = useState('全部');
  const [activeTab, setActiveTab]     = useState('在職');
  const [drawerStaff, setDrawerStaff] = useState(null);
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
    const matchGroup  = activeGroup === '全部' || s.group === activeGroup;
    const matchTab    = s.status === activeTab;
    const matchSearch = !search || s.name.includes(search) || (s.email || '').includes(search);
    return matchGroup && matchTab && matchSearch;
  });

  const activeCount   = staffList.filter(s => s.status === '在職').length;
  const resignedCount = staffList.filter(s => s.status === '離職').length;

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
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-[#40CE94] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-[14px] flex items-center gap-3">
          <a href="/tools/" className="no-underline flex-shrink-0">
            <img
              src="https://www.topcape.com.tw/wp-content/uploads/2025/05/topcape_logo_index2.svg"
              alt="開譜國際 TopCape"
              className="h-7 block"
            />
          </a>
          <div className="w-px h-[22px] bg-[#ddd] hidden sm:block" />
          <span className="hidden sm:block text-[11px] font-semibold tracking-[0.06em] uppercase flex-shrink-0" style={{ fontFamily: 'Poppins, sans-serif', color: '#7a00df' }}>
            組織管理
          </span>
          <div className="w-px h-[22px] bg-[#ddd] hidden lg:block" />
          <span className="hidden lg:block text-[15px] font-bold text-[#111] flex-shrink-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
            同仁資料管理
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-[#aaa]">{activeCount} 位在職</span>
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="border border-[#ebebeb] text-[#555] hover:border-[#ccc] px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer"
            >
              ＋ 新增同仁
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 忘打卡審核已移至假勤系統 /tools/leave/ 審核中心（2026-06-10） */}
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* 在職 / 離職 Tab */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {[
              { label: `在職 ${activeCount}`, val: '在職' },
              { label: `離職 ${resignedCount}`, val: '離職' },
            ].map(({ label, val }) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer
                  ${activeTab === val ? 'bg-[#40CE94] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="搜尋姓名或 Email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-[#c8f0e0] bg-white"
          />
          <div className="flex gap-1 flex-wrap">
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer
                  ${activeGroup === g
                    ? 'bg-[#40CE94] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">載入中…</div>
        ) : (
          <StaffTable
            staffList={filtered}
            onView={staff => setDrawerStaff(staff)}
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

      {/* Drawer */}
      <AnimatePresence>
        {drawerStaff && (
          <StaffDrawer
            key={drawerStaff.id}
            staff={drawerStaff}
            onClose={() => setDrawerStaff(null)}
            onEdit={staff => setModal({ mode: 'edit', staff })}
            onResign={handleResign}
            onDelete={handleDelete}
            onRefresh={load}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full shadow-lg text-sm font-medium z-50 whitespace-nowrap
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#111] text-white'}`}>
          {toast.msg}
        </div>
      )}

      <footer className="text-center py-5 text-xs text-gray-400 mt-auto border-t border-gray-100">
        © {new Date().getFullYear()}&nbsp;
        <a href="https://www.topcape.com.tw/" className="text-[#40CE94] no-underline">開譜國際 TopCape</a>
        &nbsp;・ 僅供內部使用
      </footer>
    </div>
  );
}
