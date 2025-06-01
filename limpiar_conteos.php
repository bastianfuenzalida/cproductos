<?php
header('Content-Type: application/json');
$host = '192.168.0.65';
$usuario = 'cproductos';
$contrasena = 'cproductos123';
$bd = 'MASCOLIMP-PRD';
$puerto = 3306;

$conn = new mysqli($host, $usuario, $contrasena, $bd, $puerto);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Error de conexión']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
if (!$product_id) {
    echo json_encode(['success' => false, 'error' => 'ID de producto requerido']);
    exit;
}

$sql = "UPDATE conteos_fisicos SET validado = 1 WHERE product_id = $product_id AND validado = 0";
$conn->query($sql);

echo json_encode(['success' => true]);
$conn->close();