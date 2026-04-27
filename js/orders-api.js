/*
 * Orders API - Shared data layer for order operations
 * Requires: supabase-config.js to be loaded first
 */

const OrdersAPI = {

  generateOrderNumber: function() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'PRA-' + yyyy + mm + dd + '-' + rand;
  },

  createOrder: async function(orderData) {
    var orderNumber = this.generateOrderNumber();

    var result = await supabaseClient
      .from('orders')
      .insert([{
        order_number: orderNumber,
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_phone: orderData.customerPhone || null,
        customer_address: orderData.customerAddress || null,
        items: orderData.items,
        total: orderData.total,
        status: 'Pending'
      }]);

    if (result.error) throw result.error;
    return { order_number: orderNumber };
  },

  getOrders: async function(filters) {
    filters = filters || {};
    var query = supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(
        'customer_name.ilike.%' + filters.search + '%,' +
        'order_number.ilike.%' + filters.search + '%,' +
        'customer_email.ilike.%' + filters.search + '%'
      );
    }

    var result = await query;
    if (result.error) throw result.error;
    return result.data;
  },

  updateOrderStatus: async function(orderId, newStatus, oldStatus, changedBy) {
    var orderResult = await supabaseClient
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (orderResult.error) throw orderResult.error;

    await supabaseClient
      .from('status_history')
      .insert([{
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy || 'admin'
      }]);

    return orderResult.data;
  },

  getOrderStats: async function() {
    var result = await supabaseClient
      .from('orders')
      .select('status');

    if (result.error) throw result.error;

    var stats = {
      total: result.data.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    result.data.forEach(function(order) {
      var key = order.status.toLowerCase();
      if (stats.hasOwnProperty(key)) stats[key]++;
    });

    return stats;
  }
};
