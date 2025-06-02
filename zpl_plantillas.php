<?php
session_start();
if (!isset($_SESSION['odoo_uid'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

require_once 'config.php';
$mysqli = conectarDB();

// --- Endpoint GET: Listar plantillas ZPL activas ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = "SELECT id, nombre, codigo_zpl, activo, fecha_creacion, fecha_actualizacion FROM zpl_plantillas WHERE activo = TRUE ORDER BY nombre ASC;";
    $stmt = $mysqli->prepare($query);
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $plantillas = [];
        while ($row = $result->fetch_assoc()) {
            $plantillas[] = $row;
        }
        echo json_encode(['success' => true, 'plantillas' => $plantillas]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error al consultar plantillas.']);
    }
    $stmt->close();
    exit;
}

// --- Endpoint POST: Agregar o editar una plantilla ZPL ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['nombre']) || !isset($input['codigo_zpl'])) {
        echo json_encode(['success' => false, 'error' => 'Faltan datos (nombre o código ZPL).']);
        exit;
    }
    $nombre = trim($input['nombre']);
    $codigo_zpl = trim($input['codigo_zpl']);
    if (empty($nombre) || empty($codigo_zpl)) {
        echo json_encode(['success' => false, 'error' => 'El nombre y el código ZPL no pueden estar vacíos.']);
        exit;
    }
    // Si se envía un id, se actualiza la plantilla existente; de lo contrario, se inserta una nueva.
    if (isset($input['id']) && is_numeric($input['id'])) {
         $id = (int) $input['id'];
         $query = "UPDATE zpl_plantillas SET nombre = ?, codigo_zpl = ?, activo = TRUE, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?;";
         $stmt = $mysqli->prepare($query);
         $stmt->bind_param("ssi", $nombre, $codigo_zpl, $id);
    } else {
         $query = "INSERT INTO zpl_plantillas (nombre, codigo_zpl, activo) VALUES (?, ?, TRUE);";
         $stmt = $mysqli->prepare($query);
         $stmt->bind_param("ss", $nombre, $codigo_zpl);
    }
    if ($stmt->execute()) {
         echo json_encode(['success' => true, 'id' => (isset($id) ? $id : $mysqli->insert_id)]);
    } else {
         echo json_encode(['success' => false, 'error' => 'Error al guardar la plantilla.']);
    }
    $stmt->close();
    exit;
}

// --- Endpoint DELETE (simulado con POST + parámetro accion=delete): Borrar (desactivar) una plantilla ZPL ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion']) && $_POST['accion'] === 'delete') {
    if (!isset($_POST['id']) || !is_numeric($_POST['id'])) {
        echo json_encode(['success' => false, 'error' => 'Se requiere un id válido.']);
        exit;
    }
    $id = (int) $_POST['id'];
    $query = "UPDATE zpl_plantillas SET activo = FALSE, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?;";
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
         echo json_encode(['success' => true]);
    } else {
         echo json_encode(['success' => false, 'error' => 'Error al borrar la plantilla.']);
    }
    $stmt->close();
    exit;
}

// Si se llega aquí, el método no es GET ni POST (o no se envió "accion=delete" en POST).
header('HTTP/ 1.0 405 Method Not Allowed');
echo json_encode(['success' => false, 'error' => 'Método no permitido.']); 