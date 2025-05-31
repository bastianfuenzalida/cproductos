<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $product_id = isset($input['product_id']) ? intval($input['product_id']) : 0;
    $field = isset($input['field']) ? $input['field'] : '';
    $value = isset($input['value']) ? $input['value'] : null;

    if ($product_id <= 0 || !$field || $value === null) {
        throw new Exception('Datos incompletos');
    }

    // Solo permitir ciertos campos editables
    $allowed_fields = ['list_price', 'default_code', 'barcode'];
    if (!in_array($field, $allowed_fields)) {
        throw new Exception('Campo no permitido');
    }

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

    // Actualizar el campo en Odoo
    $update_data = [
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
                [$field => $value]
            ]
        ],
        "id" => 2
    ];
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($update_data));
    $response = curl_exec($ch);
    curl_close($ch);
    $result = json_decode($response, true);
    if (isset($result['error'])) {
        throw new Exception('Error al actualizar: ' . json_encode($result['error']));
    }
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    error_log('Error en update_field.php: ' . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}
