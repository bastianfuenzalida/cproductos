<?php
require_once 'config.php';
header('Content-Type: application/json');

date_default_timezone_set('America/Santiago');

try {
    $conn = conectarDB();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        // Desactivar por SKU
        if (isset($data['accion']) && $data['accion'] === 'desactivar' && isset($data['sku'])) {
            $sku = $conn->real_escape_string($data['sku']);
            $fecha = date('Y-m-d H:i:s');
            $sql = "UPDATE etiquetas_impresion SET estado='desactivado', fecha_desactivacion='$fecha' WHERE sku='$sku' AND estado='activo'";
            if (!$conn->query($sql)) {
                throw new Exception('Error al desactivar: ' . $conn->error);
            }
            echo json_encode(['success' => true]);
            exit;
        }
        // Actualizar cantidad de la fila activa más reciente
        if (isset($data['accion']) && $data['accion'] === 'actualizar_cantidad' && isset($data['sku']) && isset($data['diferencia'])) {
            $sku = $conn->real_escape_string($data['sku']);
            $diferencia = intval($data['diferencia']);
            // Buscar la fila activa más reciente
            $res = $conn->query("SELECT id, cantidad FROM etiquetas_impresion WHERE sku='$sku' AND estado='activo' ORDER BY fecha DESC, id DESC LIMIT 1");
            if ($row = $res->fetch_assoc()) {
                $nueva_cantidad = $row['cantidad'] + $diferencia;
                if ($nueva_cantidad < 0) $nueva_cantidad = 0;
                $id = $row['id'];
                $conn->query("UPDATE etiquetas_impresion SET cantidad=$nueva_cantidad WHERE id=$id");
                echo json_encode(['success' => true]);
                exit;
            } else {
                throw new Exception('No hay fila activa para este SKU');
            }
        }
        // Desactivar todos los registros activos
        if (isset($data['accion']) && $data['accion'] === 'desactivar_todos') {
            $fecha = date('Y-m-d H:i:s');
            $sql = "UPDATE etiquetas_impresion SET estado='desactivado', fecha_desactivacion='$fecha' WHERE estado='activo'";
            if (!$conn->query($sql)) {
                throw new Exception('Error al borrar todos: ' . $conn->error);
            }
            echo json_encode(['success' => true]);
            exit;
        }
        // Guardar nuevo registro
        if (!isset($data['nombre_producto'], $data['precio'], $data['codigo_barras'], $data['sku'], $data['cantidad'])) {
            throw new Exception('Faltan datos requeridos');
        }
        $stmt = $conn->prepare("INSERT INTO etiquetas_impresion (nombre_producto, precio, codigo_barras, sku, cantidad, estado) VALUES (?, ?, ?, ?, ?, 'activo')");
        $stmt->bind_param('sisss', $data['nombre_producto'], $data['precio'], $data['codigo_barras'], $data['sku'], $data['cantidad']);
        if (!$stmt->execute()) {
            throw new Exception('Error al guardar: ' . $stmt->error);
        }
        $stmt->close();
        echo json_encode(['success' => true]);
        exit;
    }

    // GET: listar acumulado agrupado por SKU solo activos
    $result = $conn->query("SELECT sku, nombre_producto, codigo_barras, SUM(cantidad) as cantidad FROM etiquetas_impresion WHERE estado='activo' GROUP BY sku, nombre_producto, codigo_barras ORDER BY MAX(fecha) DESC, MAX(id) DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    echo json_encode(['success' => true, 'etiquetas' => $rows]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 