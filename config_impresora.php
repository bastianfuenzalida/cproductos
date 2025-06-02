<?php
session_start();
if (!isset($_SESSION['odoo_uid'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

require_once 'config.php';
$mysqli = conectarDB();

// --- Endpoint GET: Consultar la configuración activa de la impresora ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = "SELECT id, host, nombre, activo, fecha_creacion, fecha_actualizacion FROM impresora_config WHERE activo = TRUE LIMIT 1;";
    $stmt = $mysqli->prepare($query);
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            echo json_encode(['success' => true, 'config' => $row]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No se encontró configuración activa.']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al consultar la configuración.']);
    }
    $stmt->close();
    exit;
}

// --- Endpoint POST: Guardar (insertar o actualizar) la configuración de la impresora ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['host']) || !isset($input['nombre'])) {
        echo json_encode(['success' => false, 'error' => 'Faltan datos (host o nombre).']);
        exit;
    }
    $host = trim($input['host']);
    $nombre = trim($input['nombre']);
    if (empty($host) || empty($nombre)) {
        echo json_encode(['success' => false, 'error' => 'El host y el nombre no pueden estar vacíos.']);
        exit;
    }
    // Actualizar (desactivar) la configuración anterior (si existe) y luego insertar la nueva.
    $queryUpdate = "UPDATE impresora_config SET activo = FALSE;";
    $stmtUpdate = $mysqli->prepare($queryUpdate);
    if (!$stmtUpdate->execute()) {
        echo json_encode(['success' => false, 'error' => 'Error al actualizar la configuración anterior.']);
        $stmtUpdate->close();
        exit;
    }
    $stmtUpdate->close();
    $queryInsert = "INSERT INTO impresora_config (host, nombre, activo) VALUES (?, ?, TRUE);";
    $stmtInsert = $mysqli->prepare($queryInsert);
    $stmtInsert->bind_param("ss", $host, $nombre);
    if ($stmtInsert->execute()) {
        echo json_encode(['success' => true, 'id' => $mysqli->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al guardar la nueva configuración.']);
    }
    $stmtInsert->close();
    exit;
}

// Si se llega aquí, el método no es GET ni POST.
header('HTTP/ 1.0 405 Method Not Allowed');
echo json_encode(['success' => false, 'error' => 'Método no permitido.']); 