/* =========================================================
   SSTC SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";

const SUPABASE_PUBLISHABLE_KEY =
    "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";


/* ================= SUPABASE CLIENT ================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
