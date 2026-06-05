const BASE = '/tools/staff/api/staff.php';

export async function fetchStaff(activeOnly = false) {
  const url = activeOnly ? `${BASE}?action=list&active=1` : `${BASE}?action=list`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createStaff(data) {
  const res = await fetch(`${BASE}?action=create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateStaff(data) {
  const res = await fetch(`${BASE}?action=update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteStaff(id) {
  const res = await fetch(`${BASE}?action=delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function addHistoryEntry(id, entry) {
  const res = await fetch(`${BASE}?action=add_history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, entry }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteHistoryEntry(id, entry) {
  const res = await fetch(`${BASE}?action=delete_history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, entry }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const ATTENDANCE_ADMIN = '/tools/attendance/api/admin.php';

export async function fetchMissedClockRequests() {
  const res = await fetch(`${ATTENDANCE_ADMIN}?action=list`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function reviewMissedClock(id, action, note = '') {
  const res = await fetch(`${ATTENDANCE_ADMIN}?action=review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action, note }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function reinstateStaff(id, date, note = '') {
  const res = await fetch(`${BASE}?action=reinstate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, date, note }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
