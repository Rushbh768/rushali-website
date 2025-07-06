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
        // Ensure you destructure 'request_id' here
        const { coffee_items, phone_numb, address, total_amount, request_id } = JSON.parse(event.body);

        // Basic validation (add more as needed)
        // Ensure request_id is present
        if (!coffee_items || coffee_items.length === 0 || !phone_numb || !address || total_amount === undefined || !request_id) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields including request_id.' }) };
        }

        // --- Idempotency Check ---
        // 1. Try to find an existing order with this request_id
        const { data: existingOrder, error: selectError } = await supabase
            .from('orders')
            .select('id')
            .eq('request_id', request_id)
            .single();

        // If an error occurred during select and it's NOT just 'no rows found' (PGRST116)
        if (selectError && selectError.code !== 'PGRST116') {
            console.error('Supabase select error during idempotency check:', selectError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error checking for existing order. Please try again.' }),
            };
        }

        // If an order with this request_id already exists, return success without re-inserting.
        if (existingOrder) {
            console.log(`Order with request_id ${request_id} already exists. Returning success without re-inserting.`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Order already processed.', orderId: existingOrder.id }),
            };
        }

        // --- If no existing order, proceed with the insert ---
        const { data, error: insertError } = await supabase
            .from('orders') // Your table name
            .insert([
                {
                    coffee_items: coffee_items,
                    phone_numb: phone_numb, // Ensure this matches your DB column name (phone_numb as per previous convo)
                    address: address,
                    total_amount: total_amount,
                    request_id: request_id // Insert the unique ID here
                },
            ])
            .select(); // To return the inserted data

        if (insertError) {
            console.error('Supabase insert error:', insertError);
            // Specifically check for unique constraint violation (code '23505')
            // This can happen in very rare race conditions where two requests for the same ID
            // arrive almost simultaneously, and the select check passes for both before the first inserts.
            if (insertError.code === '23505') {
                 console.warn(`Duplicate request_id ${request_id} caught during insert (unique constraint violation). Returning success.`);
                 return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Order already processed (duplicate detected during insert).' }),
                };
            }
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error saving order to database', error: insertError.message }),
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
        console.error('Request parsing error or unhandled exception:', parseError);
        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid request body or unexpected error.' }) };
    }
};
