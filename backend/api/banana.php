<?php
/**
 * banana.php - Banana API Proxy
 *
 * INTEROPERABILITY DEMONSTRATION:
 * ================================
 * This script acts as a server-side proxy between the JavaScript frontend
 * and the external Banana API (https://marcconrad.com/uob/banana/).
 *
 * Why a proxy is needed:
 *   The PHP endpoint provides an authenticated, validated server-side route.
 *   The frontend also has a direct HTTPS fallback for static previews or when
 *   PHP is unavailable.
 *
 *   Our PHP backend runs server-side where CORS does not apply, so it can
 *   freely make HTTP requests to the external API using cURL, then forward
 *   the result back to the JavaScript client.
 *
 * Interoperability chain:
 *   [Browser JS] --fetch()--> [Our PHP proxy] --cURL/HTTPS--> [Banana API]
 *   [Banana API] --JSON----> [Our PHP proxy] --JSON-------> [Browser JS]
 *
 * Protocols involved:
 *   - HTTPS     : encrypted transport to the external API
 *   - JSON      : data interchange format (language-neutral, system-neutral)
 *   - cURL      : PHP's HTTP client library for server-to-server calls
 *
 * External API: Banana API by Marc Conrad
 *   Documentation: https://marcconrad.com/uob/banana/doc.php
 *   Base URL:      https://marcconrad.com/uob/banana/api.php
 *   Response:      {"question": "<base64 image or image URL>", "solution": <number 0-9>}
 *
 * Author: CIS046-3 Assignment — BananaBrain Game
 */

// ---- Response headers ----
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token, X-Guest-Name');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---- Include shared utilities ----
require_once __DIR__ . '/helpers.php';
ensureDataFiles();

// ---- Authenticate registered users or validate a guest display name ----
$token    = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
$username = validateSession($token);
$guestName = trim($_SERVER['HTTP_X_GUEST_NAME'] ?? '');

$guestLength = preg_match_all('/./us', $guestName);
if (!$username && ($guestName === '' || $guestLength === false || $guestLength > 24 || preg_match('/[\x00-\x1F\x7F]/', $guestName))) {
    http_response_code(401);
    jsonResponse(false, 'Enter a valid guest name or log in to play.');
}

// ---- Call the external Banana API (Interoperability) ----
// We use cURL with certificate verification to request the external API.
// cURL is PHP's standard HTTP client for server-to-server communication.

$bananaApiUrl = 'https://marcconrad.com/uob/banana/api.php?out=json&base64=yes';

$curlHandle = curl_init();
curl_setopt_array($curlHandle, [
    CURLOPT_URL            => $bananaApiUrl,
    CURLOPT_RETURNTRANSFER => true,           // Return response as string
    CURLOPT_TIMEOUT        => 20,             // 20-second timeout for the image payload
    CURLOPT_CONNECTTIMEOUT => 5,              // 5-second connection timeout
    CURLOPT_USERAGENT      => 'BananaBrain-Game/1.0 (CIS046-3 UoB Assignment)',
    CURLOPT_FOLLOWLOCATION => true,           // Follow redirects
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

$rawResponse = curl_exec($curlHandle);
$httpCode    = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
$curlError   = curl_error($curlHandle);
$contentType = curl_getinfo($curlHandle, CURLINFO_CONTENT_TYPE);
curl_close($curlHandle);

// ---- Handle errors from the external API ----
if ($curlError || $rawResponse === false) {
    http_response_code(502);
    jsonResponse(false, 'Could not reach the Banana API: ' . ($curlError ?: 'empty response'));
}

if ($httpCode !== 200) {
    http_response_code(502);
    jsonResponse(false, "Banana API returned HTTP {$httpCode}. Please try again.");
}

// ---- Parse and validate the Banana API JSON response ----
// Interoperability: we parse the JSON payload from the external system
$apiData = json_decode($rawResponse, true);

if (!is_array($apiData) || !isset($apiData['question'], $apiData['solution'])) {
    http_response_code(502);
    jsonResponse(false, 'Banana API returned invalid JSON. ' . (json_last_error_msg() ?: (string) $contentType));
}

$solution = filter_var($apiData['solution'], FILTER_VALIDATE_INT);
if ($solution === false || $solution < 0 || $solution > 9 || !is_string($apiData['question'])) {
    http_response_code(502);
    jsonResponse(false, 'Banana API returned an invalid puzzle.');
}

$question = trim($apiData['question']);
$imageBytes = base64_decode($question, true);
$imageInfo = $imageBytes !== false ? @getimagesizefromstring($imageBytes) : false;
$mimeTypes = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/gif' => 'gif',
    'image/webp' => 'webp'
];

if ($imageInfo && isset($mimeTypes[$imageInfo['mime']])) {
    $question = 'data:' . $imageInfo['mime'] . ';base64,' . base64_encode($imageBytes);
} else {
    $imageUrl = filter_var($question, FILTER_VALIDATE_URL);
    $imageHost = $imageUrl ? strtolower((string) parse_url($imageUrl, PHP_URL_HOST)) : '';
    if (!$imageUrl || strtolower((string) parse_url($imageUrl, PHP_URL_SCHEME)) !== 'https'
        || !in_array($imageHost, ['marcconrad.com', 'www.sanfoh.com'], true)) {
        http_response_code(502);
        jsonResponse(false, 'Banana API did not return a supported puzzle image.');
    }
}

// ---- Return the puzzle data to our JavaScript frontend ----
// We add attribution metadata to make it clear where the data comes from
echo json_encode([
    'success'     => true,
    'question'    => $question,
    'solution'    => $solution, // Correct answer (0–9)
    'fetched_by'  => $username ?: $guestName, // Which player requested this puzzle
    'source'      => 'Banana API by Marc Conrad — https://marcconrad.com/uob/banana/',
    'timestamp'   => date('c')
]);
