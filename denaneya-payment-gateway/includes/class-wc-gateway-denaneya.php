<?php
/**
 * DenaNeya v2.0 - WooCommerce Payment Gateway Class
 * File: includes/class-wc-gateway-denaneya.php
 *
 * Implements WC_Payment_Gateway contract for direct-to-SIM automated payments.
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Gateway_DenaNeya extends WC_Payment_Gateway {

    /** @var DenaNeya_API_Client */
    public $api_client;

    /** @var string */
    public $api_base_url;

    /** @var string */
    public $api_key;

    /** @var string */
    public $api_secret;

    /** @var string */
    public $webhook_secret;

    /** @var int */
    public $invoice_ttl;

    /** @var string */
    public $order_status_success;

    /** @var bool */
    public $debug;

    public function __construct() {
        $this->id                 = 'denaneya';
        $this->has_fields         = false;
        $this->method_title       = __('DenaNeya (দেনা নেয়া)', 'denaneya-payment-gateway');
        $this->method_description = __('Accept direct bKash, Nagad, Rocket, and Upay payments directly to your SIM with 0% gateway commission and automated SMS verification.', 'denaneya-payment-gateway');
        $this->supports           = array('products');

        // Set gateway icon if available
        $icon_url = defined('DENANEYA_PLUGIN_URL') ? DENANEYA_PLUGIN_URL . 'assets/images/icon.png' : '';
        $this->icon = apply_filters('woocommerce_denaneya_icon', $icon_url);

        // Initialize admin configuration form and settings
        $this->init_form_fields();
        $this->init_settings();

        // Bind user-configured settings
        $this->title                = $this->get_option('title', 'দেনা নেয়া (bKash / Nagad / Rocket / Upay)');
        $this->description          = $this->get_option('description', 'Pay securely using bKash, Nagad, Rocket, Upay, Bank, or Debit/Credit card directly to merchant SIM with automated SMS matching.');
        $this->enabled              = $this->get_option('enabled', 'no');
        $this->api_base_url         = rtrim($this->get_option('api_base_url', 'http://localhost:4000'), '/');
        $this->api_key              = $this->get_option('api_key', '');
        $this->api_secret           = $this->get_option('api_secret', '');
        $this->webhook_secret       = $this->get_option('webhook_secret', '');
        $this->invoice_ttl          = absint($this->get_option('invoice_ttl', 15));
        $this->order_status_success = $this->get_option('order_status_success', 'processing');
        $this->debug                = ('yes' === $this->get_option('debug', 'no'));

        // Instantiate API client
        $this->api_client = new DenaNeya_API_Client(
            $this->api_base_url,
            $this->api_key,
            $this->api_secret,
            $this->debug
        );

        // Register action to save settings in WooCommerce admin
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));

        // Register Webhook listener endpoints
        add_action('woocommerce_api_denaneya_webhook', array($this, 'handle_webhook_callback'));
        add_action('woocommerce_api_wc_gateway_denaneya', array($this, 'handle_webhook_callback'));
    }

    /**
     * Define admin settings form fields.
     */
    public function init_form_fields() {
        $webhook_url = function_exists('home_url') ? add_query_arg('wc-api', 'denaneya_webhook', home_url('/')) : '/?wc-api=denaneya_webhook';

        $this->form_fields = array(
            'enabled' => array(
                'title'       => __('Enable/Disable', 'denaneya-payment-gateway'),
                'type'        => 'checkbox',
                'label'       => __('Enable DenaNeya Payment Gateway', 'denaneya-payment-gateway'),
                'default'     => 'no',
            ),
            'title' => array(
                'title'       => __('Title', 'denaneya-payment-gateway'),
                'type'        => 'text',
                'description' => __('Payment method title displayed to customers during checkout.', 'denaneya-payment-gateway'),
                'default'     => 'দেনা নেয়া (bKash / Nagad / Rocket / Upay)',
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __('Description', 'denaneya-payment-gateway'),
                'type'        => 'textarea',
                'description' => __('Payment method description displayed to customers during checkout.', 'denaneya-payment-gateway'),
                'default'     => 'Pay securely using bKash, Nagad, Rocket, Upay, Bank, or Debit/Credit card directly to merchant SIM with automated SMS matching.',
            ),
            'api_base_url' => array(
                'title'       => __('API Base URL', 'denaneya-payment-gateway'),
                'type'        => 'text',
                'description' => __('Base URL of your DenaNeya v2.0 API server (e.g. https://denaneya.aihaat.shop or http://localhost:4000).', 'denaneya-payment-gateway'),
                'default'     => 'http://localhost:4000',
                'desc_tip'    => true,
            ),
            'api_key' => array(
                'title'       => __('Merchant Brand API Key', 'denaneya-payment-gateway'),
                'type'        => 'text',
                'description' => __('Your Brand API Key from the DenaNeya Merchant Dashboard.', 'denaneya-payment-gateway'),
                'default'     => '',
            ),
            'api_secret' => array(
                'title'       => __('Merchant Brand API Secret', 'denaneya-payment-gateway'),
                'type'        => 'password',
                'description' => __('Merchant secret key used to authenticate S2S invoice creation requests (minimum 32 characters).', 'denaneya-payment-gateway'),
                'default'     => '',
            ),
            'webhook_secret' => array(
                'title'       => __('Webhook HMAC Secret', 'denaneya-payment-gateway'),
                'type'        => 'password',
                'description' => __('The HMAC-SHA256 signing secret configured for your brand in DenaNeya dashboard (minimum 32 characters).', 'denaneya-payment-gateway'),
                'default'     => '',
            ),
            'webhook_url_display' => array(
                'title'       => __('Your Webhook Callback URL', 'denaneya-payment-gateway'),
                'type'        => 'title',
                'description' => '<code>' . (function_exists('esc_url') ? esc_url($webhook_url) : $webhook_url) . '</code><br><small>' .
                                 __('Copy this URL and configure it in your DenaNeya Brand Settings as the Webhook URL.', 'denaneya-payment-gateway') . '</small>',
            ),
            'invoice_ttl' => array(
                'title'       => __('Invoice Expiration (Minutes)', 'denaneya-payment-gateway'),
                'type'        => 'number',
                'description' => __('Validity window in minutes for customer payment (default: 15 minutes).', 'denaneya-payment-gateway'),
                'default'     => 15,
                'custom_attributes' => array('min' => 5, 'max' => 60),
            ),
            'order_status_success' => array(
                'title'       => __('Order Status on Payment', 'denaneya-payment-gateway'),
                'type'        => 'select',
                'description' => __('Target order status when DenaNeya successfully verifies the payment.', 'denaneya-payment-gateway'),
                'default'     => 'processing',
                'options'     => array(
                    'processing' => __('Processing (Recommended for physical products)', 'denaneya-payment-gateway'),
                    'completed'  => __('Completed (Recommended for digital downloads/instant services)', 'denaneya-payment-gateway'),
                ),
            ),
            'debug' => array(
                'title'       => __('Debug Log', 'denaneya-payment-gateway'),
                'type'        => 'checkbox',
                'label'       => __('Enable debug logging (saved to WooCommerce -> Status -> Logs)', 'denaneya-payment-gateway'),
                'default'     => 'no',
            ),
        );
    }

    /**
     * Process checkout submission: Creates DenaNeya invoice and redirects customer to hosted checkout.
     *
     * @param int $order_id
     * @return array
     */
    public function process_payment($order_id) {
        $order = function_exists('wc_get_order') ? wc_get_order($order_id) : null;
        if (!$order) {
            if (function_exists('wc_add_notice')) {
                wc_add_notice(__('Invalid order. Please try again.', 'denaneya-payment-gateway'), 'error');
            }
            return array('result' => 'fail');
        }

        $customer_name = trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name());
        if (empty($customer_name)) {
            $customer_name = 'Customer #' . $order->get_id();
        }

        $payload = array(
            'amount'         => (float) $order->get_total(),
            'currency'       => $order->get_currency(),
            'customer_name'  => $customer_name,
            'customer_email' => $order->get_billing_email() ?: null,
            'customer_phone' => $order->get_billing_phone() ?: null,
            'redirect_url'   => $this->get_return_url($order),
            'cancel_url'     => $order->get_cancel_order_url(),
            'metadata'       => array(
                'order_id'       => (string) $order->get_id(),
                'order_number'   => (string) $order->get_order_number(),
                'order_key'      => $order->get_order_key(),
                'platform'       => 'WooCommerce',
                'plugin_version' => defined('DENANEYA_VERSION') ? DENANEYA_VERSION : '2.0.0',
            ),
        );

        $response = $this->api_client->create_invoice($payload);

        if (!$response['success']) {
            $err_msg = isset($response['error']) ? $response['error'] : 'Unknown error';
            if ($this->debug && function_exists('wc_get_logger')) {
                wc_get_logger()->error(sprintf('[DenaNeya] Invoice creation failed for order #%d: %s', $order_id, $err_msg), array('source' => 'denaneya'));
            }
            if (function_exists('wc_add_notice')) {
                wc_add_notice(__('Unable to initiate payment with DenaNeya: ', 'denaneya-payment-gateway') . $err_msg, 'error');
            }
            return array('result' => 'fail');
        }

        $invoice_id   = $response['invoice_id'];
        $checkout_url = $response['checkout_url'];

        // Bind metadata to WooCommerce order
        $order->update_meta_data('_denaneya_invoice_id', $invoice_id);
        $order->update_meta_data('_denaneya_checkout_url', $checkout_url);
        $order->add_order_note(sprintf(__('DenaNeya invoice created: %s. Redirecting customer to checkout.', 'denaneya-payment-gateway'), $invoice_id));
        $order->update_status('pending', __('Awaiting DenaNeya payment.', 'denaneya-payment-gateway'));
        $order->save();

        return array(
            'result'   => 'success',
            'redirect' => $checkout_url,
        );
    }

    /**
     * Webhook callback handler.
     */
    public function handle_webhook_callback() {
        $handler = new DenaNeya_Webhook_Handler(
            $this->webhook_secret,
            $this->order_status_success,
            $this->debug
        );
        $handler->process_callback();
    }
}
