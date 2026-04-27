// Send status update email via Gmail SMTP (Nodemailer)
// Netlify Function: /.netlify/functions/send-status-email

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
    var customerEmail = body.customerEmail;
    var customerName = body.customerName;
    var orderNumber = body.orderNumber;
    var newStatus = body.newStatus;
    var items = body.items || [];

    if (!customerEmail || !orderNumber || !newStatus) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    var GMAIL_USER = process.env.GMAIL_USER;
    var GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.log('Gmail credentials not set, skipping email');
      return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, skipped: true, message: 'Email skipped - Gmail credentials not configured' }) };
    }

    // Status-specific content
    var statusConfig = {
      'Processing': {
        emoji: '⚙️',
        title: 'Your order is being prepared!',
        message: 'Great news! We\'ve started preparing your PRANA order. Our team is carefully crafting your functional beverages with the freshest ingredients.',
        color: '#3b82f6'
      },
      'Shipped': {
        emoji: '🚚',
        title: 'Your order is on its way!',
        message: 'Your PRANA order has been shipped and is on its way to you. Get ready to fuel your wellness journey!',
        color: '#8b5cf6'
      },
      'Delivered': {
        emoji: '✅',
        title: 'Your order has been delivered!',
        message: 'Your PRANA order has been successfully delivered. We hope you enjoy your functional beverages. Cheers to better health!',
        color: '#10b981'
      },
      'Cancelled': {
        emoji: '❌',
        title: 'Your order has been cancelled',
        message: 'We\'re sorry to inform you that your order has been cancelled. If you have any questions, please don\'t hesitate to contact us.',
        color: '#ef4444'
      }
    };

    var config = statusConfig[newStatus] || {
      emoji: '📦',
      title: 'Order status updated',
      message: 'Your order status has been updated to: ' + newStatus,
      color: '#1a5c38'
    };

    // Build items HTML
    var itemsHtml = '';
    if (items && items.length > 0) {
      itemsHtml = '<table style="width:100%;border-collapse:collapse;margin:15px 0;">';
      for (var i = 0; i < items.length; i++) {
        itemsHtml += '<tr style="border-bottom:1px solid #f0ede8;">' +
          '<td style="padding:10px 0;color:#333;">' + items[i].name + ' × ' + items[i].qty + '</td>' +
          '<td style="padding:10px 0;text-align:right;font-weight:600;color:#1a5c38;">Rs ' + (items[i].price * items[i].qty) + '</td>' +
          '</tr>';
      }
      itemsHtml += '</table>';
    }

    var htmlEmail = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8f7f4;font-family:Arial,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;padding:40px 20px;">' +
        '<div style="text-align:center;margin-bottom:30px;">' +
          '<h1 style="color:#1a5c38;font-size:28px;margin:0;">PRANA</h1>' +
          '<p style="color:#c8b78e;font-size:14px;margin:5px 0 0;">Functional Beverages</p>' +
        '</div>' +
        '<div style="background:#fff;border-radius:16px;padding:35px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">' +
          '<div style="text-align:center;margin-bottom:25px;">' +
            '<div style="font-size:40px;margin-bottom:10px;">' + config.emoji + '</div>' +
            '<h2 style="color:#222;font-size:22px;margin:0 0 10px;">' + config.title + '</h2>' +
            '<p style="color:#666;font-size:15px;line-height:1.6;margin:0;">' + config.message + '</p>' +
          '</div>' +
          '<div style="background:#faf9f7;border-radius:12px;padding:20px;margin:20px 0;">' +
            '<p style="margin:0 0 5px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Number</p>' +
            '<p style="margin:0;font-size:18px;font-weight:700;color:#c8b78e;letter-spacing:1px;">' + orderNumber + '</p>' +
          '</div>' +
          '<div style="background:#faf9f7;border-radius:12px;padding:15px 20px;margin:15px 0;">' +
            '<p style="margin:0 0 2px;font-size:13px;color:#888;">Status</p>' +
            '<p style="margin:0;font-size:16px;font-weight:700;color:' + config.color + ';">' + newStatus + '</p>' +
          '</div>' +
          itemsHtml +
        '</div>' +
        '<div style="text-align:center;margin-top:30px;">' +
          '<p style="color:#999;font-size:13px;">&copy; 2026 PRANA | Functional Beverages</p>' +
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

    // Send email
    var info = await transporter.sendMail({
      from: '"PRANA" <' + GMAIL_USER + '>',
      to: customerEmail,
      subject: config.emoji + ' PRANA Order ' + orderNumber + ' - ' + config.title,
      html: htmlEmail
    });

    console.log('Email sent:', info.messageId);

    return { statusCode: 200, headers: headers, body: JSON.stringify({ success: true, messageId: info.messageId }) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'Failed to send email', message: err.message }) };
  }
};
