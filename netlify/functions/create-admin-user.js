// Create admin user via Supabase Admin API
// Netlify Function: /.netlify/functions/create-admin-user

exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    var SUPABASE_URL = process.env.SUPABASE_URL;
    var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Server configuration missing' }) };
    }

    // Verify caller is authenticated by checking their token
    var authHeader = event.headers.authorization || event.headers.Authorization || '';
    var callerToken = authHeader.replace('Bearer ', '');

    if (!callerToken) {
      return { statusCode: 401, headers: headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Verify caller's token with Supabase
    var verifyResponse = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + callerToken,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (!verifyResponse.ok) {
      return { statusCode: 401, headers: headers, body: JSON.stringify({ error: 'Invalid authentication token' }) };
    }

    // Parse request body
    var body = JSON.parse(event.body);
    var email = body.email;
    var password = body.password;

    if (!email || !password) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Email and password are required' }) };
    }

    if (password.length < 6) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
    }

    // Create user using Supabase Admin API
    var createResponse = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true
      })
    });

    var result = await createResponse.json();

    if (!createResponse.ok) {
      var errorMsg = result.msg || result.message || 'Failed to create user';
      return { statusCode: createResponse.status, headers: headers, body: JSON.stringify({ error: errorMsg }) };
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        user: { id: result.id, email: result.email, created_at: result.created_at }
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Internal server error', message: err.message }) };
  }
};
