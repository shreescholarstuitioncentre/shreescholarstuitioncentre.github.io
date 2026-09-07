/* =========================================================
   SSTC ACCESS PAGE
   STUDENT LOGIN + ACCESS PAGE
========================================================= */

const SSTC_BACKEND_URL =
    "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Agar access page load hua hai,
         * to yahan student portal ka koi
         * redirect/protection code nahi chalega.
         */

        setupPasswordToggles();

    }
);


/* =========================================================
   STUDENT LOGIN
========================================================= */

async function studentLoginSubmit(event) {

    event.preventDefault();


    const studentIdElement =
        document.getElementById("studentId");

    const passwordElement =
        document.getElementById("studentPassword");


    if (!studentIdElement || !passwordElement) {

        alert(
            "Student login form properly load nahi hua."
        );

        return false;

    }


    const studentId =
        studentIdElement.value
            .trim()
            .toUpperCase();


    const password =
        passwordElement.value.trim();


    if (!studentId) {

        alert(
            "Please enter Student ID."
        );

        studentIdElement.focus();

        return false;

    }


    if (!password) {

        alert(
            "Please enter password."
        );

        passwordElement.focus();

        return false;

    }


    /* =====================================================
       LOGIN BUTTON
    ===================================================== */

    const form =
        event.target;


    const loginButton =
        form.querySelector(
            'button[type="submit"]'
        );


    const originalButtonText =
        loginButton
            ? loginButton.innerHTML
            : "";


    if (loginButton) {

        loginButton.disabled =
            true;

        loginButton.innerHTML =
            "Logging in...";

    }


    try {

        const url =
            SSTC_BACKEND_URL +
            "?action=studentlogin" +
            "&studentId=" +
            encodeURIComponent(studentId) +
            "&password=" +
            encodeURIComponent(password);


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server response error: " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "SSTC Student Login Response:",
            result
        );


        /* =================================================
           LOGIN FAILED
        ================================================= */

        if (
            !result ||
            result.success !== true
        ) {

            alert(
                result &&
                result.message
                    ? result.message
                    : "Invalid Student ID or Password."
            );

            return false;

        }


        /* =================================================
           STUDENT DATA
        ================================================= */

        const student =
            result.student ||
            result.data ||
            null;


        if (!student) {

            alert(
                "Login successful, but student data was not received."
            );

            return false;

        }


        /* =================================================
           CHECK ACTIVE STATUS
        ================================================= */

        const status =
            String(
                student.status ||
                "Active"
            )
            .trim()
            .toLowerCase();


        if (
            status !== "active"
        ) {

            alert(
                "Your SSTC account is currently inactive.\n\nPlease contact SSTC administration."
            );

            return false;

        }


        /* =================================================
           CLEAR OLD SESSION FIRST
        ================================================= */

        sessionStorage.removeItem(
            "sstcStudentLoggedIn"
        );

        sessionStorage.removeItem(
            "sstcStudentData"
        );

        sessionStorage.removeItem(
            "sstcStudentLoginTime"
        );


        /* =================================================
           LOGIN TIME
        ================================================= */

        const loginTime =
            formatLoginDateTime();


        /* =================================================
           SAVE NEW SESSION
        ================================================= */

        sessionStorage.setItem(
            "sstcStudentLoggedIn",
            "true"
        );


        sessionStorage.setItem(
            "sstcStudentData",
            JSON.stringify(student)
        );


        sessionStorage.setItem(
            "sstcStudentLoginTime",
            loginTime
        );


        /* =================================================
           OPTIONAL LOCAL FLAG
        ================================================= */

        sessionStorage.setItem(
            "sstcStudentId",
            student.studentId ||
            studentId
        );


        /* =================================================
           SUCCESS
        ================================================= */

        if (loginButton) {

            loginButton.innerHTML =
                "Login Successful ✓";

        }


        /*
         * Small delay so browser sessionStorage
         * properly save kar sake.
         */

        setTimeout(
            function () {

                window.location.href =
                    "student-page.html";

            },
            150
        );


        return false;

    }

    catch (error) {

        console.error(
            "SSTC Student Login Error:",
            error
        );


        alert(
            "Unable to connect with SSTC server.\n\nPlease check your internet connection and try again."
        );


        return false;

    }

    finally {

        /*
         * Successful login par redirect hone se
         * pehle button text change rehne do.
         */

        if (
            loginButton &&
            loginButton.innerHTML ===
            "Logging in..."
        ) {

            loginButton.disabled =
                false;

            loginButton.innerHTML =
                originalButtonText;

        }

    }

}


/* =========================================================
   LOGIN DATE/TIME
========================================================= */

function formatLoginDateTime() {

    return new Date()
        .toLocaleString(
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
   PASSWORD TOGGLE
========================================================= */

function togglePassword(
    inputId,
    button
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {

        return;

    }


    if (
        input.type === "password"
    ) {

        input.type =
            "text";


        if (button) {

            button.innerText =
                "🙈";

        }

    }

    else {

        input.type =
            "password";


        if (button) {

            button.innerText =
                "👁";

        }

    }

}


/* =========================================================
   AUTO PASSWORD TOGGLE SUPPORT
========================================================= */

function setupPasswordToggles() {

    /*
     * Agar HTML mein inline
     * onclick="togglePassword(...)"
     * already hai to ye function
     * kuch extra nahi karega.
     */

}


/* =========================================================
   STUDENT / ADMIN TAB SWITCH
========================================================= */

function switchLogin(
    type
) {

    const studentForm =
        document.getElementById(
            "studentLoginForm"
        );


    const adminForm =
        document.getElementById(
            "adminLoginForm"
        );


    const studentTab =
        document.getElementById(
            "studentTab"
        );


    const adminTab =
        document.getElementById(
            "adminTab"
        );


    if (type === "student") {

        if (studentForm) {

            studentForm.style.display =
                "";

        }


        if (adminForm) {

            adminForm.style.display =
                "none";

        }


        if (studentTab) {

            studentTab.classList.add(
                "active"
            );

        }


        if (adminTab) {

            adminTab.classList.remove(
                "active"
            );

        }

    }


    else if (
        type === "admin"
    ) {

        if (studentForm) {

            studentForm.style.display =
                "none";

        }


        if (adminForm) {

            adminForm.style.display =
                "";

        }


        if (studentTab) {

            studentTab.classList.remove(
                "active"
            );

        }


        if (adminTab) {

            adminTab.classList.add(
                "active"
            );

        }

    }

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

function showForgotPassword() {

    alert(
        "Forgot Student Password?\n\nPlease contact SSTC administration to reset your password."
    );

}


/* =========================================================
   ENTER KEY SUPPORT
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            const activeElement =
                document.activeElement;


            if (
                activeElement &&
                activeElement.tagName ===
                "INPUT"
            ) {

                const form =
                    activeElement.closest(
                        "form"
                    );


                if (form) {

                    /*
                     * Browser normal form submit
                     * ko allow kiya gaya hai.
                     */

                }

            }

        }

    }
);
