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
$id = isset($data['id']) ? intval($data['id']) : 0;
if (!$id) {
    echo json_encode(['success' => false, 'error' => 'ID requerido']);
    exit;
}

$sql = "DELETE FROM conteos_fisicos WHERE id = $id";
if ($conn->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'No se pudo eliminar']);
}
$conn->close();
