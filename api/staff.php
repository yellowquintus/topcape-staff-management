<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/tools/lib/auth.php';
require_login(); // list 只需登入；寫入操作在下方另行檢查

$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://topcape.com.tw', 'http://localhost:5173'];
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$file   = __DIR__ . '/../data/staff.json';
$action = $_GET['action'] ?? 'list';

function readStaff(string $file): array {
    if (!file_exists($file)) return [];
    return json_decode(file_get_contents($file), true) ?: [];
}

function writeStaff(string $file, array $data): void {
    $fp = fopen($file, 'c');
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode(array_values($data), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
}

function sanitizeEntry(array $body, array $base): array {
    $s = $base;
    foreach (['name','group','company','title','phone','email','status','joinDate','leaveDate','birthday','gender','employmentType','probationEndDate','emergencyContactName','emergencyContactPhone','lineUserId'] as $f) {
        if (array_key_exists($f, $body)) $s[$f] = trim((string)($body[$f] ?? ''));
    }
    if (array_key_exists('isManager', $body)) $s['isManager'] = (bool)$body['isManager'];
    if (array_key_exists('requireClockApproval', $body)) $s['requireClockApproval'] = (bool)$body['requireClockApproval'];
    if (array_key_exists('attendancePolicy', $body) && in_array($body['attendancePolicy'], ['strict','flexible'])) {
        $s['attendancePolicy'] = $body['attendancePolicy'];
    }
    if (array_key_exists('employmentHistory', $body) && is_array($body['employmentHistory'])) {
        $s['employmentHistory'] = $body['employmentHistory'];
    }
    // 標記離職時自動填入今日
    if (($s['status'] ?? '在職') === '離職' && empty($s['leaveDate'])) {
        $s['leaveDate'] = date('Y-m-d');
    }
    return $s;
}

function normalizeEntry(array $s): array {
    $defaults = [
        'gender'                => '',
        'employmentType'        => '正職',
        'probationEndDate'      => '',
        'emergencyContactName'  => '',
        'emergencyContactPhone' => '',
        'employmentHistory'     => [],
        'lineUserId'            => '',
        'requireClockApproval'  => false,
        'attendancePolicy'      => 'flexible',
    ];
    foreach ($defaults as $k => $v) {
        if (!array_key_exists($k, $s)) $s[$k] = $v;
    }
    // 若歷程為空，根據 joinDate / leaveDate 自動生成
    if (empty($s['employmentHistory'])) {
        $history = [];
        if (!empty($s['joinDate'])) {
            $history[] = ['date' => $s['joinDate'], 'action' => '到職', 'note' => ''];
        }
        if (($s['status'] ?? '') === '離職' && !empty($s['leaveDate'])) {
            $history[] = ['date' => $s['leaveDate'], 'action' => '離職', 'note' => ''];
        }
        usort($history, fn($a,$b) => strcmp($a['date'], $b['date']));
        $s['employmentHistory'] = $history;
    }
    return $s;
}

function appendHistory(array &$s, string $date, string $action, string $note = ''): void {
    if (!isset($s['employmentHistory'])) $s['employmentHistory'] = [];
    $actions = array_column($s['employmentHistory'], 'action');
    if (!in_array($action, $actions)) {
        $s['employmentHistory'][] = ['date' => $date, 'action' => $action, 'note' => $note];
        usort($s['employmentHistory'], fn($a,$b) => strcmp($a['date'], $b['date']));
    }
}

// ── GET list ──────────────────────────────────────────────────────────────
if ($action === 'list') {
    $staff = array_map('normalizeEntry', readStaff($file));
    if (!empty($_GET['active'])) {
        $staff = array_values(array_filter($staff, fn($s) => ($s['status'] ?? '在職') === '在職'));
    }
    echo json_encode($staff, JSON_UNESCAPED_UNICODE);
    exit;
}

// ── 寫入操作需要 isAdmin ─────────────────────────────────────────────────
require_admin();

// ── POST only below ──────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

if ($action === 'create') {
    $name  = trim($body['name']  ?? '');
    $email = trim($body['email'] ?? '');
    if (!$name || !$email) {
        http_response_code(400);
        echo json_encode(['error' => 'name and email required']);
        exit;
    }
    $staff = readStaff($file);
    $id    = preg_replace('/[^a-z0-9]/', '', strtolower($name)) ?: 'staff' . time();
    $existing = array_column($staff, 'id');
    $base = $id; $i = 2;
    while (in_array($id, $existing)) { $id = $base . $i++; }

    $defaults = [
        'id'        => $id,
        'name'      => $name,
        'group'     => '',
        'company'   => '兩者',
        'title'     => '',
        'phone'     => '',
        'email'     => $email,
        'status'    => '在職',
        'joinDate'              => '',
        'leaveDate'             => '',
        'birthday'              => '',
        'isManager'             => false,
        'gender'                => '',
        'employmentType'        => '正職',
        'probationEndDate'      => '',
        'emergencyContactName'  => '',
        'emergencyContactPhone' => '',
        'employmentHistory'     => [],
        'lineUserId'            => '',
        'requireClockApproval'  => false,
        'attendancePolicy'      => 'flexible',
    ];
    $entry = sanitizeEntry($body, $defaults);
    $entry['id'] = $id;
    // 工讀生預設需要主管審核忘打卡
    if (($entry['employmentType'] ?? '正職') === '工讀生') {
        $entry['requireClockApproval'] = true;
    }
    // 自動加「到職」歷程
    if (!empty($entry['joinDate'])) {
        appendHistory($entry, $entry['joinDate'], '到職');
    }
    $staff[] = $entry;
    writeStaff($file, $staff);
    echo json_encode(['ok' => true, 'staff' => $entry], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'update') {
    $id = trim($body['id'] ?? '');
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
    $staff = readStaff($file);
    $found = false;
    foreach ($staff as &$s) {
        if ($s['id'] === $id) {
            $oldStatus = $s['status'] ?? '在職';
            $s = sanitizeEntry($body, $s);
            $s['id'] = $id;
            $newStatus = $s['status'] ?? '在職';
            // 狀態變更時自動追加歷程
            if ($oldStatus === '在職' && $newStatus === '離職') {
                $leaveDate = !empty($s['leaveDate']) ? $s['leaveDate'] : date('Y-m-d');
                appendHistory($s, $leaveDate, '離職');
            } elseif ($oldStatus === '離職' && $newStatus === '在職') {
                appendHistory($s, date('Y-m-d'), '復職');
            }
            $found = true;
            break;
        }
    }
    unset($s);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'not found']); exit; }
    writeStaff($file, $staff);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'add_history') {
    $id    = trim($body['id'] ?? '');
    $entry = $body['entry'] ?? null;
    if (!$id || !isset($entry['date'], $entry['action'])) {
        http_response_code(400); echo json_encode(['error' => 'id, entry.date and entry.action required']); exit;
    }
    $staff = readStaff($file);
    $found = false;
    foreach ($staff as &$s) {
        if ($s['id'] === $id) {
            if (!isset($s['employmentHistory'])) $s['employmentHistory'] = [];
            $s['employmentHistory'][] = [
                'date'   => trim($entry['date']),
                'action' => trim($entry['action']),
                'note'   => trim($entry['note'] ?? ''),
            ];
            usort($s['employmentHistory'], fn($a,$b) => strcmp($a['date'], $b['date']));
            $found = true;
            break;
        }
    }
    unset($s);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'not found']); exit; }
    writeStaff($file, $staff);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'delete_history') {
    $id    = trim($body['id'] ?? '');
    $entry = $body['entry'] ?? null;
    if (!$id || !$entry) {
        http_response_code(400); echo json_encode(['error' => 'id and entry required']); exit;
    }
    $staff = readStaff($file);
    $found = false;
    foreach ($staff as &$s) {
        if ($s['id'] === $id) {
            $s['employmentHistory'] = array_values(array_filter(
                $s['employmentHistory'] ?? [],
                fn($h) => !(
                    $h['date']   === ($entry['date']   ?? '') &&
                    $h['action'] === ($entry['action'] ?? '') &&
                    ($h['note'] ?? '') === ($entry['note'] ?? '')
                )
            ));
            $found = true;
            break;
        }
    }
    unset($s);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'not found']); exit; }
    writeStaff($file, $staff);
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'reinstate') {
    $id   = trim($body['id']   ?? '');
    $date = trim($body['date'] ?? date('Y-m-d'));
    $note = trim($body['note'] ?? '');
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
    $staff = readStaff($file);
    $found = false;
    foreach ($staff as &$s) {
        if ($s['id'] === $id) {
            $s['status']    = '在職';
            $s['leaveDate'] = '';
            if (!isset($s['employmentHistory'])) $s['employmentHistory'] = [];
            $s['employmentHistory'][] = ['date' => $date, 'action' => '復職', 'note' => $note];
            usort($s['employmentHistory'], fn($a,$b) => strcmp($a['date'], $b['date']));
            $found = true;
            break;
        }
    }
    unset($s);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'not found']); exit; }
    writeStaff($file, $staff);
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'delete') {
    $id = trim($body['id'] ?? '');
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
    $staff = readStaff($file);
    $staff = array_filter($staff, fn($s) => $s['id'] !== $id);
    writeStaff($file, $staff);
    echo json_encode(['ok' => true]);
    exit;
}

// ── bindLine：供 LIFF 打卡系統綁定 LINE User ID，使用 LIFF_BIND_TOKEN 驗證 ──
// 不需要 Google OAuth，改用共用 token（與 attendance API 共用同一個 secret）
if ($action === 'bindLine') {
    $bindToken = defined('LIFF_BIND_TOKEN') ? LIFF_BIND_TOKEN : (getenv('LIFF_BIND_TOKEN') ?: '');
    $reqToken  = trim($body['bindToken'] ?? '');
    if (!$bindToken || $reqToken !== $bindToken) {
        http_response_code(403);
        echo json_encode(['error' => 'invalid token']);
        exit;
    }
    $staffId    = trim($body['staffId']    ?? '');
    $lineUserId = trim($body['lineUserId'] ?? '');
    if (!$staffId || !$lineUserId) {
        http_response_code(400);
        echo json_encode(['error' => 'staffId and lineUserId required']);
        exit;
    }
    $staff = readStaff($file);
    // 防止同一 lineUserId 綁定兩人
    foreach ($staff as $s) {
        if (($s['lineUserId'] ?? '') === $lineUserId && $s['id'] !== $staffId) {
            http_response_code(409);
            echo json_encode(['error' => 'lineUserId already bound to another staff']);
            exit;
        }
    }
    $found = false;
    foreach ($staff as &$s) {
        if ($s['id'] === $staffId) {
            $s['lineUserId'] = $lineUserId;
            $found = true;
            break;
        }
    }
    unset($s);
    if (!$found) { http_response_code(404); echo json_encode(['error' => 'staff not found']); exit; }
    writeStaff($file, $staff);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
