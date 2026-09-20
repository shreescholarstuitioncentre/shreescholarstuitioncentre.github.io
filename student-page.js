/* =========================================================
   SSTC STUDENT PORTAL
   LIVE STUDENT DATA
   SESSION + PROFILE + E-BOOK LIBRARY + PDF READER
   + MY STUDY SUBJECTS (select -> saved in Google Sheet)
   ========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
   ========================================================= */

let studentData = null;
let sstcRedirecting = false;
let sstcLoggingOut = false;
let sstcZoom = 100;
let sstcSelectedSubjects = new Set();

/* --- study-list (subject selection) state --- */
let sstcSubjectFilter = "all";      // "all" | "mine"
let sstcSelectionTouched = false;   // student ne khud kuch select/unselect kiya?
let sstcSaveTimer = null;           // debounce timer
let sstcSaveInFlight = false;       // save request chal rahi hai?
let sstcSaveQueued = false;         // save ke dauran naya change aaya?


/* =========================================================
   STUDENT DATABASE API (for saving selected subjects)
   ---------------------------------------------------------
   ⚠️ ZAROORI: Apps Script ka "Web App" deployment URL yahan
   paste karein (jo "https://script.google.com/macros/s/.../exec"
   se shuru hota hai). Wahi URL jo sstc-access.html / admin
   page me use ho raha hai.

   Jab tak ye khaali hai, selection Google Sheet me SAVE NAHI
   hoga - page par "Not saved" ka warning dikhega.
   ========================================================= */

const SSTC_STUDENT_API_URL = "";


/* =========================================================
   SESSION KEYS
   ========================================================= */

const SSTC_SESSION_LOGIN = "sstcStudentLoggedIn";
const SSTC_SESSION_DATA = "sstcStudentData";
const SSTC_SESSION_LOGIN_TIME = "sstcStudentLoginTime";
const SSTC_CURRENT_BOOK = "sstcCurrentBook";
const SSTC_CURRENT_CHAPTER = "sstcCurrentChapter";
const SSTC_CURRENT_PAGE = "sstcCurrentPage";


/* =========================================================
   GITHUB PAGES BASE URL
   ========================================================= */

const SSTC_SITE_BASE_URL = window.location.origin;


/* =========================================================
   PDF URL BUILDER
   ========================================================= */

function getPdfUrl(pdfPath) {

    if (!pdfPath) {
        return "";
    }

    let cleanPath = String(pdfPath).trim().replace(/^\/+/, "");

    if (/^https?:\/\//i.test(cleanPath)) {
        return cleanPath;
    }

    return SSTC_SITE_BASE_URL + "/" + cleanPath;
}


/* =========================================================
   E-BOOK LIBRARY
   ========================================================= */

const SSTC_EBOOKS = {

    "10": {

        "Science": {
            description: "Class 10 Science E-Book Library",
            image: "subject-images/science.png",
            chapters: [
                { number: 1, title: "Chemical Reactions and Equations", pdf: "ebooks/class-10/science/chapter-01.pdf" },
                { number: 2, title: "Acids, Bases and Salts", pdf: "ebooks/class-10/science/chapter-02.pdf" },
                { number: 3, title: "Metals and Non-metals", pdf: "ebooks/class-10/science/chapter-03.pdf" },
                { number: 4, title: "Carbon and Its Compounds", pdf: "ebooks/class-10/science/chapter-04.pdf" },
                { number: 5, title: "Life Processes", pdf: "ebooks/class-10/science/chapter-05.pdf" },
                { number: 6, title: "Control and Coordination", pdf: "ebooks/class-10/science/chapter-06.pdf" },
                { number: 7, title: "How do Organisms Reproduce?", pdf: "ebooks/class-10/science/chapter-07.pdf" },
                { number: 8, title: "Heredity", pdf: "ebooks/class-10/science/chapter-08.pdf" },
                { number: 9, title: "Light – Reflection and Refraction", pdf: "ebooks/class-10/science/chapter-09.pdf" },
                { number: 10, title: "The Human Eye and the Colourful World", pdf: "ebooks/class-10/science/chapter-10.pdf" },
                { number: 11, title: "Electricity", pdf: "ebooks/class-10/science/chapter-11.pdf" },
                { number: 12, title: "Magnetic Effects of Electric Current", pdf: "ebooks/class-10/science/chapter-12.pdf" },
                { number: 13, title: "Our Environment", pdf: "ebooks/class-10/science/chapter-13.pdf" }
            ]
        },

        "Mathematics": {
            description: "Class 10 Mathematics E-Book Library",
            image: "subject-images/maths.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/mathematics/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/mathematics/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/mathematics/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/mathematics/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/mathematics/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/mathematics/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/mathematics/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/mathematics/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/mathematics/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/mathematics/chapter-10.pdf" },
                { number: 11, title: "Chapter 11", pdf: "ebooks/class-10/mathematics/chapter-11.pdf" },
                { number: 12, title: "Chapter 12", pdf: "ebooks/class-10/mathematics/chapter-12.pdf" },
                { number: 13, title: "Chapter 13", pdf: "ebooks/class-10/mathematics/chapter-13.pdf" },
                { number: 14, title: "Chapter 14", pdf: "ebooks/class-10/mathematics/chapter-14.pdf" },
                { number: 15, title: "Chapter 15", pdf: "ebooks/class-10/mathematics/chapter-15.pdf" }
            ]
        },

        "Hindi": {
            description: "Class 10 Hindi E-Book Library",
            image: "subject-images/Hindi.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/hindi/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/hindi/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/hindi/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/hindi/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/hindi/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/hindi/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/hindi/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/hindi/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/hindi/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/hindi/chapter-10.pdf" }
            ]
        },

        "English": {
            description: "Class 10 English E-Book Library",
            image: "subject-images/english.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/english/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/english/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/english/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/english/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/english/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/english/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/english/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/english/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/english/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/english/chapter-10.pdf" }
            ]
        },

        "Social Science": {
            description: "Class 10 Social Science E-Book Library",
            image: "subject-images/socialscience.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/social-science/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/social-science/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/social-science/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/social-science/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/social-science/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/social-science/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/social-science/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/social-science/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/social-science/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/social-science/chapter-10.pdf" }
            ]
        },

        "Chitrakala": {
            description: "Class 10 Chitrakala E-Book Library",
            image: "subject-images/chitrakala.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/chitrakala/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/chitrakala/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/chitrakala/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/chitrakala/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/chitrakala/chapter-05.pdf" }
            ]
        },

        "Home Science": {
            description: "Class 10 Home Science E-Book Library",
            image: "subject-images/homescience.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/home-science/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/home-science/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/home-science/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/home-science/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/home-science/chapter-05.pdf" }
            ]
        },

        "Computer": {
            description: "Class 10 Computer E-Book Library",
            image: "subject-images/computer.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/computer/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/computer/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/computer/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/computer/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/computer/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/computer/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/computer/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/computer/chapter-08.pdf" }
            ]
        }

    }

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    loadLoggedInStudent();
    setupStudentSecurity();
    setupReaderDefaults();
    setupSubjectSelectionUI();
    setCurrentYear();
});


/* =========================================================
   CHECK SESSION
   ========================================================= */

function checkStudentSession() {

    const loggedIn = sessionStorage.getItem(SSTC_SESSION_LOGIN);
    const savedData = sessionStorage.getItem(SSTC_SESSION_DATA);

    if (loggedIn !== "true" || !savedData) {
        redirectToAccessPage();
        return false;
    }

    return true;
}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

function loadLoggedInStudent() {

    const loggedIn = sessionStorage.getItem(SSTC_SESSION_LOGIN);
    const savedData = sessionStorage.getItem(SSTC_SESSION_DATA);

    if (loggedIn !== "true" || !savedData) {
        redirectToAccessPage();
        return;
    }

    try {
        studentData = JSON.parse(savedData);
    }
    catch (error) {
        console.error("SSTC student session error:", error);
        clearStudentSession();
        redirectToAccessPage();
        return;
    }

    if (!studentData || !studentData.studentId) {
        clearStudentSession();
        redirectToAccessPage();
        return;
    }

    let loginTime = sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME);

    if (!loginTime) {
        loginTime = createLoginTime();
        sessionStorage.setItem(SSTC_SESSION_LOGIN_TIME, loginTime);
    }

    renderStudentData();
}


/* =========================================================
   CREATE LOGIN TIME
   ========================================================= */

function createLoginTime() {

    const now = new Date();

    return now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}


/* =========================================================
   NORMALIZE CLASS
   ========================================================= */

function normalizeStudentClass(value) {

    const text = String(value || "").trim();
    const match = text.match(/\d+/);

    if (!match) {
        return "";
    }

    return match[0];
}


/* =========================================================
   RENDER STUDENT DATA
   ========================================================= */

function renderStudentData() {

    if (!studentData) {
        return;
    }

    const fullName = getStudentValue(["fullName", "name"], "Student");

    setText("studentName", fullName);
    setText("studentFullName", fullName);
    setText("studentId", getStudentValue(["studentId", "id"], "-"));

    const classValue = getStudentValue(["className", "Class", "class", "studentClass"], "-");

    setText("studentClass", classValue);
    setText("studentClassDetail", classValue);
    setText("studentBoard", getStudentValue(["board"], "-"));
    setText("studentGender", getStudentValue(["gender"], "-"));
    setText("studentMobile", getStudentValue(["mobileNumber", "mobile", "phone"], "-"));
    setText("studentEmail", getStudentValue(["emailId", "email"], "-"));
    setText("studentSchool", getStudentValue(["schoolName", "school"], "-"));
    setText("studentSchoolPlace", getStudentValue(["schoolPlace"], "-"));

    const registrationDate = getStudentValue(["registrationDate", "registrationDateTime"], "-");

    setText("studentRegistrationDate", registrationDate);
    setText("registrationDate", registrationDate);

    const loginTime = sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME) || createLoginTime();

    sessionStorage.setItem(SSTC_SESSION_LOGIN_TIME, loginTime);

    setText("studentLoginTime", loginTime);
    setText("loginTime", loginTime);

    const status = String(studentData.status || "Active").trim();

    setText("studentStatus", status);

    const statusElement = document.getElementById("studentStatus");

    if (statusElement) {

        statusElement.classList.remove("status-active", "status-inactive");

        if (status.toLowerCase() === "active") {
            statusElement.classList.add("status-active");
        }
        else {
            statusElement.classList.add("status-inactive");
        }
    }

    const firstLetter = fullName.trim().charAt(0).toUpperCase();

    setText("studentAvatar", firstLetter || "S");
    setText("studentInitial", firstLetter || "S");

    document.title = "SSTC | " + fullName + " - Student Portal";

    sstcSelectedSubjects = getSelectedSubjectsSet();

    renderStudentLibrary();

    try {
        document.dispatchEvent(new CustomEvent("sstcStudentLoaded", { detail: studentData }));
    }
    catch (error) {
        console.warn("SSTC student event warning:", error);
    }
}


/* =========================================================
   CURRENT CLASS LIBRARY (helper)
   ========================================================= */

function getCurrentClassLibrary() {

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    return SSTC_EBOOKS[classNumber] || null;
}


/* =========================================================
   RENDER STUDENT LIBRARY
   ========================================================= */

function renderStudentLibrary() {

    const rawClass = getStudentValue(["className", "Class", "class", "studentClass"], "");
    const classNumber = normalizeStudentClass(rawClass);
    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary || Object.keys(classLibrary).length === 0) {
        renderNoLibrary();
        return;
    }

    pruneSelectedSubjects(classLibrary);

    renderSubjects(classLibrary);
    updateLibraryCounts(classLibrary);
    refreshSubjectSelectionUI();

    const subjectNames = Object.keys(classLibrary);

    if (subjectNames.length === 1) {
        selectSubject(subjectNames[0]);
    }

    /* Google Sheet me jo subjects save hain unhe load karo */
    syncSelectedSubjectsFromSheet();
}


/* =========================================================
   RENDER SUBJECT CAROUSEL
   ========================================================= */

function renderSubjects(classLibrary) {

    const carousel = document.getElementById("subjectCarousel");

    if (!carousel) {
        return;
    }

    carousel.innerHTML = "";

    const subjectNames = Object.keys(classLibrary);

    subjectNames.forEach(function (subjectName) {

        const subject = classLibrary[subjectName];

        /*
         * Card ab <div role="button"> hai (pehle <button> tha),
         * kyunki <button> ke andar <button> (Add to My Subjects)
         * HTML me valid nahi hota aur kuch browsers me click
         * properly kaam nahi karta.
         */
        const card = document.createElement("div");
        card.className = "subject-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("data-subject", subjectName);

        card.addEventListener("click", function () {
            selectSubject(subjectName);
        });

        card.addEventListener("keydown", function (event) {

            if (event.target !== card) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectSubject(subjectName);
            }
        });

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "subject-card-image";

        const image = document.createElement("img");
        image.src = subject.image || "Logo.png";
        image.alt = subjectName + " Subject";
        image.draggable = false;
        image.loading = "lazy";

        image.onerror = function () {
            this.onerror = null;
            this.src = "Logo.png";
        };

        imageWrapper.appendChild(image);

        const content = document.createElement("div");
        content.className = "subject-card-content";

        const badge = document.createElement("span");
        badge.className = "subject-card-badge";
        badge.textContent = "E-BOOK";

        const title = document.createElement("h3");
        title.textContent = subjectName;

        const description = document.createElement("p");
        description.textContent = subject.description || "View available chapters";

        const count = document.createElement("span");
        count.className = "subject-chapter-count";
        count.textContent = (Array.isArray(subject.chapters) ? subject.chapters.length : 0) + " Chapters";

        /*
         * ADD TO MY SUBJECTS BUTTON
         * Card ke click se alag hai (event.stopPropagation).
         * Student isse apni study list me subject add/remove
         * karta hai; Google Sheet me bhi save hota hai.
         */
        const selectToggle = document.createElement("button");
        selectToggle.type = "button";
        selectToggle.className = "subject-select-toggle";

        updateSstcSelectToggleUI(selectToggle, sstcSelectedSubjects.has(subjectName));

        selectToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleSubjectSelection(subjectName);
        });

        content.appendChild(badge);
        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(count);
        content.appendChild(selectToggle);

        card.appendChild(imageWrapper);
        card.appendChild(content);

        carousel.appendChild(card);
    });
}


/* =========================================================
   SELECTED SUBJECTS (STUDY LIST)
   ========================================================= */

function updateSstcSelectToggleUI(button, selected) {

    button.textContent = selected ? "✓ Added to My Subjects" : "+ Add to My Subjects";

    button.classList.toggle("is-selected", !!selected);

    button.setAttribute("aria-pressed", selected ? "true" : "false");

    button.title = selected
        ? "Tap to remove from your study list"
        : "Add this subject to your study list";
}

function parseSubjectCsv(raw) {

    const set = new Set();

    if (!raw) {
        return set;
    }

    String(raw).split(",").forEach(function (token) {

        const trimmed = token.trim();

        if (trimmed) {
            set.add(trimmed);
        }
    });

    return set;
}

function getSelectedSubjectsSet() {

    return parseSubjectCsv(getStudentValue(["selectedSubjects"], ""));
}

/* Sirf wahi subjects rakho jo student ki class library me hain */

function pruneSelectedSubjects(classLibrary) {

    const cleaned = new Set();

    sstcSelectedSubjects.forEach(function (name) {

        if (classLibrary && classLibrary[name]) {
            cleaned.add(name);
        }
    });

    sstcSelectedSubjects = cleaned;
}

/* Selected subject names - subject cards ke order me */

function getSelectedSubjectNames() {

    const library = getCurrentClassLibrary();

    if (!library) {
        return Array.from(sstcSelectedSubjects);
    }

    return Object.keys(library).filter(function (name) {
        return sstcSelectedSubjects.has(name);
    });
}

function getSelectedSubjectsCsv() {

    return getSelectedSubjectNames().join(",");
}

/* Ek subject add / remove */

function toggleSubjectSelection(subjectName) {

    sstcSelectionTouched = true;

    const nowSelected = !sstcSelectedSubjects.has(subjectName);

    if (nowSelected) {
        sstcSelectedSubjects.add(subjectName);
    }
    else {
        sstcSelectedSubjects.delete(subjectName);
    }

    refreshSubjectSelectionUI();

    showSstcToast(
        nowSelected
            ? subjectName + " added to My Subjects ✓"
            : subjectName + " removed from My Subjects",
        nowSelected ? "success" : "info"
    );

    persistSelectedSubjects();
}

/* Saare cards, chips, counts aur filter ko update karo */

function refreshSubjectSelectionUI() {

    const cards = document.querySelectorAll(".subject-card");

    cards.forEach(function (card) {

        const name = card.getAttribute("data-subject");
        const selected = sstcSelectedSubjects.has(name);

        card.classList.toggle("selected", selected);

        const toggle = card.querySelector(".subject-select-toggle");

        if (toggle) {
            updateSstcSelectToggleUI(toggle, selected);
        }
    });

    renderStudyChips();
    applySubjectFilter();
}

/* "My Study Subjects" chips */

function renderStudyChips() {

    const box = document.getElementById("studyChips");
    const names = getSelectedSubjectNames();
    const library = getCurrentClassLibrary();

    updateNumber("selectedCount", names.length);
    updateNumber("filterMineCount", names.length);
    updateNumber("filterAllCount", library ? Object.keys(library).length : 0);

    if (!box) {
        return;
    }

    box.innerHTML = "";

    if (names.length === 0) {

        const empty = document.createElement("span");
        empty.className = "study-empty";
        empty.textContent = "No subject added yet. Tap “+ Add to My Subjects” on a subject card below.";

        box.appendChild(empty);
        return;
    }

    names.forEach(function (name) {

        const chip = document.createElement("span");
        chip.className = "study-chip";

        const label = document.createElement("button");
        label.type = "button";
        label.className = "study-chip-name";
        label.textContent = name;
        label.title = "Open " + name + " chapters";

        label.addEventListener("click", function () {
            selectSubject(name);
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "study-chip-remove";
        remove.textContent = "✕";
        remove.title = "Remove " + name + " from My Subjects";
        remove.setAttribute("aria-label", "Remove " + name + " from My Subjects");

        remove.addEventListener("click", function () {
            toggleSubjectSelection(name);
        });

        chip.appendChild(label);
        chip.appendChild(remove);

        box.appendChild(chip);
    });
}

/* Filter: All Subjects / My Subjects */

function setSubjectFilter(mode) {

    sstcSubjectFilter = (mode === "mine") ? "mine" : "all";

    applySubjectFilter();

    const carousel = document.getElementById("subjectCarousel");

    if (carousel) {
        carousel.scrollLeft = 0;
    }
}

function applySubjectFilter() {

    const cards = document.querySelectorAll(".subject-card");

    let visible = 0;

    cards.forEach(function (card) {

        const name = card.getAttribute("data-subject");
        const hide = sstcSubjectFilter === "mine" && !sstcSelectedSubjects.has(name);

        card.classList.toggle("is-hidden", hide);

        if (!hide) {
            visible++;
        }
    });

    const buttons = document.querySelectorAll(".subject-filter button");

    buttons.forEach(function (button) {

        const active = button.getAttribute("data-filter") === sstcSubjectFilter;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const message = document.getElementById("subjectFilterEmpty");

    if (message) {
        message.hidden = !(sstcSubjectFilter === "mine" && cards.length > 0 && visible === 0);
    }
}

function setupSubjectSelectionUI() {

    /* Save status par click = dobara try (error hone par) */

    const statusElement = document.getElementById("saveStatus");

    if (statusElement) {

        statusElement.addEventListener("click", function () {

            if (statusElement.getAttribute("data-state") === "error") {
                flushSubjectSave();
            }
        });
    }
}


/* =========================================================
   SAVE STATUS + TOAST
   ========================================================= */

function setSaveStatus(state, detail) {

    const element = document.getElementById("saveStatus");

    if (!element) {
        return;
    }

    const labels = {
        idle: "",
        saving: "⏳ Saving…",
        saved: "✅ Saved to your account",
        error: "⚠ Not saved – tap to retry",
        nourl: "⚠ Not saved – setup incomplete"
    };

    element.setAttribute("data-state", state);

    let text = labels[state] || "";

    /* Error ka reason screen par bhi dikhao (admin ko debug me help) */

    if (state === "error" && detail) {
        text = "⚠ Not saved – " + String(detail).substring(0, 110);
    }

    element.textContent = text;
    element.title = detail || "";
}

function showSstcToast(message, type) {

    const old = document.querySelector(".sstc-toast");

    if (old) {
        old.remove();
    }

    const box = document.createElement("div");
    box.className = "sstc-toast sstc-toast-" + (type || "info");
    box.setAttribute("role", "status");
    box.textContent = message;

    document.body.appendChild(box);

    requestAnimationFrame(function () {
        box.classList.add("show");
    });

    setTimeout(function () {

        box.classList.remove("show");

        setTimeout(function () {

            if (box && box.parentNode) {
                box.remove();
            }

        }, 250);

    }, 2200);
}


/* =========================================================
   SAVE SELECTED SUBJECTS -> GOOGLE SHEET
   ========================================================= */

function buildStudentApiUrl(action, params) {

    let url =
        SSTC_STUDENT_API_URL +
        (SSTC_STUDENT_API_URL.indexOf("?") > -1 ? "&" : "?") +
        "action=" + encodeURIComponent(action);

    Object.keys(params).forEach(function (key) {
        url += "&" + key + "=" + encodeURIComponent(params[key]);
    });

    return url;
}

function persistSelectedSubjects() {

    const csv = getSelectedSubjectsCsv();

    /*
     * Turant session me bhi save kar do, taaki page reload par
     * (Sheet se dobara load hone se pehle) selection dikhe.
     */
    if (studentData) {

        studentData.selectedSubjects = csv;

        try {
            sessionStorage.setItem(SSTC_SESSION_DATA, JSON.stringify(studentData));
        }
        catch (error) {
            console.warn("SSTC session save warning:", error);
        }
    }

    setSaveStatus("saving");

    /* Kai clicks ek saath ho to sirf aakhri list save hogi */

    if (sstcSaveTimer) {
        clearTimeout(sstcSaveTimer);
    }

    sstcSaveTimer = setTimeout(flushSubjectSave, 500);
}

async function flushSubjectSave() {

    sstcSaveTimer = null;

    if (sstcSaveInFlight) {
        sstcSaveQueued = true;
        return;
    }

    if (!SSTC_STUDENT_API_URL) {

        setSaveStatus("nourl", "SSTC_STUDENT_API_URL is empty in student-page.js");

        console.warn("SSTC: ❌ SSTC_STUDENT_API_URL khaali hai - subjects Google Sheet me save NAHI ho rahe. student-page.js me Apps Script Web App URL paste karein.");

        return;
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const password = getStudentValue(["password"], "");

    if (!studentId || !password) {

        setSaveStatus("error", "Student ID / password missing in session. Please logout and login again.");

        console.error("SSTC: studentId ya password session me nahi mila. Dobara login karein.");

        return;
    }

    sstcSaveInFlight = true;

    const csvSent = getSelectedSubjectsCsv();

    setSaveStatus("saving");

    let saved = false;

    try {

        const url = buildStudentApiUrl("updatesubjects", {
            studentId: studentId,
            password: password,
            subjects: csvSent
        });

        const response = await fetch(url, { cache: "no-store" });

        const text = await response.text();

        let result;

        try {
            result = JSON.parse(text);
        }
        catch (parseError) {
            throw new Error("Server did not return valid data. Check that the Web App access is set to 'Anyone'.");
        }

        if (!result || !result.success) {
            throw new Error((result && result.message) || "Save failed.");
        }

        /*
         * Purana Apps Script deployment kisi bhi unknown action par
         * {success:true, message:"API is running"} de deta hai.
         * Isliye sirf success:true kaafi nahi - type bhi check karo.
         */
        if (result.type !== "subjects_updated") {
            throw new Error("Apps Script is running an OLD version. Deploy > Manage deployments > Edit > New version > Deploy.");
        }

        saved = true;

        console.log(
            "SSTC: ✅ Google Sheet me save hua (row " + result.sheetRow + "):",
            result.selectedSubjects || "(none)"
        );
    }
    catch (error) {

        console.error("SSTC selected-subjects save error:", error);

        setSaveStatus("error", error.message);
    }
    finally {

        sstcSaveInFlight = false;
    }

    /* Save ke dauran naya change aaya to latest list dobara bhejo */

    if (sstcSaveQueued) {

        sstcSaveQueued = false;

        flushSubjectSave();

        return;
    }

    if (saved) {
        setSaveStatus("saved");
    }
}

/* Logout / tab close par pending save chhootna nahi chahiye */

function flushPendingSubjectSaveOnExit() {

    if (!sstcSaveTimer) {
        return;
    }

    clearTimeout(sstcSaveTimer);
    sstcSaveTimer = null;

    if (!SSTC_STUDENT_API_URL || !studentData) {
        return;
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const password = getStudentValue(["password"], "");

    if (!studentId || !password) {
        return;
    }

    try {

        fetch(
            buildStudentApiUrl("updatesubjects", {
                studentId: studentId,
                password: password,
                subjects: getSelectedSubjectsCsv()
            }),
            { keepalive: true, cache: "no-store" }
        ).catch(function () { });
    }
    catch (error) {
        console.warn("SSTC exit save warning:", error);
    }
}

/* Page open hone par Google Sheet se saved subjects laao */

async function syncSelectedSubjectsFromSheet() {

    if (!SSTC_STUDENT_API_URL) {
        return;
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const password = getStudentValue(["password"], "");

    if (!studentId || !password) {
        return;
    }

    try {

        const response = await fetch(
            buildStudentApiUrl("getsubjects", { studentId: studentId, password: password }),
            { cache: "no-store" }
        );

        const result = JSON.parse(await response.text());

        if (!result || !result.success) {
            console.warn("SSTC: subjects Sheet se load nahi hue:", result && result.message);
            return;
        }

        if (result.type !== "subjects") {

            console.warn("SSTC: Apps Script ka purana version chal raha hai (getsubjects support nahi).");

            setSaveStatus("error", "Apps Script is running an OLD version. Deploy a New version.");

            return;
        }

        /* Student ne is beech khud change kar diya ho to uska change na todo */

        if (sstcSelectionTouched) {
            return;
        }

        /*
         * Sheet khaali hai par is session me selection hai = pehle ka
         * save fail hua tha (jaise URL set nahi tha). Selection mat
         * hatao - use ab Sheet me save kar do.
         */
        const localCsv = getSelectedSubjectsCsv();

        if (String(result.selectedSubjects || "").trim() === "" && localCsv !== "") {

            console.log("SSTC: Sheet khaali hai, session me selection hai - ab Sheet me save kar rahe hain:", localCsv);

            setSaveStatus("saving");

            flushSubjectSave();

            return;
        }

        sstcSelectedSubjects = parseSubjectCsv(result.selectedSubjects);

        const library = getCurrentClassLibrary();

        if (library) {
            pruneSelectedSubjects(library);
        }

        if (studentData) {

            studentData.selectedSubjects = getSelectedSubjectsCsv();

            try {
                sessionStorage.setItem(SSTC_SESSION_DATA, JSON.stringify(studentData));
            }
            catch (error) {
                console.warn("SSTC session save warning:", error);
            }
        }

        refreshSubjectSelectionUI();

        console.log("SSTC: ✅ Google Sheet se subjects load hue:", result.selectedSubjects || "(none)");
    }
    catch (error) {
        console.warn("SSTC subjects sync warning:", error);
    }
}


/* =========================================================
   SELECT SUBJECT
   ========================================================= */

function selectSubject(subjectName) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    sessionStorage.setItem(SSTC_CURRENT_BOOK, subjectName);

    setText("selectedSubjectTitle", subjectName);
    setText("selectedSubjectDescription", subject.description || "Select a chapter to start reading.");

    const cards = document.querySelectorAll(".subject-card");

    cards.forEach(function (card) {
        card.classList.remove("active");

        if (card.getAttribute("data-subject") === subjectName) {
            card.classList.add("active");
        }
    });

    renderChapters(subjectName, subject);

    const chapterSection = document.getElementById("chapterSection");

    if (chapterSection) {
        chapterSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}


/* =========================================================
   RENDER CHAPTER LIST
   ========================================================= */

function renderChapters(subjectName, subject) {

    const grid = document.getElementById("chapterGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML = "";

    if (!subject.chapters || subject.chapters.length === 0) {

        const empty = document.createElement("div");
        empty.className = "chapter-empty";

        empty.innerHTML = `
            <div>📚</div>
            <h3>No Chapters Available</h3>
            <p>Chapters for this subject are not available yet.</p>
        `;

        grid.appendChild(empty);
        return;
    }

    subject.chapters.forEach(function (chapter, index) {

        const item = document.createElement("button");
        item.type = "button";
        item.className = "chapter-item";
        item.setAttribute("data-chapter", String(chapter.number));

        item.addEventListener("click", function () {
            openChapter(subjectName, index);
        });

        const number = document.createElement("div");
        number.className = "chapter-number";
        number.textContent = String(chapter.number);

        const icon = document.createElement("div");
        icon.className = "chapter-icon";
        icon.textContent = "📖";

        const info = document.createElement("div");
        info.className = "chapter-info";

        const title = document.createElement("h3");
        title.textContent = chapter.title;

        const subtitle = document.createElement("p");
        subtitle.textContent = "Chapter " + chapter.number + " • E-Book";

        info.appendChild(title);
        info.appendChild(subtitle);

        const open = document.createElement("span");
        open.className = "chapter-open";
        open.textContent = "Open PDF →";

        item.appendChild(number);
        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(open);

        grid.appendChild(item);
    });
}


/* =========================================================
   SSTC PDF.JS COMPLETE VIEWER
   Mobile + Tablet + Desktop
   ========================================================= */

let sstcPdfDocument = null;
let sstcPdfUrl = "";
let sstcPdfPages = 0;
let sstcPdfCurrentPage = 1;
let sstcPdfScale = 1;
let sstcPdfJsLoading = null;
let sstcPdfBaseWidth = 0;


/* =========================================================
   LOAD PDF.JS
   ========================================================= */

const SSTC_PDFJS_VERSION = "4.10.38";
const SSTC_PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + SSTC_PDFJS_VERSION + "/pdf.worker.min.mjs";

function loadSstcPdfJs() {

    if (window.pdfjsLib && window.pdfjsLib.getDocument) {

        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = SSTC_PDFJS_WORKER_SRC;
        }

        return Promise.resolve();
    }

    if (sstcPdfJsLoading) {
        return sstcPdfJsLoading;
    }

    sstcPdfJsLoading = new Promise(function (resolve, reject) {

        const script = document.createElement("script");

        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + SSTC_PDFJS_VERSION + "/pdf.min.mjs";
        script.type = "module";

        script.onload = function () {

            let tries = 0;

            const timer = setInterval(function () {

                tries++;

                if (window.pdfjsLib && window.pdfjsLib.getDocument) {

                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = SSTC_PDFJS_WORKER_SRC;

                    clearInterval(timer);
                    resolve();
                    return;
                }

                if (tries > 100) {
                    clearInterval(timer);
                    reject(new Error("PDF.js could not be initialized."));
                }

            }, 100);
        };

        script.onerror = function () {
            reject(new Error("PDF.js library could not be loaded."));
        };

        document.head.appendChild(script);
    });

    return sstcPdfJsLoading;
}


/* =========================================================
   CREATE PDF.JS VIEWER
   ========================================================= */

function createSstcPdfJsViewer() {

    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        return null;
    }

    let viewer = document.getElementById("sstcPdfJsViewer");

    if (viewer) {
        return viewer;
    }

    viewer = document.createElement("div");
    viewer.id = "sstcPdfJsViewer";

    viewer.style.cssText = [
        "position:relative",
        "width:100%",
        "height:100%",
        "display:flex",
        "flex-direction:column",
        "background:#525659",
        "box-sizing:border-box",
        "overflow:hidden"
    ].join(";");

    const pages = document.createElement("div");
    pages.id = "sstcPdfJsPages";

    pages.style.cssText = [
        "position:relative",
        "flex:1 1 auto",
        "min-height:0",
        "width:100%",
        "overflow:auto",
        "box-sizing:border-box",
        "padding:14px 10px 40px",
        "overscroll-behavior:contain",
        "-webkit-overflow-scrolling:touch"
    ].join(";");

    viewer.appendChild(pages);

    pdfViewer.appendChild(viewer);

    return viewer;
}


/* =========================================================
   GET PAGES CONTAINER
   ========================================================= */

function getSstcPdfPagesContainer() {
    return document.getElementById("sstcPdfJsPages");
}


/* =========================================================
   PDF.JS VIEWER CSS
   ========================================================= */

function injectSstcPdfJsStyles() {

    if (document.getElementById("sstcPdfJsStyles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "sstcPdfJsStyles";

    style.textContent = `

        #sstcPdfJsPages {
            scrollbar-width: thin;
        }

        #sstcPdfJsPages .sstc-pdf-page {
            position:relative;
            display:block;
            margin:0 auto 18px;
            background:#ffffff;
            box-shadow:0 4px 18px rgba(0,0,0,.35);
            max-width:none;
        }

        #sstcPdfJsPages canvas {
            display:block;
            width:100%;
            height:auto;
        }

        #sstcPdfJsViewer .sstc-pdf-loading {
            min-height:180px;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:10px;
            color:#ffffff;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
            box-sizing:border-box;
        }

        #sstcPdfJsViewer .sstc-pdf-error {
            min-height:220px;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:12px;
            color:#ffffff;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
            box-sizing:border-box;
        }

        #sstcPdfJsViewer .sstc-pdf-error strong {
            font-size:18px;
        }

        #sstcPdfJsViewer .sstc-pdf-error span {
            font-size:13px;
            opacity:.85;
        }

        #sstcPdfJsToolbar {
            position:relative;
            flex:0 0 auto;
            z-index:2;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:7px;
            flex-wrap:wrap;
            width:100%;
            box-sizing:border-box;
            margin:0;
            padding:8px 9px;
            background:rgba(15,23,42,.96);
            box-shadow:0 2px 10px rgba(0,0,0,.3);
        }

        #sstcPdfJsToolbar button {
            border:0;
            border-radius:7px;
            padding:7px 10px;
            background:#ffffff;
            color:#111827;
            cursor:pointer;
            font-size:13px;
            font-weight:600;
            min-width:38px;
        }

        #sstcPdfJsToolbar button:disabled {
            opacity:.4;
            cursor:not-allowed;
        }

        #sstcPdfJsToolbar .sstc-pdf-page-info {
            color:#ffffff;
            font-size:13px;
            font-weight:600;
            min-width:78px;
            text-align:center;
        }

        @media (max-width:600px) {

            #sstcPdfJsPages {
                padding:10px 5px 25px;
            }

            #sstcPdfJsToolbar {
                gap:4px;
                padding:6px;
            }

            #sstcPdfJsToolbar button {
                padding:6px 8px;
                font-size:12px;
            }

            #sstcPdfJsPages .sstc-pdf-page {
                margin-bottom:12px;
            }
        }

        #pdfViewer.sstc-pdf-active #pdfFrame {
            display:none !important;
        }

    `;

    document.head.appendChild(style);
}


/* =========================================================
   CREATE TOOLBAR
   ========================================================= */

function createSstcPdfToolbar(viewer) {

    let toolbar = document.getElementById("sstcPdfJsToolbar");

    if (toolbar) {
        return toolbar;
    }

    toolbar = document.createElement("div");
    toolbar.id = "sstcPdfJsToolbar";

    toolbar.innerHTML = `

        <button type="button" id="sstcPdfPrev" title="Previous PDF page">◀</button>

        <span class="sstc-pdf-page-info" id="sstcPdfPageInfo">1 / 1</span>

        <button type="button" id="sstcPdfNext" title="Next PDF page">▶</button>

        <button type="button" id="sstcPdfZoomOut" title="Zoom out">−</button>

        <span class="sstc-pdf-page-info" id="sstcPdfZoomInfo">100%</span>

        <button type="button" id="sstcPdfZoomIn" title="Zoom in">+</button>

        <button type="button" id="sstcPdfFit" title="Fit width">Fit</button>

    `;

    viewer.prepend(toolbar);

    const prev = document.getElementById("sstcPdfPrev");
    const next = document.getElementById("sstcPdfNext");
    const zoomOut = document.getElementById("sstcPdfZoomOut");
    const zoomIn = document.getElementById("sstcPdfZoomIn");
    const fit = document.getElementById("sstcPdfFit");

    if (prev) {
        prev.onclick = function () {
            sstcPdfGoToPage(sstcPdfCurrentPage - 1);
        };
    }

    if (next) {
        next.onclick = function () {
            sstcPdfGoToPage(sstcPdfCurrentPage + 1);
        };
    }

    if (zoomOut) {
        zoomOut.onclick = function () {
            sstcPdfScale = Math.max(0.5, sstcPdfScale - 0.1);
            renderSstcPdfDocument();
        };
    }

    if (zoomIn) {
        zoomIn.onclick = function () {
            sstcPdfScale = Math.min(2.5, sstcPdfScale + 0.1);
            renderSstcPdfDocument();
        };
    }

    if (fit) {
        fit.onclick = function () {
            fitSstcPdfWidth();
        };
    }

    return toolbar;
}


/* =========================================================
   UPDATE TOOLBAR
   ========================================================= */

function updateSstcPdfToolbar() {

    const info = document.getElementById("sstcPdfPageInfo");
    const zoom = document.getElementById("sstcPdfZoomInfo");
    const prev = document.getElementById("sstcPdfPrev");
    const next = document.getElementById("sstcPdfNext");

    if (info) {
        info.textContent = sstcPdfCurrentPage + " / " + sstcPdfPages;
    }

    if (zoom) {
        zoom.textContent = Math.round(sstcPdfScale * 100) + "%";
    }

    if (prev) {
        prev.disabled = sstcPdfCurrentPage <= 1;
    }

    if (next) {
        next.disabled = sstcPdfCurrentPage >= sstcPdfPages;
    }
}


/* =========================================================
   OPEN PDF.JS
   ========================================================= */

async function openSstcPdfJs(pdfUrl) {

    const empty = document.getElementById("viewerEmpty");
    const frame = document.getElementById("pdfFrame");
    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        console.error("SSTC PDF Viewer not found.");
        return;
    }

    injectSstcPdfJsStyles();

    const viewer = createSstcPdfJsViewer();

    if (!viewer) {
        return;
    }

    if (frame) {
        frame.src = "about:blank";
        frame.style.display = "none";
    }

    pdfViewer.classList.add("sstc-pdf-active");

    viewer.innerHTML = `
        <div class="sstc-pdf-loading">
            <div style="font-size:32px;">📖</div>
            <strong>Opening PDF...</strong>
            <span>Please wait</span>
        </div>
    `;

    try {

        await loadSstcPdfJs();

        const loadingTask = window.pdfjsLib.getDocument({
            url: pdfUrl,
            disableAutoFetch: false,
            disableStream: false
        });

        sstcPdfDocument = await loadingTask.promise;
        sstcPdfUrl = pdfUrl;
        sstcPdfPages = sstcPdfDocument.numPages;
        sstcPdfCurrentPage = 1;

        const firstPage = await sstcPdfDocument.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        sstcPdfBaseWidth = baseViewport.width;

        sstcPdfScale = getSstcPdfInitialScale();

        viewer.innerHTML = "";

        createSstcPdfToolbar(viewer);

        const pages = document.createElement("div");
        pages.id = "sstcPdfJsPages";
        pages.style.cssText = [
            "position:relative",
            "flex:1 1 auto",
            "min-height:0",
            "width:100%",
            "overflow:auto",
            "box-sizing:border-box",
            "padding:14px 10px 40px",
            "overscroll-behavior:contain",
            "-webkit-overflow-scrolling:touch"
        ].join(";");
        viewer.appendChild(pages);

        await renderSstcPdfDocument();

        updateSstcPdfToolbar();

        if (empty) {
            empty.style.display = "none";
        }
    }
    catch (error) {

        console.error("SSTC PDF.js error:", error);

        viewer.innerHTML = `
            <div class="sstc-pdf-error">
                <strong>PDF could not be opened</strong>
                <span>${escapeHtml((error && error.message) || "Please check the PDF file path.")}</span>
            </div>
        `;

        if (empty) {
            empty.style.display = "none";
        }
    }
}


/* =========================================================
   INITIAL SCALE
   ========================================================= */

function getSstcPdfInitialScale() {

    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        return 1;
    }

    const width = pdfViewer.clientWidth;

    if (!width || !sstcPdfBaseWidth) {
        return 1;
    }

    const available = Math.max(280, width - 30);

    return Math.max(0.5, Math.min(1.5, available / sstcPdfBaseWidth));
}


/* =========================================================
   RENDER ALL PDF PAGES
   ========================================================= */

async function renderSstcPdfDocument() {

    if (!sstcPdfDocument) {
        return;
    }

    const pages = getSstcPdfPagesContainer();

    if (!pages) {
        return;
    }

    pages.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= sstcPdfPages; pageNumber++) {

        try {

            const page = await sstcPdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: sstcPdfScale });

            const pageBox = document.createElement("div");
            pageBox.className = "sstc-pdf-page";
            pageBox.dataset.page = String(pageNumber);
            pageBox.style.width = viewport.width + "px";
            pageBox.style.height = viewport.height + "px";

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(viewport.width * deviceScale);
            canvas.height = Math.floor(viewport.height * deviceScale);
            canvas.style.width = viewport.width + "px";
            canvas.style.height = viewport.height + "px";

            context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, viewport.width, viewport.height);

            pageBox.appendChild(canvas);
            pages.appendChild(pageBox);

            await page.render({ canvasContext: context, viewport: viewport }).promise;

        }
        catch (error) {
            console.error("SSTC PDF page render error:", pageNumber, error);
        }
    }

    updateSstcPdfToolbar();
}


/* =========================================================
   GO TO PDF PAGE
   ========================================================= */

function sstcPdfGoToPage(pageNumber) {

    if (!sstcPdfDocument) {
        return;
    }

    pageNumber = Math.max(1, Math.min(sstcPdfPages, pageNumber));
    sstcPdfCurrentPage = pageNumber;

    const pages = getSstcPdfPagesContainer();

    if (!pages) {
        return;
    }

    const pageBox = pages.querySelector('.sstc-pdf-page[data-page="' + pageNumber + '"]');

    if (pageBox) {
        pageBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    updateSstcPdfToolbar();
}


/* =========================================================
   FIT PDF WIDTH
   ========================================================= */

function fitSstcPdfWidth() {

    const pages = getSstcPdfPagesContainer();

    if (!pages || !sstcPdfBaseWidth) {
        return;
    }

    const width = pages.clientWidth;
    const available = Math.max(280, width - 30);

    sstcPdfScale = Math.max(0.5, Math.min(2.5, available / sstcPdfBaseWidth));

    renderSstcPdfDocument();
}


/* =========================================================
   CLEAN PDF.JS VIEWER
   ========================================================= */

function destroySstcPdfJsViewer() {

    sstcPdfDocument = null;
    sstcPdfUrl = "";
    sstcPdfPages = 0;
    sstcPdfCurrentPage = 1;
    sstcPdfBaseWidth = 0;

    const viewer = document.getElementById("sstcPdfJsViewer");

    if (viewer) {
        viewer.innerHTML = "";
    }

    const pdfViewer = document.getElementById("pdfViewer");

    if (pdfViewer) {
        pdfViewer.classList.remove("sstc-pdf-active");
    }
}


/* =========================================================
   OPEN CHAPTER / PDF
   ========================================================= */

function openChapter(subjectName, chapterIndex) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    const chapter = subject.chapters[chapterIndex];

    if (!chapter) {
        return;
    }

    if (!chapter.pdf) {
        showSecurityMessage("This chapter PDF is not available yet.");
        return;
    }

    sessionStorage.setItem(SSTC_CURRENT_BOOK, subjectName);
    sessionStorage.setItem(SSTC_CURRENT_CHAPTER, String(chapter.number));
    sessionStorage.setItem(SSTC_CURRENT_PAGE, "1");

    const chapterItems = document.querySelectorAll(".chapter-item");

    chapterItems.forEach(function (item) {
        item.classList.remove("active");
    });

    const selectedChapter = document.querySelector('.chapter-item[data-chapter="' + chapter.number + '"]');

    if (selectedChapter) {
        selectedChapter.classList.add("active");
    }

    setText("currentBookTitle", chapter.title);
    setText("currentBookStatus", subjectName + " • Chapter " + chapter.number);
    setText("currentChapterNumber", chapter.number);

    const frame = document.getElementById("pdfFrame");
    const empty = document.getElementById("viewerEmpty");

    if (!frame) {
        console.error("SSTC PDF ERROR: #pdfFrame not found.");
        showSecurityMessage("PDF viewer is not available.");
        return;
    }

    const pdfUrl = getPdfUrl(chapter.pdf);

    console.log("SSTC PDF:", pdfUrl);

    if (empty) {

        empty.style.display = "flex";

        empty.innerHTML = `
            <div class="empty-icon">📖</div>
            <h3>Opening Chapter...</h3>
            <p>${escapeHtml(chapter.title)}</p>
        `;
    }

    destroySstcPdfJsViewer();
    openSstcPdfJs(pdfUrl);

    const readerSection = document.getElementById("readerSection");

    if (readerSection) {

        setTimeout(function () {
            readerSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
    }
}


/* =========================================================
   SUBJECT CAROUSEL SCROLL
   ========================================================= */

function scrollSubjects(direction) {

    const carousel = document.getElementById("subjectCarousel");

    if (!carousel) {
        return;
    }

    const amount = carousel.clientWidth;

    carousel.scrollBy({ left: direction * amount, behavior: "smooth" });
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NO LIBRARY
   ========================================================= */

function renderNoLibrary() {

    const carousel = document.getElementById("subjectCarousel");
    const grid = document.getElementById("chapterGrid");

    if (carousel) {
        carousel.innerHTML = `
            <div class="library-empty">
                <div>📚</div>
                <h3>No E-Books Available</h3>
                <p>Your class library is not available yet.</p>
            </div>
        `;
    }

    if (grid) {
        grid.innerHTML = `
            <div class="chapter-empty">
                <div>📚</div>
                <h3>Select a Subject</h3>
                <p>Available chapters will appear here.</p>
            </div>
        `;
    }

    setText("selectedSubjectTitle", "No Subject Available");
    setText("selectedSubjectDescription", "E-books for your class are not available yet.");

    updateNumber("ebookCount", 0);
    updateNumber("totalBooks", 0);
    updateNumber("totalSubjects", 0);
    updateNumber("rentedBooks", 0);
    updateNumber("purchasedBooks", 0);
}


/* =========================================================
   UPDATE LIBRARY COUNTS
   ========================================================= */

function updateLibraryCounts(classLibrary) {

    const subjectNames = Object.keys(classLibrary);

    let totalChapters = 0;

    subjectNames.forEach(function (subjectName) {

        const subject = classLibrary[subjectName];

        if (subject && Array.isArray(subject.chapters)) {
            totalChapters += subject.chapters.length;
        }
    });

    updateNumber("ebookCount", totalChapters);
    updateNumber("totalBooks", totalChapters);
    updateNumber("totalSubjects", subjectNames.length);
    updateNumber("rentedBooks", 0);
    updateNumber("purchasedBooks", 0);
}


/* =========================================================
   UPDATE NUMBER
   ========================================================= */

function updateNumber(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = String(value);
}


/* =========================================================
   GET STUDENT VALUE
   ========================================================= */

function getStudentValue(keys, fallback) {

    if (!studentData || !Array.isArray(keys)) {
        return fallback;
    }

    for (let i = 0; i < keys.length; i++) {

        const key = keys[i];

        if (
            studentData[key] !== undefined &&
            studentData[key] !== null &&
            String(studentData[key]).trim() !== ""
        ) {
            return String(studentData[key]).trim();
        }
    }

    return fallback;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    if (value === undefined || value === null || String(value).trim() === "") {
        element.textContent = "-";
    }
    else {
        element.textContent = String(value);
    }
}


/* =========================================================
   CLEAR SESSION
   ========================================================= */

function clearStudentSession() {

    try {
        sessionStorage.removeItem(SSTC_SESSION_LOGIN);
        sessionStorage.removeItem(SSTC_SESSION_DATA);
        sessionStorage.removeItem(SSTC_SESSION_LOGIN_TIME);
        sessionStorage.removeItem(SSTC_CURRENT_BOOK);
        sessionStorage.removeItem(SSTC_CURRENT_CHAPTER);
        sessionStorage.removeItem(SSTC_CURRENT_PAGE);
    }
    catch (error) {
        console.error("SSTC session clear error:", error);
    }

    studentData = null;
}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToAccessPage() {

    if (sstcRedirecting) {
        return;
    }

    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    if (currentPage === "sstc-access.html") {
        return;
    }

    sstcRedirecting = true;

    window.location.replace("sstc-access.html");
}


/* =========================================================
   LOGOUT
   ========================================================= */

function studentLogout(event) {

    if (event) {
        event.preventDefault();
    }

    if (sstcLoggingOut) {
        return false;
    }

    sstcLoggingOut = true;

    /* Pending subject selection ko logout se pehle save karo */
    flushPendingSubjectSaveOnExit();

    const pdfFrame = document.getElementById("pdfFrame");

    if (pdfFrame) {
        try {
            pdfFrame.src = "about:blank";
        }
        catch (error) {
            console.warn("PDF cleanup warning:", error);
        }
    }

    clearStudentSession();

    window.location.replace("sstc-access.html");

    return false;
}


/* =========================================================
   READER DEFAULTS
   ========================================================= */

function setupReaderDefaults() {

    const frame = document.getElementById("pdfFrame");

    if (frame) {

        frame.setAttribute("draggable", "false");
        frame.setAttribute("loading", "eager");

        frame.addEventListener("load", function () {
            pdfLoaded();
        });

        frame.addEventListener("error", function () {
            console.error("SSTC PDF iframe failed to load.");
            showSecurityMessage("PDF could not be loaded.");
        });
    }

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
    }
}


/* =========================================================
   PDF LOADED
   ========================================================= */

function pdfLoaded() {

    const empty = document.getElementById("viewerEmpty");
    const frame = document.getElementById("pdfFrame");

    if (!frame) {
        return;
    }

    if (frame.src && frame.src !== "about:blank" && frame.src !== window.location.href) {

        if (empty) {
            empty.style.display = "none";
        }
    }
}


/* =========================================================
   ZOOM IN
   ========================================================= */

function zoomIn() {
    sstcZoom = Math.min(200, sstcZoom + 10);
    applyZoom();
}


/* =========================================================
   ZOOM OUT
   ========================================================= */

function zoomOut() {
    sstcZoom = Math.max(50, sstcZoom - 10);
    applyZoom();
}


/* =========================================================
   APPLY ZOOM
   ========================================================= */

function applyZoom() {

    setText("zoomLevel", sstcZoom + "%");

    const frame = document.getElementById("pdfFrame");

    if (frame) {
        frame.style.transform = "scale(" + (sstcZoom / 100) + ")";
        frame.style.transformOrigin = "top left";
        frame.style.width = (10000 / sstcZoom) + "%";
        frame.style.height = (10000 / sstcZoom) + "%";
    }
}


/* =========================================================
   FIT WIDTH
   ========================================================= */

function fitWidth() {

    sstcZoom = 100;

    applyZoom();

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.scrollLeft = 0;
    }
}


/* =========================================================
   FIT PAGE
   ========================================================= */

function fitPage() {

    sstcZoom = 90;

    applyZoom();

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.scrollTop = 0;
        viewer.scrollLeft = 0;
    }
}


/* =========================================================
   FULLSCREEN
   ========================================================= */

function toggleFullscreen() {

    const viewer = document.getElementById("pdfViewer");

    if (!viewer) {
        return;
    }

    if (document.fullscreenElement) {

        if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        return;
    }

    if (viewer.requestFullscreen) {
        viewer.requestFullscreen().catch(function (error) {
            console.warn("Fullscreen unavailable:", error);
        });
    }
}


/* =========================================================
   PREVIOUS CHAPTER
   ========================================================= */

function previousPage() {
    navigateChapter(-1);
}


/* =========================================================
   NEXT CHAPTER
   ========================================================= */

function nextPage() {
    navigateChapter(1);
}


/* =========================================================
   NAVIGATE CHAPTER
   ========================================================= */

function navigateChapter(direction) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subjectName = sessionStorage.getItem(SSTC_CURRENT_BOOK);

    if (!subjectName) {
        showSecurityMessage("Please select a subject first.");
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    let currentChapter = parseInt(sessionStorage.getItem(SSTC_CURRENT_CHAPTER) || "1", 10);

    let newChapter = currentChapter + direction;

    if (newChapter < 1) {
        newChapter = 1;
    }

    if (newChapter > subject.chapters.length) {
        newChapter = subject.chapters.length;
    }

    openChapter(subjectName, newChapter - 1);
}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

function setCurrentYear() {

    const year = new Date().getFullYear();

    setText("currentYear", year);
}


/* =========================================================
   SECURITY
   ========================================================= */

function setupStudentSecurity() {

    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    document.addEventListener("dragstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("selectstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("keydown", function (event) {

        const key = String(event.key || "").toLowerCase();

        if (event.ctrlKey && key === "s") {
            event.preventDefault();
            showSecurityMessage("Downloading is disabled.");
            return;
        }

        if (event.ctrlKey && key === "p") {
            event.preventDefault();
            showSecurityMessage("Printing is disabled.");
            return;
        }

        if (event.ctrlKey && key === "u") {
            event.preventDefault();
            showSecurityMessage("This page is protected.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "i") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "j") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "c") {
            event.preventDefault();
            showSecurityMessage("Inspection is disabled.");
            return;
        }

        if (event.key === "F12") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }
    });

    window.addEventListener("beforeprint", function () {
        document.body.classList.add("print-blocked");
        showSecurityMessage("Printing is disabled.");
    });

    window.addEventListener("afterprint", function () {
        document.body.classList.remove("print-blocked");
    });

    document.addEventListener("visibilitychange", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (!viewer) {
            return;
        }

        if (document.hidden) {
            viewer.classList.add("viewer-hidden");
        }
        else {
            viewer.classList.remove("viewer-hidden");
        }
    });

    window.addEventListener("blur", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (viewer) {
            viewer.classList.add("viewer-hidden");
        }
    });

    window.addEventListener("focus", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (viewer) {
            viewer.classList.remove("viewer-hidden");
        }
    });
}


/* =========================================================
   SECURITY MESSAGE
   ========================================================= */

function showSecurityMessage(message) {

    const old = document.querySelector(".security-message");

    if (old) {
        old.remove();
    }

    const box = document.createElement("div");
    box.className = "security-message";
    box.textContent = message;

    document.body.appendChild(box);

    setTimeout(function () {

        if (box && box.parentNode) {
            box.remove();
        }

    }, 2000);
}


/* =========================================================
   PAGE HIDE
   ========================================================= */

window.addEventListener("pagehide", function () {

    /* Tab close / navigate par pending subject save bhej do */
    flushPendingSubjectSaveOnExit();
});


/* =========================================================
   EXPOSE FUNCTIONS
   ========================================================= */

window.studentLogout = studentLogout;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.fitWidth = fitWidth;
window.fitPage = fitPage;
window.toggleFullscreen = toggleFullscreen;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.pdfLoaded = pdfLoaded;
window.scrollSubjects = scrollSubjects;
window.selectSubject = selectSubject;
window.openChapter = openChapter;
window.setSubjectFilter = setSubjectFilter;
