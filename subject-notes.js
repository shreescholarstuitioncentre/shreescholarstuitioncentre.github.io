/* =========================================================
   SSTC NOTES  (student-page.html ke andar hi section khulta hai)
   Subject cards -> Chapters (English / Hindi medium) -> Notes
   viewer (linked HTML file) -> Print / Save as PDF.

   Ye file student-page.js ke BAAD load hoti hai aur uske
   functions use karti hai: getCurrentClassLibrary, getStudentValue,
   normalizeStudentClass, checkStudentSession, showSstcToast.
   ========================================================= */

(function () {

    "use strict";

    /* -----------------------------------------------------
       SETTINGS
    ----------------------------------------------------- */

    /*
     * Notes ki HTML files kahan rakhi hain.
     * Chapter ka PDF path:   ebooks/class-10/science/chapter-01.pdf
     * Notes ka path banega:
     *   notes/class-10/science/english/chapter-01.html   (English Medium)
     *   notes/class-10/science/hindi/chapter-01.html     (Hindi Medium)
     */
    const NOTES_BASE_FOLDER = "notes";

    /*
     * false = notes sabke liye free
     * true  = notes ke liye subject rent hona chahiye (Chapter 1 free preview)
     */
    const NOTES_REQUIRE_RENT = false;

    /*
     * Kisi chapter ki file ka naam alag ho to yahan likho. Format:
     *   "class|Subject|chapterNumber|medium": "path/to/file.html"
     * Example:
     *   "10|Science|1|english": "notes/science-ch1-en.html"
     */
    const NOTES_FILE_OVERRIDES = window.SSTC_NOTES_FILES || {};

    const MEDIUM_KEY = "sstcNotesMedium";


    /* -----------------------------------------------------
       STATE
    ----------------------------------------------------- */

    const state = {
        open: false,
        subject: "",
        medium: "english",
        index: -1,
        url: "",
        printing: false,
        token: 0
    };

    function $(id) {
        return document.getElementById(id);
    }


    /* -----------------------------------------------------
       HELPERS
    ----------------------------------------------------- */

    function hasDevanagari(text) {
        return /[\u0900-\u097F]/.test(text);
    }

    /*
     * "Chapter 1: Real Numbers * अध्याय 1: वास्तविक संख्याएँ"
     *  -> { en: "Chapter 1: Real Numbers", hi: "अध्याय 1: वास्तविक संख्याएँ" }
     * Pehla " / " ya " * " jiske baad Devanagari shuru ho, wahin se Hindi naam.
     */
    function splitTitle(raw) {

        const text = String(raw || "").trim();
        const pattern = / [\/*] /g;

        let match;

        while ((match = pattern.exec(text)) !== null) {

            const rest = text.slice(match.index + 3);

            if (rest && hasDevanagari(rest.charAt(0))) {

                return {
                    en: text.slice(0, match.index).trim(),
                    hi: rest.trim()
                };
            }
        }

        return { en: text, hi: "" };
    }

    function getChapterTitle(chapter, medium) {

        const parts = splitTitle(chapter.title);

        if (medium === "hindi" && parts.hi) {
            return parts.hi;
        }

        return parts.en;
    }

    function getClassNumber() {

        return normalizeStudentClass(
            getStudentValue(["className", "Class", "class", "studentClass"], "")
        );
    }

    function getLibrary() {

        return typeof getCurrentClassLibrary === "function"
            ? getCurrentClassLibrary()
            : null;
    }

    function buildNotesUrl(subjectName, chapter, medium) {

        const key = [getClassNumber(), subjectName, chapter.number, medium].join("|");

        let path = NOTES_FILE_OVERRIDES[key];

        if (!path) {

            path = String(chapter.pdf || "").trim().replace(/^\/+/, "");

            if (!path) {
                return "";
            }

            path = path
                .replace(/^ebooks\//i, NOTES_BASE_FOLDER + "/")
                .replace(/\/([^\/]+)\.pdf$/i, "/" + medium + "/$1.html");
        }

        try {
            return new URL(path, document.baseURI).href;
        }
        catch (error) {
            return path;
        }
    }

    async function fileExists(url) {

        try {

            const response = await fetch(url, { method: "HEAD", cache: "no-store" });

            return response.ok;
        }
        catch (error) {

            /* Network glitch - iframe ko try karne do */
            return true;
        }
    }

    function toast(message, type) {

        if (typeof showSstcToast === "function") {
            showSstcToast(message, type || "info");
        }
    }

    function canOpenChapter(subjectName, index) {

        if (!NOTES_REQUIRE_RENT) {
            return true;
        }

        if (typeof canReadChapter === "function") {
            return canReadChapter(subjectName, index);
        }

        return true;
    }


    /* -----------------------------------------------------
       OPEN / CLOSE SECTION
    ----------------------------------------------------- */

    function toggleSstcNotes() {

        if (state.open) {
            closeSstcNotes();
        }
        else {
            openNotesSection();
        }
    }

    function openNotesSection() {

        if (typeof checkStudentSession === "function" && !checkStudentSession()) {
            return;
        }

        const section = $("sstcNotesSection");

        if (!section) {
            return;
        }

        if (!sessionStorage.getItem(MEDIUM_KEY)) {

            const studentMedium = String(
                getStudentValue(["medium", "Medium", "studentMedium"], "")
            ).toLowerCase();

            state.medium = (studentMedium.indexOf("hindi") > -1 || studentMedium.indexOf("हिंदी") > -1)
                ? "hindi"
                : "english";
        }
        else {
            state.medium = sessionStorage.getItem(MEDIUM_KEY) === "hindi" ? "hindi" : "english";
        }

        state.open = true;
        section.hidden = false;

        const button = $("sstcNotesBtn");

        if (button) {
            button.setAttribute("aria-expanded", "true");
        }

        renderAll();

        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function closeSstcNotes() {

        const section = $("sstcNotesSection");

        if (!section) {
            return;
        }

        closeNotesViewer();

        state.open = false;
        section.hidden = true;

        const button = $("sstcNotesBtn");

        if (button) {
            button.setAttribute("aria-expanded", "false");
            button.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }


    /* -----------------------------------------------------
       RENDER
    ----------------------------------------------------- */

    function renderAll() {

        renderMediumToggle();
        renderSubjects();
        renderChapters();
    }

    function renderMediumToggle() {

        const buttons = document.querySelectorAll("#sstcNotesSection .nt-medium button");

        buttons.forEach(function (button) {

            const active = button.getAttribute("data-medium") === state.medium;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });

        const classLabel = $("ntClassLabel");

        if (classLabel) {

            const classNumber = getClassNumber();

            classLabel.textContent = classNumber ? "Class " + classNumber : "";
        }
    }

    function renderSubjects() {

        const box = $("ntSubjects");

        if (!box) {
            return;
        }

        box.innerHTML = "";

        const library = getLibrary();

        if (!library || Object.keys(library).length === 0) {

            const empty = document.createElement("div");
            empty.className = "nt-placeholder";
            empty.style.gridColumn = "1 / -1";
            empty.textContent = "Aapki class ke notes abhi available nahi hain.";

            box.appendChild(empty);
            return;
        }

        Object.keys(library).forEach(function (subjectName) {

            const subject = library[subjectName];
            const count = Array.isArray(subject.chapters) ? subject.chapters.length : 0;

            const card = document.createElement("button");
            card.type = "button";
            card.className = "nt-subject" + (subjectName === state.subject ? " active" : "");
            card.setAttribute("data-subject", subjectName);

            const imageWrap = document.createElement("span");
            imageWrap.className = "nt-subject-img";

            const image = document.createElement("img");
            image.src = subject.image || "Logo.png";
            image.alt = subjectName;
            image.draggable = false;
            image.loading = "lazy";

            image.onerror = function () {
                this.onerror = null;
                this.src = "Logo.png";
            };

            imageWrap.appendChild(image);

            const body = document.createElement("span");
            body.className = "nt-subject-body";

            const name = document.createElement("strong");
            name.textContent = subjectName;

            const meta = document.createElement("span");
            meta.textContent = count + (count === 1 ? " chapter" : " chapters");

            body.appendChild(name);
            body.appendChild(meta);

            card.appendChild(imageWrap);
            card.appendChild(body);

            card.addEventListener("click", function () {
                selectNotesSubject(subjectName);
            });

            box.appendChild(card);
        });
    }

    function renderChapters() {

        const box = $("ntChapters");
        const title = $("ntChapterTitle");

        if (!box) {
            return;
        }

        box.innerHTML = "";

        const library = getLibrary();
        const subject = library ? library[state.subject] : null;

        if (!subject || !Array.isArray(subject.chapters)) {

            if (title) {
                title.textContent = "Chapter chuniye";
            }

            const placeholder = document.createElement("div");
            placeholder.className = "nt-placeholder";
            placeholder.style.gridColumn = "1 / -1";
            placeholder.textContent = "Pehle upar se ek subject chuniye.";

            box.appendChild(placeholder);
            return;
        }

        if (title) {

            title.textContent = state.subject + " – " +
                (state.medium === "hindi" ? "Hindi Medium" : "English Medium");
        }

        subject.chapters.forEach(function (chapter, index) {

            const row = document.createElement("button");
            row.type = "button";
            row.className = "nt-chapter" + (index === state.index ? " active" : "");

            const number = document.createElement("span");
            number.className = "nt-chapter-no";
            number.textContent = String(chapter.number);

            const text = document.createElement("span");
            text.className = "nt-chapter-title";
            text.lang = state.medium === "hindi" ? "hi" : "en";
            text.textContent = getChapterTitle(chapter, state.medium);

            if (NOTES_REQUIRE_RENT && index === 0) {

                const free = document.createElement("span");
                free.className = "nt-free";
                free.textContent = "FREE";

                text.appendChild(free);
            }

            const go = document.createElement("span");
            go.className = "nt-chapter-go";

            if (canOpenChapter(state.subject, index)) {
                go.textContent = "Open Notes →";
            }
            else {
                go.classList.add("locked");
                go.textContent = "🔒 Rent to read";
            }

            row.appendChild(number);
            row.appendChild(text);
            row.appendChild(go);

            row.addEventListener("click", function () {
                openNotesChapter(index);
            });

            box.appendChild(row);
        });
    }


    /* -----------------------------------------------------
       SELECT SUBJECT / MEDIUM
    ----------------------------------------------------- */

    function selectNotesSubject(subjectName) {

        state.subject = subjectName;
        state.index = -1;

        closeNotesViewer();
        renderSubjects();
        renderChapters();

        const step = $("ntChapterStep");

        if (step) {
            step.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function setSstcNotesMedium(medium) {

        state.medium = medium === "hindi" ? "hindi" : "english";

        sessionStorage.setItem(MEDIUM_KEY, state.medium);

        renderMediumToggle();
        renderChapters();

        /* Notes khule hue hain to wahi chapter dusre medium me khol do */

        if (state.index >= 0 && state.subject) {
            openNotesChapter(state.index, true);
        }
    }


    /* -----------------------------------------------------
       NOTES VIEWER
    ----------------------------------------------------- */

    function setOverlay(icon, heading, message, retry) {

        const overlay = $("ntOverlay");

        if (!overlay) {
            return;
        }

        overlay.innerHTML = "";

        const iconEl = document.createElement("div");
        iconEl.className = "nt-overlay-icon";
        iconEl.textContent = icon;

        const headingEl = document.createElement("strong");
        headingEl.textContent = heading;

        overlay.appendChild(iconEl);
        overlay.appendChild(headingEl);

        if (message) {

            const messageEl = document.createElement("span");
            messageEl.textContent = message;

            overlay.appendChild(messageEl);
        }

        if (retry) {

            const button = document.createElement("button");
            button.type = "button";
            button.textContent = "Dobara try karein";

            button.addEventListener("click", function () {
                openNotesChapter(state.index, true);
            });

            overlay.appendChild(button);
        }

        overlay.hidden = false;
    }

    async function openNotesChapter(index, keepScroll) {

        const library = getLibrary();
        const subject = library ? library[state.subject] : null;

        if (!subject || !Array.isArray(subject.chapters)) {
            return;
        }

        const chapter = subject.chapters[index];

        if (!chapter) {
            return;
        }

        if (!canOpenChapter(state.subject, index)) {

            toast("Ye notes dekhne ke liye " + state.subject + " rent karein.", "info");

            if (typeof openRentModal === "function") {
                openRentModal(state.subject);
            }

            return;
        }

        const token = ++state.token;

        state.index = index;

        const url = buildNotesUrl(state.subject, chapter, state.medium);

        state.url = "";

        const viewer = $("ntViewer");
        const frame = $("ntFrame");

        if (!viewer || !frame) {
            return;
        }

        viewer.hidden = false;

        $("ntViewerTitle").textContent = getChapterTitle(chapter, state.medium);
        $("ntViewerMeta").textContent =
            state.subject + " • " +
            (state.medium === "hindi" ? "Hindi Medium" : "English Medium") +
            " • Chapter " + chapter.number;

        $("ntPrev").disabled = index <= 0;
        $("ntNext").disabled = index >= subject.chapters.length - 1;

        renderChapters();

        setOverlay("📝", "Notes khul rahe hain…", "");

        frame.src = "about:blank";

        if (!keepScroll) {
            viewer.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (!url) {

            setOverlay("📭", "Notes available nahi hain", "Is chapter ki notes file set nahi hui hai.");
            return;
        }

        const exists = await fileExists(url);

        if (token !== state.token) {
            return;
        }

        if (!exists) {

            setOverlay(
                "📭",
                "Notes jald aayenge",
                state.medium === "hindi"
                    ? "Is chapter ke Hindi Medium notes abhi upload nahi hue hain. English Medium try kar sakte hain."
                    : "Is chapter ke English Medium notes abhi upload nahi hue hain. Hindi Medium try kar sakte hain."
            );

            return;
        }

        frame.onload = function () {

            if (token !== state.token) {
                return;
            }

            if (frame.src && frame.src !== "about:blank") {

                const overlay = $("ntOverlay");

                if (overlay) {
                    overlay.hidden = true;
                }
            }
        };

        state.url = url;
        frame.src = url;
    }

    function notesStep(direction) {

        if (state.index < 0) {
            return;
        }

        openNotesChapter(state.index + direction);
    }

    function closeNotesViewer() {

        state.token++;
        state.index = -1;
        state.url = "";

        const viewer = $("ntViewer");
        const frame = $("ntFrame");

        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () { /* ignore */ });
        }

        if (frame) {
            frame.onload = null;
            frame.src = "about:blank";
        }

        if (viewer) {
            viewer.hidden = true;
        }

        renderChapters();
    }

    function toggleNotesFullscreen() {

        const viewer = $("ntViewer");

        if (!viewer) {
            return;
        }

        if (document.fullscreenElement) {

            document.exitFullscreen();
            return;
        }

        if (viewer.requestFullscreen) {

            viewer.requestFullscreen().catch(function () {
                toast("Fullscreen is device par available nahi hai.", "info");
            });
        }
    }


    /* -----------------------------------------------------
       PRINT / SAVE AS PDF
    ----------------------------------------------------- */

    function printNotes(asPdf) {

        const frame = $("ntFrame");

        if (!state.url || !frame) {

            toast("Pehle koi chapter ke notes kholiye.", "info");
            return;
        }

        state.printing = true;

        toast(
            asPdf
                ? "Print window me Destination: “Save as PDF” chuniye."
                : "Print window khul rahi hai…",
            "info"
        );

        try {

            frame.contentWindow.focus();
            frame.contentWindow.print();
        }
        catch (error) {

            /* Fallback: notes ko naye tab me kholkar print karwao */
            window.open(state.url, "_blank");
        }

        setTimeout(function () {
            state.printing = false;
        }, 5000);
    }

    /*
     * student-page.js ka "Printing is disabled" message tab na dikhe
     * jab student hamare Print / Download PDF button se print kare.
     * Ye listener pehle register hota hai, isliye pehle chalta hai.
     */
    window.addEventListener("beforeprint", function (event) {

        if (state.printing) {
            event.stopImmediatePropagation();
        }
    }, true);


    /* -----------------------------------------------------
       EVENTS + EXPOSE
    ----------------------------------------------------- */

    document.addEventListener("sstcStudentLoaded", function () {

        if (state.open) {
            renderAll();
        }
    });

    window.toggleSstcNotes = toggleSstcNotes;
    window.closeSstcNotes = closeSstcNotes;
    window.setSstcNotesMedium = setSstcNotesMedium;
    window.closeSstcNotesViewer = closeNotesViewer;
    window.sstcNotesStep = notesStep;
    window.sstcNotesFullscreen = toggleNotesFullscreen;
    window.sstcNotesPrint = printNotes;

    /* Purana openSstcNotes (naye tab wala) ab isi section ko kholta hai */
    window.openSstcNotes = openNotesSection;

})();
