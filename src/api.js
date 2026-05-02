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
