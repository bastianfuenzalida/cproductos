<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Configuración de conexión a Odoo
$odooUrl = 'http://192.168.0.11:8069/jsonrpc';
$db = 'MASCOLIMP-PRD';
$username = 'contacto@mascolimp.cl';
$password = 'Asd18280896';

// Obtener datos del POST
$input = json_decode(file_get_contents('php://input'), true);
$product_id = isset($input['product_id']) ? intval($input['product_id']) : 0;
$new_price = isset($input['new_price']) ? floatval($input['new_price']) : 0;

if (!$product_id || !$new_price) {
    echo json_encode(['error' => 'Faltan datos requeridos (product_id, new_price)']);
    exit;
}

try {
    // Autenticación en Odoo
    $auth_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "common",
            "method" => "login",
            "args" => [
                $db,
                $username,
                $password
            ]
        ],
        "id" => 1
    ];

    $ch = curl_init($odooUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($auth_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL: ' . curl_error($ch));
    }
    $auth_result = json_decode($response, true);
    if (isset($auth_result['error'])) {
        throw new Exception('Error de autenticación: ' . json_encode($auth_result['error']));
    }
    $uid = $auth_result['result'];

    // Actualizar el precio en Odoo
    $write_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "product.product",
                "write",
                [$product_id],
                ["list_price" => $new_price]
            ]
        ],
        "id" => 2
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($write_data));
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL en actualización: ' . curl_error($ch));
    }
    $write_result = json_decode($response, true);
    if (isset($write_result['error'])) {
        throw new Exception('Error en la actualización: ' . json_encode($write_result['error']));
    }
    curl_close($ch);

    if ($write_result['result'] === true) {
        echo json_encode(['success' => true, 'message' => 'Precio actualizado en Odoo']);
    } else {
        echo json_encode(['success' => false, 'message' => 'No se pudo actualizar el precio']);
    }

} catch (Exception $e) {
    error_log("Error en update_price.php: " . $e->getMessage());
    echo json_encode([
        'error' => $e->getMessage(),
        'debug_info' => [
            'odoo_url' => $odooUrl,
            'db' => $db,
            'username' => $username
        ]
    ]);
}

?> 