/* =========================================================
   SSTC STUDENT PAGE
   ========================================================= */

/* ================= GLOBAL VARIABLES ================= */

let studentData = null;
let sstcRedirecting = false;
let sstcLoggingOut = false;
let sstcZoom = 100;


/* ================= SESSION KEYS ================= */

const SSTC_SESSION_LOGIN = "sstcStudentLoggedIn";
const SSTC_SESSION_DATA = "sstcStudentData";
const SSTC_SESSION_LOGIN_TIME = "sstcStudentLoginTime";

const SSTC_CURRENT_BOOK = "sstcCurrentBook";
const SSTC_CURRENT_CHAPTER = "sstcCurrentChapter";
const SSTC_CURRENT_PAGE = "sstcCurrentPage";


/* ================= SITE BASE URL ================= */

const SSTC_SITE_BASE_URL = window.location.origin;


/* =========================================================
   PDF URL HELPER
   ========================================================= */

function getPdfUrl(pdfPath) {

    if (!pdfPath) {
        return "";
    }

    const path = String(pdfPath).trim();

    /* Already full URL */
    if (
        path.startsWith("http://") ||
        path.startsWith("https://")
    ) {
        return path;
    }

    /* Remove starting slash */
    const cleanPath = path.replace(/^\/+/, "");

    return SSTC_SITE_BASE_URL + "/" + cleanPath;
}


/* =========================================================
   SSTC E-BOOK DATA
   ========================================================= */

const SSTC_EBOOKS = {

    "10": {

        "Science": {
            description: "Class 10 Science e-books and chapters.",

           image:
                "subject-images/science.png",

            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/science/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/science/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/science/chapter-03.pdf"
                },

                {
                    title: "Chapter 04",
                    pdf: "ebooks/class-10/science/chapter-04.pdf"
                },

                {
                    title: "Chapter 05",
                    pdf: "ebooks/class-10/science/chapter-05.pdf"
                }

            ]
        },


        "Mathematics": {
            description: "Class 10 Mathematics e-books and chapters.",

           image:
                "subject-images/maths.png",

            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/mathematics/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/mathematics/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/mathematics/chapter-03.pdf"
                },

                {
                    title: "Chapter 04",
                    pdf: "ebooks/class-10/mathematics/chapter-04.pdf"
                },

                {
                    title: "Chapter 05",
                    pdf: "ebooks/class-10/mathematics/chapter-05.pdf"
                }

            ]
        },


        "Hindi": {
            description: "Class 10 Hindi e-books and chapters.",

           image:
                "subject-images/Hindi.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/hindi/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/hindi/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/hindi/chapter-03.pdf"
                },

                {
                    title: "Chapter 04",
                    pdf: "ebooks/class-10/hindi/chapter-04.pdf"
                },

                {
                    title: "Chapter 05",
                    pdf: "ebooks/class-10/hindi/chapter-05.pdf"
                }

            ]
        },


        "English": {
            description: "Class 10 English e-books and chapters.",

           image:
                "subject-images/english.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/english/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/english/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/english/chapter-03.pdf"
                },

                {
                    title: "Chapter 04",
                    pdf: "ebooks/class-10/english/chapter-04.pdf"
                },

                {
                    title: "Chapter 05",
                    pdf: "ebooks/class-10/english/chapter-05.pdf"
                }

            ]
        },


        "Social Science": {
            description: "Class 10 Social Science e-books and chapters.",

           image:
                "subject-images/socialscience.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/social-science/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/social-science/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/social-science/chapter-03.pdf"
                },

                {
                    title: "Chapter 04",
                    pdf: "ebooks/class-10/social-science/chapter-04.pdf"
                },

                {
                    title: "Chapter 05",
                    pdf: "ebooks/class-10/social-science/chapter-05.pdf"
                }

            ]
        },


        "Chitrakala": {
            description: "Class 10 Chitrakala e-books and chapters.",

           image:
                "subject-images/chitrakala.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/chitrakala/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/chitrakala/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/chitrakala/chapter-03.pdf"
                }

            ]
        },


        "Home Science": {
            description: "Class 10 Home Science e-books and chapters.",

           image:
                "subject-images/homescience.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/home-science/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/home-science/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/home-science/chapter-03.pdf"
                }

            ]
        },


        "Computer": {
            description: "Class 10 Computer e-books and chapters.",

           image:
                "subject-images/computer.png",

 
            chapters: [

                {
                    title: "Chapter 01",
                    pdf: "ebooks/class-10/computer/chapter-01.pdf"
                },

                {
                    title: "Chapter 02",
                    pdf: "ebooks/class-10/computer/chapter-02.pdf"
                },

                {
                    title: "Chapter 03",
                    pdf: "ebooks/class-10/computer/chapter-03.pdf"
                }

            ]
        }

    }

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("SSTC Student Page Loaded");

    loadLoggedInStudent();

    setupStudentSecurity();

    setupReaderDefaults();

    setCurrentYear();

});


/* =========================================================
   LOAD LOGGED-IN STUDENT
   ========================================================= */

function loadLoggedInStudent() {

    try {

        const loginStatus =
            sessionStorage.getItem(SSTC_SESSION_LOGIN);

        const rawStudentData =
            sessionStorage.getItem(SSTC_SESSION_DATA);


        console.log(
            "SSTC Login Status:",
            loginStatus
        );

        console.log(
            "SSTC Student Data:",
            rawStudentData
        );


        /* No login */

        if (
            !loginStatus ||
            loginStatus !== "true"
        ) {

            redirectToAccess();

            return;
        }


        /* No student data */

        if (!rawStudentData) {

            console.error(
                "SSTC student data not found in sessionStorage."
            );

            redirectToAccess();

            return;
        }


        /* Parse student data */

        studentData =
            JSON.parse(rawStudentData);


        /* Student ID required */

        if (
            !studentData ||
            !studentData.studentId
        ) {

            console.error(
                "Invalid SSTC student data:",
                studentData
            );

            redirectToAccess();

            return;
        }


        /* Render */

        renderStudentData();


    } catch (error) {

        console.error(
            "SSTC Student Load Error:",
            error
        );

        redirectToAccess();

    }

}


/* =========================================================
   REDIRECT TO SSTC ACCESS
   ========================================================= */

function redirectToAccess() {

    if (sstcRedirecting) {
        return;
    }

    sstcRedirecting = true;

    window.location.href =
        "sstc-access.html";

}


/* =========================================================
   RENDER STUDENT DATA
   ========================================================= */

function renderStudentData() {

    if (!studentData) {
        return;
    }


    console.log(
        "Rendering Student Data:",
        studentData
    );


    /* ================= NAME ================= */

    setElementText(
        "studentName",
        studentData.fullName ||
        studentData.name ||
        "-"
    );


    setElementText(
        "studentFullName",
        studentData.fullName ||
        studentData.name ||
        "-"
    );


    /* ================= STUDENT ID ================= */

    setElementText(
        "studentId",
        studentData.studentId ||
        studentData.id ||
        "-"
    );


    /* ================= CLASS ================= */

    const studentClass =
        studentData.className ||
        studentData.class ||
        studentData.standard ||
        "-";


    setElementText(
        "studentClass",
        studentClass
    );


    setElementText(
        "studentClassDetail",
        studentClass
    );


    /* ================= BOARD ================= */

    setElementText(
        "studentBoard",
        studentData.board ||
        "UP Board"
    );


    /* ================= GENDER ================= */

    setElementText(
        "studentGender",
        studentData.gender ||
        "-"
    );


    /* ================= MOBILE ================= */

    setElementText(
        "studentMobile",
        studentData.mobile ||
        studentData.phone ||
        "-"
    );


    /* ================= EMAIL ================= */

    setElementText(
        "studentEmail",
        studentData.email ||
        "-"
    );


    /* ================= SCHOOL ================= */

    setElementText(
        "studentSchool",
        studentData.school ||
        studentData.schoolName ||
        "-"
    );


    /* ================= SCHOOL PLACE ================= */

    setElementText(
        "studentSchoolPlace",
        studentData.schoolPlace ||
        studentData.city ||
        studentData.district ||
        "-"
    );


    /* ================= REGISTRATION DATE ================= */

    const registrationDate =
        studentData.registrationDate ||
        studentData.registeredAt ||
        "-";


    setElementText(
        "studentRegistrationDate",
        formatDate(registrationDate)
    );


    setElementText(
        "registrationDate",
        formatDate(registrationDate)
    );


    /* ================= LOGIN TIME ================= */

    const loginTime =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN_TIME
        ) ||
        studentData.loginTime ||
        "-";


    setElementText(
        "studentLoginTime",
        formatDateTime(loginTime)
    );


    setElementText(
        "loginTime",
        formatDateTime(loginTime)
    );


    /* ================= STATUS ================= */

    setElementText(
        "studentStatus",
        studentData.status ||
        "Active"
    );


    /* ================= AVATAR ================= */

    const avatar =
        document.getElementById(
            "studentAvatar"
        );


    if (avatar) {

        if (studentData.photo) {

            avatar.src =
                studentData.photo;

        } else if (studentData.avatar) {

            avatar.src =
                studentData.avatar;

        } else {

            avatar.style.display =
                "none";
        }

    }


    /* ================= INITIAL ================= */

    const initial =
        document.getElementById(
            "studentInitial"
        );


    if (initial) {

        const name =
            studentData.fullName ||
            studentData.name ||
            "S";

        initial.textContent =
            name
                .trim()
                .charAt(0)
                .toUpperCase();

    }


    /* ================= LIBRARY ================= */

    renderStudentLibrary();

}


/* =========================================================
   SAFE TEXT SETTER
   ========================================================= */

function setElementText(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
            ? value
            : "-";

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

    if (
        !value ||
        value === "-"
    ) {
        return "-";
    }


    try {

        const date =
            new Date(value);


        if (isNaN(date.getTime())) {
            return value;
        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );


    } catch (error) {

        return value;

    }

}


/* =========================================================
   FORMAT DATE TIME
   ========================================================= */

function formatDateTime(value) {

    if (
        !value ||
        value === "-"
    ) {
        return "-";
    }


    try {

        const date =
            new Date(value);


        if (isNaN(date.getTime())) {
            return value;
        }


        return date.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    } catch (error) {

        return value;

    }

}


/* =========================================================
   NORMALIZE STUDENT CLASS
   ========================================================= */

function normalizeStudentClass(value) {

    const text =
        String(value || "")
            .trim();


    const match =
        text.match(/\d+/);


    if (!match) {
        return "";
    }


    return match[0];

}


/* =========================================================
   RENDER STUDENT LIBRARY
   ========================================================= */

function renderStudentLibrary() {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    if (!carousel) {

        console.warn(
            "#subjectCarousel not found."
        );

        return;
    }


    const classNumber =
        normalizeStudentClass(
            studentData.className ||
            studentData.class ||
            studentData.standard
        );


    console.log(
        "Student Class:",
        classNumber
    );


    carousel.innerHTML = "";


    const classBooks =
        SSTC_EBOOKS[classNumber];


    if (!classBooks) {

        carousel.innerHTML = `
            <div class="sstc-empty-library">
                <p>No e-books available for Class ${classNumber || "-"}</p>
            </div>
        `;

        return;
    }


    renderSubjects(
        classBooks
    );

}


/* =========================================================
   RENDER SUBJECTS
   ========================================================= */

function renderSubjects(subjects) {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    if (!carousel) {
        return;
    }


    carousel.innerHTML = "";


    const subjectNames =
        Object.keys(subjects);


    if (subjectNames.length === 0) {

        carousel.innerHTML = `
            <div class="sstc-empty-library">
                <p>No subjects available.</p>
            </div>
        `;

        return;
    }


    subjectNames.forEach(
        function (
            subjectName,
            index
        ) {

            const subject =
                subjects[subjectName];


            const card =
                document.createElement(
                    "button"
                );


            card.type = "button";

            card.className =
                "subject-card";


            if (index === 0) {
                card.classList.add(
                    "active"
                );
            }


            card.innerHTML = `

                <div class="subject-card-title">
                    ${escapeHtml(subjectName)}
                </div>

                <div class="subject-card-count">
                    ${
                        subject.chapters
                            ? subject.chapters.length
                            : 0
                    }
                    Chapters
                </div>

            `;


            card.addEventListener(
                "click",
                function () {

                    selectSubject(
                        subjectName
                    );

                }
            );


            carousel.appendChild(
                card
            );

        }
    );


    /* Select first subject */

    selectSubject(
        subjectNames[0]
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   SELECT SUBJECT
   ========================================================= */

function selectSubject(subjectName) {

    if (!studentData) {
        return;
    }


    const classNumber =
        normalizeStudentClass(
            studentData.className ||
            studentData.class ||
            studentData.standard
        );


    const classBooks =
        SSTC_EBOOKS[classNumber];


    if (!classBooks) {
        return;
    }


    const subject =
        classBooks[subjectName];


    if (!subject) {
        return;
    }


    /* ================= SAVE CURRENT SUBJECT ================= */

    sessionStorage.setItem(
        SSTC_CURRENT_BOOK,
        subjectName
    );


    /* ================= SUBJECT TITLE ================= */

    setElementText(
        "selectedSubjectTitle",
        subjectName
    );


    /* ================= SUBJECT DESCRIPTION ================= */

    setElementText(
        "selectedSubjectDescription",
        subject.description ||
        "Select a chapter to open the e-book."
    );


    /* ================= ACTIVE SUBJECT CARD ================= */

    const cards =
        document.querySelectorAll(
            ".subject-card"
        );


    cards.forEach(
        function (card) {

            const title =
                card.querySelector(
                    ".subject-card-title"
                );


            if (
                title &&
                title.textContent.trim() ===
                subjectName
            ) {

                card.classList.add(
                    "active"
                );

            } else {

                card.classList.remove(
                    "active"
                );

            }

        }
    );


    /* ================= CHAPTERS ================= */

    renderChapters(
        subject.chapters || [],
        subjectName
    );

}


/* =========================================================
   RENDER CHAPTERS
   ========================================================= */

function renderChapters(
    chapters,
    subjectName
) {

    const grid =
        document.getElementById(
            "chapterGrid"
        );


    if (!grid) {

        console.warn(
            "#chapterGrid not found."
        );

        return;
    }


    grid.innerHTML = "";


    if (!chapters.length) {

        grid.innerHTML = `
            <div class="sstc-empty-library">
                <p>No chapters available.</p>
            </div>
        `;

        return;
    }


    chapters.forEach(
        function (
            chapter,
            index
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type = "button";

            button.className =
                "chapter-card";


            button.innerHTML = `

                <span class="chapter-number">
                    ${index + 1}
                </span>

                <span class="chapter-title">
                    ${escapeHtml(
                        chapter.title ||
                        `Chapter ${index + 1}`
                    )}
                </span>

            `;


            button.addEventListener(
                "click",
                function () {

                    openChapter(
                        subjectName,
                        index
                    );

                }
            );


            grid.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   OPEN CHAPTER
   ========================================================= */

function openChapter(
    subjectName,
    chapterIndex
) {

    if (!studentData) {
        return;
    }


    const classNumber =
        normalizeStudentClass(
            studentData.className ||
            studentData.class ||
            studentData.standard
        );


    const classBooks =
        SSTC_EBOOKS[classNumber];


    if (!classBooks) {

        console.error(
            "Books not found for class:",
            classNumber
        );

        return;
    }


    const subject =
        classBooks[subjectName];


    if (!subject) {

        console.error(
            "Subject not found:",
            subjectName
        );

        return;
    }


    const chapter =
        subject.chapters[
            chapterIndex
        ];


    if (!chapter) {

        console.error(
            "Chapter not found:",
            chapterIndex
        );

        return;
    }


    /* ================= SAVE SESSION ================= */

    sessionStorage.setItem(
        SSTC_CURRENT_BOOK,
        subjectName
    );


    sessionStorage.setItem(
        SSTC_CURRENT_CHAPTER,
        String(chapterIndex)
    );


    sessionStorage.setItem(
        SSTC_CURRENT_PAGE,
        "1"
    );


    /* ================= PDF URL ================= */

    const pdfUrl =
        getPdfUrl(
            chapter.pdf
        );


    console.log(
        "Opening PDF:",
        pdfUrl
    );


    /* ================= CURRENT CHAPTER TITLE ================= */

    setElementText(
        "currentChapterTitle",
        chapter.title ||
        `Chapter ${chapterIndex + 1}`
    );


    /* ================= PDF FRAME ================= */

    const currentFrame =
        document.getElementById(
            "pdfFrame"
        );


    if (!currentFrame) {

        console.error(
            "#pdfFrame not found."
        );

        return;
    }


    /* Reset zoom */

    sstcZoom = 100;

    applyZoom();


    /* Show loading state */

    const viewerEmpty =
        document.getElementById(
            "viewerEmpty"
        );


    if (viewerEmpty) {

        viewerEmpty.style.display =
            "flex";

    }


    /* Set PDF directly inside iframe */

    currentFrame.src =
        pdfUrl;


    /* ================= SCROLL TO READER ================= */

    const reader =
        document.getElementById(
            "pdfReader"
        ) ||
        document.getElementById(
            "readerSection"
        );


    if (reader) {

        setTimeout(
            function () {

                reader.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            100
        );

    }

}


/* =========================================================
   READER DEFAULTS
   ========================================================= */

function setupReaderDefaults() {

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (!frame) {
        return;
    }


    frame.addEventListener(
        "load",
        function () {

            pdfLoaded();

        }
    );


    frame.addEventListener(
        "error",
        function () {

            console.error(
                "PDF iframe failed to load."
            );

        }
    );


    sstcZoom = 100;

    applyZoom();

}


/* =========================================================
   PDF LOADED
   ========================================================= */

function pdfLoaded() {

    const viewerEmpty =
        document.getElementById(
            "viewerEmpty"
        );


    if (viewerEmpty) {

        viewerEmpty.style.display =
            "none";

    }

}


/* =========================================================
   APPLY ZOOM
   ========================================================= */

function applyZoom() {

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (!frame) {
        return;
    }


    const zoom =
        sstcZoom / 100;


    frame.style.transform =
        `scale(${zoom})`;


    frame.style.transformOrigin =
        "top left";


    if (sstcZoom !== 100) {

        frame.style.width =
            `${100 / zoom}%`;

        frame.style.height =
            `${100 / zoom}%`;

    } else {

        frame.style.width =
            "100%";

        frame.style.height =
            "100%";

    }


    const zoomText =
        document.getElementById(
            "zoomLevel"
        );


    if (zoomText) {

        zoomText.textContent =
            `${sstcZoom}%`;

    }

}


/* =========================================================
   ZOOM IN
   ========================================================= */

function zoomIn() {

    if (sstcZoom >= 200) {
        return;
    }


    sstcZoom += 10;

    applyZoom();

}


/* =========================================================
   ZOOM OUT
   ========================================================= */

function zoomOut() {

    if (sstcZoom <= 50) {
        return;
    }


    sstcZoom -= 10;

    applyZoom();

}


/* =========================================================
   FIT WIDTH
   ========================================================= */

function fitWidth() {

    sstcZoom = 100;

    applyZoom();

}


/* =========================================================
   FIT PAGE
   ========================================================= */

function fitPage() {

    sstcZoom = 90;

    applyZoom();

}


/* =========================================================
   FULLSCREEN
   ========================================================= */

function toggleFullscreen() {

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (!frame) {
        return;
    }


    if (
        document.fullscreenElement
    ) {

        document.exitFullscreen();

        return;

    }


    if (
        frame.requestFullscreen
    ) {

        frame.requestFullscreen();

    }

}


/* =========================================================
   PREVIOUS PAGE
   ========================================================= */

function previousPage() {

    console.log(
        "Previous page button clicked."
    );

}


/* =========================================================
   NEXT PAGE
   ========================================================= */

function nextPage() {

    console.log(
        "Next page button clicked."
    );

}


/* =========================================================
   SUBJECT CAROUSEL SCROLL
   ========================================================= */

function scrollSubjects(
    direction
) {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    if (!carousel) {
        return;
    }


    const amount = 300;


    carousel.scrollBy({

        left:
            direction === "left"
                ? -amount
                : amount,

        behavior: "smooth"

    });

}


/* =========================================================
   SET CURRENT YEAR
   ========================================================= */

function setCurrentYear() {

    const year =
        new Date().getFullYear();


    const elements =
        document.querySelectorAll(
            "[data-current-year]"
        );


    elements.forEach(
        function (element) {

            element.textContent =
                year;

        }
    );


    const footerYear =
        document.getElementById(
            "currentYear"
        );


    if (footerYear) {

        footerYear.textContent =
            year;

    }

}


/* =========================================================
   STUDENT LOGOUT
   ========================================================= */

function studentLogout() {

    if (sstcLoggingOut) {
        return;
    }


    sstcLoggingOut = true;


    try {

        sessionStorage.removeItem(
            SSTC_SESSION_LOGIN
        );

        sessionStorage.removeItem(
            SSTC_SESSION_DATA
        );

        sessionStorage.removeItem(
            SSTC_SESSION_LOGIN_TIME
        );

        sessionStorage.removeItem(
            SSTC_CURRENT_BOOK
        );

        sessionStorage.removeItem(
            SSTC_CURRENT_CHAPTER
        );

        sessionStorage.removeItem(
            SSTC_CURRENT_PAGE
        );


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    window.location.href =
        "sstc-access.html";

}


/* =========================================================
   SECURITY
   ========================================================= */

function setupStudentSecurity() {

    /* ================= RIGHT CLICK ================= */

    document.addEventListener(
        "contextmenu",
        function (event) {

            event.preventDefault();

        }
    );


    /* ================= DRAG ================= */

    document.addEventListener(
        "dragstart",
        function (event) {

            event.preventDefault();

        }
    );


    /* ================= SELECT ================= */

    document.addEventListener(
        "selectstart",
        function (event) {

            const target =
                event.target;


            if (
                target &&
                target.tagName &&
                target.tagName.toLowerCase() ===
                "input"
            ) {

                return;
            }


            event.preventDefault();

        }
    );


    /* ================= KEYBOARD ================= */

    document.addEventListener(
        "keydown",
        function (event) {

            const key =
                String(
                    event.key || ""
                ).toLowerCase();


            /* F12 */

            if (
                event.key === "F12"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + U */

            if (
                event.ctrlKey &&
                key === "u"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + S */

            if (
                event.ctrlKey &&
                key === "s"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + P */

            if (
                event.ctrlKey &&
                key === "p"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + Shift + I */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "i"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + Shift + J */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "j"
            ) {

                event.preventDefault();

                return;
            }


            /* Ctrl + Shift + C */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "c"
            ) {

                event.preventDefault();

                return;
            }

        }
    );

}


/* =========================================================
   WINDOW FUNCTIONS
   ========================================================= */

window.studentLogout =
    studentLogout;


window.zoomIn =
    zoomIn;


window.zoomOut =
    zoomOut;


window.fitWidth =
    fitWidth;


window.fitPage =
    fitPage;


window.toggleFullscreen =
    toggleFullscreen;


window.previousPage =
    previousPage;


window.nextPage =
    nextPage;


window.pdfLoaded =
    pdfLoaded;


window.scrollSubjects =
    scrollSubjects;


window.selectSubject =
    selectSubject;


window.openChapter =
    openChapter;


/* =========================================================
   END SSTC STUDENT PAGE
   ========================================================= */
