// Supabase configuration
const SUPABASE_URL = "https://qrouuoycvxxxutkxkxpp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3V1b3ljdnh4eHV0a3hreHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODMyNDgsImV4cCI6MjA3Nzc1OTI0OH0.LXKVdTXNgHgoILlHJcSaGnzyWlaT0-oBxbEgl5ipA48";

// Initialize Supabase client (supabase is loaded from CDN as window.supabase)
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
