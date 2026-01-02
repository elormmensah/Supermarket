<?php
// api/users.php - User Authentication and Profile API
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$conn = getDBConnection();

switch ($action) {
    case 'register':
        handleRegister($conn);
        break;
    case 'login':
        handleLogin($conn);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'profile':
        handleProfile($conn);
        break;
    case 'addresses':
        handleAddresses($conn);
        break;
    default:
        sendResponse(['error' => 'Invalid action'], 400);
}

// Register new user
function handleRegister($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['username', 'email', 'password', 'full_name'];
    $missing = validateRequiredFields($data, $required);
    
    if (!empty($missing)) {
        sendResponse(['error' => 'Missing fields: ' . implode(', ', $missing)], 400);
    }
    
    // Validate email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendResponse(['error' => 'Invalid email address'], 400);
    }
    
    // Validate password strength
    if (strlen($data['password']) < 6) {
        sendResponse(['error' => 'Password must be at least 6 characters'], 400);
    }
    
    try {
        // Check if username or email already exists
        $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$data['username'], $data['email']]);
        
        if ($stmt->fetch()) {
            sendResponse(['error' => 'Username or email already exists'], 409);
        }
        
        // Hash password
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Insert user
        $stmt = $conn->prepare("
            INSERT INTO users (username, email, password_hash, full_name, phone)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['username'],
            $data['email'],
            $passwordHash,
            $data['full_name'],
            $data['phone'] ?? null
        ]);
        
        $userId = $conn->lastInsertId();
        
        // Set session
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $data['username'];
        $_SESSION['email'] = $data['email'];
        
        sendResponse([
            'success' => true,
            'message' => 'Registration successful',
            'user' => [
                'user_id' => $userId,
                'username' => $data['username'],
                'email' => $data['email'],
                'full_name' => $data['full_name']
            ]
        ], 201);
        
    } catch(PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        sendResponse(['error' => 'Registration failed'], 500);
    }
}

// Login user
function handleLogin($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(['error' => 'Method not allowed'], 405);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['username']) || !isset($data['password'])) {
        sendResponse(['error' => 'Username and password are required'], 400);
    }
    
    try {
        // Find user by username or email
        $stmt = $conn->prepare("
            SELECT user_id, username, email, password_hash, full_name, phone
            FROM users
            WHERE username = ? OR email = ?
        ");
        $stmt->execute([$data['username'], $data['username']]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            sendResponse(['error' => 'Invalid username or password'], 401);
        }
        
        // Set session
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        
        // Remove password hash from response
        unset($user['password_hash']);
        
        sendResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user
        ]);
        
    } catch(PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        sendResponse(['error' => 'Login failed'], 500);
    }
}

// Logout user
function handleLogout() {
    session_destroy();
    sendResponse([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
}

// Get/Update user profile
function handleProfile($conn) {
    if (!isset($_SESSION['user_id'])) {
        sendResponse(['error' => 'Not authenticated'], 401);
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $stmt = $conn->prepare("
                SELECT user_id, username, email, full_name, phone, created_at
                FROM users
                WHERE user_id = ?
            ");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            
            sendResponse([
                'success' => true,
                'user' => $user
            ]);
            
        } catch(PDOException $e) {
            error_log("Get profile error: " . $e->getMessage());
            sendResponse(['error' => 'Failed to fetch profile'], 500);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $updates = [];
            $params = [];
            
            $allowedFields = ['full_name', 'phone', 'email'];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
            
            if (empty($updates)) {
                sendResponse(['error' => 'No fields to update'], 400);
            }
            
            $params[] = $_SESSION['user_id'];
            
            $stmt = $conn->prepare("
                UPDATE users 
                SET " . implode(', ', $updates) . "
                WHERE user_id = ?
            ");
            
            $stmt->execute($params);
            
            sendResponse([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
            
        } catch(PDOException $e) {
            error_log("Update profile error: " . $e->getMessage());
            sendResponse(['error' => 'Failed to update profile'], 500);
        }
    }
}

// Manage user addresses
function handleAddresses($conn) {
    if (!isset($_SESSION['user_id'])) {
        sendResponse(['error' => 'Not authenticated'], 401);
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Get all addresses for user
        try {
            $stmt = $conn->prepare("
                SELECT * FROM user_addresses 
                WHERE user_id = ? 
                ORDER BY is_default DESC, created_at DESC
            ");
            $stmt->execute([$_SESSION['user_id']]);
            $addresses = $stmt->fetchAll();
            
            sendResponse([
                'success' => true,
                'addresses' => $addresses
            ]);
            
        } catch(PDOException $e) {
            error_log("Get addresses error: " . $e->getMessage());
            sendResponse(['error' => 'Failed to fetch addresses'], 500);
        }
        
    } elseif ($method === 'POST') {
        // Add new address
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['address_line'])) {
            sendResponse(['error' => 'Address line is required'], 400);
        }
        
        try {
            $conn->beginTransaction();
            
            // If this is set as default, unset other defaults
            if (isset($data['is_default']) && $data['is_default']) {
                $stmt = $conn->prepare("
                    UPDATE user_addresses 
                    SET is_default = 0 
                    WHERE user_id = ?
                ");
                $stmt->execute([$_SESSION['user_id']]);
            }
            
            $stmt = $conn->prepare("
                INSERT INTO user_addresses 
                (user_id, address_line, city, region, is_default)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $_SESSION['user_id'],
                $data['address_line'],
                $data['city'] ?? null,
                $data['region'] ?? null,
                $data['is_default'] ?? false
            ]);
            
            $addressId = $conn->lastInsertId();
            $conn->commit();
            
            sendResponse([
                'success' => true,
                'message' => 'Address added successfully',
                'address_id' => $addressId
            ], 201);
            
        } catch(PDOException $e) {
            $conn->rollBack();
            error_log("Add address error: " . $e->getMessage());
            sendResponse(['error' => 'Failed to add address'], 500);
        }
        
    } elseif ($method === 'DELETE') {
        // Delete address
        if (!isset($_GET['address_id'])) {
            sendResponse(['error' => 'Address ID is required'], 400);
        }
        
        try {
            $stmt = $conn->prepare("
                DELETE FROM user_addresses 
                WHERE address_id = ? AND user_id = ?
            ");
            $stmt->execute([$_GET['address_id'], $_SESSION['user_id']]);
            
            sendResponse([
                'success' => true,
                'message' => 'Address deleted successfully'
            ]);
            
        } catch(PDOException $e) {
            error_log("Delete address error: " . $e->getMessage());
            sendResponse(['error' => 'Failed to delete address'], 500);
        }
    }
}
?>