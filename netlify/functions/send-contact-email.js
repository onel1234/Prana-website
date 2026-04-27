// Send contact form email via Gmail SMTP (Nodemailer)
// Netlify Function: /.netlify/functions/send-contact-email

var nodemailer = require('nodemailer');

exports.handler = async function(event) {
  // CORS headers
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    var body = JSON.parse(event.body);
    var fullName = body.fullName;
    var email = body.email;
    var phone = body.phone;
    var message = body.message;

    if (!fullName || !email || !message) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Please fill in your name, email, and message.' }) };
    }

    var GMAIL_USER = process.env.GMAIL_USER;
    var GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.log('Gmail credentials not set, cannot send contact email');
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Email service is not configured. Please try again later.' }) };
    }

    // Build the HTML email
    var htmlEmail = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8f7f4;font-family:Arial,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 20px;">' +
        '<div style="text-align:center;margin-bottom:30px;">' +
          '<h1 style="color:#1a5c38;font-size:28px;margin:0;">PRANA</h1>' +
          '<p style="color:#c8b78e;font-size:14px;margin:5px 0 0;">New Contact Form Submission</p>' +
        '</div>' +
        '<div style="background:#fff;border-radius:16px;padding:35px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">' +
          '<h2 style="color:#1a5c38;font-size:20px;margin:0 0 25px;border-bottom:2px solid #f0ede8;padding-bottom:15px;">📩 Contact Message</h2>' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<tr>' +
              '<td style="padding:12px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;width:120px;">Name</td>' +
              '<td style="padding:12px 0;color:#333;font-size:15px;font-weight:600;">' + fullName + '</td>' +
            '</tr>' +
            '<tr style="border-top:1px solid #f0ede8;">' +
              '<td style="padding:12px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Email</td>' +
              '<td style="padding:12px 0;color:#333;font-size:15px;"><a href="mailto:' + email + '" style="color:#1a5c38;text-decoration:none;">' + email + '</a></td>' +
            '</tr>' +
            '<tr style="border-top:1px solid #f0ede8;">' +
              '<td style="padding:12px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Phone</td>' +
              '<td style="padding:12px 0;color:#333;font-size:15px;">' + (phone || 'Not provided') + '</td>' +
            '</tr>' +
            '<tr style="border-top:1px solid #f0ede8;">' +
              '<td style="padding:12px 0;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Message</td>' +
              '<td style="padding:12px 0;color:#333;font-size:15px;line-height:1.6;">' + message + '</td>' +
            '</tr>' +
          '</table>' +
        '</div>' +
        '<div style="text-align:center;margin-top:30px;">' +
          '<p style="color:#999;font-size:13px;">This message was sent from the PRANA website contact form.</p>' +
        '</div>' +
      '</div>' +
    '</body></html>';

    // Create Gmail SMTP transporter
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    // Send email to the PRANA inbox
    var info = await transporter.sendMail({
      from: '"PRANA Website" <' + GMAIL_USER + '>',
      replyTo: email,
      to: GMAIL_USER,
      subject: '📩 New Contact Message from ' + fullName,
      html: htmlEmail
    });

    console.log('Contact email sent:', info.messageId);

    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, messageId: info.messageId }) };

  } catch (err) {
    console.error('Contact form error:', err);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Failed to send message. Please try again later.', message: err.message }) };
  }
};
