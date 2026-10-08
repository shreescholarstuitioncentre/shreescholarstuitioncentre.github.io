/* =========================================================
   SSTC NOTES SECTION  (student-notes.js)
   - Subject cards -> Chapters (English / Hindi naam) -> Notes viewer
   - Medium toggle: English Medium / Hindi Medium
   - Print / Save as PDF
   - RENT logic (student-page.js jaisa): Chapter 1 FREE, baaki ke
     liye 3 / 6 / 12 month rent -> Google Sheet ke "NotesRentals" tab me
   - student-page.js ke functions use karta hai, isliye uske BAAD load karein
   ========================================================= */

/* Notes ki HTML files ka base folder */
const SSTC_NOTES_BASE = "notes";

/* true = Chapter 1 free, baaki notes rent par | false = sab free */
const SSTC_NOTES_REQUIRE_RENT = true;

/*
 * Kisi chapter ki file ka naam alag ho to yahan likhein.
 * Key: "class|Subject|chapterNumber|medium"
 * Example: "10|Science|1|english": "notes/my-science-1.html"
 */
const SSTC_NOTES_FILES = {};

/* Display ke liye (asli price Code.gs ke NOTES_RENT_PLANS se aata hai) */
/* student-page.js ke SSTC_RENT_NOTES_PLANS se single-subject plans (69 / 99 / 149) */

const SSTC_NOTES_DEFAULT_PLANS = SSTC_RENT_NOTES_PLANS.filter(function (plan) {
    return !plan.bundle;
});

const SSTC_NOTES_MEDIUM_KEY = "sstcNotesMedium";


/* ---------- state ---------- */

let ntRentals = [];
let ntRentalsLoaded = false;
let ntRentalsError = "";
let ntRequiresApproval = true;
let ntPlans = SSTC_NOTES_DEFAULT_PLANS.slice();

let ntMedium = sessionStorage.getItem(SSTC_NOTES_MEDIUM_KEY) === "hindi" ? "hindi" : "english";
let ntSubject = "";
let ntChapterIdx = -1;
let ntFrameOK = false;
let ntBusy = false;
let ntReady = false;
let ntModalSubject = "";
let ntModalMonths = 0;
let ntPaySelected = new Set();


/* ---------- helpers ---------- */

function ntEl(id) {
    return document.getElementById(id);
}

function ntClassNumber() {
    return normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );
}

function ntLibrary() {
    return SSTC_EBOOKS[ntClassNumber()] || null;
}

/* "Chapter 1: X / अध्याय 1: Y"  ->  { en, hi } */
function ntSplitTitle(title) {

    const text = String(title || "").trim();
    const index = text.search(/\s+[\/*]\s+(?=[\u0900-\u097F])/);

    if (index === -1) {
        return { en: text, hi: text };
    }

    const en = text.substring(0, index).trim();
    const hi = text.substring(index).replace(/^\s+[\/*]\s+/, "").trim();

    return { en: en, hi: hi || en };
}

function ntPad(n) {
    return Number(n) < 10 ? "0" + Number(n) : String(n);
}

/* notes/class-10/science/chapter-01-en.html (ya ...-hi.html) */
function ntFileFor(subjectName, subject, chapter, medium) {

    const cls = ntClassNumber();
    const key = cls + "|" + subjectName + "|" + chapter.number + "|" + medium;

    if (SSTC_NOTES_FILES[key]) {
        return SSTC_NOTES_FILES[key];
    }

    let slug = normalizeSubjectKey(subjectName).replace(/\s+/g, "-");

    const firstPdf = subject.chapters && subject.chapters[0] && subject.chapters[0].pdf;

    if (firstPdf) {

        const parts = String(firstPdf).split("/");

        if (parts.length >= 3) {
            slug = parts[2];
        }
    }

    return (
        SSTC_NOTES_BASE + "/class-" + cls + "/" + slug +
        "/chapter-" + ntPad(chapter.number) +
        (medium === "hindi" ? "-hi" : "-en") + ".html"
    );
}

function ntPlanByMonths(months) {

    for (let i = 0; i < ntPlans.length; i++) {
        if (Number(ntPlans[i].months) === Number(months)) {
            return ntPlans[i];
        }
    }

    return null;
}


/* ---------- rent state ---------- */

function ntState(subjectName) {

    const key = normalizeSubjectKey(subjectName);
    const priority = { active: 3, pending: 2, expired: 1 };

    let best = null;
    let bestStatus = "none";
    let bestScore = 0;

    ntRentals.forEach(function (rental) {

        if (normalizeSubjectKey(rental.subject) !== key) {
            return;
        }

        let status = String(rental.status || "").toLowerCase();

        if (status === "active" && rental.expiryDate) {

            const expiry = new Date(rental.expiryDate);

            if (!isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()) {
                status = "expired";
            }
        }

        const score = priority[status] || 0;

        if (score > bestScore) {
            best = rental;
            bestStatus = status;
            bestScore = score;
        }
    });

    return { status: bestStatus, rental: best };
}

/* Chapter 1 hamesha free (free preview), baaki ke liye active rent chahiye */
function ntCanRead(subjectName, index) {

    if (!SSTC_NOTES_REQUIRE_RENT) {
        return true;
    }

    if (Number(index) === 0) {
        return true;
    }

    return ntState(subjectName).status === "active";
}

function ntPending() {

    return ntRentals.filter(function (rental) {
        return String(rental.status || "").toLowerCase() === "pending";
    });
}


/* ---------- server (Google Sheet: NotesRentals) ---------- */

function ntApplyResult(result) {

    ntRentals = Array.isArray(result.rentals) ? result.rentals : [];

    if (Array.isArray(result.plans) && result.plans.length) {

        /* Bundle plans modal me nahi dikhane - woh total me apne-aap lagte hain */
        const singles = result.plans.filter(function (plan) {
            return !plan.bundle;
        });

        if (singles.length) {
            ntPlans = singles;
        }
    }

    if (typeof result.requiresApproval === "boolean") {
        ntRequiresApproval = result.requiresApproval;
    }
}


function ntSetStatus(state, detail) {

    const box = ntEl("ntRentStatus");

    if (!box) {
        return;
    }

    box.classList.toggle("error", state === "error");

    if (state === "loading") {
        box.textContent = "⏳ Loading your notes rentals…";
    }
    else if (state === "error") {
        box.textContent = "⚠ " + String(detail || "Could not load").substring(0, 110) + " – tap to retry";
    }
    else {
        box.textContent = "";
    }
}

async function ntLoadRentals() {

    ntSetStatus("loading");

    try {

        const result = await callRentalApi("getnotesrentals");

        expectResultType(result, "notesrentals");

        ntApplyResult(result);

        ntRentalsLoaded = true;
        ntRentalsError = "";

        ntSetStatus("idle");
    }
    catch (error) {

        ntRentalsError = error.message || "error";

        ntSetStatus("error", error.message);

        console.error("SSTC notes rentals load error:", error);
    }

    ntRefresh();
}


/* ---------- init ---------- */

function ntInit() {

    if (!studentData || !ntEl("ntSubjects") || ntReady) {
        return;
    }

    ntReady = true;

    const library = ntLibrary();

    ntUpdateMediumButtons();
    ntBuildPanel();
    ntEnsureModals();
    ntSetWatermark();

    setText("ntClassLabel", ntClassNumber() ? "• Class " + ntClassNumber() : "");

    if (!library) {

        ntEl("ntSubjects").innerHTML =
            '<div class="nt-empty" style="grid-column:1/-1"><div>📝</div><h4>No Notes Available</h4><p>Your class notes are not available yet.</p></div>';

        return;
    }

    ntRenderSubjects(library);
    ntRefresh();
    ntLoadRentals();
}

/* "My Notes Rentals" panel - JS khud banata hai (HTML me kuch nahi chahiye) */

function ntBuildPanel() {

    if (ntEl("ntRentPanel")) {
        return;
    }

    const firstStep = document.querySelector("#sstcNotesSection .nt-step");

    if (!firstStep) {
        return;
    }

    const panel = document.createElement("div");
    panel.className = "nt-rent-panel";
    panel.id = "ntRentPanel";

    panel.innerHTML =
        '<div>' +
            '<div class="nt-rent-title">🔑 My Notes Rentals <span class="nt-rent-count" id="ntRentCount">0</span></div>' +
            '<div class="nt-rent-chips" id="ntRentChips"></div>' +
            '<button type="button" class="nt-pay-btn" id="ntPayBtn" hidden></button>' +
        '</div>' +
        '<span class="nt-rent-status" id="ntRentStatus" role="status"></span>';

    firstStep.parentNode.insertBefore(panel, firstStep);

    ntEl("ntPayBtn").addEventListener("click", ntOpenPay);

    ntEl("ntRentStatus").addEventListener("click", function () {

        if (this.classList.contains("error")) {
            ntLoadRentals();
        }
    });
}

/* Notes viewer par Student ID ka halka watermark */

function ntSetWatermark() {

    const overlay = ntEl("ntOverlay");

    if (!overlay) {
        return;
    }

    const id = escapeHtml(getStudentValue(["studentId", "id"], "SSTC"));

    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220">' +
        '<text x="30" y="130" transform="rotate(-28 160 110)" ' +
        'font-family="Arial" font-size="20" font-weight="700" fill="rgba(15,118,110,0.18)">' +
        'SSTC • ' + id + '</text></svg>';

    overlay.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
}


/* ---------- subject cards ---------- */

function ntRenderSubjects(library) {

    const box = ntEl("ntSubjects");

    box.innerHTML = "";

    Object.keys(library).forEach(function (subjectName) {

        const subject = library[subjectName];

        const card = document.createElement("div");
        card.className = "nt-subject";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("data-subject", subjectName);
        card.setAttribute("data-rent", "none");

        card.addEventListener("click", function () {
            ntSelectSubject(subjectName);
        });

        card.addEventListener("keydown", function (event) {

            if (event.target !== card) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                ntSelectSubject(subjectName);
            }
        });

        const imgWrap = document.createElement("div");
        imgWrap.className = "nt-subject-img";

        const img = document.createElement("img");
        img.src = subject.image || "Logo.png";
        img.alt = subjectName + " Notes";
        img.draggable = false;
        img.loading = "lazy";

        img.onerror = function () {
            this.onerror = null;
            this.src = "Logo.png";
        };

        imgWrap.appendChild(img);

        const body = document.createElement("div");
        body.className = "nt-subject-body";

        const tag = document.createElement("span");
        tag.className = "nt-subject-tag";
        tag.textContent = "NOTES";

        const title = document.createElement("h4");
        title.textContent = subjectName;

        const count = document.createElement("span");
        count.className = "nt-subject-count";
        count.textContent = (Array.isArray(subject.chapters) ? subject.chapters.length : 0) + " Chapters";

        const rentBtn = document.createElement("button");
        rentBtn.type = "button";
        rentBtn.className = "nt-subject-rent";

        ntFillRentButton(rentBtn, subjectName);

        rentBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            ntOpenRent(subjectName);
        });

        body.appendChild(tag);
        body.appendChild(title);
        body.appendChild(count);
        body.appendChild(rentBtn);

        card.appendChild(imgWrap);
        card.appendChild(body);

        box.appendChild(card);
    });
}

function ntFillRentButton(button, subjectName) {

    const state = ntState(subjectName);

    let text = "🔑 Rent Notes";

    if (state.status === "active") {

        const days = getRentalDaysLeft(state.rental);

        text = (days !== null && days > 0)
            ? "✓ Rented · " + days + (days === 1 ? " day left" : " days left")
            : "✓ Rented";
    }
    else if (state.status === "pending") {
        text = "⏳ Rent Pending";
    }
    else if (state.status === "expired") {
        text = "↻ Renew Notes";
    }

    button.textContent = text;
    button.setAttribute("data-rent", state.status);
}

/* Rental badalne par saari UI refresh */

function ntRefresh() {

    document.querySelectorAll(".nt-subject").forEach(function (card) {

        const name = card.getAttribute("data-subject");

        card.setAttribute("data-rent", ntState(name).status);

        const button = card.querySelector(".nt-subject-rent");

        if (button) {
            ntFillRentButton(button, name);
        }
    });

    ntRenderChips();
    ntUpdatePayBtn();

    if (ntSubject) {
        ntRenderChapters();
    }
}

function ntRenderChips() {

    const box = ntEl("ntRentChips");
    const library = ntLibrary();

    if (!box) {
        return;
    }

    const names = library
        ? Object.keys(library).filter(function (name) {
            return ntState(name).status !== "none";
        })
        : [];

    setText("ntRentCount", names.length);
    ntEl("ntRentCount").textContent = String(names.length);

    box.innerHTML = "";

    if (names.length === 0) {

        const empty = document.createElement("span");
        empty.className = "nt-rent-empty";
        empty.textContent = ntRentalsLoaded
            ? "You have not rented any notes yet. Chapter 1 of every subject is free."
            : "Your rented notes will appear here.";

        box.appendChild(empty);
        return;
    }

    names.forEach(function (name) {

        const state = ntState(name);

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "nt-chip";
        chip.setAttribute("data-rent", state.status);

        const label = document.createElement("strong");
        label.textContent = name;

        const info = document.createElement("small");

        if (state.status === "active") {

            const days = getRentalDaysLeft(state.rental);

            info.textContent = (days !== null && days > 0)
                ? days + (days === 1 ? " day left" : " days left")
                : "Active";
        }
        else if (state.status === "pending") {
            info.textContent = "⏳ Pending";
        }
        else {
            info.textContent = "⌛ Expired";
        }

        chip.appendChild(label);
        chip.appendChild(info);

        chip.addEventListener("click", function () {
            ntOpenRent(name);
        });

        box.appendChild(chip);
    });
}

function ntUpdatePayBtn() {

    const button = ntEl("ntPayBtn");

    if (!button) {
        return;
    }

    const pending = ntPending();

    if (pending.length === 0) {
        button.hidden = true;
        return;
    }

    const total = calculateSstcNotesRentalTotal(pending);

    button.hidden = false;

    button.textContent =
        "💳 Pay Now · ₹" + total +
        " (" + pending.length + (pending.length === 1 ? " subject" : " subjects") + ")";
}


/* ---------- subject / medium ---------- */

function ntSelectSubject(subjectName) {

    const library = ntLibrary();
    const subject = library ? library[subjectName] : null;

    if (!subject) {
        return;
    }

    ntSubject = subjectName;
    ntChapterIdx = -1;

    document.querySelectorAll(".nt-subject").forEach(function (card) {
        card.classList.toggle("active", card.getAttribute("data-subject") === subjectName);
    });

    closeSstcNotesViewer();
    ntRenderChapters();

    const step = ntEl("ntChapterStep");

    if (step && step.scrollIntoView) {
        step.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function ntUpdateMediumButtons() {

    document.querySelectorAll(".nt-medium button").forEach(function (button) {

        const active = button.getAttribute("data-medium") === ntMedium;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
}

function setSstcNotesMedium(medium) {

    ntMedium = medium === "hindi" ? "hindi" : "english";

    sessionStorage.setItem(SSTC_NOTES_MEDIUM_KEY, ntMedium);

    ntUpdateMediumButtons();

    if (!ntSubject) {
        return;
    }

    ntRenderChapters();

    /* Chapter khula ho to wahi chapter dusre medium me kholo */
    if (ntChapterIdx > -1) {
        ntOpenChapter(ntChapterIdx);
    }
}


/* ---------- chapters ---------- */

function ntBanner(subjectName) {

    if (!SSTC_NOTES_REQUIRE_RENT) {
        return null;
    }

    const state = ntState(subjectName);

    const banner = document.createElement("div");
    banner.className = "chapter-rent-banner";
    banner.style.marginBottom = "4px";

    const text = document.createElement("span");

    let actionLabel = "";

    if (!ntRentalsLoaded) {

        banner.setAttribute("data-rent", "loading");

        text.textContent = ntRentalsError
            ? "⚠ Could not check your notes rentals."
            : "⏳ Checking your notes rentals…";
    }
    else if (state.status === "active") {

        const days = getRentalDaysLeft(state.rental);

        banner.setAttribute("data-rent", "active");

        text.textContent = "✓ Notes rented – valid till " +
            formatRentDate(state.rental && state.rental.expiryDate) +
            ((days !== null && days > 0) ? " (" + days + (days === 1 ? " day" : " days") + " left)" : "");

        actionLabel = "Details";
    }
    else if (state.status === "pending") {

        banner.setAttribute("data-rent", "pending");

        text.textContent = "⏳ Your notes rent request is pending. Chapter 1 is free; the rest unlock after SSTC confirms your payment.";

        actionLabel = "View Request";
    }
    else if (state.status === "expired") {

        banner.setAttribute("data-rent", "expired");

        text.textContent = "⌛ Your notes rental has expired. Chapter 1 is still free — renew to keep reading.";

        actionLabel = "Renew";
    }
    else {

        banner.setAttribute("data-rent", "none");

        text.textContent = "📝 Chapter 1 notes are free. Rent this subject's notes to unlock the rest.";

        actionLabel = "Rent Now";
    }

    banner.appendChild(text);

    if (actionLabel) {

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = actionLabel;

        button.addEventListener("click", function () {
            ntOpenRent(subjectName);
        });

        banner.appendChild(button);
    }

    return banner;
}

function ntRenderChapters() {

    const box = ntEl("ntChapters");
    const library = ntLibrary();
    const subject = library ? library[ntSubject] : null;

    if (!box) {
        return;
    }

    box.innerHTML = "";

    if (!subject || !Array.isArray(subject.chapters) || subject.chapters.length === 0) {

        box.innerHTML =
            '<div class="nt-empty"><div>📝</div><h4>Select a Subject</h4><p>Chapters will appear here.</p></div>';

        return;
    }

    setText(
        "ntChapterTitle",
        ntSubject + " — " + (ntMedium === "hindi" ? "अध्याय चुनिए" : "Choose a chapter")
    );

    const banner = ntBanner(ntSubject);

    if (banner) {
        box.appendChild(banner);
    }

    subject.chapters.forEach(function (chapter, index) {

        const names = ntSplitTitle(chapter.title);

        const item = document.createElement("button");
        item.type = "button";
        item.className = "nt-chapter" + (index === ntChapterIdx ? " active" : "");

        item.addEventListener("click", function () {
            ntOpenChapter(index);
        });

        const no = document.createElement("div");
        no.className = "nt-chapter-no";
        no.textContent = String(chapter.number);

        const info = document.createElement("div");

        const title = document.createElement("div");
        title.className = "nt-chapter-title";
        title.textContent = ntMedium === "hindi" ? names.hi : names.en;

        info.appendChild(title);

        if (index === 0 && SSTC_NOTES_REQUIRE_RENT) {

            const free = document.createElement("span");
            free.className = "nt-free";
            free.textContent = "FREE PREVIEW";

            info.appendChild(free);
        }

        const open = document.createElement("span");
        open.className = "nt-chapter-open";

        if (ntCanRead(ntSubject, index)) {
            open.textContent = ntMedium === "hindi" ? "नोट्स खोलें →" : "Open Notes →";
        }
        else {
            open.classList.add("locked");
            open.textContent = "🔒 Rent to read";
        }

        item.appendChild(no);
        item.appendChild(info);
        item.appendChild(open);

        box.appendChild(item);
    });
}


/* ---------- viewer ---------- */

async function ntOpenChapter(index) {

    const library = ntLibrary();
    const subject = library ? library[ntSubject] : null;
    const chapter = subject && subject.chapters ? subject.chapters[index] : null;

    if (!chapter) {
        return;
    }

    if (!ntCanRead(ntSubject, index)) {

        showSstcToast(
            ntRentalsLoaded
                ? "Rent " + ntSubject + " notes to read this chapter."
                : "Checking your rentals… please try again in a moment.",
            "info"
        );

        if (ntRentalsLoaded) {
            ntOpenRent(ntSubject);
        }
        else if (ntRentalsError) {
            ntLoadRentals();
        }

        return;
    }

    ntChapterIdx = index;
    ntRenderChapters();

    const names = ntSplitTitle(chapter.title);
    const titleText = ntMedium === "hindi" ? names.hi : names.en;
    const url = ntFileFor(ntSubject, subject, chapter, ntMedium);

    const viewer = ntEl("ntViewer");
    const frame = ntEl("ntFrame");

    viewer.hidden = false;

    setText("ntViewerTitle", titleText);
    setText(
        "ntViewerMeta",
        ntSubject + " • " + (ntMedium === "hindi" ? "Hindi Medium" : "English Medium") + " • Chapter " + chapter.number
    );

    ntEl("ntPrev").disabled = index <= 0;
    ntEl("ntNext").disabled = index >= subject.chapters.length - 1;

    /* File hai ya nahi - pehle check */
    let exists = true;

    try {
        const response = await fetch(url, { method: "HEAD", cache: "no-store" });
        exists = response.ok;
    }
    catch (error) {
        exists = true;
    }

    if (!exists) {

        ntFrameOK = false;

        frame.srcdoc =
            '<body style="font-family:Arial;text-align:center;padding:60px 20px;color:#064e48;">' +
            '<div style="font-size:46px">🚧</div>' +
            '<h3>' + (ntMedium === "hindi" ? "नोट्स अभी उपलब्ध नहीं हैं" : "Notes are not available yet") + '</h3>' +
            '<p style="color:#5f7370">' + escapeHtml(titleText) + '</p></body>';
    }
    else {

        ntFrameOK = true;

        frame.removeAttribute("srcdoc");
        frame.src = url;
    }

    setTimeout(function () {
        viewer.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
}

function sstcNotesStep(direction) {

    const library = ntLibrary();
    const subject = library ? library[ntSubject] : null;

    if (!subject || ntChapterIdx < 0) {
        return;
    }

    const next = ntChapterIdx + direction;

    if (next < 0 || next >= subject.chapters.length) {
        return;
    }

    ntOpenChapter(next);
}

/* Print / Download PDF  (Download = print window me "Save as PDF") */

function sstcNotesPrint(isDownload) {

    const frame = ntEl("ntFrame");

    if (!frame || !ntFrameOK) {
        showSstcToast("Pehle koi chapter kholiye.", "info");
        return;
    }

    try {

        const library = ntLibrary();
        const chapter = library && library[ntSubject] ? library[ntSubject].chapters[ntChapterIdx] : null;

        if (chapter && frame.contentDocument) {

            const names = ntSplitTitle(chapter.title);

            frame.contentDocument.title =
                "SSTC - " + ntSubject + " - " + (ntMedium === "hindi" ? names.hi : names.en);
        }

        if (isDownload) {
            showSstcToast("Print window me Destination: “Save as PDF” chuniye.", "info");
        }

        frame.contentWindow.focus();

        setTimeout(function () {
            frame.contentWindow.print();
        }, isDownload ? 900 : 0);
    }
    catch (error) {

        console.error("SSTC notes print error:", error);

        showSstcToast("Print nahi ho paya. Dobara try kijiye.", "info");
    }
}

function sstcNotesFullscreen() {

    const wrap = document.querySelector("#ntViewer .nt-frame-wrap");

    if (!wrap) {
        return;
    }

    if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
    }

    if (wrap.requestFullscreen) {

        wrap.requestFullscreen().catch(function (error) {
            console.warn("Fullscreen unavailable:", error);
        });
    }
}

function closeSstcNotesViewer() {

    const viewer = ntEl("ntViewer");
    const frame = ntEl("ntFrame");

    ntChapterIdx = -1;
    ntFrameOK = false;

    if (frame) {
        frame.removeAttribute("srcdoc");
        frame.src = "about:blank";
    }

    if (viewer) {
        viewer.hidden = true;
    }

    if (ntSubject) {
        ntRenderChapters();
    }
}


/* ---------- open / close notes section ---------- */

function toggleSstcNotes() {

    const section = ntEl("sstcNotesSection");

    if (section && !section.hidden) {
        closeSstcNotes();
        return;
    }

    openSstcNotesSection();
}

function openSstcNotesSection() {

    /* Login nahi hai to checkStudentSession() khud access page par bhej deta hai */
    if (!checkStudentSession()) {
        return;
    }

    if (sstcSessionEnding || sstcLoggingOut) {
        return;
    }

    const section = ntEl("sstcNotesSection");
    const button = ntEl("sstcNotesBtn");

    if (!section) {
        return;
    }

    ntInit();

    section.hidden = false;

    if (button) {
        button.setAttribute("aria-expanded", "true");
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSstcNotes() {

    const section = ntEl("sstcNotesSection");
    const button = ntEl("sstcNotesBtn");

    closeSstcNotesViewer();
    ntCloseModals();

    if (section) {
        section.hidden = true;
    }

    if (button) {
        button.setAttribute("aria-expanded", "false");
    }
}


/* =========================================================
   RENT WINDOW + PAY WINDOW  (JS khud banata hai)
   ========================================================= */

function ntEnsureModals() {

    if (ntEl("ntRentModal")) {
        return;
    }

    const wrap = document.createElement("div");

    wrap.innerHTML =

        /* ---------- Rent window ---------- */
        '<div class="sstc-rent-modal" id="ntRentModal" hidden>' +
            '<div class="sstc-rent-backdrop" data-nt-close="rent"></div>' +
            '<div class="sstc-rent-dialog" role="dialog" aria-modal="true" aria-labelledby="ntRentTitle">' +
                '<button type="button" class="sstc-rent-close" data-nt-close="rent" aria-label="Close">✕</button>' +
                '<div class="sstc-rent-head">' +
                    '<div class="sstc-rent-head-icon">📝</div>' +
                    '<div><h3 id="ntRentTitle">Rent Notes</h3>' +
                    '<p id="ntRentSub">Choose how long you want to rent these notes.</p></div>' +
                '</div>' +
                '<p class="sstc-rent-success" id="ntRentSuccess" hidden></p>' +
                '<div class="sstc-rent-plans" id="ntRentPlans" role="radiogroup" aria-label="Notes rental plans"></div>' +
                '<div class="sstc-rent-details" id="ntRentDetails" hidden></div>' +
                '<p class="sstc-rent-note" id="ntRentNote"></p>' +
                '<p class="sstc-rent-error" id="ntRentError" role="alert" hidden></p>' +
                '<div class="sstc-rent-actions">' +
                    '<button type="button" class="sstc-rent-btn secondary" data-nt-close="rent">Close</button>' +
                    '<button type="button" class="sstc-rent-btn danger" id="ntRentCancelBtn" hidden>Cancel Request</button>' +
                    '<button type="button" class="sstc-rent-btn primary" id="ntRentConfirmBtn" disabled>Choose a plan</button>' +
                '</div>' +
            '</div>' +
        '</div>' +

        /* ---------- Pay window ---------- */
        '<div class="sstc-rent-modal" id="ntPayModal" hidden>' +
            '<div class="sstc-rent-backdrop" data-nt-close="pay"></div>' +
            '<div class="sstc-rent-dialog" role="dialog" aria-modal="true" style="max-width:420px;">' +
                '<button type="button" class="sstc-rent-close" data-nt-close="pay" aria-label="Close">✕</button>' +
                '<div class="sstc-rent-head">' +
                    '<div class="sstc-rent-head-icon">💳</div>' +
                    '<div><h3>Pay Now · Notes</h3><p>Select subjects and complete payment via UPI.</p></div>' +
                '</div>' +
                '<div id="ntPayList" style="display:flex;flex-direction:column;gap:8px;margin:14px 0;"></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f1f5f9;border-radius:10px;font-weight:700;font-size:16px;margin-bottom:14px;">' +
                    '<span>Total Amount</span><strong id="ntPayTotal">₹0</strong>' +
                '</div>' +
                '<div id="ntPaySection" style="border-top:1px dashed #cbd5e1;padding-top:14px;">' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>Student ID</span><strong id="ntPayStudent">-</strong></div>' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px;gap:8px;"><span>UPI ID</span><strong id="ntPayUpi">-</strong>' +
                    '<button type="button" onclick="copyUpiId()" style="border:0;background:#e2e8f0;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px;">Copy</button></div>' +
                    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:12px;gap:8px;"><span>Note</span><strong id="ntPayNote" style="text-align:right;">-</strong></div>' +
                    '<div style="text-align:center;"><img id="ntPayQr" hidden alt="UPI QR Code" style="width:180px;height:180px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;"></div>' +
                    '<a id="ntPayLink" href="#" target="_blank" rel="noopener" style="display:block;text-align:center;background:#4f46e5;color:#fff;text-decoration:none;padding:11px;border-radius:8px;font-weight:700;margin-bottom:10px;">📲 Pay via UPI App</a>' +
                    '<div style="margin:12px 0;padding:12px 14px;border-radius:12px;background:#fff7e6;border:1.5px solid #f59e0b;color:#7c2d12;font-size:13px;line-height:1.5;">' +
                        '<p style="margin:0 0 8px;"><strong>⚠️ IMPORTANT: After your payment is successful, please share the payment screenshot on WhatsApp at ' +
                        '<a href="https://wa.me/91' + SSTC_PAYMENT_WHATSAPP + '" target="_blank" rel="noopener" style="color:#15803d;text-decoration:underline;">' + SSTC_PAYMENT_WHATSAPP + '</a>.</strong></p>' +
                        '<p style="margin:0;"><strong>⚠️ ज़रूरी सूचना: पेमेंट सफल होने के बाद, पेमेंट का स्क्रीनशॉट WhatsApp नंबर ' +
                        '<a href="https://wa.me/91' + SSTC_PAYMENT_WHATSAPP + '" target="_blank" rel="noopener" style="color:#15803d;text-decoration:underline;">' + SSTC_PAYMENT_WHATSAPP + '</a> पर ज़रूर भेजें।</strong></p>' +
                    '</div>' +
                '</div>' +
                '<p id="ntPayEmpty" hidden style="font-size:13px;color:#b91c1c;">UPI payment is not set up yet. Please contact SSTC administration.</p>' +
                '<div class="sstc-rent-actions">' +
                    '<button type="button" class="sstc-rent-btn secondary" data-nt-close="pay">Close</button>' +
                    '<button type="button" class="sstc-rent-btn primary" id="ntPayConfirm">✅ I Have Paid</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    while (wrap.firstChild) {
        document.body.appendChild(wrap.firstChild);
    }

    document.querySelectorAll("[data-nt-close]").forEach(function (el) {

        el.addEventListener("click", function () {

            if (el.getAttribute("data-nt-close") === "pay") {
                ntClosePay();
            }
            else {
                ntCloseRent();
            }
        });
    });

    ntEl("ntRentConfirmBtn").addEventListener("click", ntConfirmRent);
    ntEl("ntRentCancelBtn").addEventListener("click", ntCancelRent);
    ntEl("ntPayConfirm").addEventListener("click", ntClaimPayment);

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            ntCloseModals();
        }
    });
}

function ntCloseModals() {
    ntCloseRent();
    ntClosePay();
}

function ntShowRentError(message) {

    const box = ntEl("ntRentError");

    box.textContent = message || "";
    box.hidden = !message;
}


/* ---------- rent window ---------- */

function ntOpenRent(subjectName) {

    ntEnsureModals();

    ntModalSubject = subjectName;
    ntModalMonths = 0;

    const state = ntState(subjectName);

    if (state.status === "pending" || state.status === "active") {
        ntRenderDetails(state.rental, state.status, "");
    }
    else {
        ntRenderPlans(subjectName, state.status === "expired");
    }

    ntEl("ntRentModal").hidden = false;
    document.body.classList.add("sstc-modal-open");
}

function ntCloseRent() {

    const modal = ntEl("ntRentModal");

    if (!modal || modal.hidden) {
        return;
    }

    modal.hidden = true;

    const pay = ntEl("ntPayModal");

    if (!pay || pay.hidden) {
        document.body.classList.remove("sstc-modal-open");
    }
}

function ntRenderPlans(subjectName, isRenew) {

    setText("ntRentTitle", (isRenew ? "Renew " : "Rent ") + subjectName + " Notes");
    setText("ntRentSub", "Choose how long you want to rent these notes.");

    const plansBox = ntEl("ntRentPlans");
    const confirm = ntEl("ntRentConfirmBtn");

    plansBox.hidden = false;
      ntEnsureBundleOffer();
    ntEl("ntRentDetails").hidden = true;
    ntEl("ntRentSuccess").hidden = true;
    ntEl("ntRentCancelBtn").hidden = true;

    plansBox.innerHTML = "";

    ntPlans.forEach(function (plan) {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "sstc-rent-plan";
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("data-months", String(plan.months));

        const main = document.createElement("span");
        main.className = "sstc-rent-plan-main";

        const label = document.createElement("strong");
        label.textContent = plan.label;

        const perMonth = document.createElement("small");
        perMonth.textContent = "≈ ₹" + Math.round(plan.price / plan.months) + " / month";

        main.appendChild(label);
        main.appendChild(perMonth);

        const price = document.createElement("span");
        price.className = "sstc-rent-plan-price";
        price.textContent = "₹" + plan.price;

        button.appendChild(main);
        button.appendChild(price);

        const tagText = getPlanTag(plan.months);

        if (tagText) {

            const tag = document.createElement("em");
            tag.className = "sstc-rent-plan-tag";
            tag.textContent = tagText;

            button.appendChild(tag);
        }

        button.addEventListener("click", function () {
            ntSelectPlan(plan.months);
        });

        plansBox.appendChild(button);
    });

    confirm.hidden = false;
    confirm.disabled = true;
    confirm.textContent = "Choose a plan";

    setText(
        "ntRentNote",
        ntRequiresApproval
            ? "Your rental starts after SSTC confirms your payment."
            : "Your rental starts immediately."
    );

    ntShowRentError("");
}


function ntEnsureBundleOffer() {

    const plansBox = ntEl("ntRentPlans");

    if (!plansBox) {
        return;
    }

    let note = ntEl("ntBundleOffer");

    if (!note) {

        note = document.createElement("div");
        note.id = "ntBundleOffer";

        note.style.cssText = [
            "margin-top:10px",
            "padding:10px 12px",
            "border-radius:10px",
            "background:#ecfdf5",
            "border:1.5px dashed #10b981",
            "color:#065f46",
            "font-size:12.5px",
            "line-height:1.5",
            "text-align:left"
        ].join(";");

        plansBox.insertAdjacentElement("afterend", note);
    }

    const b6 = getSstcBundleNotesPlan(6);
    const b12 = getSstcBundleNotesPlan(12);

    note.innerHTML =
        "🎁 <strong>Any 6 Subject Notes Offer:</strong><br>" +
        "6 Months · ₹" + b6.price + " <s>₹" + b6.actualPrice + "</s><br>" +
        "12 Months · ₹" + b12.price + " <s>₹" + b12.actualPrice + "</s><br>" +
        "<small>6 subjects ke notes ek hi duration (6 ya 12 months) me lene par bundle price apne-aap lagegi.</small>";

    note.hidden = false;
}

function ntBundleProgressText(subjectName, months) {

    const bundle = getSstcBundleNotesPlan(months);

    if (!bundle) {
        return "";
    }

    const size = Number(bundle.subjects) || 6;
    const key = normalizeSubjectKey(subjectName);

    const same = ntPending().filter(function (rental) {
        return Number(rental.months) === Number(months) &&
               normalizeSubjectKey(rental.subject) !== key;
    }).length + 1;

    if (same >= size) {
        return " 🎁 Any " + size + " Subject Notes plan lagega: ₹" + bundle.price + " (actual ₹" + bundle.actualPrice + ").";
    }

    return " 🎁 " + same + "/" + size + " notes selected for " + months + " months — " +
        (size - same) + " aur lene par Any " + size + " Subject Notes plan ₹" + bundle.price + " me milega.";
}



function ntSelectPlan(months) {

    const plan = ntPlanByMonths(months);

    if (!plan) {
        return;
    }

    ntModalMonths = Number(months);

    document.querySelectorAll("#ntRentPlans .sstc-rent-plan").forEach(function (button) {

        const selected = Number(button.getAttribute("data-months")) === ntModalMonths;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    const confirm = ntEl("ntRentConfirmBtn");

    confirm.textContent = "Confirm Rent · ₹" + plan.price;
    confirm.disabled = false;

    // setText(
    //     "ntRentNote",
    //     plan.label + " for ₹" + plan.price + ". " +
    //     (ntRequiresApproval
    //         ? "Your rental starts after SSTC confirms your payment. " + SSTC_PAYMENT_HELP
    //         : "Your rental starts immediately.")
    // );
       setText(
        "ntRentNote",
        plan.label + " for ₹" + plan.price + ". " +
        (ntRequiresApproval
            ? "Your rental starts after SSTC confirms your payment. " + SSTC_PAYMENT_HELP
            : "Your rental starts immediately.") +
        ntBundleProgressText(ntModalSubject, months)
    );
}

function ntRenderDetails(rental, status, successText) {

    ntEl("ntRentPlans").hidden = true;
   const offer = ntEl("ntBundleOffer");
if (offer) { offer.hidden = true; }
    ntEl("ntRentConfirmBtn").hidden = true;
    ntEl("ntRentCancelBtn").hidden = status !== "pending";

    const details = ntEl("ntRentDetails");
    const success = ntEl("ntRentSuccess");

    details.hidden = false;
    details.innerHTML = "";

    success.textContent = successText || "";
    success.hidden = !successText;

    ntShowRentError("");

    if (!rental) {
        return;
    }

    setText("ntRentTitle", rental.subject + " Notes");

    const labels = {
        active: "✓ Active",
        pending: "⏳ Pending approval",
        expired: "Expired"
    };

    setText("ntRentSub", labels[status] || "");

    const rows = [
        ["Subject", rental.subject + " (Notes)"],
        ["Plan", rental.plan + " · ₹" + rental.price],
        ["Requested on", formatRentDate(rental.requestedOn)]
    ];

    if (rental.startDate) {
        rows.push(["Started on", formatRentDate(rental.startDate)]);
    }

    if (rental.expiryDate) {

        const days = getRentalDaysLeft(rental);

        rows.push([
            status === "expired" ? "Expired on" : "Valid till",
            formatRentDate(rental.expiryDate) +
                ((status === "active" && days !== null && days > 0)
                    ? " (" + days + (days === 1 ? " day" : " days") + " left)"
                    : "")
        ]);
    }

    rows.forEach(function (pair) {

        const row = document.createElement("div");
        row.className = "sstc-rent-detail-row";

        const label = document.createElement("span");
        label.textContent = pair[0];

        const value = document.createElement("strong");
        value.textContent = pair[1] || "-";

        row.appendChild(label);
        row.appendChild(value);

        details.appendChild(row);
    });

    setText(
        "ntRentNote",
        status === "pending"
            ? SSTC_PAYMENT_HELP
            : (status === "active" ? "You can renew these notes after they expire." : "")
    );
}

async function ntConfirmRent() {

    if (!ntModalSubject || !ntModalMonths || ntBusy) {
        return;
    }

    ntBusy = true;

    const confirm = ntEl("ntRentConfirmBtn");
    const previous = confirm.textContent;

    confirm.disabled = true;
    confirm.textContent = "Sending…";

    ntShowRentError("");

    try {

        const result = await callRentalApi("rentnotes", { subject: ntModalSubject, months: ntModalMonths });

        expectResultType(result, "notes_rent_requested");

        ntApplyResult(result);

        ntRentalsLoaded = true;
        ntRentalsError = "";

        ntSetStatus("idle");
        ntRefresh();

        const state = ntState(ntModalSubject);

        ntRenderDetails(
            state.rental,
            state.status,
            state.status === "active"
                ? "✅ Notes rented successfully!"
                : "✅ Rent request sent! " + SSTC_PAYMENT_HELP
        );
    }
    catch (error) {

        console.error("SSTC notes rent error:", error);

        ntShowRentError(error.message);

        confirm.textContent = previous;
        confirm.disabled = false;
    }
    finally {

        ntBusy = false;
    }
}

async function ntCancelRent() {

    const state = ntState(ntModalSubject);

    if (!state.rental || state.status !== "pending" || ntBusy) {
        return;
    }

    if (!window.confirm("Cancel your notes rent request for " + ntModalSubject + "?")) {
        return;
    }

    ntBusy = true;

    const button = ntEl("ntRentCancelBtn");

    button.disabled = true;

    try {

        const result = await callRentalApi("cancelnotesrental", { rentalId: state.rental.rentalId });

        expectResultType(result, "notes_rental_cancelled");

        ntApplyResult(result);
        ntRefresh();
        ntCloseRent();

        showSstcToast("Notes rent request for " + ntModalSubject + " cancelled.", "info");
    }
    catch (error) {

        console.error("SSTC notes cancel error:", error);

        ntShowRentError(error.message);
    }
    finally {

        ntBusy = false;
        button.disabled = false;
    }
}


/* ---------- pay window ---------- */

function ntOpenPay() {

    ntEnsureModals();

    const pending = ntPending();

    if (pending.length === 0) {
        showSstcToast("No pending notes rent request to pay for.", "info");
        return;
    }

    ntPaySelected = new Set(pending.map(function (rental) {
        return rental.rentalId;
    }));

    ntRenderPayList();
    ntUpdatePayTotal();

    ntEl("ntPayModal").hidden = false;
    document.body.classList.add("sstc-modal-open");
}

function ntClosePay() {

    const modal = ntEl("ntPayModal");

    if (!modal || modal.hidden) {
        return;
    }

    modal.hidden = true;

    const rent = ntEl("ntRentModal");

    if (!rent || rent.hidden) {
        document.body.classList.remove("sstc-modal-open");
    }
}

function ntRenderPayList() {

    const box = ntEl("ntPayList");

    box.innerHTML = "";

    ntPending().forEach(function (rental) {

        const row = document.createElement("label");
        row.className = "sstc-pay-row";

        const left = document.createElement("span");
        left.className = "sstc-pay-row-main";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = ntPaySelected.has(rental.rentalId);

        checkbox.addEventListener("change", function () {

            if (checkbox.checked) {
                ntPaySelected.add(rental.rentalId);
            }
            else {
                ntPaySelected.delete(rental.rentalId);
            }

            ntUpdatePayTotal();
        });

        const text = document.createElement("span");
        text.className = "sstc-pay-row-text";

        const name = document.createElement("strong");
        name.textContent = rental.subject + " (Notes)";

        const plan = document.createElement("small");
        plan.textContent = rental.plan;

        text.appendChild(name);
        text.appendChild(plan);

        left.appendChild(checkbox);
        left.appendChild(text);

        const price = document.createElement("span");
        price.className = "sstc-pay-row-price";
        price.textContent = "₹" + (Number(rental.price) || 0);

        row.appendChild(left);
        row.appendChild(price);

        box.appendChild(row);
    });
}

/* Notes Pay window me price details: kaun sa plan laga, kitna bacha, hint */

function ntRenderPayBreakdown(breakdown) {

    let box = ntEl("ntPayBreakdown");

    if (!box) {

        const anchor = ntEl("ntPayList");

        if (!anchor) {
            return;
        }

        box = document.createElement("div");
        box.id = "ntPayBreakdown";

        box.style.cssText = [
            "margin:0 0 14px",
            "padding:12px 14px",
            "border-radius:12px",
            "background:#f0fdf4",
            "border:1.5px solid #22c55e",
            "color:#14532d",
            "font-size:13px",
            "line-height:1.5",
            "text-align:left"
        ].join(";");

        anchor.insertAdjacentElement("afterend", box);
    }

    if (!breakdown || !breakdown.count) {
        box.hidden = true;
        return;
    }

    box.hidden = false;

    let html = "<strong>🧾 Price Details</strong>" +
        '<ul style="margin:6px 0 0; padding-left:18px;">';

    breakdown.lines.forEach(function (line) {
        html += "<li>" + escapeHtml(line) + "</li>";
    });

    html += "</ul>";

    const saved = breakdown.perSubjectTotal - breakdown.total;

    if (breakdown.bundles > 0 && saved > 0) {
        html += '<p style="margin:8px 0 0; font-weight:700;">🎉 Any 6 Subject Notes plan lag gaya! ' +
            "Aapne ₹" + saved + " bacha liye.</p>";
    }

    breakdown.hints.forEach(function (hint) {
        html += '<p style="margin:6px 0 0; color:#92400e;">' + escapeHtml(hint) + "</p>";
    });

    box.innerHTML = html;
}

function ntUpdatePayTotal() {

    const chosen = ntPending().filter(function (rental) {
        return ntPaySelected.has(rental.rentalId);
    });

    const breakdown = sstcComputeRentalBreakdown(chosen, "notes");
    const total = breakdown.total;

    setText("ntPayTotal", "₹" + total);

    ntRenderPayBreakdown(breakdown);

    ntEl("ntPayConfirm").disabled = chosen.length === 0;

    const section = ntEl("ntPaySection");
    const empty = ntEl("ntPayEmpty");

    if (!SSTC_UPI_ID) {
        section.hidden = true;
        empty.hidden = false;
        return;
    }

    empty.hidden = true;
    section.hidden = total === 0;

    if (total === 0) {
        return;
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const studentName = getStudentValue(["fullName", "name"], "");

    const subjects = chosen.map(function (rental) {
        return rental.subject;
    }).join("+");

    const note = "SSTC NOTES " + studentId + " " + subjects;

    setText("ntPayUpi", SSTC_UPI_ID);
    setText("ntPayStudent", studentId + (studentName ? " · " + studentName : ""));
    setText("ntPayNote", note);

    ntEl("ntPayLink").href = buildUpiLink(total, note);

    if (SSTC_SHOW_UPI_QR) {

        const qr = ntEl("ntPayQr");

        qr.hidden = false;
        qr.src =
            "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
            encodeURIComponent(buildUpiLink(total, note));
    }
}
async function ntClaimPayment() {

    const ids = Array.from(ntPaySelected);

    if (ids.length === 0) {
        showSstcToast("Please select at least one subject.", "info");
        return;
    }

    const button = ntEl("ntPayConfirm");

    button.disabled = true;
    button.textContent = "Sending…";

    try {

        const result = await callRentalApi("claimnotespayment", { rentalIds: ids.join(",") });

        expectResultType(result, "notes_payment_claimed");

        ntApplyResult(result);
        ntRefresh();
        ntClosePay();

        showSstcToast("✅ Payment claim sent! SSTC will confirm shortly and activate your notes.", "success");
    }
    catch (error) {

        console.error("SSTC notes claim error:", error);

        showSstcToast("Could not send claim: " + error.message, "info");
    }
    finally {

        button.disabled = false;
        button.textContent = "✅ I Have Paid";
    }
}


/* ---------- start ---------- */

document.addEventListener("sstcStudentLoaded", ntInit);

document.addEventListener("DOMContentLoaded", function () {

    if (studentData && !ntReady) {
        ntInit();
    }
});

window.toggleSstcNotes = toggleSstcNotes;
window.closeSstcNotes = closeSstcNotes;
window.setSstcNotesMedium = setSstcNotesMedium;
window.sstcNotesStep = sstcNotesStep;
window.sstcNotesPrint = sstcNotesPrint;
window.sstcNotesFullscreen = sstcNotesFullscreen;
window.closeSstcNotesViewer = closeSstcNotesViewer;
