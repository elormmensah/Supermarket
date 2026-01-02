<?php
// api/products.php - Products API
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$conn = getDBConnection();

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    case 'PUT':
        handlePut($conn);
        break;
    case 'DELETE':
        handleDelete($conn);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

// GET - Fetch products
function handleGet($conn) {
    try {
        // Get all products or filter by category
        if (isset($_GET['category_slug'])) {
            $stmt = $conn->prepare("
                SELECT p.*, c.category_name, c.category_slug 
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                WHERE c.category_slug = ? AND p.is_active = 1
                ORDER BY p.product_name
            ");
            $stmt->execute([$_GET['category_slug']]);
        } elseif (isset($_GET['product_id'])) {
            $stmt = $conn->prepare("
                SELECT p.*, c.category_name, c.category_slug 
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.product_id = ?
            ");
            $stmt->execute([$_GET['product_id']]);
        } else {
            $stmt = $conn->query("
                SELECT p.*, c.category_name, c.category_slug 
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.is_active = 1
                ORDER BY c.category_name, p.product_name
            ");
        }
        
        $products = $stmt->fetchAll();
        sendResponse(['success' => true, 'products' => $products]);
        
    } catch(PDOException $e) {
        error_log("Get products error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to fetch products'], 500);
    }
}

// POST - Create new product (Admin only)
function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['product_name', 'category_id', 'price'];
    $missing = validateRequiredFields($data, $required);
    
    if (!empty($missing)) {
        sendResponse(['error' => 'Missing fields: ' . implode(', ', $missing)], 400);
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO products 
            (product_name, category_id, price, stock_quantity, image_url, description, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['product_name'],
            $data['category_id'],
            $data['price'],
            $data['stock_quantity'] ?? 0,
            $data['image_url'] ?? null,
            $data['description'] ?? null,
            $data['unit'] ?? 'piece'
        ]);
        
        $productId = $conn->lastInsertId();
        sendResponse([
            'success' => true,
            'message' => 'Product created successfully',
            'product_id' => $productId
        ], 201);
        
    } catch(PDOException $e) {
        error_log("Create product error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to create product'], 500);
    }
}

// PUT - Update product (Admin only)
function handlePut($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['product_id'])) {
        sendResponse(['error' => 'Product ID is required'], 400);
    }
    
    try {
        $updates = [];
        $params = [];
        
        $allowedFields = ['product_name', 'price', 'stock_quantity', 'image_url', 'description', 'unit', 'is_active'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        
        if (empty($updates)) {
            sendResponse(['error' => 'No fields to update'], 400);
        }
        
        $params[] = $data['product_id'];
        
        $stmt = $conn->prepare("
            UPDATE products 
            SET " . implode(', ', $updates) . "
            WHERE product_id = ?
        ");
        
        $stmt->execute($params);
        
        sendResponse([
            'success' => true,
            'message' => 'Product updated successfully'
        ]);
        
    } catch(PDOException $e) {
        error_log("Update product error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to update product'], 500);
    }
}

// DELETE - Soft delete product (Admin only)
function handleDelete($conn) {
    if (!isset($_GET['product_id'])) {
        sendResponse(['error' => 'Product ID is required'], 400);
    }
    
    try {
        $stmt = $conn->prepare("UPDATE products SET is_active = 0 WHERE product_id = ?");
        $stmt->execute([$_GET['product_id']]);
        
        sendResponse([
            'success' => true,
            'message' => 'Product deleted successfully'
        ]);
        
    } catch(PDOException $e) {
        error_log("Delete product error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to delete product'], 500);
    }
}
?>