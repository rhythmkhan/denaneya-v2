<?php
/**
 * DenaNeya v2.0 - S2S HTTP API Client
 * File: includes/class-denaneya-api-client.php
 *
 * Communicates with the DenaNeya backend API to create hosted payment invoices
 * with 15-minute TTL and manage S2S transactions.
 */

if (!defined('ABSPATH')) {
    exit;
}

class DenaNeya_API_Client {

    /** @var string */
    private $api_base_url;

    /** @var string */
    private $api_key;

    /** @var string */
    private $api_secret;

    /** @var bool */
    private $debug;

    public function __construct($api_base_url, $api_key, $api_secret, $debug = false) {
        $this->api_base_url = rtrim(trim($api_base_url), '/');
        $this->api_key      = trim($api_key);
        $this->api_secret   = trim($api_secret);
        $this->debug        = (bool) $debug;
    }

    /**
     * Create an invoice via S2S API call (POST /v1/payment/create).
     *
     * @param array $payload
     * @return array
     */
    public function create_invoice(array $payload) {
        if (empty($this->api_key) || empty($this->api_secret)) {
            return array(
                'success' => false,
                'error'   => 'DenaNeya API credentials are not configured. Please check payment settings.'
            );
        }

        $endpoint = $this->api_base_url . '/v1/payment/create';
        $json_body = json_encode($payload);

        $headers = array(
            'Content-Type'         => 'application/json',
            'Accept'               => 'application/json',
            'X-API-KEY'            => $this->api_key,
            'X-API-SECRET'         => $this->api_secret,
            'x-zinipay-api-key'    => $this->api_key,
            'x-zinipay-api-secret' => $this->api_secret,
            'User-Agent'           => 'DenaNeya-WooCommerce-Plugin/' . (defined('DENANEYA_VERSION') ? DENANEYA_VERSION : '2.0.0')
        );

        // Standard WordPress HTTP API call if available
        if (function_exists('wp_remote_post')) {
            $args = array(
                'method'      => 'POST',
                'headers'     => $headers,
                'body'        => $json_body,
                'timeout'     => 15,
                'sslverify'   => (strpos($this->api_base_url, 'https://') === 0),
                'data_format' => 'body',
            );

            $response = wp_remote_post($endpoint, $args);

            if (is_wp_error($response)) {
                return array('success' => false, 'error' => $response->get_error_message());
            }

            $http_code = wp_remote_retrieve_response_code($response);
            $raw_body  = wp_remote_retrieve_body($response);
        } else {
            // Standalone cURL fallback (for CLI testing / environments without WordPress loaded)
            $ch = curl_init($endpoint);
            $formatted_headers = array();
            foreach ($headers as $k => $v) {
                $formatted_headers[] = "{$k}: {$v}";
            }

            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $json_body);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $formatted_headers);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, (strpos($this->api_base_url, 'https://') === 0));

            $raw_body  = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_err  = curl_error($ch);
            curl_close($ch);

            if ($raw_body === false || !empty($curl_err)) {
                return array('success' => false, 'error' => !empty($curl_err) ? $curl_err : 'Connection failed');
            }
        }

        $data = json_decode($raw_body, true);

        if ($http_code < 200 || $http_code >= 300 || empty($data)) {
            $err_msg = isset($data['message']) ? $data['message'] : ('Server returned HTTP ' . $http_code);
            return array('success' => false, 'error' => $err_msg, 'status_code' => $http_code);
        }

        // Extract invoice ID
        $invoice_id = null;
        if (!empty($data['invoice']['id'])) {
            $invoice_id = $data['invoice']['id'];
        } elseif (!empty($data['invoice_id'])) {
            $invoice_id = $data['invoice_id'];
        }

        // Extract checkout URL
        $checkout_url = null;
        if (!empty($data['checkout_url'])) {
            $checkout_url = $data['checkout_url'];
        } elseif (!empty($data['payment_url'])) {
            $checkout_url = $data['payment_url'];
        } elseif (!empty($data['invoice']['checkout_url'])) {
            $checkout_url = $data['invoice']['checkout_url'];
        } elseif ($invoice_id) {
            $checkout_url = $this->api_base_url . '/pay/' . $invoice_id;
        }

        if (!$invoice_id || !$checkout_url) {
            return array('success' => false, 'error' => 'Malformed invoice response from server.');
        }

        return array(
            'success'      => true,
            'invoice_id'   => $invoice_id,
            'checkout_url' => $checkout_url,
            'expires_at'   => isset($data['expires_at']) ? $data['expires_at'] : null,
            'raw'          => $data
        );
    }
}
