<?php
header('Content-Type: application/json');

// Configuración Odoo
$odoo_url = 'http://192.168.0.11:8069/jsonrpc';
$db = 'MASCOLIMP-PRD';
$username = 'contacto@mascolimp.cl';
$password = 'Asd18280896';

// Recibir product_id por GET o POST
$product_id = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
if (!$product_id) {
    echo json_encode(['success' => false, 'error' => 'ID de producto requerido']);
    exit;
}

// Función para llamar a Odoo por JSON-RPC
function odoo_jsonrpc($url, $method, $params) {
    $data = [
        'jsonrpc' => '2.0',
        'method' => 'call',
        'params' => $params,
        'id' => rand(1, 100000)
    ];
    $options = [
        'http' => [
            'header'  => "Content-type: application/json",
            'method'  => 'POST',
            'content' => json_encode($data),
            'timeout' => 10
        ]
    ];
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    if ($result === FALSE) return null;
    $response = json_decode($result, true);
    return $response['result'] ?? null;
}

// Paso 1: Autenticación
$uid = odoo_jsonrpc($odoo_url, 'call', [
    'service' => 'common',
    'method' => 'login',
    'args' => [$db, $username, $password]
]);
if (!$uid) {
    echo json_encode(['success' => false, 'error' => 'No se pudo autenticar en Odoo']);
    exit;
}

// Paso 2: Buscar el ID de la ubicación "Virtual Locations/Inventory adjustment"
$location_search = odoo_jsonrpc($odoo_url, 'call', [
    'service' => 'object',
    'method' => 'execute_kw',
    'args' => [
        $db, $uid, $password,
        'stock.location', 'search_read',
        [[['complete_name', '=', 'Virtual Locations/Inventory adjustment']]],
        ['fields' => ['id'], 'limit' => 1]
    ]
]);
if (is_array($location_search) && count($location_search) > 0) {
    $location_id = $location_search[0]['id'];
} else {
    echo json_encode(['success' => false, 'error' => 'No se encontró la ubicación de ajuste de inventario']);
    exit;
}

// Paso 3: Buscar el último movimiento de stock para el producto, ubicación y estado done
$movimientos = odoo_jsonrpc($odoo_url, 'call', [
    'service' => 'object',
    'method' => 'execute_kw',
    'args' => [
        $db, $uid, $password,
        'stock.move', 'search_read',
        [[
            ['product_id', '=', $product_id],
            ['state', '=', 'done'],
            '|',
            ['location_dest_id', '=', $location_id],
            ['location_id', '=', $location_id]
        ]],
        [
            'fields' => ['date', 'reference', 'product_uom_qty', 'qty_done'],
            'order' => 'date desc',
            'limit' => 1
        ]
    ]
]);

if (is_array($movimientos) && count($movimientos) > 0) {
    $mov = $movimientos[0];
    // Consultar el stock actual del producto
    $stock_actual = null;
    $product = odoo_jsonrpc($odoo_url, 'call', [
        'service' => 'object',
        'method' => 'execute_kw',
        'args' => [
            $db, $uid, $password,
            'product.product', 'read',
            [$product_id],
            ['qty_available']
        ]
    ]);
    if (is_array($product) && count($product) > 0) {
        $stock_actual = $product[0]['qty_available'];
    }
    echo json_encode([
        'success' => true,
        'date' => $mov['date'],
        'reference' => $mov['reference'],
        'qty' => $mov['product_uom_qty'],
        'qty_done' => isset($mov['qty_done']) ? $mov['qty_done'] : null,
        'stock_final' => $stock_actual
    ]);
} else {
    echo json_encode(['success' => true, 'empty' => true]);
}
