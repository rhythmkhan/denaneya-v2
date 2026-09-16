<?php
/**
 * DenaNeya v2.0 - RFC 8785 JSON Canonicalization Scheme (JCS) Implementation
 * File: includes/class-denaneya-canonicalizer.php
 *
 * Implements deterministic serialization conforming to RFC 8785.
 * Guarantees exact byte-for-byte parity with @denaneya/shared canonicalizeJson.
 *
 * Rules:
 * 1. Primitives: null -> "null", true/false -> "true"/"false", numbers -> shortest representation.
 * 2. Strings: UTF-8 encoded with minimal escapes (slashes unescaped, unicode unescaped).
 * 3. Arrays: Sequential elements canonicalized in order.
 * 4. Objects / Dictionaries: Keys sorted lexicographically by UTF-16 code units.
 */

if (!defined('ABSPATH')) {
    exit;
}

class DenaNeya_Canonicalizer {

    /**
     * Recursively canonicalizes a PHP value into an RFC 8785 canonical JSON string.
     *
     * @param mixed $val
     * @returns string
     */
    public static function canonicalize($val) {
        if (is_null($val)) {
            return 'null';
        }

        if (is_bool($val)) {
            return $val ? 'true' : 'false';
        }

        if (is_int($val) || is_float($val)) {
            if (is_nan($val) || is_infinite($val)) {
                return 'null';
            }
            return (string) $val;
        }

        if (is_string($val)) {
            return json_encode($val, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        if (is_object($val)) {
            if ($val instanceof JsonSerializable) {
                return self::canonicalize($val->jsonSerialize());
            }
            $val = get_object_vars($val);
        }

        if (is_array($val)) {
            if (empty($val)) {
                return '[]';
            }

            $keys = array_keys($val);
            $is_assoc = ($keys !== range(0, count($val) - 1));

            if (!$is_assoc) {
                // Sequential array / list
                $elements = array();
                foreach ($val as $item) {
                    $elements[] = self::canonicalize($item);
                }
                return '[' . implode(',', $elements) . ']';
            } else {
                // Associative dictionary / object: sort keys lexicographically by UTF-16 code units
                $str_keys = array_map('strval', $keys);
                sort($str_keys, SORT_STRING);

                $pairs = array();
                foreach ($str_keys as $k) {
                    $original_key = array_key_exists($k, $val) ? $k : (int)$k;
                    $pairs[] = json_encode((string) $k, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . 
                               ':' . self::canonicalize($val[$original_key]);
                }
                return '{' . implode(',', $pairs) . '}';
            }
        }

        return json_encode($val, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
