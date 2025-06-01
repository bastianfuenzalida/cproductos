<?php
header('Content-Type: application/json');

// Conexión a la base de datos
$host = '192.168.0.65';
$usuario = 'cproductos';
$contrasena = 'cproductos123';
$bd = 'MASCOLIMP-PRD';
$puerto = 3306;

$conn = new mysqli($host, $usuario, $contrasena, $bd, $puerto);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'error' => 'Error de conexión a la base de datos']);
    exit;
}

// Obtener datos del POST
$data = json_decode(file_get_contents('php://input'), true);

$product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
$usuario = isset($data['usuario']) ? $conn->real_escape_string($data['usuario']) : '';
$ubicacion = isset($data['ubicacion']) ? $conn->real_escape_string($data['ubicacion']) : '';
$cantidad = isset($data['cantidad']) ? intval($data['cantidad']) : 0;

if (!$product_id || !$usuario || !$ubicacion || $cantidad < 0) {
    echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
    exit;
}

$stmt = $conn->prepare("INSERT INTO conteos_fisicos (product_id, usuario, ubicacion, cantidad, fecha, validado) VALUES (?, ?, ?, ?, NOW(), 0)");
$stmt->bind_param('issi', $product_id, $usuario, $ubicacion, $cantidad);
$stmt->execute();
$insert_id = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode(['success' => true, 'id' => $insert_id]);
