<?php
include('../config.php');
    if (!array_key_exists('user_name', $_POST)) {
        return;
    }
    $id = $_POST['user_name'];

    $mysqli = new mysqli($host, $user, $password, $db);
    if ($mysqli->connect_errno) {
        http_response_code(503);
        die ("Failed to connect to MySQL: ($mysqli->errno) $mysqli->error");
    }
    $query = "SELECT 1 FROM $user_table WHERE userID='$hash' LIMIT 1";
    $result = $mysqli->query($query);
    if (!$result) {
        http_response_code(500);
        die ("Failed to retrieve data: ($mysqli->errno) $mysqli->error");
    }
    if ($result->num_rows === 0) {
        echo '{"newUser": true}';
        return;
    }

    echo '{"userID": "' . $hash . '"}';
?>