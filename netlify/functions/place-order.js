// netlify/functions/place-order.js
const { createClient } = require('@supabase/supabase-js');

// Load environment variables (set in Netlify later)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service_role key for server-side

const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Netlify Functions parse JSON bodies automatically if Content-Type is application/json
        const { coffeeItems, phoneNumber, address, totalAmount } = JSON.parse(event.body);

        // Basic validation (add more as needed)
        if (!coffeeItems || coffeeItems.length === 0 || !phoneNumber || !address || !totalAmount) {
            return { statusCode: 400, body: 'Missing required fields' };
        }

        const { data, error } = await supabase
            .from('orders') // Your table name
            .insert([
                {
                    coffee_items: coffeeItems,
                    phone_number: phoneNumber,
                    address: address,
                    total_amount: totalAmount
                },
            ])
            .select(); // To return the inserted data

        if (error) {
            console.error('Supabase insert error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error saving order to database', error: error.message }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Order placed successfully!', order: data[0] }),
        };

    } catch (parseError) {
        console.error('Request parsing error:', parseError);
        return { statusCode: 400, body: 'Invalid JSON body' };
    }
};
