<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $to = "anitapkh3@gmail.com";
    $subject = "New Coffee Order from BrewUp";

    $coffee = isset($_POST['coffee']) ? implode(", ", $_POST['coffee']) : "None";
    $phone = htmlspecialchars($_POST['phone']);
    $address = htmlspecialchars($_POST['address']);
    $total = htmlspecialchars($_POST['totalAmount']);

    $message = "New order details:\n\n";
    $message .= "Coffee Selected: $coffee\n";
    $message .= "Phone Number: $phone\n";
    $message .= "Address: $address\n";
    $message .= "Total Price: Rs. $total\n";

    $headers = "From: orders@brewup.com";

    if (mail($to, $subject, $message, $headers)) {
        header("Location: thank-you.html");
        exit();
    } else {
        echo "Email failed to send. Please try again.";
    }
} else {
    echo "Invalid request.";
}
?>
