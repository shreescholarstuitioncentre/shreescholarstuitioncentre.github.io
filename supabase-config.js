/* =========================================================
   SSTC SUPABASE DISABLED
   This site is hosted on static GitHub Pages and does not have
   a secure backend configured for Supabase. Keep it disabled.
   ========================================================= */

window.SSTC_SUPABASE_DISABLED = true;

if (window.location.hostname === "localhost") {
    console.warn("Supabase is disabled for local development until a secure backend is configured.");
}
