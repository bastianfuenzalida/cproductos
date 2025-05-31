<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    // Validar datos de entrada
    if (!isset($_POST['product_id']) || !isset($_POST['new_qty']) || !isset($_POST['reason'])) {
        throw new Exception('Faltan datos requeridos');
    }

    $product_id = intval($_POST['product_id']);
    $new_qty = floatval($_POST['new_qty']);
    $reason = $_POST['reason'];
    $location_id = 46; // ID de la ubicación principal de stock

    if ($new_qty < 0) {
        throw new Exception('La cantidad no puede ser negativa');
    }

    // Inicializar CURL
    $ch = curl_init($odooUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    // 1. Crear el ajuste de inventario
    $inventory_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "stock.inventory",
                "create",
                [
                    'name' => $reason,
                    'filter' => 'product',
                    'product_id' => $product_id,
                    'location_id' => $location_id,
                    'state' => 'draft'
                ]
            ]
        ],
        "id" => 1
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($inventory_data));
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL: ' . curl_error($ch));
    }
    $result = json_decode($response, true);
    if (isset($result['error'])) {
        throw new Exception('Error al crear ajuste: ' . json_encode($result['error']));
    }
    $inventory_id = $result['result'];

    // 2. Crear la línea de inventario con la cantidad real
    $line_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "stock.inventory.line",
                "create",
                [
                    'inventory_id' => $inventory_id,
                    'product_id' => $product_id,
                    'product_qty' => $new_qty,
                    'location_id' => $location_id
                ]
            ]
        ],
        "id" => 2
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($line_data));
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL en línea: ' . curl_error($ch));
    }
    $result = json_decode($response, true);
    if (isset($result['error'])) {
        throw new Exception('Error al crear línea: ' . json_encode($result['error']));
    }

    // 3. Validar el ajuste
    $validate_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "stock.inventory",
                "action_validate",
                [$inventory_id]
            ]
        ],
        "id" => 3
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($validate_data));
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('Error CURL en validación: ' . curl_error($ch));
    }
    $result = json_decode($response, true);
    if (isset($result['error'])) {
        throw new Exception('Error al validar: ' . json_encode($result['error']));
    }

    // 4. Agregar nota en el chatter del producto
    $mensaje = sprintf(
        '<p>Ajuste de inventario: %s unidades</p><p>Motivo: %s</p>',
        number_format($new_qty, 0, '', '.'),
        htmlspecialchars($reason)
    );

    $message_post_data = [
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
                "message_post",
                $product_id,
                $mensaje,
                null,
                "notification",
                "mail.mt_note",
                []
            ]
        ],
        "id" => 4
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message_post_data));
    $response = curl_exec($ch);
    curl_close($ch);

    echo json_encode([
        'success' => true,
        'message' => 'Ajuste de stock realizado con éxito'
    ]);

} catch (Exception $e) {
    error_log("Error en adjust_stock.php: " . $e->getMessage());
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}