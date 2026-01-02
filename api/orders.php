<?php
// api/orders.php - Orders API
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
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
}

// GET - Fetch orders
function handleGet($conn) {
    try {
        if (isset($_GET['order_id'])) {
            // Get specific order with items
            $stmt = $conn->prepare("
                SELECT o.*, 
                       GROUP_CONCAT(
                           CONCAT(oi.product_name, '|', oi.quantity, '|', oi.price_at_purchase)
                           SEPARATOR ';;'
                       ) as items_data
                FROM orders o
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                WHERE o.order_id = ?
                GROUP BY o.order_id
            ");
            $stmt->execute([$_GET['order_id']]);
            $order = $stmt->fetch();
            
            if ($order) {
                $order['items'] = parseOrderItems($order['items_data']);
                unset($order['items_data']);
            }
            
            sendResponse(['success' => true, 'order' => $order]);
            
        } elseif (isset($_GET['user_id'])) {
            // Get all orders for a user
            $stmt = $conn->prepare("
                SELECT o.*, 
                       (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count
                FROM orders o
                WHERE o.user_id = ?
                ORDER BY o.order_date DESC
            ");
            $stmt->execute([$_GET['user_id']]);
            $orders = $stmt->fetchAll();
            
            sendResponse(['success' => true, 'orders' => $orders]);
            
        } elseif (isset($_GET['order_number'])) {
            // Get order by order number
            $stmt = $conn->prepare("
                SELECT o.*, 
                       GROUP_CONCAT(
                           CONCAT(oi.product_name, '|', oi.quantity, '|', oi.price_at_purchase)
                           SEPARATOR ';;'
                       ) as items_data
                FROM orders o
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                WHERE o.order_number = ?
                GROUP BY o.order_id
            ");
            $stmt->execute([$_GET['order_number']]);
            $order = $stmt->fetch();
            
            if ($order) {
                $order['items'] = parseOrderItems($order['items_data']);
                unset($order['items_data']);
            }
            
            sendResponse(['success' => true, 'order' => $order]);
        } else {
            sendResponse(['error' => 'Invalid request parameters'], 400);
        }
        
    } catch(PDOException $e) {
        error_log("Get orders error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to fetch orders'], 500);
    }
}

// POST - Create new order
function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['customer_name', 'customer_email', 'customer_phone', 'delivery_address', 'items', 'total_amount', 'payment_method'];
    $missing = validateRequiredFields($data, $required);
    
    if (!empty($missing)) {
        sendResponse(['error' => 'Missing fields: ' . implode(', ', $missing)], 400);
    }
    
    if (empty($data['items']) || !is_array($data['items'])) {
        sendResponse(['error' => 'Order must contain at least one item'], 400);
    }
    
    try {
        $conn->beginTransaction();
        
        // Generate order number
        $orderNumber = 'FM-' . strtoupper(substr(uniqid(), -8));
        
        // Calculate totals
        $subtotal = 0;
        foreach ($data['items'] as $item) {
            $subtotal += floatval($item['price']) * (isset($item['quantity']) ? intval($item['quantity']) : 1);
        }
        
        $deliveryFee = $subtotal * 0.07;
        $totalAmount = $subtotal + $deliveryFee;
        
        // Insert order
        $stmt = $conn->prepare("
            INSERT INTO orders 
            (order_number, user_id, customer_name, customer_email, customer_phone, 
             delivery_address, subtotal, delivery_fee, total_amount, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $orderNumber,
            $data['user_id'] ?? null,
            $data['customer_name'],
            $data['customer_email'],
            $data['customer_phone'],
            $data['delivery_address'],
            $subtotal,
            $deliveryFee,
            $totalAmount,
            $data['payment_method']
        ]);
        
        $orderId = $conn->lastInsertId();
        
        // Insert order items
        $itemStmt = $conn->prepare("
            INSERT INTO order_items 
            (order_id, product_id, product_name, quantity, price_at_purchase, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($data['items'] as $item) {
            $quantity = isset($item['quantity']) ? intval($item['quantity']) : 1;
            $price = floatval($item['price']);
            $itemSubtotal = $price * $quantity;
            
            $itemStmt->execute([
                $orderId,
                $item['product_id'] ?? null,
                $item['name'],
                $quantity,
                $price,
                $itemSubtotal
            ]);
            
            // Update product stock if product_id exists
            if (isset($item['product_id'])) {
                $updateStock = $conn->prepare("
                    UPDATE products 
                    SET stock_quantity = stock_quantity - ? 
                    WHERE product_id = ? AND stock_quantity >= ?
                ");
                $updateStock->execute([$quantity, $item['product_id'], $quantity]);
            }
        }
        
        $conn->commit();
        
        sendResponse([
            'success' => true,
            'message' => 'Order placed successfully',
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'total_amount' => $totalAmount
        ], 201);
        
    } catch(PDOException $e) {
        $conn->rollBack();
        error_log("Create order error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to create order'], 500);
    }
}

// PUT - Update order status
function handlePut($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['order_id'])) {
        sendResponse(['error' => 'Order ID is required'], 400);
    }
    
    if (!isset($data['order_status'])) {
        sendResponse(['error' => 'Order status is required'], 400);
    }
    
    $validStatuses = ['Pending', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!in_array($data['order_status'], $validStatuses)) {
        sendResponse(['error' => 'Invalid order status'], 400);
    }
    
    try {
        $updates = ["order_status = ?"];
        $params = [$data['order_status']];
        
        // If marking as delivered, set delivered_at timestamp
        if ($data['order_status'] === 'Delivered') {
            $updates[] = "delivered_at = NOW()";
        }
        
        $params[] = $data['order_id'];
        
        $stmt = $conn->prepare("
            UPDATE orders 
            SET " . implode(', ', $updates) . "
            WHERE order_id = ?
        ");
        
        $stmt->execute($params);
        
        sendResponse([
            'success' => true,
            'message' => 'Order status updated successfully'
        ]);
        
    } catch(PDOException $e) {
        error_log("Update order error: " . $e->getMessage());
        sendResponse(['error' => 'Failed to update order'], 500);
    }
}

// Helper function to parse order items
function parseOrderItems($itemsData) {
    if (!$itemsData) return [];
    
    $items = [];
    $itemsArray = explode(';;', $itemsData);
    
    foreach ($itemsArray as $itemStr) {
        $parts = explode('|', $itemStr);
        if (count($parts) === 3) {
            $items[] = [
                'name' => $parts[0],
                'quantity' => intval($parts[1]),
                'price' => floatval($parts[2])
            ];
        }
    }
    
    return $items;
}
?>