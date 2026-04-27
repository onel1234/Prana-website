/*
 * Supabase Client Configuration
 * ================================
 * The anon key is safe to expose in client-side code (RLS handles security).
 */

var SUPABASE_URL = 'https://jdjalzgnnegvjzjbrvnb.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkamFsemdubmVndmp6amJydm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjcxNzksImV4cCI6MjA5Mjg0MzE3OX0.ijPFMyPJwo76349DGdBGexmcuIWkep9U6hcCHcFNOOk';

// Initialize Supabase client with explicit storage config for file:// compatibility
var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'prana-auth-session',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
