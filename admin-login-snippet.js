/* =========================================================
   SSTC ADMIN LOGIN
   Shree Scholars Tuition Centre
   ========================================================= */


/* =========================================================
   ADMIN CREDENTIALS
   ========================================================= */

const SSTC_ADMIN_ID = "SSTCGKP";

const SSTC_ADMIN_PASSWORD = "Maa@adarsh2023";


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

function togglePassword(inputId, button) {

    const input = document.getElementById(inputId);

    if (!input || !button) {
        return;
    }


    /* PASSWORD → TEXT */

    if (input.type === "password") {

        input.type = "text";

        button.textContent = "🙈";

        button.setAttribute(
            "aria-label",
            "Hide password"
        );

        button.setAttribute(
            "title",
            "Hide password"
        );

    }


    /* TEXT → PASSWORD */

    else {

        input.type = "password";

        button.textContent = "👁️";

        button.setAttribute(
            "aria-label",
            "Show password"
        );

        button.setAttribute(
            "title",
            "Show password"
        );

    }

}


/* =========================================================
   ADMIN LOGIN
   ========================================================= */

function adminLoginSubmit(event) {

    /* Stop normal form submission */

    event.preventDefault();


    /* =====================================================
       GET HTML ELEMENTS
       ===================================================== */

    const adminIdElement =
        document.getElementById("adminId");


    const adminPasswordElement =
        document.getElementById("adminPassword");


    const rememberAdminElement =
        document.getElementById("rememberAdmin");


    const message =
        document.getElementById("adminMessage");


    /* =====================================================
       GET VALUES
       ===================================================== */

    const adminId =
        adminIdElement
            ? adminIdElement.value.trim()
            : "";


    const adminPassword =
        adminPasswordElement
            ? adminPasswordElement.value
            : "";


    const rememberAdmin =
        rememberAdminElement
            ? rememberAdminElement.checked
            : false;


    /* =====================================================
       CLEAR PREVIOUS MESSAGE
       ===================================================== */

    if (message) {

        message.textContent = "";

        message.className =
            "login-message";

    }


    /* =====================================================
       EMPTY FIELD VALIDATION
       ===================================================== */

    if (!adminId || !adminPassword) {

        showAdminMessage(
            "Please enter Admin ID and Password.",
            "error"
        );

        return;

    }


    /* =====================================================
       ADMIN AUTHENTICATION
       ===================================================== */

    if (
        adminId === SSTC_ADMIN_ID &&
        adminPassword === SSTC_ADMIN_PASSWORD
    ) {


        /* =================================================
           CREATE ADMIN SESSION
           ================================================= */

        sessionStorage.setItem(
            "sstcAdminLoggedIn",
            "true"
        );


        /* =================================================
           SAVE ADMIN ID IF REMEMBER ME IS CHECKED

           IMPORTANT:
           Password is NEVER stored in localStorage.
           ================================================= */

        if (rememberAdmin) {

            localStorage.setItem(
                "sstcRememberedAdmin",
                adminId
            );

        }

        else {

            localStorage.removeItem(
                "sstcRememberedAdmin"
            );

        }


        /* =================================================
           SUCCESS MESSAGE
           ================================================= */

        showAdminMessage(
            "Login successful! Opening Admin Dashboard...",
            "success"
        );


        /* =================================================
           REDIRECT TO ADMIN DASHBOARD
           ================================================= */

        setTimeout(function () {

            window.location.href =
                "admin-page.html";

        }, 600);


        return;

    }


    /* =====================================================
       INVALID LOGIN
       ===================================================== */

    showAdminMessage(
        "Invalid Admin ID or Password.",
        "error"
    );

}


/* =========================================================
   ADMIN MESSAGE
   ========================================================= */

function showAdminMessage(text, type) {

    const message =
        document.getElementById("adminMessage");


    if (!message) {

        return;

    }


    message.textContent = text;


    message.className =
        "login-message " + type;

}


/* =========================================================
   REMEMBERED ADMIN ID
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* =================================================
           GET SAVED ADMIN ID
           ================================================= */

        const savedAdmin =
            localStorage.getItem(
                "sstcRememberedAdmin"
            );


        /* =================================================
           GET ADMIN INPUT
           ================================================= */

        const adminInput =
            document.getElementById(
                "adminId"
            );


        /* =================================================
           GET REMEMBER CHECKBOX
           ================================================= */

        const rememberCheckbox =
            document.getElementById(
                "rememberAdmin"
            );


        /* =================================================
           RESTORE ADMIN ID
           ================================================= */

        if (
            savedAdmin &&
            adminInput
        ) {

            adminInput.value =
                savedAdmin;


            if (rememberCheckbox) {

                rememberCheckbox.checked =
                    true;

            }

        }

    }
);
