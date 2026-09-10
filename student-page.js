/* =========================================================
   SSTC STUDENT PORTAL
   LIVE STUDENT DATA
   SESSION + PROFILE + E-BOOK LIBRARY + PDF READER
   ========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
   ========================================================= */

let studentData = null;

let sstcRedirecting = false;

let sstcLoggingOut = false;

let sstcZoom = 100;


/* =========================================================
   SESSION KEYS
   ========================================================= */

const SSTC_SESSION_LOGIN =
    "sstcStudentLoggedIn";

const SSTC_SESSION_DATA =
    "sstcStudentData";

const SSTC_SESSION_LOGIN_TIME =
    "sstcStudentLoginTime";

const SSTC_CURRENT_BOOK =
    "sstcCurrentBook";

const SSTC_CURRENT_CHAPTER =
    "sstcCurrentChapter";

const SSTC_CURRENT_PAGE =
    "sstcCurrentPage";


/* =========================================================
   GITHUB PAGES BASE URL
   =========================================================
   
   Aapki website:
   https://shreescholarstuitioncentre.github.io/

   PDF:
   /ebooks/class-10/science/chapter-01.pdf

   Is function se relative PDF path ko proper
   GitHub Pages URL me convert kiya jayega.
   ========================================================= */

const SSTC_SITE_BASE_URL =
    window.location.origin;


/* =========================================================
   PDF URL BUILDER
   ========================================================= */

function getPdfUrl(pdfPath) {

    if (!pdfPath) {

        return "";

    }


    let cleanPath =
        String(pdfPath)
            .trim()
            .replace(/^\/+/, "");


    /*
     * Agar already complete URL hai
     * to usko as-it-is use karo.
     */

    if (
        /^https?:\/\//i.test(cleanPath)
    ) {

        return cleanPath;

    }


    /*
     * GitHub Pages root se PDF URL banega.
     */

    return (
        SSTC_SITE_BASE_URL +
        "/" +
        cleanPath
    );

}


/* =========================================================
   E-BOOK LIBRARY
   ========================================================= */

const SSTC_EBOOKS = {

    "10": {

        /* =====================================================
           SCIENCE
           ===================================================== */

        "Science": {

            description:
                "Class 10 Science E-Book Library",

            image:
                "subject-images/science.png",

            chapters: [

                {
                    number: 1,
                    title:
                        "Chemical Reactions and Equations",
                    pdf:
                        "ebooks/class-10/science/chapter-01.pdf"
                },

                {
                    number: 2,
                    title:
                        "Acids, Bases and Salts",
                    pdf:
                        "ebooks/class-10/science/chapter-02.pdf"
                },

                {
                    number: 3,
                    title:
                        "Metals and Non-metals",
                    pdf:
                        "ebooks/class-10/science/chapter-03.pdf"
                },

                {
                    number: 4,
                    title:
                        "Carbon and Its Compounds",
                    pdf:
                        "ebooks/class-10/science/chapter-04.pdf"
                },

                {
                    number: 5,
                    title:
                        "Life Processes",
                    pdf:
                        "ebooks/class-10/science/chapter-05.pdf"
                },

                {
                    number: 6,
                    title:
                        "Control and Coordination",
                    pdf:
                        "ebooks/class-10/science/chapter-06.pdf"
                },

                {
                    number: 7,
                    title:
                        "How do Organisms Reproduce?",
                    pdf:
                        "ebooks/class-10/science/chapter-07.pdf"
                },

                {
                    number: 8,
                    title:
                        "Heredity",
                    pdf:
                        "ebooks/class-10/science/chapter-08.pdf"
                },

                {
                    number: 9,
                    title:
                        "Light – Reflection and Refraction",
                    pdf:
                        "ebooks/class-10/science/chapter-09.pdf"
                },

                {
                    number: 10,
                    title:
                        "The Human Eye and the Colourful World",
                    pdf:
                        "ebooks/class-10/science/chapter-10.pdf"
                },

                {
                    number: 11,
                    title:
                        "Electricity",
                    pdf:
                        "ebooks/class-10/science/chapter-11.pdf"
                },

                {
                    number: 12,
                    title:
                        "Magnetic Effects of Electric Current",
                    pdf:
                        "ebooks/class-10/science/chapter-12.pdf"
                },

                {
                    number: 13,
                    title:
                        "Our Environment",
                    pdf:
                        "ebooks/class-10/science/chapter-13.pdf"
                }

            ]

        },


        /* =====================================================
           MATHEMATICS
           ===================================================== */

        "Mathematics": {

            description:
                "Class 10 Mathematics E-Book Library",

            image:
                "subject-images/maths.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-05.pdf"
                },

                {
                    number: 6,
                    title: "Chapter 6",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-06.pdf"
                },

                {
                    number: 7,
                    title: "Chapter 7",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-07.pdf"
                },

                {
                    number: 8,
                    title: "Chapter 8",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-08.pdf"
                },

                {
                    number: 9,
                    title: "Chapter 9",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-09.pdf"
                },

                {
                    number: 10,
                    title: "Chapter 10",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-10.pdf"
                },

                {
                    number: 11,
                    title: "Chapter 11",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-11.pdf"
                },

                {
                    number: 12,
                    title: "Chapter 12",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-12.pdf"
                },

                {
                    number: 13,
                    title: "Chapter 13",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-13.pdf"
                },

                {
                    number: 14,
                    title: "Chapter 14",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-14.pdf"
                },

                {
                    number: 15,
                    title: "Chapter 15",
                    pdf:
                        "ebooks/class-10/mathematics/chapter-15.pdf"
                }

            ]

        },


        /* =====================================================
           HINDI
           ===================================================== */

        "Hindi": {

            description:
                "Class 10 Hindi E-Book Library",

            image:
                "subject-images/Hindi.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/hindi/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/hindi/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/hindi/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/hindi/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/hindi/chapter-05.pdf"
                },

                {
                    number: 6,
                    title: "Chapter 6",
                    pdf:
                        "ebooks/class-10/hindi/chapter-06.pdf"
                },

                {
                    number: 7,
                    title: "Chapter 7",
                    pdf:
                        "ebooks/class-10/hindi/chapter-07.pdf"
                },

                {
                    number: 8,
                    title: "Chapter 8",
                    pdf:
                        "ebooks/class-10/hindi/chapter-08.pdf"
                },

                {
                    number: 9,
                    title: "Chapter 9",
                    pdf:
                        "ebooks/class-10/hindi/chapter-09.pdf"
                },

                {
                    number: 10,
                    title: "Chapter 10",
                    pdf:
                        "ebooks/class-10/hindi/chapter-10.pdf"
                }

            ]

        },


        /* =====================================================
           ENGLISH
           ===================================================== */

        "English": {

            description:
                "Class 10 English E-Book Library",

            image:
                "subject-images/english.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/english/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/english/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/english/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/english/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/english/chapter-05.pdf"
                },

                {
                    number: 6,
                    title: "Chapter 6",
                    pdf:
                        "ebooks/class-10/english/chapter-06.pdf"
                },

                {
                    number: 7,
                    title: "Chapter 7",
                    pdf:
                        "ebooks/class-10/english/chapter-07.pdf"
                },

                {
                    number: 8,
                    title: "Chapter 8",
                    pdf:
                        "ebooks/class-10/english/chapter-08.pdf"
                },

                {
                    number: 9,
                    title: "Chapter 9",
                    pdf:
                        "ebooks/class-10/english/chapter-09.pdf"
                },

                {
                    number: 10,
                    title: "Chapter 10",
                    pdf:
                        "ebooks/class-10/english/chapter-10.pdf"
                }

            ]

        },


        /* =====================================================
           SOCIAL SCIENCE
           ===================================================== */

        "Social Science": {

            description:
                "Class 10 Social Science E-Book Library",

            image:
                "subject-images/socialscience.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/social-science/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/social-science/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/social-science/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/social-science/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/social-science/chapter-05.pdf"
                },

                {
                    number: 6,
                    title: "Chapter 6",
                    pdf:
                        "ebooks/class-10/social-science/chapter-06.pdf"
                },

                {
                    number: 7,
                    title: "Chapter 7",
                    pdf:
                        "ebooks/class-10/social-science/chapter-07.pdf"
                },

                {
                    number: 8,
                    title: "Chapter 8",
                    pdf:
                        "ebooks/class-10/social-science/chapter-08.pdf"
                },

                {
                    number: 9,
                    title: "Chapter 9",
                    pdf:
                        "ebooks/class-10/social-science/chapter-09.pdf"
                },

                {
                    number: 10,
                    title: "Chapter 10",
                    pdf:
                        "ebooks/class-10/social-science/chapter-10.pdf"
                }

            ]

        },


        /* =====================================================
           CHITRAKALA
           ===================================================== */

        "Chitrakala": {

            description:
                "Class 10 Chitrakala E-Book Library",

            image:
                "subject-images/chitrakala.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/chitrakala/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/chitrakala/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/chitrakala/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/chitrakala/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/chitrakala/chapter-05.pdf"
                }

            ]

        },


        /* =====================================================
           HOME SCIENCE
           ===================================================== */

        "Home Science": {

            description:
                "Class 10 Home Science E-Book Library",

            image:
                "subject-images/homescience.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/home-science/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/home-science/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/home-science/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/home-science/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/home-science/chapter-05.pdf"
                }

            ]

        },


        /* =====================================================
           COMPUTER
           ===================================================== */

        "Computer": {

            description:
                "Class 10 Computer E-Book Library",

            image:
                "subject-images/computer.png",

            chapters: [

                {
                    number: 1,
                    title: "Chapter 1",
                    pdf:
                        "ebooks/class-10/computer/chapter-01.pdf"
                },

                {
                    number: 2,
                    title: "Chapter 2",
                    pdf:
                        "ebooks/class-10/computer/chapter-02.pdf"
                },

                {
                    number: 3,
                    title: "Chapter 3",
                    pdf:
                        "ebooks/class-10/computer/chapter-03.pdf"
                },

                {
                    number: 4,
                    title: "Chapter 4",
                    pdf:
                        "ebooks/class-10/computer/chapter-04.pdf"
                },

                {
                    number: 5,
                    title: "Chapter 5",
                    pdf:
                        "ebooks/class-10/computer/chapter-05.pdf"
                },

                {
                    number: 6,
                    title: "Chapter 6",
                    pdf:
                        "ebooks/class-10/computer/chapter-06.pdf"
                },

                {
                    number: 7,
                    title: "Chapter 7",
                    pdf:
                        "ebooks/class-10/computer/chapter-07.pdf"
                },

                {
                    number: 8,
                    title: "Chapter 8",
                    pdf:
                        "ebooks/class-10/computer/chapter-08.pdf"
                }

            ]

        }

    }

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadLoggedInStudent();

        setupStudentSecurity();

        setupReaderDefaults();

        setCurrentYear();

    }
);


/* =========================================================
   CHECK SESSION
   ========================================================= */

function checkStudentSession() {

    const loggedIn =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN
        );

    const savedData =
        sessionStorage.getItem(
            SSTC_SESSION_DATA
        );


    if (
        loggedIn !== "true" ||
        !savedData
    ) {

        redirectToAccessPage();

        return false;

    }


    return true;

}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

function loadLoggedInStudent() {

    const loggedIn =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN
        );

    const savedData =
        sessionStorage.getItem(
            SSTC_SESSION_DATA
        );


    if (
        loggedIn !== "true" ||
        !savedData
    ) {

        redirectToAccessPage();

        return;

    }


    try {

        studentData =
            JSON.parse(
                savedData
            );

    }

    catch (error) {

        console.error(
            "SSTC student session error:",
            error
        );

        clearStudentSession();

        redirectToAccessPage();

        return;

    }


    if (
        !studentData ||
        !studentData.studentId
    ) {

        clearStudentSession();

        redirectToAccessPage();

        return;

    }


    let loginTime =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN_TIME
        );


    if (!loginTime) {

        loginTime =
            createLoginTime();


        sessionStorage.setItem(
            SSTC_SESSION_LOGIN_TIME,
            loginTime
        );

    }


    renderStudentData();

}


/* =========================================================
   CREATE LOGIN TIME
   ========================================================= */

function createLoginTime() {

    const now =
        new Date();


    return now.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

}


/* =========================================================
   NORMALIZE CLASS
   ========================================================= */

function normalizeStudentClass(value) {

    const text =
        String(
            value || ""
        ).trim();


    const match =
        text.match(
            /\d+/
        );


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


    const fullName =
        getStudentValue(
            [
                "fullName",
                "name"
            ],
            "Student"
        );


    setText(
        "studentName",
        fullName
    );


    setText(
        "studentFullName",
        fullName
    );


    setText(
        "studentId",
        getStudentValue(
            [
                "studentId",
                "id"
            ],
            "-"
        )
    );


    const classValue =
        getStudentValue(
            [
                "className",
                "Class",
                "class",
                "studentClass"
            ],
            "-"
        );


    setText(
        "studentClass",
        classValue
    );


    setText(
        "studentClassDetail",
        classValue
    );


    setText(
        "studentBoard",
        getStudentValue(
            [
                "board"
            ],
            "-"
        )
    );


    setText(
        "studentGender",
        getStudentValue(
            [
                "gender"
            ],
            "-"
        )
    );


    setText(
        "studentMobile",
        getStudentValue(
            [
                "mobileNumber",
                "mobile",
                "phone"
            ],
            "-"
        )
    );


    setText(
        "studentEmail",
        getStudentValue(
            [
                "emailId",
                "email"
            ],
            "-"
        )
    );


    setText(
        "studentSchool",
        getStudentValue(
            [
                "schoolName",
                "school"
            ],
            "-"
        )
    );


    setText(
        "studentSchoolPlace",
        getStudentValue(
            [
                "schoolPlace"
            ],
            "-"
        )
    );


    const registrationDate =
        getStudentValue(
            [
                "registrationDate",
                "registrationDateTime"
            ],
            "-"
        );


    setText(
        "studentRegistrationDate",
        registrationDate
    );


    setText(
        "registrationDate",
        registrationDate
    );


    const loginTime =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN_TIME
        ) ||
        createLoginTime();


    sessionStorage.setItem(
        SSTC_SESSION_LOGIN_TIME,
        loginTime
    );


    setText(
        "studentLoginTime",
        loginTime
    );


    setText(
        "loginTime",
        loginTime
    );


    const status =
        String(
            studentData.status ||
            "Active"
        ).trim();


    setText(
        "studentStatus",
        status
    );


    const statusElement =
        document.getElementById(
            "studentStatus"
        );


    if (statusElement) {

        statusElement.classList.remove(
            "status-active",
            "status-inactive"
        );


        if (
            status.toLowerCase() ===
            "active"
        ) {

            statusElement.classList.add(
                "status-active"
            );

        }

        else {

            statusElement.classList.add(
                "status-inactive"
            );

        }

    }


    const firstLetter =
        fullName
            .trim()
            .charAt(0)
            .toUpperCase();


    setText(
        "studentAvatar",
        firstLetter || "S"
    );


    setText(
        "studentInitial",
        firstLetter || "S"
    );


    document.title =
        "SSTC | " +
        fullName +
        " - Student Portal";


    renderStudentLibrary();


    try {

        document.dispatchEvent(
            new CustomEvent(
                "sstcStudentLoaded",
                {
                    detail:
                        studentData
                }
            )
        );

    }

    catch (error) {

        console.warn(
            "SSTC student event warning:",
            error
        );

    }

}


/* =========================================================
   RENDER STUDENT LIBRARY
   ========================================================= */

function renderStudentLibrary() {

    const rawClass =
        getStudentValue(
            [
                "className",
                "Class",
                "class",
                "studentClass"
            ],
            ""
        );


    const classNumber =
        normalizeStudentClass(
            rawClass
        );


    const classLibrary =
        SSTC_EBOOKS[
            classNumber
        ];


    if (
        !classLibrary ||
        Object.keys(
            classLibrary
        ).length === 0
    ) {

        renderNoLibrary();

        return;

    }


    renderSubjects(
        classLibrary
    );


    updateLibraryCounts(
        classLibrary
    );


    const subjectNames =
        Object.keys(
            classLibrary
        );


    if (
        subjectNames.length === 1
    ) {

        selectSubject(
            subjectNames[0]
        );

    }

}


/* =========================================================
   RENDER SUBJECT CAROUSEL
   ========================================================= */

function renderSubjects(
    classLibrary
) {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    if (!carousel) {

        return;

    }


    carousel.innerHTML = "";


    const subjectNames =
        Object.keys(
            classLibrary
        );


    subjectNames.forEach(
        function (
            subjectName
        ) {

            const subject =
                classLibrary[
                    subjectName
                ];


            const card =
                document.createElement(
                    "button"
                );


            card.type =
                "button";


            card.className =
                "subject-card";


            card.setAttribute(
                "data-subject",
                subjectName
            );


            card.addEventListener(
                "click",
                function () {

                    selectSubject(
                        subjectName
                    );

                }
            );


            const imageWrapper =
                document.createElement(
                    "div"
                );


            imageWrapper.className =
                "subject-card-image";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                subject.image ||
                "Logo.png";


            image.alt =
                subjectName +
                " Subject";


            image.draggable =
                false;


            image.loading =
                "lazy";


            image.onerror =
                function () {

                    this.onerror =
                        null;

                    this.src =
                        "Logo.png";

                };


            imageWrapper.appendChild(
                image
            );


            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "subject-card-content";


            const badge =
                document.createElement(
                    "span"
                );


            badge.className =
                "subject-card-badge";


            badge.textContent =
                "E-BOOK";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                subjectName;


            const description =
                document.createElement(
                    "p"
                );


            description.textContent =
                subject.description ||
                "View available chapters";


            const count =
                document.createElement(
                    "span"
                );


            count.className =
                "subject-chapter-count";


            count.textContent =
                (
                    Array.isArray(
                        subject.chapters
                    )
                        ? subject.chapters.length
                        : 0
                ) +
                " Chapters";


            content.appendChild(
                badge
            );


            content.appendChild(
                title
            );


            content.appendChild(
                description
            );


            content.appendChild(
                count
            );


            card.appendChild(
                imageWrapper
            );


            card.appendChild(
                content
            );


            carousel.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   SELECT SUBJECT
   ========================================================= */

function selectSubject(
    subjectName
) {

    if (!studentData) {

        return;

    }


    const classNumber =
        normalizeStudentClass(
            getStudentValue(
                [
                    "className",
                    "Class",
                    "class",
                    "studentClass"
                ],
                ""
            )
        );


    const classLibrary =
        SSTC_EBOOKS[
            classNumber
        ];


    if (!classLibrary) {

        return;

    }


    const subject =
        classLibrary[
            subjectName
        ];


    if (!subject) {

        return;

    }


    sessionStorage.setItem(
        SSTC_CURRENT_BOOK,
        subjectName
    );


    setText(
        "selectedSubjectTitle",
        subjectName
    );


    setText(
        "selectedSubjectDescription",
        subject.description ||
        "Select a chapter to start reading."
    );


    const cards =
        document.querySelectorAll(
            ".subject-card"
        );


    cards.forEach(
        function (
            card
        ) {

            card.classList.remove(
                "active"
            );


            if (
                card.getAttribute(
                    "data-subject"
                ) === subjectName
            ) {

                card.classList.add(
                    "active"
                );

            }

        }
    );


    renderChapters(
        subjectName,
        subject
    );


    const chapterSection =
        document.getElementById(
            "chapterSection"
        );


    if (chapterSection) {

        chapterSection.scrollIntoView(
            {
                behavior:
                    "smooth",

                block:
                    "start"
            }
        );

    }

}


/* =========================================================
   RENDER CHAPTER LIST
   ========================================================= */

function renderChapters(
    subjectName,
    subject
) {

    const grid =
        document.getElementById(
            "chapterGrid"
        );


    if (!grid) {

        return;

    }


    grid.innerHTML = "";


    if (
        !subject.chapters ||
        subject.chapters.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "chapter-empty";


        empty.innerHTML =
            `
            <div>📚</div>
            <h3>No Chapters Available</h3>
            <p>Chapters for this subject are not available yet.</p>
            `;


        grid.appendChild(
            empty
        );


        return;

    }


    subject.chapters.forEach(
        function (
            chapter,
            index
        ) {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "chapter-item";


            item.setAttribute(
                "data-chapter",
                String(
                    chapter.number
                )
            );


            item.addEventListener(
                "click",
                function () {

                    openChapter(
                        subjectName,
                        index
                    );

                }
            );


            const number =
                document.createElement(
                    "div"
                );


            number.className =
                "chapter-number";


            number.textContent =
                String(
                    chapter.number
                );


            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "chapter-icon";


            icon.textContent =
                "📖";


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "chapter-info";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                chapter.title;


            const subtitle =
                document.createElement(
                    "p"
                );


            subtitle.textContent =
                "Chapter " +
                chapter.number +
                " • E-Book";


            info.appendChild(
                title
            );


            info.appendChild(
                subtitle
            );


            const open =
                document.createElement(
                    "span"
                );


            open.className =
                "chapter-open";


            open.textContent =
                "Open PDF →";


            item.appendChild(
                number
            );


            item.appendChild(
                icon
            );


            item.appendChild(
                info
            );


            item.appendChild(
                open
            );


            grid.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   OPEN CHAPTER / PDF
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
            getStudentValue(
                [
                    "className",
                    "Class",
                    "class",
                    "studentClass"
                ],
                ""
            )
        );


    const classLibrary =
        SSTC_EBOOKS[
            classNumber
        ];


    if (!classLibrary) {

        return;

    }


    const subject =
        classLibrary[
            subjectName
        ];


    if (!subject) {

        return;

    }


    const chapter =
        subject.chapters[
            chapterIndex
        ];


    if (!chapter) {

        return;

    }


    if (!chapter.pdf) {

        showSecurityMessage(
            "This chapter PDF is not available yet."
        );

        return;

    }


    /* =====================================================
       SAVE SESSION
       ===================================================== */

    sessionStorage.setItem(
        SSTC_CURRENT_BOOK,
        subjectName
    );


    sessionStorage.setItem(
        SSTC_CURRENT_CHAPTER,
        String(
            chapter.number
        )
    );


    sessionStorage.setItem(
        SSTC_CURRENT_PAGE,
        "1"
    );


    /* =====================================================
       ACTIVE CHAPTER
       ===================================================== */

    const chapterItems =
        document.querySelectorAll(
            ".chapter-item"
        );


    chapterItems.forEach(
        function (
            item
        ) {

            item.classList.remove(
                "active"
            );

        }
    );


    const selectedChapter =
        document.querySelector(
            '.chapter-item[data-chapter="' +
            chapter.number +
            '"]'
        );


    if (selectedChapter) {

        selectedChapter.classList.add(
            "active"
        );

    }


    /* =====================================================
       READER INFORMATION
       ===================================================== */

    setText(
        "currentBookTitle",
        chapter.title
    );


    setText(
        "currentBookStatus",
        subjectName +
        " • Chapter " +
        chapter.number
    );


    setText(
        "currentChapterNumber",
        chapter.number
    );


    /* =====================================================
       PDF FRAME
       ===================================================== */

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    const empty =
        document.getElementById(
            "viewerEmpty"
        );


    if (!frame) {

        console.error(
            "SSTC: pdfFrame not found."
        );

        return;

    }


    /* =====================================================
       SHOW LOADING
       ===================================================== */

    if (empty) {

        empty.style.display =
            "flex";


        empty.innerHTML =
            `
            <div class="empty-icon">
                📖
            </div>

            <h3>
                Opening Chapter...
            </h3>

            <p>
                ${escapeHtml(
                    chapter.title
                )}
            </p>
            `;

    }


    /* =====================================================
       CLEAR OLD PDF
       ===================================================== */

    frame.src =
        "about:blank";


    /* =====================================================
       BUILD PDF.JS VIEWER URL
       ===================================================== */

    const pdfUrl =
        new URL(
            chapter.pdf,
            window.location.href
        ).href;


    const viewerUrl =
        "pdf-viewer.html?file=" +
        encodeURIComponent(
            pdfUrl
        );


    console.log(
        "SSTC PDF:",
        pdfUrl
    );


    console.log(
        "SSTC PDF Viewer:",
        viewerUrl
    );


    /* =====================================================
       LOAD CUSTOM PDF VIEWER
       ===================================================== */

    setTimeout(
        function () {

            const currentFrame =
                document.getElementById(
                    "pdfFrame"
                );


            if (!currentFrame) {

                return;

            }


            currentFrame.src =
                viewerUrl;


        },
        100
    );


    /* =====================================================
       SCROLL TO READER
       ===================================================== */

    const readerSection =
        document.getElementById(
            "readerSection"
        );


    if (readerSection) {

        setTimeout(
            function () {

                readerSection.scrollIntoView(
                    {
                        behavior:
                            "smooth",

                        block:
                            "start"
                    }
                );

            },
            150
        );

    }

}

    /* =====================================================
       SAVE SESSION
       ===================================================== */

    sessionStorage.setItem(
        SSTC_CURRENT_BOOK,
        subjectName
    );


    sessionStorage.setItem(
        SSTC_CURRENT_CHAPTER,
        String(
            chapter.number
        )
    );


    sessionStorage.setItem(
        SSTC_CURRENT_PAGE,
        "1"
    );


    /* =====================================================
       ACTIVE CHAPTER
       ===================================================== */

    const chapterItems =
        document.querySelectorAll(
            ".chapter-item"
        );


    chapterItems.forEach(
        function (
            item
        ) {

            item.classList.remove(
                "active"
            );

        }
    );


    const selectedChapter =
        document.querySelector(
            '.chapter-item[data-chapter="' +
            chapter.number +
            '"]'
        );


    if (selectedChapter) {

        selectedChapter.classList.add(
            "active"
        );

    }


    /* =====================================================
       READER INFORMATION
       ===================================================== */

    setText(
        "currentBookTitle",
        chapter.title
    );


    setText(
        "currentBookStatus",
        subjectName +
        " • Chapter " +
        chapter.number
    );


    setText(
        "currentChapterNumber",
        chapter.number
    );


    /* =====================================================
       PDF FRAME
       ===================================================== */

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    const empty =
        document.getElementById(
            "viewerEmpty"
        );


    if (!frame) {

        console.error(
            "SSTC PDF ERROR: #pdfFrame not found."
        );

        showSecurityMessage(
            "PDF viewer is not available."
        );

        return;

    }


    /*
     * IMPORTANT:
     * Relative path ko GitHub Pages absolute URL me
     * convert kar rahe hain.
     */

    const pdfUrl =
        getPdfUrl(
            chapter.pdf
        );


    console.log(
        "SSTC PDF:",
        pdfUrl
    );


    /*
     * Opening message.
     */

    if (empty) {

        empty.style.display =
            "flex";


        empty.innerHTML =
            `
            <div class="empty-icon">📖</div>
            <h3>Opening Chapter...</h3>
            <p>${escapeHtml(chapter.title)}</p>
            `;

    }


    /*
     * Pehle old PDF remove.
     */

    frame.src =
        "about:blank";


    /*
     * Thoda delay dekar new PDF load.
     */

    setTimeout(
        function () {

            const currentFrame =
                document.getElementById(
                    "pdfFrame"
                );


            const currentEmpty =
                document.getElementById(
                    "viewerEmpty"
                );


            if (!currentFrame) {

                return;

            }


            if (currentEmpty) {

                currentEmpty.style.display =
                    "flex";

            }


            /*
             * PDF direct GitHub Pages URL.
             */

            currentFrame.src =
                pdfUrl;


            /*
             * PDF frame ko visible rakho.
             */

            currentFrame.style.display =
                "block";


            /*
             * Browser ko reload ke liye force.
             */

            try {

                currentFrame.contentWindow;

            }

            catch (error) {

                console.warn(
                    "SSTC iframe warning:",
                    error
                );

            }

        },
        100
    );


    /* =====================================================
       SCROLL TO READER
       ===================================================== */

    const readerSection =
        document.getElementById(
            "readerSection"
        );


    if (readerSection) {

        setTimeout(
            function () {

                readerSection.scrollIntoView(
                    {
                        behavior:
                            "smooth",

                        block:
                            "start"
                    }
                );

            },
            150
        );

    }

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


    const amount =
        carousel.clientWidth;


    carousel.scrollBy(
        {
            left:
                direction * amount,

            behavior:
                "smooth"
        }
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value || ""
    )
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
   NO LIBRARY
   ========================================================= */

function renderNoLibrary() {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    const grid =
        document.getElementById(
            "chapterGrid"
        );


    if (carousel) {

        carousel.innerHTML =
            `
            <div class="library-empty">
                <div>📚</div>
                <h3>No E-Books Available</h3>
                <p>Your class library is not available yet.</p>
            </div>
            `;

    }


    if (grid) {

        grid.innerHTML =
            `
            <div class="chapter-empty">
                <div>📚</div>
                <h3>Select a Subject</h3>
                <p>Available chapters will appear here.</p>
            </div>
            `;

    }


    setText(
        "selectedSubjectTitle",
        "No Subject Available"
    );


    setText(
        "selectedSubjectDescription",
        "E-books for your class are not available yet."
    );


    updateNumber(
        "ebookCount",
        0
    );


    updateNumber(
        "totalBooks",
        0
    );


    updateNumber(
        "totalSubjects",
        0
    );


    updateNumber(
        "rentedBooks",
        0
    );


    updateNumber(
        "purchasedBooks",
        0
    );

}


/* =========================================================
   UPDATE LIBRARY COUNTS
   ========================================================= */

function updateLibraryCounts(
    classLibrary
) {

    const subjectNames =
        Object.keys(
            classLibrary
        );


    let totalChapters =
        0;


    subjectNames.forEach(
        function (
            subjectName
        ) {

            const subject =
                classLibrary[
                    subjectName
                ];


            if (
                subject &&
                Array.isArray(
                    subject.chapters
                )
            ) {

                totalChapters +=
                    subject.chapters.length;

            }

        }
    );


    updateNumber(
        "ebookCount",
        totalChapters
    );


    updateNumber(
        "totalBooks",
        totalChapters
    );


    updateNumber(
        "totalSubjects",
        subjectNames.length
    );


    updateNumber(
        "rentedBooks",
        0
    );


    updateNumber(
        "purchasedBooks",
        0
    );

}


/* =========================================================
   UPDATE NUMBER
   ========================================================= */

function updateNumber(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        String(
            value
        );

}


/* =========================================================
   GET STUDENT VALUE
   ========================================================= */

function getStudentValue(
    keys,
    fallback
) {

    if (
        !studentData ||
        !Array.isArray(keys)
    ) {

        return fallback;

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const key =
            keys[i];


        if (
            studentData[key] !==
                undefined &&
            studentData[key] !==
                null &&
            String(
                studentData[key]
            ).trim() !== ""
        ) {

            return String(
                studentData[key]
            ).trim();

        }

    }


    return fallback;

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        element.textContent =
            "-";

    }

    else {

        element.textContent =
            String(value);

    }

}


/* =========================================================
   CLEAR SESSION
   ========================================================= */

function clearStudentSession() {

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

    }

    catch (error) {

        console.error(
            "SSTC session clear error:",
            error
        );

    }


    studentData =
        null;

}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToAccessPage() {

    if (sstcRedirecting) {

        return;

    }


    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    if (
        currentPage ===
        "sstc-access.html"
    ) {

        return;

    }


    sstcRedirecting =
        true;


    window.location.replace(
        "sstc-access.html"
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function studentLogout(
    event
) {

    if (event) {

        event.preventDefault();

    }


    if (sstcLoggingOut) {

        return false;

    }


    sstcLoggingOut =
        true;


    const pdfFrame =
        document.getElementById(
            "pdfFrame"
        );


    if (pdfFrame) {

        try {

            pdfFrame.src =
                "about:blank";

        }

        catch (error) {

            console.warn(
                "PDF cleanup warning:",
                error
            );

        }

    }


    clearStudentSession();


    window.location.replace(
        "sstc-access.html"
    );


    return false;

}


/* =========================================================
   READER DEFAULTS
   ========================================================= */

function setupReaderDefaults() {

    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (frame) {

        frame.setAttribute(
            "draggable",
            "false"
        );


        frame.setAttribute(
            "loading",
            "eager"
        );


        /*
         * PDF load event.
         */

        frame.addEventListener(
            "load",
            function () {

                pdfLoaded();

            }
        );


        /*
         * PDF error event.
         */

        frame.addEventListener(
            "error",
            function () {

                console.error(
                    "SSTC PDF iframe failed to load."
                );

                showSecurityMessage(
                    "PDF could not be loaded."
                );

            }
        );

    }


    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (viewer) {

        viewer.addEventListener(
            "contextmenu",
            function (
                event
            ) {

                event.preventDefault();

            }
        );

    }

}


/* =========================================================
   PDF LOADED
   ========================================================= */

function pdfLoaded() {

    const empty =
        document.getElementById(
            "viewerEmpty"
        );


    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (!frame) {

        return;

    }


    /*
     * about:blank hone par empty screen visible rahe.
     */

    if (
        frame.src &&
        frame.src !==
            "about:blank" &&
        frame.src !==
            window.location.href
    ) {

        if (empty) {

            empty.style.display =
                "none";

        }

    }

}


/* =========================================================
   ZOOM IN
   ========================================================= */

function zoomIn() {

    sstcZoom =
        Math.min(
            200,
            sstcZoom + 10
        );


    applyZoom();

}


/* =========================================================
   ZOOM OUT
   ========================================================= */

function zoomOut() {

    sstcZoom =
        Math.max(
            50,
            sstcZoom - 10
        );


    applyZoom();

}


/* =========================================================
   APPLY ZOOM
   ========================================================= */

function applyZoom() {

    setText(
        "zoomLevel",
        sstcZoom + "%"
    );


    const frame =
        document.getElementById(
            "pdfFrame"
        );


    if (frame) {

        frame.style.transform =
            "scale(" +
            (sstcZoom / 100) +
            ")";


        frame.style.transformOrigin =
            "top left";


        frame.style.width =
            (10000 / sstcZoom) +
            "%";


        frame.style.height =
            (10000 / sstcZoom) +
            "%";

    }

}


/* =========================================================
   FIT WIDTH
   ========================================================= */

function fitWidth() {

    sstcZoom =
        100;


    applyZoom();


    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (viewer) {

        viewer.scrollLeft =
            0;

    }

}


/* =========================================================
   FIT PAGE
   ========================================================= */

function fitPage() {

    sstcZoom =
        90;


    applyZoom();


    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (viewer) {

        viewer.scrollTop =
            0;

        viewer.scrollLeft =
            0;

    }

}


/* =========================================================
   FULLSCREEN
   ========================================================= */

function toggleFullscreen() {

    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (!viewer) {

        return;

    }


    if (
        document.fullscreenElement
    ) {

        if (
            document.exitFullscreen
        ) {

            document.exitFullscreen();

        }

        return;

    }


    if (
        viewer.requestFullscreen
    ) {

        viewer.requestFullscreen()
            .catch(
                function (
                    error
                ) {

                    console.warn(
                        "Fullscreen unavailable:",
                        error
                    );

                }
            );

    }

}


/* =========================================================
   PREVIOUS CHAPTER
   ========================================================= */

function previousPage() {

    navigateChapter(
        -1
    );

}


/* =========================================================
   NEXT CHAPTER
   ========================================================= */

function nextPage() {

    navigateChapter(
        1
    );

}


/* =========================================================
   NAVIGATE CHAPTER
   ========================================================= */

function navigateChapter(
    direction
) {

    if (!studentData) {

        return;

    }


    const classNumber =
        normalizeStudentClass(
            getStudentValue(
                [
                    "className",
                    "Class",
                    "class",
                    "studentClass"
                ],
                ""
            )
        );


    const classLibrary =
        SSTC_EBOOKS[
            classNumber
        ];


    if (!classLibrary) {

        return;

    }


    const subjectName =
        sessionStorage.getItem(
            SSTC_CURRENT_BOOK
        );


    if (!subjectName) {

        showSecurityMessage(
            "Please select a subject first."
        );

        return;

    }


    const subject =
        classLibrary[
            subjectName
        ];


    if (!subject) {

        return;

    }


    let currentChapter =
        parseInt(
            sessionStorage.getItem(
                SSTC_CURRENT_CHAPTER
            ) ||
            "1",
            10
        );


    let newChapter =
        currentChapter +
        direction;


    if (
        newChapter < 1
    ) {

        newChapter =
            1;

    }


    if (
        newChapter >
        subject.chapters.length
    ) {

        newChapter =
            subject.chapters.length;

    }


    openChapter(
        subjectName,
        newChapter - 1
    );

}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

function setCurrentYear() {

    const year =
        new Date()
            .getFullYear();


    setText(
        "currentYear",
        year
    );

}


/* =========================================================
   SECURITY
   ========================================================= */

function setupStudentSecurity() {

    /* RIGHT CLICK */

    document.addEventListener(
        "contextmenu",
        function (
            event
        ) {

            event.preventDefault();

        }
    );


    /* DRAG */

    document.addEventListener(
        "dragstart",
        function (
            event
        ) {

            event.preventDefault();

        }
    );


    /* TEXT SELECTION */

    document.addEventListener(
        "selectstart",
        function (
            event
        ) {

            event.preventDefault();

        }
    );


    /* KEYBOARD */

    document.addEventListener(
        "keydown",
        function (
            event
        ) {

            const key =
                String(
                    event.key || ""
                ).toLowerCase();


            if (
                event.ctrlKey &&
                key === "s"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Downloading is disabled."
                );

                return;

            }


            if (
                event.ctrlKey &&
                key === "p"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Printing is disabled."
                );

                return;

            }


            if (
                event.ctrlKey &&
                key === "u"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "This page is protected."
                );

                return;

            }


            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "i"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Developer tools are disabled."
                );

                return;

            }


            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "j"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Developer tools are disabled."
                );

                return;

            }


            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "c"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Inspection is disabled."
                );

                return;

            }


            if (
                event.key === "F12"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Developer tools are disabled."
                );

                return;

            }

        }
    );


    /* PRINT */

    window.addEventListener(
        "beforeprint",
        function () {

            document.body.classList.add(
                "print-blocked"
            );

            showSecurityMessage(
                "Printing is disabled."
            );

        }
    );


    window.addEventListener(
        "afterprint",
        function () {

            document.body.classList.remove(
                "print-blocked"
            );

        }
    );


    /* VISIBILITY */

    document.addEventListener(
        "visibilitychange",
        function () {

            const viewer =
                document.getElementById(
                    "pdfViewer"
                ) ||
                document.getElementById(
                    "ebookViewer"
                );


            if (!viewer) {

                return;

            }


            if (
                document.hidden
            ) {

                viewer.classList.add(
                    "viewer-hidden"
                );

            }

            else {

                viewer.classList.remove(
                    "viewer-hidden"
                );

            }

        }
    );


    /* WINDOW BLUR */

    window.addEventListener(
        "blur",
        function () {

            const viewer =
                document.getElementById(
                    "pdfViewer"
                ) ||
                document.getElementById(
                    "ebookViewer"
                );


            if (viewer) {

                viewer.classList.add(
                    "viewer-hidden"
                );

            }

        }
    );


    /* WINDOW FOCUS */

    window.addEventListener(
        "focus",
        function () {

            const viewer =
                document.getElementById(
                    "pdfViewer"
                ) ||
                document.getElementById(
                    "ebookViewer"
                );


            if (viewer) {

                viewer.classList.remove(
                    "viewer-hidden"
                );

            }

        }
    );

}


/* =========================================================
   SECURITY MESSAGE
   ========================================================= */

function showSecurityMessage(
    message
) {

    const old =
        document.querySelector(
            ".security-message"
        );


    if (old) {

        old.remove();

    }


    const box =
        document.createElement(
            "div"
        );


    box.className =
        "security-message";


    box.textContent =
        message;


    document.body.appendChild(
        box
    );


    setTimeout(
        function () {

            if (
                box &&
                box.parentNode
            ) {

                box.remove();

            }

        },
        2000
    );

}


/* =========================================================
   PAGE HIDE
   ========================================================= */

window.addEventListener(
    "pagehide",
    function () {

        /*
         * Session clear nahi karna.
         */

    }
);


/* =========================================================
   EXPOSE FUNCTIONS
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
