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

$product_id = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;
if (!$product_id) {
    echo json_encode(['success' => false, 'error' => 'ID de producto requerido']);
    exit;
}

$sql = "SELECT id, ubicacion, cantidad, fecha FROM conteos_fisicos WHERE product_id = $product_id AND validado = 0 ORDER BY fecha ASC";
$res = $conn->query($sql);

$conteos = [];
while ($row = $res->fetch_assoc()) {
    $conteos[] = $row;
}

echo json_encode(['success' => true, 'conteos' => $conteos]);
$conn->close();