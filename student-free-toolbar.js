/* =========================================================
   SSTC FREE VIEWER: neeche floating zoom toolbar
   (notes viewer jaisa). CSS isi file ke andar hai, isliye
   alag CSS file ya version (?v=) ki zaroorat nahi.
   ========================================================= */

(function () {

    var FR_ZOOM_MIN = 0.5;
    var FR_ZOOM_MAX = 3;
    var FR_ZOOM_STEP = 0.1;

    var frZoom = 1;
    var frZoomNative = ("zoom" in document.documentElement.style);

    function frEl(id) {
        return document.getElementById(id);
    }

    function frApplyZoom(level) {

        var frame = frEl("frFrame");

        if (!frame) {
            return;
        }

        var doc = null;

        try {
            doc = frame.contentDocument;
        }
        catch (error) {
            return;
        }

        if (!doc || !doc.documentElement || !doc.body) {
            return;
        }

        if (frZoomNative) {
            doc.documentElement.style.zoom = level === 1 ? "" : String(level);
        }
        else {
            doc.body.style.transformOrigin = "0 0";
            doc.body.style.transform = level === 1 ? "" : "scale(" + level + ")";
            doc.body.style.width = level === 1 ? "" : (100 / level) + "%";
        }
    }

    function frUpdateLabel() {

        var label = frEl("frZoomLabel");
        var minus = frEl("frZoomOut");
        var plus = frEl("frZoomIn");

        if (label) {
            label.textContent = Math.round(frZoom * 100) + "%";
        }

        if (minus) {
            minus.disabled = frZoom <= FR_ZOOM_MIN + 0.001;
        }

        if (plus) {
            plus.disabled = frZoom >= FR_ZOOM_MAX - 0.001;
        }
    }

    function frDoZoom(direction) {

        if (direction === 0) {
            frZoom = 1;
        }
        else {
            frZoom = Math.round((frZoom + direction * FR_ZOOM_STEP) * 100) / 100;
            frZoom = Math.min(FR_ZOOM_MAX, Math.max(FR_ZOOM_MIN, frZoom));
        }

        frApplyZoom(frZoom);
        frUpdateLabel();
    }

    function frBuildToolbar() {

        var wrap = frEl("frFrameWrap");
        var frame = frEl("frFrame");

        if (!wrap || !frame) {
            return false;
        }

        if (frEl("frToolbar")) {
            return true;
        }

        if (!frEl("frToolbarStyle")) {

            var style = document.createElement("style");
            style.id = "frToolbarStyle";

            style.textContent =
                "#frFrameWrap{position:relative;}" +
                "#frFrameWrap:fullscreen{background:#fff;}" +
                "#frFrameWrap:-webkit-full-screen{background:#fff;}" +
                "#frFrameWrap:fullscreen #frFrame{width:100%;height:100%;}" +
                "#frFrameWrap:-webkit-full-screen #frFrame{width:100%;height:100%;}" +
                ".fr-bar-actions button[title='Fullscreen']{display:none;}" +
                "#frToolbar{position:absolute;right:16px;bottom:16px;z-index:50;display:flex;align-items:center;" +
                "gap:4px;padding:6px 8px;border-radius:12px;background:rgba(6,78,72,.92);" +
                "box-shadow:0 6px 20px rgba(0,0,0,.28);}" +
                "#frToolbar button{border:0;background:rgba(255,255,255,.14);color:#fff;font-size:14px;" +
                "font-weight:700;min-width:36px;height:36px;padding:0 10px;border-radius:8px;cursor:pointer;" +
                "font-family:inherit;line-height:1;}" +
                "#frToolbar button:hover:not(:disabled){background:rgba(255,255,255,.28);}" +
                "#frToolbar button:disabled{opacity:.4;cursor:not-allowed;}" +
                "#frToolbar .fr-tb-label{min-width:48px;text-align:center;}" +
                "#frToolbar .fr-tb-sep{width:1px;height:22px;background:rgba(255,255,255,.3);margin:0 4px;}" +
                "@media (max-width:600px){#frToolbar{right:8px;bottom:8px;padding:4px 6px;}" +
                "#frToolbar button{min-width:32px;height:32px;padding:0 6px;font-size:13px;}}";

            document.head.appendChild(style);
        }

        var bar = document.createElement("div");
        bar.id = "frToolbar";
        bar.setAttribute("role", "toolbar");
        bar.setAttribute("aria-label", "Free chapter tools");

        bar.innerHTML =
            '<button type="button" id="frZoomOut" title="Zoom out">−</button>' +
            '<button type="button" id="frZoomLabel" class="fr-tb-label" title="Reset zoom">100%</button>' +
            '<button type="button" id="frZoomIn" title="Zoom in">+</button>' +
            '<span class="fr-tb-sep"></span>' +
            '<button type="button" id="frTbFull" title="Fullscreen">⛶</button>';

        wrap.appendChild(bar);

        frEl("frZoomOut").addEventListener("click", function () { frDoZoom(-1); });
        frEl("frZoomIn").addEventListener("click", function () { frDoZoom(1); });
        frEl("frZoomLabel").addEventListener("click", function () { frDoZoom(0); });

        frEl("frTbFull").addEventListener("click", function () {
            if (typeof window.sstcFreeFullscreen === "function") {
                window.sstcFreeFullscreen();
            }
        });

        /* Naya chapter khulne par bhi same zoom lage */
        frame.addEventListener("load", function () {
            frApplyZoom(frZoom);
        });

        frUpdateLabel();
        return true;
    }

    /* Viewer band hone par zoom 100% par wapas */
    var origClose = window.closeSstcFreeViewer;

    function hookClose() {

        if (typeof window.closeSstcFreeViewer === "function" && window.closeSstcFreeViewer !== origClose) {
            origClose = window.closeSstcFreeViewer;
        }

        if (typeof origClose === "function" && !origClose.__frHooked) {

            var wrapped = function () {
                frZoom = 1;
                frUpdateLabel();
                return origClose.apply(this, arguments);
            };

            wrapped.__frHooked = true;
            window.closeSstcFreeViewer = wrapped;
            origClose = wrapped;
        }
    }

    function init() {

        hookClose();

        if (frBuildToolbar()) {
            return;
        }

        /* Agar section baad me JS se inject hota hai to wait karo */
        var observer = new MutationObserver(function () {
            if (frBuildToolbar()) {
                hookClose();
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }

})();
