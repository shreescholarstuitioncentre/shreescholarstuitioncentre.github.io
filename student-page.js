/* =========================================================
   SSTC  ·  student-free.js  (v1)
   ---------------------------------------------------------
   "SSTC FREE" section: subject ke bina seedhe chapters.
   Har chapter ek HTML file se linked hai aur isi page ke
   andar (iframe me) khulta hai.

   student-page.js aur student-notes.js ke BAAD load karein.
   Ye file database / login / rent logic ko bilkul nahi chhuti.
   ========================================================= */


/* =========================================================
   ✏️ FREE CHAPTERS - YAHAN APNE CHAPTERS LIKHEIN
   ---------------------------------------------------------
   number : chapter ka number (sirf dikhane ke liye)
   title  : chapter ka naam
   desc   : chhoti line (optional, "" chhod sakte hain)
   file   : HTML file ka path (site ke root se, jaise
            ebooks/free/chapter-01.html)

   Naya chapter jodna ho to ek line copy karke niche paste karein.
   Chapter hatana ho to uski line delete karein.
   ========================================================= */

const SSTC_FREE_CHAPTERS = [
    { number: 1, title: "Free Chapter 1", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-01.html" },
    { number: 2, title: "Free Chapter 2", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-02.html" },
    { number: 3, title: "Free Chapter 3", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-03.html" },
    { number: 4, title: "Free Chapter 4", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-04.html" },
    { number: 5, title: "Free Chapter 5", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-05.html" },
    { number: 6, title: "Free Chapter 6", desc: "Is chapter ki chhoti si jaankari yahan likhein.", file: "free/chapter-06.html" }
];


/* =========================================================
   STATE
   ========================================================= */

let sstcFreeIndex = -1;          // abhi kaun sa chapter khula hai (-1 = koi nahi)
let sstcFreeRendered = false;


/* =========================================================
   SMALL HELPERS
   ========================================================= */

function frEl(id) {
    return document.getElementById(id);
}

/* Student login hai ya nahi (student-page.js ka function use hota hai) */

function frSessionOk() {

    if (typeof checkStudentSession === "function") {
        return checkStudentSession();
    }

    return sessionStorage.getItem("sstcStudentLoggedIn") === "true";
}

function frIsFullscreen() {

    const wrap = frEl("frFrameWrap");

    return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        (wrap && wrap.classList.contains("fr-pseudo-fs"))
    );
}


/* =========================================================
   RENDER CHAPTER LIST
   ========================================================= */

function renderSstcFreeList() {

    const list = frEl("frList");
    const empty = frEl("frEmpty");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (!SSTC_FREE_CHAPTERS.length) {

        if (empty) { empty.hidden = false; }
        return;
    }

    if (empty) { empty.hidden = true; }

    SSTC_FREE_CHAPTERS.forEach(function (chapter, index) {

        const card = document.createElement("button");
        card.type = "button";
        card.className = "fr-card";
        card.setAttribute("data-index", String(index));

        const no = document.createElement("span");
        no.className = "fr-card-no";
        no.textContent = String(chapter.number);

        const text = document.createElement("span");
        text.className = "fr-card-text";

        const title = document.createElement("strong");
        title.textContent = chapter.title;

        text.appendChild(title);

        if (chapter.desc) {

            const desc = document.createElement("small");
            desc.textContent = chapter.desc;

            text.appendChild(desc);
        }

        card.appendChild(no);
        card.appendChild(text);

        card.addEventListener("click", function () {
            openSstcFreeChapter(index);
        });

        list.appendChild(card);
    });

    sstcFreeRendered = true;
}


/* =========================================================
   OPEN / CLOSE SECTION  (SSTC FREE button)
   ========================================================= */

function toggleSstcFree() {

    const section = frEl("sstcFreeSection");

    if (!section) {
        return;
    }

    if (section.hidden) {
        openSstcFree();
    }
    else {
        closeSstcFree();
    }
}

function openSstcFree() {

    if (!frSessionOk()) {
        return;
    }

    const section = frEl("sstcFreeSection");
    const button = frEl("sstcFreeBtn");

    if (!section) {
        return;
    }

    if (!sstcFreeRendered) {
        renderSstcFreeList();
    }

    section.hidden = false;

    if (button) {
        button.setAttribute("aria-expanded", "true");
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSstcFree() {

    const section = frEl("sstcFreeSection");
    const button = frEl("sstcFreeBtn");

    closeSstcFreeViewer();

    if (section) {
        section.hidden = true;
    }

    if (button) {
        button.setAttribute("aria-expanded", "false");
    }
}


/* =========================================================
   OPEN A CHAPTER  (HTML file iframe me)
   ========================================================= */

function openSstcFreeChapter(index) {

    if (!frSessionOk()) {
        return;
    }

    const chapter = SSTC_FREE_CHAPTERS[index];

    if (!chapter || !chapter.file) {
        return;
    }

    const viewer = frEl("frViewer");
    const frame = frEl("frFrame");

    if (!viewer || !frame) {
        return;
    }

    sstcFreeIndex = index;

    frame.src = encodeURI(chapter.file);

    frEl("frViewerTitle").textContent = chapter.title;
    frEl("frViewerMeta").textContent =
        "Chapter " + chapter.number + " of " + SSTC_FREE_CHAPTERS.length;

    viewer.hidden = false;

    document.querySelectorAll("#frList .fr-card").forEach(function (card) {

        card.classList.toggle(
            "active",
            Number(card.getAttribute("data-index")) === index
        );
    });

    frEl("frPrev").disabled = index <= 0;
    frEl("frNext").disabled = index >= SSTC_FREE_CHAPTERS.length - 1;

    viewer.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sstcFreeStep(direction) {

    if (sstcFreeIndex < 0) {
        return;
    }

    const next = sstcFreeIndex + direction;

    if (next < 0 || next >= SSTC_FREE_CHAPTERS.length) {
        return;
    }

    openSstcFreeChapter(next);
}

function closeSstcFreeViewer() {

    const viewer = frEl("frViewer");
    const frame = frEl("frFrame");

    if (frIsFullscreen()) {
        sstcFreeFullscreen();
    }

    if (frame) {
        frame.src = "about:blank";
    }

    if (viewer) {
        viewer.hidden = true;
    }

    sstcFreeIndex = -1;

    document.querySelectorAll("#frList .fr-card").forEach(function (card) {
        card.classList.remove("active");
    });
}


/* =========================================================
   FULLSCREEN  (iPhone jaise browsers ke liye fallback ke saath)
   ========================================================= */

function sstcFreeFullscreen() {

    const wrap = frEl("frFrameWrap");

    if (!wrap) {
        return;
    }

    if (wrap.classList.contains("fr-pseudo-fs")) {
        wrap.classList.remove("fr-pseudo-fs");
        document.body.classList.remove("sstc-modal-open");
        return;
    }

    if (document.fullscreenElement || document.webkitFullscreenElement) {

        const exit = document.exitFullscreen || document.webkitExitFullscreen;

        if (exit) { exit.call(document); }

        return;
    }

    const request = wrap.requestFullscreen || wrap.webkitRequestFullscreen;

    const usePseudo = function () {
        wrap.classList.add("fr-pseudo-fs");
        document.body.classList.add("sstc-modal-open");
    };

    if (!request) {
        usePseudo();
        return;
    }

    try {

        const result = request.call(wrap);

        if (result && result.catch) {
            result.catch(usePseudo);
        }
    }
    catch (error) {
        usePseudo();
    }
}

document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") {
        return;
    }

    const wrap = frEl("frFrameWrap");

    if (wrap && wrap.classList.contains("fr-pseudo-fs")) {
        wrap.classList.remove("fr-pseudo-fs");
        document.body.classList.remove("sstc-modal-open");
    }
});


/* =========================================================
   INIT + EXPOSE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    renderSstcFreeList();
});

window.toggleSstcFree = toggleSstcFree;
window.openSstcFree = openSstcFree;
window.closeSstcFree = closeSstcFree;
window.openSstcFreeChapter = openSstcFreeChapter;
window.sstcFreeStep = sstcFreeStep;
window.closeSstcFreeViewer = closeSstcFreeViewer;
window.sstcFreeFullscreen = sstcFreeFullscreen;
