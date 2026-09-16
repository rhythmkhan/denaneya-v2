<?php
/**
 * Plugin Name:       DenaNeya Payment Gateway for WooCommerce
 * Plugin URI:        https://denaneya.com
 * Description:       Accept direct-to-SIM MFS payments (bKash, Nagad, Rocket, Upay) with 0% gateway commission and automated SMS verification via DenaNeya v2.0.
 * Version:           2.0.0
 * Author:            DenaNeya Team
 * Author URI:        https://denaneya.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       denaneya-payment-gateway
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 6.0
 * WC tested up to:   9.3
 */

if (!defined('ABSPATH')) {
    exit; // Prevent direct access
}

define('DENANEYA_VERSION', '2.0.0');
define('DENANEYA_PLUGIN_FILE', __FILE__);
define('DENANEYA_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('DENANEYA_PLUGIN_URL', plugin_dir_url(__FILE__));

// Declare High-Performance Order Storage (HPOS / custom_order_tables) compatibility
add_action('before_woocommerce_init', function () {
    if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

// Initialize gateway once plugins are loaded
add_action('plugins_loaded', 'denaneya_init_payment_gateway');

function denaneya_init_payment_gateway() {
    if (!class_exists('WC_Payment_Gateway')) {
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p>' . 
                 esc_html__('DenaNeya Payment Gateway requires WooCommerce to be installed and active.', 'denaneya-payment-gateway') . 
                 '</p></div>';
        });
        return;
    }

    // Load plugin dependencies
    require_once DENANEYA_PLUGIN_PATH . 'includes/class-denaneya-canonicalizer.php';
    require_once DENANEYA_PLUGIN_PATH . 'includes/class-denaneya-api-client.php';
    require_once DENANEYA_PLUGIN_PATH . 'includes/class-denaneya-webhook-handler.php';
    require_once DENANEYA_PLUGIN_PATH . 'includes/class-wc-gateway-denaneya.php';

    // Register gateway class with WooCommerce
    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_Gateway_DenaNeya';
        return $gateways;
    });

    // Add direct Settings link on Plugins admin page
    add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
        $settings_url = admin_url('admin.php?page=wc-settings&tab=checkout&section=denaneya');
        $settings_link = '<a href="' . esc_url($settings_url) . '">' . esc_html__('Settings', 'denaneya-payment-gateway') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    });
}
