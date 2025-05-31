<?php
header('Content-Type: application/json');

// Configuración de conexión a Odoo
$odooUrl = 'http://192.168.0.11:8069/jsonrpc';
$db = 'MASCOLIMP-PRD';
$username = 'contacto@mascolimp.cl';
$password = 'Asd18280896';

$input = json_decode(file_get_contents('php://input'), true);
$product_id = isset($input['id']) ? intval($input['id']) : 0;

if ($product_id <= 0) {
    echo json_encode(['error' => 'ID de producto inválido']);
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

    // Leer la imagen grande y original
    $read_data = [
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
                "read",
                [$product_id],
                ['image_1024', 'image']
            ]
        ],
        "id" => 2
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($read_data));
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL en lectura: ' . curl_error($ch));
    }
    $read_result = json_decode($response, true);
    if (isset($read_result['error'])) {
        throw new Exception('Error en la lectura: ' . json_encode($read_result['error']));
    }
    curl_close($ch);

    $image_1024 = isset($read_result['result'][0]['image_1024']) ? $read_result['result'][0]['image_1024'] : null;
    $image_full = isset($read_result['result'][0]['image']) ? $read_result['result'][0]['image'] : null;

    if ($image_1024) {
        echo json_encode(['image_1024' => $image_1024]);
        exit;
    } elseif ($image_full) {
        echo json_encode(['image_1024' => $image_full]);
        exit;
    } else {
        echo json_encode(['error' => 'Imagen no encontrada']);
        exit;
    }

} catch (Exception $e) {
    error_log("Error en get_image.php: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}
?> 