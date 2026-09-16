<?php
/**
 * DenaNeya v2.0 - WooCommerce Mock Test Harness for Automated PHP Testing
 * File: scripts/mock_wc_harness.php
 *
 * Provides mock WooCommerce environment (WC_Order, wc_get_order, transients)
 * to test DenaNeya_Webhook_Handler and DenaNeya_Canonicalizer with 100% genuine execution.
 */

if (!defined('ABSPATH')) {
    define('ABSPATH', dirname(__DIR__) . '/denaneya-payment-gateway/');
}

require_once ABSPATH . 'includes/class-denaneya-canonicalizer.php';
require_once ABSPATH . 'includes/class-denaneya-webhook-handler.php';

// Persistent file-backed transients for CLI process isolation
$transient_file = sys_get_temp_dir() . '/denaneya_mock_transients.json';

function get_transient($key) {
    global $transient_file;
    if (!file_exists($transient_file)) return false;
    $data = json_decode(@file_get_contents($transient_file), true);
    if (!is_array($data) || !isset($data[$key])) return false;
    if ($data[$key] < time()) {
        unset($data[$key]);
        @file_put_contents($transient_file, json_encode($data));
        return false;
    }
    return true;
}

function set_transient($key, $value, $expiration) {
    global $transient_file;
    $data = array();
    if (file_exists($transient_file)) {
        $data = json_decode(@file_get_contents($transient_file), true);
        if (!is_array($data)) $data = array();
    }
    $data[$key] = time() + (int)$expiration;
    @file_put_contents($transient_file, json_encode($data));
    return true;
}

// Mock WooCommerce Order State Store
class Mock_WC_Order {
    public $id;
    public $order_number;
    public $order_key;
    public $total = 500.00;
    public $currency = 'BDT';
    public $status = 'pending';
    public $billing_first_name = 'Rahim';
    public $billing_last_name = 'Uddin';
    public $billing_email = 'rahim@example.com';
    public $billing_phone = '01712345678';
    public $meta = array();
    public $notes = array();
    public $paid = false;

    public function __construct($data = array()) {
        foreach ($data as $k => $v) {
            if (property_exists($this, $k)) {
                $this->$k = $v;
            }
        }
        if (!$this->order_number) $this->order_number = (string) $this->id;
        if (!$this->order_key) $this->order_key = 'wc_order_' . md5((string)$this->id);
    }

    public function get_id() { return $this->id; }
    public function get_order_number() { return $this->order_number; }
    public function get_order_key() { return $this->order_key; }
    public function get_total() { return (float) $this->total; }
    public function get_currency() { return $this->currency; }
    public function get_status() { return $this->status; }
    public function is_paid() { return (bool) $this->paid; }
    public function get_billing_first_name() { return $this->billing_first_name; }
    public function get_billing_last_name() { return $this->billing_last_name; }
    public function get_billing_email() { return $this->billing_email; }
    public function get_billing_phone() { return $this->billing_phone; }
    public function get_cancel_order_url() { return 'https://example.com/checkout/cancel'; }

    public function update_meta_data($key, $val) {
        $this->meta[$key] = $val;
    }

    public function get_meta_data() {
        return $this->meta;
    }

    public function update_status($new_status, $note = '') {
        $this->status = $new_status;
        if (!empty($note)) {
            $this->add_order_note($note);
        }
    }

    public function add_order_note($note) {
        $this->notes[] = $note;
    }

    public function payment_complete($trx_id = '') {
        $this->paid = true;
        $this->status = 'processing';
        if (!empty($trx_id)) {
            $this->meta['_denaneya_trx_id'] = $trx_id;
        }
    }

    public function save() {
        return true;
    }
}

// Global order registry
$GLOBALS['mock_wc_orders'] = array();

function wc_get_order($id) {
    $id = (int)$id;
    return isset($GLOBALS['mock_wc_orders'][$id]) ? $GLOBALS['mock_wc_orders'][$id] : null;
}

function sanitize_text_field($str) {
    return trim(strip_tags((string)$str));
}

function absint($val) {
    return abs((int)$val);
}

function current_time($type = 'mysql') {
    return gmdate('Y-m-d H:i:s');
}

// Read JSON input from STDIN
$input_raw = file_get_contents('php://stdin');
$req = json_decode($input_raw, true);

if (!$req || !isset($req['action'])) {
    echo json_encode(array('success' => false, 'error' => 'Invalid JSON input or missing action.'));
    exit(1);
}

$action = $req['action'];

if ($action === 'canonicalize') {
    $canon = DenaNeya_Canonicalizer::canonicalize($req['value']);
    echo json_encode(array('success' => true, 'canonical' => $canon));
    exit(0);
}

if ($action === 'compute_hmac') {
    $data = isset($req['data']) ? $req['data'] : '';
    $secret = isset($req['secret']) ? $req['secret'] : '';
    $sig = hash_hmac('sha256', $data, $secret);
    echo json_encode(array('success' => true, 'signature' => $sig));
    exit(0);
}

if ($action === 'clear_transients') {
    if (file_exists($transient_file)) {
        @unlink($transient_file);
    }
    echo json_encode(array('success' => true));
    exit(0);
}

if ($action === 'test_webhook') {
    $order_data = isset($req['order']) ? $req['order'] : array('id' => 101, 'total' => 500, 'status' => 'pending');
    $order = new Mock_WC_Order($order_data);
    $GLOBALS['mock_wc_orders'][$order->get_id()] = $order;

    $webhook_secret = isset($req['webhook_secret']) ? $req['webhook_secret'] : '';
    $order_status_success = isset($req['order_status_success']) ? $req['order_status_success'] : 'processing';

    $handler = new DenaNeya_Webhook_Handler($webhook_secret, $order_status_success, false);

    $raw_body = isset($req['raw_body']) ? $req['raw_body'] : '';
    $headers  = isset($req['headers']) ? $req['headers'] : array();

    $res = $handler->process_callback($raw_body, $headers, false);

    $final_order = $GLOBALS['mock_wc_orders'][$order->get_id()];

    echo json_encode(array(
        'success'      => true,
        'handler_res'  => $res,
        'order_status' => $final_order->get_status(),
        'order_paid'   => $final_order->is_paid(),
        'order_meta'   => $final_order->get_meta_data(),
        'order_notes'  => $final_order->notes
    ));
    exit(0);
}

echo json_encode(array('success' => false, 'error' => 'Unknown action: ' . $action));
exit(1);
