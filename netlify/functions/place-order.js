const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    // Parse the request body
    const data = JSON.parse(event.body);

    const { coffee_items, phone_number, address, total_amount, request_id } = data;

    // Basic validation (add more robust validation as needed)
    if (!coffee_items || coffee_items.length === 0 || !phone_number || !address || total_amount === undefined || !request_id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required fields or request_id.' })
        };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // --- Idempotency Check ---
        // First, try to find an existing order with this request_id
        const { data: existingOrder, error: selectError } = await supabase
            .from('orders')
            .select('id')
            .eq('request_id', request_id)
            .single();

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means 'no rows found'
            console.error('Supabase select error during idempotency check:', selectError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error checking for existing order.' })
            };
        }

        if (existingOrder) {
            console.log(`Order with request_id ${request_id} already exists. Returning success without re-inserting.`);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Order already processed.' })
            };
        }

        // --- If no existing order, proceed with insert ---
        const { data: order, error: insertError } = await supabase
            .from('orders')
            .insert([
                {
                    coffee_items: coffee_items,
                    phone_numb: phone_number, // Ensure this matches your DB column name if different from phone_number
                    address: address,
                    total_amount: total_amount,
                    request_id: request_id // Insert the unique ID
                }
            ])
            .select(); // Use .select() to get the inserted data back

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to place order due to database error.' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order placed successfully!', orderId: order[0].id })
        };

    } catch (error) {
        console.error('Unhandled error in function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An unexpected error occurred.' })
        };
    }
};
