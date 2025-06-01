<?php
session_start();

header('Content-Type: application/json');

// Configuración de Odoo
$odoo_url = 'http://192.168.0.11:8069'; // Cambia esto por la URL de tu Odoo
$odoo_db = 'MASCOLIMP-PRD'; // Cambia esto por el nombre de tu base de datos

$input = json_decode(file_get_contents('php://input'), true);
$user = isset($input['user']) ? $input['user'] : '';
$pass = isset($input['pass']) ? $input['pass'] : '';

if (!$user || !$pass) {
    echo json_encode(['success' => false, 'error' => 'Usuario y contraseña requeridos']);
    exit;
}

// Llamada a Odoo JSON-RPC para login
function odoo_login($url, $db, $user, $pass) {
    $data = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => [
            'db' => $db,
            'login' => $user,
            'password' => $pass
        ],
        'id' => 1
    ];
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($data)
        ]
    ];
    $context = stream_context_create($opts);
    $result = file_get_contents($url . '/web/session/authenticate', false, $context);
    if ($result === false) return false;
    $json = json_decode($result, true);
    if (isset($json['result']) && isset($json['result']['uid']) && $json['result']['uid']) {
        return $json['result'];
    }
    return false;
}

$login = odoo_login($odoo_url, $odoo_db, $user, $pass);
if ($login) {
    // Guardar datos del usuario en la sesión
    $_SESSION['odoo_uid'] = $login['uid'];
    $_SESSION['odoo_user'] = $login['username'];
    $_SESSION['odoo_name'] = $login['name'];
    $_SESSION['odoo_session_id'] = $login['session_id'];
    echo json_encode(['success' => true, 'user' => [
        'uid' => $login['uid'],
        'username' => $login['username'],
        'name' => $login['name'],
        'session_id' => $login['session_id']
    ]]);
} else {
    echo json_encode(['success' => false, 'error' => 'Credenciales incorrectas o error de conexión con Odoo']);
}
