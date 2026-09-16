<?php
/**
 * DenaNeya v2.0 - Cryptographic Webhook Callback Handler
 * File: includes/class-denaneya-webhook-handler.php
 *
 * Enforces:
 * - RFC 8785 JSON Canonicalization verification
 * - HMAC-SHA256 signature matching with constant-time hash_equals()
 * - 300-second timestamp freshness window
 * - Nonce replay attack mitigation
 * - Idempotent WooCommerce order status transitions
 * - Underpayment detection and defensive logging
 */

if (!defined('ABSPATH')) {
    exit;
}

class DenaNeya_Webhook_Handler {

    /** @var string */
    private $webhook_secret;

    /** @var string */
    private $order_status_success;

    /** @var bool */
    private $debug;

    /** @var array Internal memory cache for nonces in standalone test executions */
    private static $nonce_cache = array();

    public function __construct($webhook_secret, $order_status_success = 'processing', $debug = false) {
        $this->webhook_secret       = trim($webhook_secret);
        $this->order_status_success = $order_status_success ?: 'processing';
        $this->debug                = (bool) $debug;
    }

    /**
     * Process incoming webhook callback.
     *
     * @param string|null $raw_input Optional explicit body for testing
     * @param array|null  $headers   Optional explicit headers for testing
     * @param bool        $exit      Whether to terminate script with HTTP headers/exit
     * @return array Response data (returned when $exit is false)
     */
    public function process_callback($raw_input = null, $headers = null, $exit = true) {
        $method = 'POST';
        if (isset($_SERVER['REQUEST_METHOD'])) {
            $method = strtoupper($_SERVER['REQUEST_METHOD']);
        } elseif (is_array($headers) && isset($headers['REQUEST_METHOD'])) {
            $method = strtoupper($headers['REQUEST_METHOD']);
        }

        if ($method !== 'POST') {
            return $this->send_response(405, array(
                'success' => false,
                'code'    => 'METHOD_NOT_ALLOWED',
                'message' => 'Only POST method is allowed.'
            ), $exit);
        }

        $raw_body = ($raw_input !== null) ? $raw_input : file_get_contents('php://input');
        if ($raw_body === false || strlen(trim($raw_body)) === 0) {
            return $this->send_response(400, array(
                'success' => false,
                'code'    => 'EMPTY_BODY',
                'message' => 'Empty request body received.'
            ), $exit);
        }

        // Validate webhook secret configuration (minimum 32 characters)
        if (empty($this->webhook_secret) || strlen($this->webhook_secret) < 32) {
            $this->log('Webhook secret is unconfigured or fewer than 32 characters. Rejecting callback.');
            return $this->send_response(500, array(
                'success' => false,
                'code'    => 'INSECURE_CONFIGURATION',
                'message' => 'Webhook secret is not securely configured.'
            ), $exit);
        }

        // Resolve header inputs from $_SERVER or explicit $headers map
        $h_sig       = $this->resolve_header(array('HTTP_X_DENANEYA_SIGNATURE', 'X-DenaNeya-Signature', 'HTTP_X_ZINIPAY_SIGNATURE', 'x-zinipay-signature'), $headers);
        $h_timestamp = $this->resolve_header(array('HTTP_X_DENANEYA_TIMESTAMP', 'X-DenaNeya-Timestamp', 'HTTP_X_ZINIPAY_TIMESTAMP', 'x-zinipay-timestamp'), $headers);
        $h_nonce     = $this->resolve_header(array('HTTP_X_DENANEYA_NONCE', 'X-DenaNeya-Nonce', 'HTTP_X_ZINIPAY_NONCE', 'x-zinipay-nonce'), $headers);

        if (empty($h_sig)) {
            return $this->send_response(401, array(
                'success' => false,
                'code'    => 'MISSING_SIGNATURE',
                'message' => 'Missing cryptographic signature header.'
            ), $exit);
        }

        // Parse signature string: support t=...,n=...,v1=... format or legacy direct headers
        $timestamp = null;
        $nonce     = null;
        $signature = null;

        if (strpos($h_sig, 't=') !== false && strpos($h_sig, 'v1=') !== false) {
            $parts = explode(',', $h_sig);
            foreach ($parts as $part) {
                $eq = strpos($part, '=');
                if ($eq !== false) {
                    $k = trim(substr($part, 0, $eq));
                    $v = trim(substr($part, $eq + 1));
                    if ($k === 't')  $timestamp = (int) $v;
                    if ($k === 'n')  $nonce = $v;
                    if ($k === 'v1') $signature = $v;
                }
            }
        } else {
            $signature = $h_sig;
            $timestamp = (int) $h_timestamp;
            $nonce     = $h_nonce;
        }

        if (empty($signature) || empty($timestamp) || empty($nonce)) {
            return $this->send_response(400, array(
                'success' => false,
                'code'    => 'MALFORMED_HEADER',
                'message' => 'Malformed signature parameters.'
            ), $exit);
        }

        // Freshness verification: 300-second (5 minute) tolerance window
        $now = time();
        if (abs($now - $timestamp) > 300) {
            $this->log(sprintf('Timestamp out of tolerance window. Server: %d, Webhook: %d, Diff: %ds', $now, $timestamp, abs($now - $timestamp)));
            return $this->send_response(401, array(
                'success' => false,
                'code'    => 'TIMESTAMP_OUT_OF_TOLERANCE',
                'message' => 'Timestamp expired or out of tolerance window.'
            ), $exit);
        }

        // Replay mitigation: check nonce
        $transient_key = 'denaneya_nonce_' . md5($nonce);
        $already_used = false;

        if (function_exists('get_transient')) {
            $already_used = (bool) get_transient($transient_key);
        } elseif (isset(self::$nonce_cache[$transient_key])) {
            if (self::$nonce_cache[$transient_key] > $now) {
                $already_used = true;
            }
        }

        if ($already_used) {
            $this->log('Replay attack detected for nonce: ' . $nonce);
            return $this->send_response(409, array(
                'success' => false,
                'code'    => 'REPLAYED_NONCE',
                'message' => 'Replay detected: nonce has already been used.'
            ), $exit);
        }

        // Cryptographic HMAC-SHA256 signature verification
        // Check 1: Wire body
        $expected_sig_wire = hash_hmac('sha256', "{$timestamp}.{$nonce}.{$raw_body}", $this->webhook_secret);
        $sig_valid = hash_equals($expected_sig_wire, $signature);

        // Check 2: RFC 8785 Canonical JSON representation fallback
        if (!$sig_valid) {
            $decoded_json = json_decode($raw_body, true);
            if (is_array($decoded_json)) {
                $canonical_body = DenaNeya_Canonicalizer::canonicalize($decoded_json);
                $expected_sig_canon = hash_hmac('sha256', "{$timestamp}.{$nonce}.{$canonical_body}", $this->webhook_secret);
                $sig_valid = hash_equals($expected_sig_canon, $signature);
            }
        }

        if (!$sig_valid) {
            $this->log('HMAC verification failed. Signature mismatch.');
            return $this->send_response(401, array(
                'success' => false,
                'code'    => 'INVALID_SIGNATURE',
                'message' => 'Cryptographic signature mismatch.'
            ), $exit);
        }

        // Store nonce to prevent replay for 360 seconds
        if (function_exists('set_transient')) {
            set_transient($transient_key, 1, 360);
        }
        self::$nonce_cache[$transient_key] = $now + 360;

        // Parse verified payload
        $payload = json_decode($raw_body, true);
        if (!is_array($payload)) {
            return $this->send_response(400, array(
                'success' => false,
                'code'    => 'INVALID_JSON',
                'message' => 'Payload is not valid JSON.'
            ), $exit);
        }

        // Handle non-payment events gracefully
        if (!isset($payload['event']) || $payload['event'] !== 'invoice.completed') {
            return $this->send_response(200, array(
                'success' => true,
                'message' => 'Event ignored: ' . (isset($payload['event']) ? $payload['event'] : 'unknown')
            ), $exit);
        }

        // Resolve WooCommerce order ID from payload metadata or top-level field
        $order_id = null;
        if (!empty($payload['metadata']['order_id'])) {
            $order_id = absint($payload['metadata']['order_id']);
        } elseif (!empty($payload['order_id'])) {
            $order_id = absint($payload['order_id']);
        } elseif (!empty($payload['metadata']['order_number']) && function_exists('wc_get_order_id_by_order_key')) {
            $order_id = wc_get_order_id_by_order_key(isset($payload['metadata']['order_key']) ? $payload['metadata']['order_key'] : '');
        }

        if (!$order_id) {
            return $this->send_response(400, array(
                'success' => false,
                'code'    => 'ORDER_NOT_SPECIFIED',
                'message' => 'Missing order_id in webhook payload.'
            ), $exit);
        }

        if (!function_exists('wc_get_order')) {
            return $this->send_response(500, array(
                'success' => false,
                'code'    => 'WOOCOMMERCE_NOT_ACTIVE',
                'message' => 'WooCommerce functions are not available.'
            ), $exit);
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return $this->send_response(404, array(
                'success' => false,
                'code'    => 'ORDER_NOT_FOUND',
                'message' => 'WooCommerce order #' . $order_id . ' not found.'
            ), $exit);
        }

        // Idempotency: If order is already paid, completed, or processing, return 200 without duplicate updates
        $current_status = $order->get_status();
        if ($order->is_paid() || in_array($current_status, array('processing', 'completed'), true)) {
            $this->log(sprintf('Order #%d is already in status "%s". Idempotent acknowledge.', $order_id, $current_status));
            return $this->send_response(200, array(
                'success'  => true,
                'message'  => 'Order already processed.',
                'order_id' => $order_id,
                'status'   => $current_status
            ), $exit);
        }

        $paid_amount = isset($payload['amount']) ? (float) $payload['amount'] : 0.0;
        $order_total = (float) $order->get_total();

        // Underpayment detection
        if ($paid_amount < $order_total) {
            $warning_msg = sprintf(
                'DenaNeya underpayment detected! Expected %s %s, received %s %s. TrxID: %s',
                $order_total,
                $order->get_currency(),
                $paid_amount,
                isset($payload['currency']) ? $payload['currency'] : 'BDT',
                isset($payload['trx_id']) ? $payload['trx_id'] : 'N/A'
            );
            $order->update_status('on-hold', $warning_msg);
            $order->add_order_note($warning_msg);
            $order->save();

            return $this->send_response(200, array(
                'success'  => true,
                'warning'  => 'UNDERPAYMENT_DETECTED',
                'order_id' => $order_id,
                'status'   => 'on-hold'
            ), $exit);
        }

        // Process successful payment
        $trx_id         = sanitize_text_field(isset($payload['trx_id']) ? $payload['trx_id'] : '');
        $payment_method = sanitize_text_field(isset($payload['payment_method']) ? $payload['payment_method'] : 'MFS');
        $invoice_id     = sanitize_text_field(isset($payload['invoice_id']) ? $payload['invoice_id'] : '');

        $order->update_meta_data('_denaneya_trx_id', $trx_id);
        $order->update_meta_data('_denaneya_payment_method', $payment_method);
        $order->update_meta_data('_denaneya_invoice_id', $invoice_id);
        $order->update_meta_data('_denaneya_paid_at', function_exists('current_time') ? current_time('mysql') : date('Y-m-d H:i:s'));

        // Mark payment complete
        $order->payment_complete($trx_id);

        $order->add_order_note(sprintf(
            'DenaNeya Payment Verified. Channel: %s | TrxID: %s | Amount: %s %s | Invoice: %s',
            strtoupper($payment_method),
            $trx_id,
            $paid_amount,
            $order->get_currency(),
            $invoice_id
        ));

        // Enforce configured success status (e.g., 'completed' for instant digital goods)
        if ($this->order_status_success === 'completed' && $order->get_status() !== 'completed') {
            $order->update_status('completed', 'Completed via DenaNeya payment settings.');
        }

        $order->save();

        $this->log(sprintf('Successfully processed payment for order #%d, TrxID: %s', $order_id, $trx_id));

        return $this->send_response(200, array(
            'success'  => true,
            'message'  => 'Order status updated successfully.',
            'order_id' => $order_id,
            'status'   => $order->get_status(),
            'trx_id'   => $trx_id
        ), $exit);
    }

    /**
     * Resolve header from candidate keys in server or custom headers map.
     */
    private function resolve_header(array $candidate_keys, $custom_headers = null) {
        if (is_array($custom_headers)) {
            foreach ($candidate_keys as $k) {
                if (isset($custom_headers[$k]) && $custom_headers[$k] !== '') {
                    return $custom_headers[$k];
                }
                // Try lowercase
                $lower_k = strtolower($k);
                if (isset($custom_headers[$lower_k]) && $custom_headers[$lower_k] !== '') {
                    return $custom_headers[$lower_k];
                }
            }
        }

        if (isset($_SERVER) && is_array($_SERVER)) {
            foreach ($candidate_keys as $k) {
                if (isset($_SERVER[$k]) && $_SERVER[$k] !== '') {
                    return $_SERVER[$k];
                }
            }
        }

        return '';
    }

    /**
     * Log messages when debug mode is enabled.
     */
    private function log($message) {
        if ($this->debug && function_exists('wc_get_logger')) {
            wc_get_logger()->info('[DenaNeya Webhook] ' . $message, array('source' => 'denaneya'));
        }
    }

    /**
     * Output JSON response with appropriate status code.
     */
    private function send_response($status_code, array $body, $exit = true) {
        $body['status_code'] = $status_code;

        if ($exit) {
            if (function_exists('status_header')) {
                status_header($status_code);
            } else {
                http_response_code($status_code);
            }
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($body);
            exit;
        }

        return $body;
    }
}
