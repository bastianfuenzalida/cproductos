<?php
require_once 'config.php';
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Configuración de conexión a Odoo
$odooUrl = 'http://192.168.0.11:8069/jsonrpc';
$db = 'MASCOLIMP-PRD';
$username = 'contacto@mascolimp.cl';
$password = 'Asd18280896';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $query = isset($input['query']) ? trim($input['query']) : '';
    $product_id = isset($input['product_id']) ? intval($input['product_id']) : 0;

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

    // Ahora que tenemos la autenticación, procedemos con la búsqueda
    if ($product_id > 0) {
        // Búsqueda por ID usando search_read
        $search_data = [
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
                    "search_read",
                    [['id', '=', $product_id]],
                    ["id", "name", "default_code", "qty_available", "virtual_available", "list_price", "image_medium", "barcode", "categ_id", "last_purchase_price"]
                ]
            ],
            "id" => 2
        ];
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($search_data));
        $response = curl_exec($ch);
        
        if ($response === false) {
            throw new Exception('Error CURL en búsqueda por ID: ' . curl_error($ch));
        }
        
        $result = json_decode($response, true);
        
        if (isset($result['error'])) {
            throw new Exception('Error al buscar producto por ID: ' . json_encode($result['error']));
        }
        
        echo json_encode(['results' => $result['result']]);
        exit;
    }

    if ($query === '') {
        throw new Exception('Término de búsqueda vacío');
    }
   
    

    // ... lógica existente para búsqueda por query ...

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}

try {
    // Preparar el dominio de búsqueda
    $is_barcode = preg_match('/^\d{7,}$/', $query); // 7 o más dígitos, típico de código de barras
    if ($is_barcode) {
        // Buscar solo por barcode o default_code
        $domain = ['|', ['barcode', '=', $query], ['default_code', '=', $query]];
        $search_terms = [];
    } else {
        // Búsqueda por palabras clave
        $search_terms = explode(' ', trim($query));
        $search_terms = array_filter($search_terms, function($term) {
            return strlen($term) >= 2; // Ignorar términos muy cortos
        });
        if (empty($search_terms)) {
            echo json_encode(['results' => []]);
            exit;
        }
        $domain = ['&', ['active', '=', true]];
        foreach ($search_terms as $term) {
            $domain[] = '|';
            $domain[] = ['name', 'ilike', '%' . $term . '%'];
            $domain[] = ['default_code', 'ilike', '%' . $term . '%'];
        }
    }

    // Primero buscar los IDs de los productos
    $search_data = [
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
                "search",
                $domain,
                0,  // offset
                10  // limit
            ]
        ],
        "id" => 2
    ];

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($search_data));
    $response = curl_exec($ch);
    
    if ($response === false) {
        throw new Exception('Error CURL en búsqueda: ' . curl_error($ch));
    }

    $search_result = json_decode($response, true);

    if (isset($search_result['error'])) {
        throw new Exception('Error en la búsqueda: ' . json_encode($search_result['error']));
    }

    $product_ids = $search_result['result'];

    if (empty($product_ids)) {
        echo json_encode(['results' => []]);
        exit;
    }

    // Luego leer los detalles de los productos encontrados
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
                $product_ids,
                [
                    'name',
                    'default_code',
                    'qty_available',
                    'virtual_available',
                    'list_price',
                    'barcode',
                    'categ_id',
                    'image_medium',
                    'last_purchase_price',
                    'purchase_history_ids'
                ]
            ]
        ],
        "id" => 3
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

    // Formatear y enviar resultados
    $results = [];
    foreach ($read_result['result'] as $product) {
        // Obtener el registro más reciente de purchase.history
        $purchase_history = null;
        $purchase_history_all = [];
        if (!empty($product['purchase_history_ids'])) {
            // Leer todos los registros de purchase.history
            $ph_read_data = [
                "jsonrpc" => "2.0",
                "method" => "call",
                "params" => [
                    "service" => "object",
                    "method" => "execute",
                    "args" => [
                        $db,
                        $uid,
                        $password,
                        "purchase.history",
                        "read",
                        $product['purchase_history_ids'],
                        ['order_date','price','po_order','qty','partner_id']
                    ]
                ],
                "id" => 4
            ];
            $ph_ch = curl_init($odooUrl);
            curl_setopt($ph_ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ph_ch, CURLOPT_POST, true);
            curl_setopt($ph_ch, CURLOPT_POSTFIELDS, json_encode($ph_read_data));
            curl_setopt($ph_ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ph_ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ph_ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ph_ch, CURLOPT_TIMEOUT, 30);
            $ph_response = curl_exec($ph_ch);
            $ph_result = json_decode($ph_response, true);
            if (!isset($ph_result['error']) && !empty($ph_result['result'])) {
                // Ordenar por order_date descendente y tomar el más reciente
                usort($ph_result['result'], function($a, $b) {
                    return strcmp($b['order_date'], $a['order_date']);
                });
                $purchase_history_all = $ph_result['result'];
                $purchase_history = $ph_result['result'][0];
            }
            curl_close($ph_ch);
        }

        $name = $product['name'];
        if (!empty($search_terms)) {
            foreach ($search_terms as $term) {
                $pattern = '/(' . preg_quote($term, '/') . ')/i';
                $name = preg_replace($pattern, '<mark>$1</mark>', $name);
            }
        }
        $result = [
            'id' => $product['id'],
            'name' => $name,
            'default_code' => $product['default_code'] ?? 'Sin SKU',
            'qty_available' => number_format($product['qty_available'], 0),
            'virtual_available' => number_format($product['virtual_available'], 0),
            'list_price' => number_format($product['list_price'], 0),
            'barcode' => $product['barcode'] ?? 'Sin código',
            'categ_id' => $product['categ_id'] ? $product['categ_id'][1] : 'Sin categoría',
            'image_medium' => $product['image_medium'] ?? null,
            'last_purchase_price' => $product['last_purchase_price'] ?? null,
            'purchase_history' => $purchase_history,
            'purchase_history_all' => $purchase_history_all
        ];
        if (!empty($search_terms)) {
            $result['search_terms'] = $search_terms;
        }
        $results[] = $result;
    }

    echo json_encode(['results' => $results]);

} catch (Exception $e) {
    error_log("Error en search_products.php: " . $e->getMessage());
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