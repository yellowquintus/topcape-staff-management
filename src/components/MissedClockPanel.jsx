import { useState, useEffect, useCallback } from 'react';
import { fetchMissedClockRequests, reviewMissedClock } from '../api';

const STATUS_LABEL = { pending: '待審核', approved: '已核准', rejected: '已拒絕' };
const STATUS_COLOR = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-gray-100 text-gray-500 border-gray-200',
};
const TYPE_LABEL = { clockIn: '上班打卡', clockOut: '下班打卡' };

export default function MissedClockPanel({ onPendingCount }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [reviewing, setReviewing] = useState(null); // { id, action }
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchMissedClockRequests();
      setRequests(data.requests || []);
      const pending = (data.requests || []).filter(r => r.status === 'pending').length;
      onPendingCount?.(pending);
    } catch (e) {
      showToast('載入失敗：' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [onPendingCount]);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  async function handleReview() {
    if (!reviewing) return;
    setSaving(true);
    try {
      await reviewMissedClock(reviewing.id, reviewing.action, note);
      showToast(reviewing.action === 'approve' ? '已核准' : '已拒絕');
      setReviewing(null);
      setNote('');
      load();
    } catch (e) {
      showToast('操作失敗：' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { val: 'pending', label: `待審核${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { val: 'approved', label: '已核准' },
          { val: 'rejected', label: '已拒絕' },
          { val: 'all', label: '全部' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer
              ${filter === val ? 'bg-[#40CE94] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">載入中…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          {filter === 'pending' ? '目前沒有待審核的申請' : '沒有符合的記錄'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{req.staffName}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{req.staffGroup}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 border ${STATUS_COLOR[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">申請時間：{req.submittedAt}</p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setReviewing({ id: req.id, action: 'approve' }); setNote(''); }}
                      className="px-3 py-1.5 text-xs bg-[#40CE94] text-white rounded-lg hover:bg-[#32b882] cursor-pointer"
                    >
                      核准
                    </button>
                    <button
                      onClick={() => { setReviewing({ id: req.id, action: 'reject' }); setNote(''); }}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                    >
                      拒絕
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">日期</p>
                  <p className="font-medium text-gray-800">{req.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">類型</p>
                  <p className="font-medium text-gray-800">{TYPE_LABEL[req.type] || req.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">申請時間</p>
                  <p className="font-medium text-gray-800">{req.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">原因</p>
                  <p className="text-gray-700">{req.reason}</p>
                </div>
              </div>

              {req.reviewedBy && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                  {req.reviewedAt} 由 {req.reviewedBy} 審核
                  {req.reviewNote ? `：${req.reviewNote}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 審核確認 Modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setReviewing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">
              確認{reviewing.action === 'approve' ? '核准' : '拒絕'}申請
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {reviewing.action === 'approve'
                ? '核准後將自動補打卡記錄，此操作無法撤銷。'
                : '拒絕後同仁將不會補到打卡記錄。'}
            </p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">審核備註（可留空）</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="例：已確認考勤"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c8f0e0] outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReviewing(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
                取消
              </button>
              <button
                onClick={handleReview}
                disabled={saving}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 cursor-pointer
                  ${reviewing.action === 'approve' ? 'bg-[#40CE94] hover:bg-[#32b882]' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {saving ? '處理中…' : reviewing.action === 'approve' ? '確認核准' : '確認拒絕'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full shadow-lg text-sm font-medium z-50 whitespace-nowrap
          ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#111] text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
