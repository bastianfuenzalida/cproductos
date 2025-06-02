<?php
// Configuración de Odoo
$odooUrl = 'http://192.168.0.11:8069/jsonrpc';
$db = 'MASCOLIMP-PRD';
$username = 'contacto@mascolimp.cl';
$password = 'Asd18280896';

// Configuración de la base de datos
$host = 'localhost';
$dbname = 'odoo12';
$dbuser = 'root';
$dbpass = '';

// Configuración de la aplicación
$app_name = 'Master Productos';
$app_version = '1.0.0';

// Configuración de errores
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'error.log');

// Configuración de zona horaria
date_default_timezone_set('America/Santiago');

// Configuración de sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configuración de headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Función para validar la sesión de Odoo
function validateOdooSession() {
    global $odooUrl, $db, $username, $password;
    
    $ch = curl_init($odooUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    $data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "common",
            "method" => "login",
            "args" => [$db, $username, $password]
        ],
        "id" => 1
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);
    
    if (isset($result['error'])) {
        throw new Exception('Error de autenticación en Odoo: ' . json_encode($result['error']));
    }
    
    return $result['result'];
}

// Función para obtener el ID de usuario de Odoo
function getOdooUid() {
    global $odooUrl, $db, $username, $password;
    
    $ch = curl_init($odooUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    $data = [
        "jsonrpc" => "2.0",
        "method" => "call",
        "params" => [
            "service" => "common",
            "method" => "login",
            "args" => [$db, $username, $password]
        ],
        "id" => 1
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);
    
    if (isset($result['error'])) {
        throw new Exception('Error al obtener UID de Odoo: ' . json_encode($result['error']));
    }
    
    return $result['result'];
}

// Obtener el UID al cargar la configuración
try {
    $uid = getOdooUid();
} catch (Exception $e) {
    error_log("Error al inicializar Odoo: " . $e->getMessage());
    $uid = null;
}

// Conexión a MySQL para uso general
function conectarDB() {
    $host = '192.168.0.65';
    $user = 'cproductos';
    $pass = 'cproductos123';
    $db = 'MASCOLIMP-PRD'; // Cambia si tu base de datos tiene otro nombre
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        die('Error de conexión a MySQL: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8');
    return $conn;
}
?>