import { useState } from 'react';

const GROUPS = ['管理組', '企劃組', '設計組', '基地組'];
const COMPANIES = ['開譜', '開闊', '兩者'];

const inputCls = (error) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors
  ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-purple-200'}`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function StaffModal({ mode, staff, onSave, onClose }) {
  const [form, setForm] = useState(staff || {
    name: '', group: '管理組', company: '兩者', title: '',
    phone: '', email: '', status: '在職',
    joinDate: '', leaveDate: '', birthday: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = '必填';
    if (!form.email?.trim()) errs.email = '必填';
    if (!form.group) errs.group = '必填';
    if (!form.company) errs.company = '必填';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">
            {mode === 'add' ? '新增同仁' : '編輯同仁'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="姓名 *" error={errors.name}>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className={inputCls(errors.name)} placeholder="例：施清仁" />
            </Field>
            <Field label="Email *" error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={inputCls(errors.email)} placeholder="name@topcape.com.tw" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="組別 *" error={errors.group}>
              <select value={form.group} onChange={e => set('group', e.target.value)} className={inputCls(errors.group)}>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="公司 *" error={errors.company}>
              <select value={form.company} onChange={e => set('company', e.target.value)} className={inputCls(errors.company)}>
                {COMPANIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="職稱">
              <input value={form.title || ''} onChange={e => set('title', e.target.value)}
                className={inputCls()} placeholder="例：企劃專員" />
            </Field>
            <Field label="手機">
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                className={inputCls()} placeholder="0912-345678" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="入職日期">
              <input type="date" value={form.joinDate || ''} onChange={e => set('joinDate', e.target.value)}
                className={inputCls()} />
            </Field>
            <Field label="生日">
              <input type="date" value={form.birthday || ''} onChange={e => set('birthday', e.target.value)}
                className={inputCls()} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="在職狀態">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls()}>
                <option>在職</option>
                <option>離職</option>
              </select>
            </Field>
            {form.status === '離職' && (
              <Field label="離職日期">
                <input type="date" value={form.leaveDate || ''} onChange={e => set('leaveDate', e.target.value)}
                  className={inputCls()} />
              </Field>
            )}
          </div>
          <div className="pt-2 flex gap-3 justify-end border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
              取消
            </button>
            <button type="submit"
              className="px-5 py-2 rounded-lg text-sm bg-[#7a00df] hover:bg-[#5c00a8] text-white font-medium transition-colors">
              {mode === 'add' ? '新增' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
