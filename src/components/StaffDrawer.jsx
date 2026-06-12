import { useState } from 'react';
import { motion } from 'motion/react';
import StatusBadge from './StatusBadge';
import { addHistoryEntry, deleteHistoryEntry, reinstateStaff } from '../api';

function calcSeniority(staff) {
  const hist = [...(staff.employmentHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (hist.length === 0) return null;

  // resolve null (更名/調薪) by inheriting previous state
  let prevState = false;
  const resolved = hist.map(h => {
    const cs = h.countsSeniority === null || h.countsSeniority === undefined
      ? prevState
      : h.countsSeniority;
    prevState = cs;
    return { ...h, _cs: cs };
  });

  const today = new Date().toISOString().slice(0, 10);
  let totalDays = 0;

  for (let i = 0; i < resolved.length; i++) {
    if (!resolved[i]._cs) continue;
    const from = resolved[i].date;
    const to = i + 1 < resolved.length ? resolved[i + 1].date : (staff.status === '在職' ? today : null);
    if (!to) continue;
    const days = (new Date(to) - new Date(from)) / 86400000;
    if (days > 0) totalDays += days;
  }

  if (totalDays <= 0) return '0 個月';
  const months = Math.floor(totalDays / 30.4375);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} 個月`;
  if (remMonths === 0) return `${years} 年`;
  return `${years} 年 ${remMonths} 個月`;
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2.5">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value}</span>
    </div>
  );
}

const ACTION_COLOR = {
  '到職': 'border-green-400 bg-green-400',
  '離職': 'border-gray-400 bg-gray-400',
  '復職': 'border-blue-400 bg-blue-400',
  '升遷': 'border-[#7a00df] bg-[#7a00df]',
  '轉職': 'border-orange-400 bg-orange-400',
};

export default function StaffDrawer({ staff, onClose, onEdit, onResign, onDelete, onRefresh }) {
  const [addingHistory, setAddingHistory] = useState(false);
  const [histForm, setHistForm] = useState({ date: '', action: '到職', note: '' });
  const [saving, setSaving] = useState(false);
  const [reinstateModal, setReinstateModal] = useState(false);
  const [reinstateDate, setReinstateDate] = useState(new Date().toISOString().slice(0, 10));
  const [reinstateNote, setReinstateNote] = useState('');

  const history = [...(staff.employmentHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
  const seniority = calcSeniority(staff);

  const handleAddHistory = async (e) => {
    e.preventDefault();
    if (!histForm.date || !histForm.action) return;
    setSaving(true);
    try {
      await addHistoryEntry(staff.id, histForm);
      setAddingHistory(false);
      setHistForm({ date: '', action: '到職', note: '' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistory = async (entry) => {
    if (!confirm(`確定刪除「${entry.action}」（${entry.date}）這筆記錄？`)) return;
    try {
      await deleteHistoryEntry(staff.id, entry);
      onRefresh();
    } catch (e) {
      alert('刪除失敗：' + e.message);
    }
  };

  const handleReinstate = async () => {
    if (!reinstateDate) return;
    setSaving(true);
    try {
      await reinstateStaff(staff.id, reinstateDate, reinstateNote);
      setReinstateModal(false);
      setReinstateNote('');
      onRefresh();
      onClose();
    } catch (e) {
      alert('復職失敗：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full bg-purple-50 text-[#7a00df] font-bold text-lg flex items-center justify-center flex-shrink-0"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {staff.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-base">{staff.name}</span>
              <StatusBadge status={staff.status} />
              {staff.employmentType && staff.employmentType !== '正職' && (
                <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                  {staff.employmentType}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 truncate">{staff.title || staff.group}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl leading-none flex-shrink-0 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 基本資料 */}
          <Section title="基本資料">
            <InfoRow label="組別" value={staff.group} />
            <InfoRow label="公司" value={staff.company} />
            <InfoRow label="職稱" value={staff.title} />
            {staff.isManager && <InfoRow label="職級" value="管理職（膳雜費 $700）" />}
            <InfoRow label="雇用類型" value={staff.employmentType} />
            <InfoRow label="性別" value={staff.gender} />
            <InfoRow label="生日" value={staff.birthday} />
          </Section>

          {/* 聯絡資訊 */}
          <Section title="聯絡資訊">
            <InfoRow label="手機" value={staff.phone} />
            <InfoRow label="Email" value={staff.email} />
          </Section>

          {/* 雇用資訊 */}
          <Section title="雇用資訊">
            <InfoRow label="到職日" value={staff.joinDate} />
            <InfoRow label="試用期結束" value={staff.probationEndDate} />
            {staff.status === '離職' && <InfoRow label="離職日" value={staff.leaveDate} />}
            {seniority && <InfoRow label="年資" value={seniority} />}
          </Section>

          {/* 緊急聯絡人 */}
          {(staff.emergencyContactName || staff.emergencyContactPhone) && (
            <Section title="緊急聯絡人">
              <InfoRow label="姓名" value={staff.emergencyContactName} />
              <InfoRow label="電話" value={staff.emergencyContactPhone} />
            </Section>
          )}

          {/* 吉時開工打卡 */}
          <Section title="吉時開工打卡">
            <InfoRow label="LINE User ID" value={staff.lineUserId || '（未設定）'} />
            <InfoRow label="打卡政策" value={staff.attendancePolicy === 'strict' ? '嚴格' : '彈性'} />
            <InfoRow label="忘打卡審核" value={staff.requireClockApproval ? '需主管審核' : '自動通過'} />
            <InfoRow label="假單審核" value={staff.leaveApprovalRequired !== false ? '需要審核' : '自動核准'} />
          </Section>

          {/* 雇用歷程 */}
          <Section title="雇用歷程">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">尚無記錄</p>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-200" />
                {history.map((h, i) => {
                  const dotCls = ACTION_COLOR[h.action] || 'border-gray-400 bg-gray-400';
                  return (
                    <div key={i} className="relative flex gap-3 pb-4 last:pb-0 group/hist">
                      <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 bg-white ${dotCls}`} />
                      <div className="ml-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{h.action}</span>
                          {h.note && <span className="text-xs text-gray-500">{h.note}</span>}
                          <button
                            onClick={() => handleDeleteHistory(h)}
                            className="ml-auto opacity-0 group-hover/hist:opacity-100 text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-50 transition-all cursor-pointer"
                            title="刪除這筆記錄"
                          >
                            刪除
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{h.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 新增歷程 */}
            {addingHistory ? (
              <form onSubmit={handleAddHistory} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={histForm.date}
                    onChange={e => setHistForm(p => ({ ...p, date: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                  />
                  <select
                    value={histForm.action}
                    onChange={e => setHistForm(p => ({ ...p, action: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    {['到職','離職','復職','升遷','轉職','其他'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="備註（可留空）"
                  value={histForm.note}
                  onChange={e => setHistForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setAddingHistory(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-lg cursor-pointer">
                    取消
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-3 py-1.5 text-xs bg-[#7a00df] text-white rounded-lg hover:bg-[#5c00a8] disabled:opacity-50 cursor-pointer">
                    {saving ? '儲存中…' : '儲存'}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingHistory(true)}
                className="mt-2 text-xs text-[#7a00df] hover:underline cursor-pointer"
              >
                ＋ 新增歷程記錄
              </button>
            )}
          </Section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => { onEdit(staff); onClose(); }}
            className="px-4 py-2 rounded-lg text-sm bg-[#7a00df] text-white hover:bg-[#5c00a8] transition-colors cursor-pointer"
          >
            編輯資料
          </button>
          {staff.status === '在職' && (
            <button
              onClick={() => { onResign(staff); onClose(); }}
              className="px-4 py-2 rounded-lg text-sm border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
            >
              標記離職
            </button>
          )}
          {staff.status === '離職' && (
            <button
              onClick={() => setReinstateModal(true)}
              className="px-4 py-2 rounded-lg text-sm border border-green-200 text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
            >
              標記復職
            </button>
          )}
          <button
            onClick={() => { onDelete(staff); onClose(); }}
            className="px-4 py-2 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            刪除同仁
          </button>
        </div>
      </motion.div>

      {/* 復職 Modal */}
      {reinstateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setReinstateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">標記復職 — {staff.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">復職日期</label>
                <input
                  type="date"
                  value={reinstateDate}
                  onChange={e => setReinstateDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">備註（可留空）</label>
                <input
                  type="text"
                  value={reinstateNote}
                  onChange={e => setReinstateNote(e.target.value)}
                  placeholder="例：重新到職"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setReinstateModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button
                onClick={handleReinstate}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '處理中…' : '確認復職'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
