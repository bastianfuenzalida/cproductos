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

// Obtener el ID del producto
$input = json_decode(file_get_contents('php://input'), true);
$product_id = isset($input['product_id']) ? intval($input['product_id']) : 0;

if (!$product_id) {
    echo json_encode(['error' => 'ID de producto no válido']);
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

    // Obtener historial de ventas de los últimos 2 meses
    $dosMesesAtras = date('Y-m-d', strtotime('-2 months'));
    
    // Buscar líneas de venta para este producto (sale.order.line)
    $sale_search_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "sale.order.line",
                "search_read",
                [
                    ['product_id', '=', $product_id],
                    ['order_id.date_order', '>=', $dosMesesAtras],
                    ['order_id.state', 'in', ['sale', 'done']]
                ],
                ['product_uom_qty', 'create_date', 'order_id', 'order_id.team_id'],
                0, // offset
                100 // limit
            ]
        ],
        "id" => 2
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($sale_search_data));
    $response = curl_exec($ch);
    
    if ($response === false) {
        throw new Exception('Error al obtener historial de ventas: ' . curl_error($ch));
    }

    $sale_result = json_decode($response, true);
    
    if (isset($sale_result['error'])) {
        throw new Exception('Error en la consulta de ventas: ' . json_encode($sale_result['error']));
    }

    $sales_history = [];
    $sale_order_ids = [];
    if (isset($sale_result['result'])) {
        foreach ($sale_result['result'] as $line) {
            if (isset($line['order_id']) && is_array($line['order_id']) && isset($line['order_id'][0])) {
                $sale_order_ids[] = $line['order_id'][0];
            }
        }
        $sale_order_ids = array_unique($sale_order_ids);
    }

    // Consultar sale.order para obtener team_id
    $sale_orders_team = [];
    if (!empty($sale_order_ids)) {
        $sale_orders_search = [
            "jsonrpc" => "2.0",
            "method" => "call",
            "params" => [
                "service" => "object",
                "method" => "execute",
                "args" => [
                    $db,
                    $uid,
                    $password,
                    "sale.order",
                    "read",
                    $sale_order_ids,
                    ['id', 'team_id']
                ]
            ],
            "id" => 10
        ];
        $ch_so = curl_init($odooUrl);
        curl_setopt($ch_so, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch_so, CURLOPT_POST, true);
        curl_setopt($ch_so, CURLOPT_POSTFIELDS, json_encode($sale_orders_search));
        curl_setopt($ch_so, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch_so, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch_so, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch_so, CURLOPT_TIMEOUT, 30);
        $response_so = curl_exec($ch_so);
        curl_close($ch_so);
        $so_result = json_decode($response_so, true);
        if (!isset($so_result['error']) && isset($so_result['result'])) {
            foreach ($so_result['result'] as $so) {
                $sale_orders_team[$so['id']] = (isset($so['team_id']) && is_array($so['team_id']) && isset($so['team_id'][1])) ? $so['team_id'][1] : 'Sin equipo';
            }
        }
    }

    // Mapear líneas de venta con team_id real
    if (isset($sale_result['result'])) {
        $sales_history = array_map(function($line) use ($sale_orders_team) {
            $order_id = (isset($line['order_id']) && is_array($line['order_id']) && isset($line['order_id'][0])) ? $line['order_id'][0] : null;
            $team_name = ($order_id && isset($sale_orders_team[$order_id])) ? $sale_orders_team[$order_id] : 'Sin equipo';
            return [
                'date' => isset($line['create_date']) ? $line['create_date'] : '',
                'qty' => isset($line['product_uom_qty']) ? $line['product_uom_qty'] : 0,
                'team_id' => $team_name
            ];
        }, $sale_result['result']);
    }

    // --- Consultar POS (pos.order.line) ---
    $pos_search_data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "object",
            "method" => "execute",
            "args" => [
                $db,
                $uid,
                $password,
                "pos.order.line",
                "search_read",
                [
                    ['product_id', '=', $product_id],
                    ['create_date', '>=', $dosMesesAtras],
                ],
                ['qty', 'create_date', 'order_id', 'order_id.team_id'],
                0, // offset
                100 // limit
            ]
        ],
        "id" => 3
    ];

    $ch_pos = curl_init($odooUrl);
    curl_setopt($ch_pos, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch_pos, CURLOPT_POST, true);
    curl_setopt($ch_pos, CURLOPT_POSTFIELDS, json_encode($pos_search_data));
    curl_setopt($ch_pos, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch_pos, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch_pos, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch_pos, CURLOPT_TIMEOUT, 30);
    $response_pos = curl_exec($ch_pos);
    curl_close($ch_pos);

    $pos_order_ids = [];
    if ($response_pos !== false) {
        $pos_result = json_decode($response_pos, true);
        if (!isset($pos_result['error']) && isset($pos_result['result'])) {
            foreach ($pos_result['result'] as $line) {
                if (isset($line['order_id']) && is_array($line['order_id']) && isset($line['order_id'][0])) {
                    $pos_order_ids[] = $line['order_id'][0];
                }
            }
            $pos_order_ids = array_unique($pos_order_ids);
        }
    }
    // Consultar pos.order para obtener team_id
    $pos_orders_team = [];
    if (!empty($pos_order_ids)) {
        $pos_orders_search = [
            "jsonrpc" => "2.0",
            "method" => "call",
            "params" => [
                "service" => "object",
                "method" => "execute",
                "args" => [
                    $db,
                    $uid,
                    $password,
                    "pos.order",
                    "read",
                    $pos_order_ids,
                    ['id', 'team_id']
                ]
            ],
            "id" => 11
        ];
        $ch_po = curl_init($odooUrl);
        curl_setopt($ch_po, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch_po, CURLOPT_POST, true);
        curl_setopt($ch_po, CURLOPT_POSTFIELDS, json_encode($pos_orders_search));
        curl_setopt($ch_po, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch_po, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch_po, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch_po, CURLOPT_TIMEOUT, 30);
        $response_po = curl_exec($ch_po);
        curl_close($ch_po);
        $po_result = json_decode($response_po, true);
        if (!isset($po_result['error']) && isset($po_result['result'])) {
            foreach ($po_result['result'] as $po) {
                $pos_orders_team[$po['id']] = (isset($po['team_id']) && is_array($po['team_id']) && isset($po['team_id'][1])) ? $po['team_id'][1] : 'Punto de venta';
            }
        }
    }
    // Mapear líneas POS con team_id real y unir al sales_history
    if (isset($pos_result['result'])) {
        $pos_history = array_map(function($line) use ($pos_orders_team) {
            $order_id = (isset($line['order_id']) && is_array($line['order_id']) && isset($line['order_id'][0])) ? $line['order_id'][0] : null;
            $team_name = ($order_id && isset($pos_orders_team[$order_id])) ? $pos_orders_team[$order_id] : 'Punto de venta';
            return [
                'date' => isset($line['create_date']) ? $line['create_date'] : '',
                'qty' => isset($line['qty']) ? $line['qty'] : 0,
                'team_id' => $team_name
            ];
        }, $pos_result['result']);
        $sales_history = array_merge($sales_history, $pos_history);
    }

    echo json_encode(['sales_history' => $sales_history]);

} catch (Exception $e) {
    error_log("Error en get_sales_history.php: " . $e->getMessage());
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
