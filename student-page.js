/* =========================================================
   SSTC STUDENT PORTAL
   LIVE LOGGED-IN STUDENT DATA
========================================================= */


/* =========================================================
   STUDENT SESSION
========================================================= */

let studentData = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    loadLoggedInStudent();

    setupStudentSecurity();

});


/* =========================================================
   LOAD LOGGED-IN STUDENT
========================================================= */

function loadLoggedInStudent() {

    const loggedIn =
        sessionStorage.getItem(
            "sstcStudentLoggedIn"
        );

    const savedData =
        sessionStorage.getItem(
            "sstcStudentData"
        );


    /* -----------------------------------------------------
       LOGIN CHECK
    ----------------------------------------------------- */

    if (
        loggedIn !== "true" ||
        !savedData
    ) {

        window.location.href =
            "sstc-access.html";

        return;

    }


    /* -----------------------------------------------------
       READ STUDENT DATA
    ----------------------------------------------------- */

    try {

        studentData =
            JSON.parse(
                savedData
            );

    }

    catch (error) {

        console.error(
            "Student session data error:",
            error
        );

        sessionStorage.removeItem(
            "sstcStudentData"
        );

        sessionStorage.removeItem(
            "sstcStudentLoggedIn"
        );

        window.location.href =
            "sstc-access.html";

        return;

    }


    if (
        !studentData ||
        !studentData.studentId
    ) {

        sessionStorage.removeItem(
            "sstcStudentData"
        );

        sessionStorage.removeItem(
            "sstcStudentLoggedIn"
        );

        window.location.href =
            "sstc-access.html";

        return;

    }


    /* -----------------------------------------------------
       DISPLAY STUDENT DATA
    ----------------------------------------------------- */

    renderStudentData();

}


/* =========================================================
   RENDER STUDENT DATA
========================================================= */

function renderStudentData() {

    if (!studentData) {
        return;
    }


    /* -----------------------------------------------------
       BASIC DETAILS
    ----------------------------------------------------- */

    setText(
        "studentName",
        studentData.fullName
    );

    setText(
        "studentFullName",
        studentData.fullName
    );

    setText(
        "studentId",
        studentData.studentId
    );

    setText(
        "studentClass",
        studentData.className
    );

    setText(
        "studentBoard",
        studentData.board
    );

    setText(
        "studentGender",
        studentData.gender
    );

    setText(
        "studentMobile",
        studentData.mobile
    );

    setText(
        "studentEmail",
        studentData.email
    );

    setText(
        "studentSchool",
        studentData.schoolName
    );

    setText(
        "studentSchoolPlace",
        studentData.schoolPlace
    );

    setText(
        "studentRegistrationDate",
        studentData.registrationDate
    );


    /* -----------------------------------------------------
       STATUS
    ----------------------------------------------------- */

    const status =
        String(
            studentData.status || "Active"
        )
        .trim();


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


    /* -----------------------------------------------------
       INITIAL
    ----------------------------------------------------- */

    const name =
        String(
            studentData.fullName || "Student"
        ).trim();


    const firstLetter =
        name.charAt(0).toUpperCase();


    setText(
        "studentInitial",
        firstLetter
    );


    /* -----------------------------------------------------
       PAGE TITLE
    ----------------------------------------------------- */

    document.title =
        "SSTC | " +
        name +
        " - Student Portal";


    /* -----------------------------------------------------
       LOGIN TIME
    ----------------------------------------------------- */

    const loginTime =
        sessionStorage.getItem(
            "sstcStudentLoginTime"
        );


    if (!loginTime) {

        const now =
            new Date();

        sessionStorage.setItem(
            "sstcStudentLoginTime",
            now.toLocaleString(
                "en-IN"
            )
        );

    }


    setText(
        "studentLoginTime",
        sessionStorage.getItem(
            "sstcStudentLoginTime"
        )
    );

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


    if (element) {

        element.textContent =
            value || "";

    }

}


/* =========================================================
   STUDENT LOGOUT
========================================================= */

function studentLogout() {

    const confirmation =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmation) {
        return;
    }


    sessionStorage.removeItem(
        "sstcStudentData"
    );

    sessionStorage.removeItem(
        "sstcStudentLoggedIn"
    );

    sessionStorage.removeItem(
        "sstcStudentLoginTime"
    );


    window.location.href =
        "sstc-access.html";

}


/* =========================================================
   SECURITY PROTECTION
   BEST-EFFORT BROWSER PROTECTION
========================================================= */

function setupStudentSecurity() {


    /* -----------------------------------------------------
       DISABLE RIGHT CLICK
    ----------------------------------------------------- */

    document.addEventListener(
        "contextmenu",
        function (event) {

            event.preventDefault();

        }
    );


    /* -----------------------------------------------------
       DISABLE DRAG
    ----------------------------------------------------- */

    document.addEventListener(
        "dragstart",
        function (event) {

            event.preventDefault();

        }
    );


    /* -----------------------------------------------------
       DISABLE TEXT SELECTION
    ----------------------------------------------------- */

    document.addEventListener(
        "selectstart",
        function (event) {

            event.preventDefault();

        }
    );


    /* -----------------------------------------------------
       KEYBOARD PROTECTION
    ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        function (event) {

            const key =
                String(
                    event.key || ""
                ).toLowerCase();


            /* Ctrl + S */

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


            /* Ctrl + P */

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


            /* Ctrl + U */

            if (
                event.ctrlKey &&
                key === "u"
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


            /* F12 */

            if (
                event.key === "F12"
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


    /* -----------------------------------------------------
       PRINT EVENT
    ----------------------------------------------------- */

    window.addEventListener(
        "beforeprint",
        function () {

            document.body.classList.add(
                "print-blocked"
            );

        }
    );


    /* -----------------------------------------------------
       TAB / WINDOW HIDDEN
       HIDE READING AREA TEMPORARILY
    ----------------------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        function () {

            const viewer =
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

            box.remove();

        },
        2000
    );

}
