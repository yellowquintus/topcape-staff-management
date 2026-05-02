<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
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
    foreach (['name','group','company','title','phone','email','status','joinDate','leaveDate','birthday'] as $f) {
        if (array_key_exists($f, $body)) $s[$f] = trim((string)($body[$f] ?? ''));
    }
    // 標記離職時自動填入今日
    if (($s['status'] ?? '在職') === '離職' && empty($s['leaveDate'])) {
        $s['leaveDate'] = date('Y-m-d');
    }
    return $s;
}

// ── GET list ──────────────────────────────────────────────────────────────
if ($action === 'list') {
    $staff = readStaff($file);
    if (!empty($_GET['active'])) {
        $staff = array_values(array_filter($staff, fn($s) => ($s['status'] ?? '在職') === '在職'));
    }
    echo json_encode($staff, JSON_UNESCAPED_UNICODE);
    exit;
}

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
        'joinDate'  => '',
        'leaveDate' => '',
        'birthday'  => '',
    ];
    $entry = sanitizeEntry($body, $defaults);
    $entry['id'] = $id;
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
            $s = sanitizeEntry($body, $s);
            $s['id'] = $id;
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

if ($action === 'delete') {
    $id = trim($body['id'] ?? '');
    if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
    $staff = readStaff($file);
    $staff = array_filter($staff, fn($s) => $s['id'] !== $id);
    writeStaff($file, $staff);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Unknown action']);
