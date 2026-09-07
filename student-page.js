/* =========================================================
   SSTC STUDENT PORTAL
   LIVE LOGGED-IN STUDENT DATA
   SESSION + PROFILE + READER + BASIC SECURITY
========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
========================================================= */

let studentData = null;


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
   LOGOUT / REDIRECT CONTROL
========================================================= */

let sstcRedirecting =
    false;

let sstcLoggingOut =
    false;


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
   PAGE SHOW
   ---------------------------------------------------------
   Browser Back / bfcache protection
========================================================= */

// window.addEventListener(
//     "pageshow",
//     function (event) {

//         /*
//          * Agar page browser cache se wapas aaya hai,
//          * session ko dobara verify karo.
//          */

//         if (event.persisted) {

//             checkStudentSession();

//         }

//     }
// );


/* =========================================================
   CHECK STUDENT SESSION
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
   LOAD LOGGED-IN STUDENT
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


    /* =====================================================
       LOGIN CHECK
    ===================================================== */

    if (
        loggedIn !== "true" ||
        !savedData
    ) {

        redirectToAccessPage();

        return;

    }


    /* =====================================================
       READ STUDENT DATA
    ===================================================== */

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


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
        !studentData ||
        !studentData.studentId
    ) {

        clearStudentSession();

        redirectToAccessPage();

        return;

    }


    /* =====================================================
       MAKE SURE LOGIN TIME EXISTS
       -----------------------------------------------------
       Agar sstc-access.js ne login ke time save nahi kiya,
       to yahan first time create ho jayega.
    ===================================================== */

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


    /* =====================================================
       RENDER STUDENT
    ===================================================== */

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
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",

            hour12:
                true
        }
    );

}


/* =========================================================
   RENDER STUDENT DATA
========================================================= */

function renderStudentData() {

    if (!studentData) {
        return;
    }


    /* =====================================================
       NAME
    ===================================================== */

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


    /* =====================================================
       STUDENT ID
    ===================================================== */

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


   /* =====================================================
   CLASS
===================================================== */

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


/* Profile ke naam ke neeche */

setText(
    "studentClass",
    classValue
);


/* Profile details me Class */

setText(
    "studentClassDetail",
    classValue
);

   
    /* =====================================================
       BOARD
    ===================================================== */

    setText(
        "studentBoard",
        getStudentValue(
            [
                "board"
            ],
            "-"
        )
    );


    /* =====================================================
       GENDER
    ===================================================== */

    setText(
        "studentGender",
        getStudentValue(
            [
                "gender"
            ],
            "-"
        )
    );


    /* =====================================================
       MOBILE
       -----------------------------------------------------
       Backend field:
       mobileNumber
    ===================================================== */

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


    /* =====================================================
       EMAIL
       -----------------------------------------------------
       Backend field:
       emailId
    ===================================================== */

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


    /* =====================================================
       SCHOOL NAME
    ===================================================== */

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


    /* =====================================================
       SCHOOL PLACE
    ===================================================== */

    setText(
        "studentSchoolPlace",
        getStudentValue(
            [
                "schoolPlace"
            ],
            "-"
        )
    );


    /* =====================================================
       REGISTRATION DATE
    ===================================================== */

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


    /* =====================================================
       LOGIN TIME
    ===================================================== */

    const loginTime =
        sessionStorage.getItem(
            SSTC_SESSION_LOGIN_TIME
        ) ||
        createLoginTime();


    /*
     * Agar somehow missing ho to save bhi kar do.
     */

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


    /* =====================================================
       ACCOUNT STATUS
    ===================================================== */

    const status =
        String(
            studentData.status ||
            "Active"
        )
        .trim();


    setText(
        "studentStatus",
        status
    );


    /*
     * Agar HTML me studentStatus hai.
     */

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


    /*
     * Agar HTML me account status fixed
     * strong element hai to usko bhi update karne ki
     * koshish.
     */

    const accountStatus =
        document.querySelector(
            ".profile-info .status-active"
        );


    if (
        accountStatus &&
        !document.getElementById("studentStatus")
    ) {

        accountStatus.textContent =
            "● " + status;


        accountStatus.classList.remove(
            "status-active",
            "status-inactive"
        );


        if (
            status.toLowerCase() ===
            "active"
        ) {

            accountStatus.classList.add(
                "status-active"
            );

        }

        else {

            accountStatus.classList.add(
                "status-inactive"
            );

        }

    }


    /* =====================================================
       AVATAR
    ===================================================== */

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


    /* =====================================================
       PAGE TITLE
    ===================================================== */

    document.title =
        "SSTC | " +
        fullName +
        " - Student Portal";


    /* =====================================================
       DISPATCH EVENT
       -----------------------------------------------------
       Future e-book system isko use kar sakta hai.
    ===================================================== */

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
   CLEAR STUDENT SESSION
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
   REDIRECT TO ACCESS PAGE
========================================================= */

function redirectToAccessPage() {

    /*
     * Multiple redirect ko prevent karo.
     */

    if (sstcRedirecting) {
        return;
    }


    /*
     * Agar already access page par hai,
     * kuch mat karo.
     */

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


    /*
     * replace() use hoga.
     * Isse logout ke baad protected page ki
     * unnecessary history entry nahi banegi.
     */

    window.location.replace(
        "sstc-access.html"
    );

}


/* =========================================================
   STUDENT LOGOUT
========================================================= */

function studentLogout(event) {

    if (event) {

        event.preventDefault();

    }


    /*
     * Double click protection.
     */

    if (sstcLoggingOut) {

        return false;

    }


    sstcLoggingOut =
        true;


    /*
     * Reader ko clear karo.
     */

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


    /*
     * Complete student session clear.
     */

    clearStudentSession();


    /*
     * Access page par normal redirect.
     */

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

    }


    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (viewer) {

        viewer.addEventListener(
            "contextmenu",
            function (event) {

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


    if (
        frame &&
        frame.src &&
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
   ZOOM
========================================================= */

let sstcZoom =
    100;


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


    /*
     * Browser iframe ko CSS zoom dena possible hai,
     * lekin PDF browser viewer ka internal zoom
     * har browser me control nahi hota.
     *
     * Isliye ye best-effort hai.
     */

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


    /*
     * Agar already fullscreen hai,
     * exit karo.
     */

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


    /*
     * Fullscreen request.
     */

    if (
        viewer.requestFullscreen
    ) {

        viewer.requestFullscreen()
            .catch(
                function (error) {

                    console.warn(
                        "Fullscreen unavailable:",
                        error
                    );

                }
            );

    }

}


/* =========================================================
   PREVIOUS PAGE
   ---------------------------------------------------------
   PDF iframe ke internal page ko browser JS se
   universally control nahi kiya ja sakta.
========================================================= */

function previousPage() {

    const current =
        parseInt(
            sessionStorage.getItem(
                SSTC_CURRENT_PAGE
            ) ||
            "1",
            10
        );


    const next =
        Math.max(
            1,
            current - 1
        );


    sessionStorage.setItem(
        SSTC_CURRENT_PAGE,
        String(next)
    );


    setText(
        "currentPage",
        next
    );


    showSecurityMessage(
        "PDF page controls depend on the reader."
    );

}


/* =========================================================
   NEXT PAGE
========================================================= */

function nextPage() {

    const current =
        parseInt(
            sessionStorage.getItem(
                SSTC_CURRENT_PAGE
            ) ||
            "1",
            10
        );


    const next =
        current + 1;


    sessionStorage.setItem(
        SSTC_CURRENT_PAGE,
        String(next)
    );


    setText(
        "currentPage",
        next
    );


    showSecurityMessage(
        "PDF page controls depend on the reader."
    );

}


/* =========================================================
   SET CURRENT YEAR
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
   BASIC SECURITY
   ---------------------------------------------------------
   IMPORTANT:
   Browser/OS screenshot or screen recording ko
   100% block karna website ke control me nahi hota.
========================================================= */

function setupStudentSecurity() {


    /* =====================================================
       RIGHT CLICK
    ===================================================== */

    document.addEventListener(
        "contextmenu",
        function (event) {

            event.preventDefault();

        }
    );


    /* =====================================================
       DRAG
    ===================================================== */

    document.addEventListener(
        "dragstart",
        function (event) {

            event.preventDefault();

        }
    );


    /* =====================================================
       TEXT SELECTION
    ===================================================== */

    document.addEventListener(
        "selectstart",
        function (event) {

            event.preventDefault();

        }
    );


    /* =====================================================
       KEYBOARD PROTECTION
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            const key =
                String(
                    event.key || ""
                )
                .toLowerCase();


            /* =================================================
               CTRL + S
            ================================================= */

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


            /* =================================================
               CTRL + P
            ================================================= */

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


            /* =================================================
               CTRL + U
            ================================================= */

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


            /* =================================================
               CTRL + SHIFT + I
            ================================================= */

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


            /* =================================================
               CTRL + SHIFT + J
            ================================================= */

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


            /* =================================================
               CTRL + SHIFT + C
            ================================================= */

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


            /* =================================================
               F12
            ================================================= */

            if (
                event.key ===
                "F12"
            ) {

                event.preventDefault();

                showSecurityMessage(
                    "Developer tools are disabled."
                );

                return;

            }

        }
    );


    /* =====================================================
       PRINT
    ===================================================== */

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


    /* =====================================================
       AFTER PRINT
    ===================================================== */

    window.addEventListener(
        "afterprint",
        function () {

            document.body.classList.remove(
                "print-blocked"
            );

        }
    );


    /* =====================================================
       VISIBILITY CHANGE
       -----------------------------------------------------
       Tab change hone par reader temporarily hide.
    ===================================================== */

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


    /* =====================================================
       WINDOW BLUR
    ===================================================== */

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


    /* =====================================================
       WINDOW FOCUS
    ===================================================== */

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

    /*
     * Existing message remove.
     */

    const old =
        document.querySelector(
            ".security-message"
        );


    if (old) {

        old.remove();

    }


    /*
     * Create message.
     */

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


    /*
     * Auto remove.
     */

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
   PREVENT UNWANTED PAGE CACHE BEHAVIOUR
========================================================= */

window.addEventListener(
    "pagehide",
    function () {

        /*
         * Yahan session clear nahi karna hai.
         *
         * Normal refresh/navigation par student logged-in
         * rehna chahiye.
         *
         * Logout function already session clear karta hai.
         */

    }
);


/* =========================================================
   EXPOSE FUNCTIONS FOR HTML ONCLICK
   ---------------------------------------------------------
   Ye ensure karta hai ki inline onclick functions
   browser ko available rahen.
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
