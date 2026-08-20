/* =========================================================
   SSTC STUDENT REGISTRATION
   ========================================================= */


/*
   IMPORTANT:

   Google Apps Script Web App URL yahan paste karna hai.

   Example:

   const SSTC_GOOGLE_SCRIPT_URL =
       "https://script.google.com/macros/s/XXXXXXXX/exec";
*/

const SSTC_GOOGLE_SCRIPT_URL =
    "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";



/* =========================================================
   STUDENT REGISTRATION
   ========================================================= */

function submitStudentRegistration(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "studentRegistrationForm"
        );


    const button =
        document.getElementById(
            "registerButton"
        );


    const message =
        document.getElementById(
            "registrationMessage"
        );


    if (!form || !button || !message) {
        return;
    }


    /* =====================================================
       GET VALUES
       ===================================================== */

    const fullName =
        document
            .getElementById("fullName")
            .value
            .trim();


    const mobileNumber =
        document
            .getElementById("mobileNumber")
            .value
            .trim();


    const emailId =
        document
            .getElementById("emailId")
            .value
            .trim();


    const studentClass =
        document
            .getElementById("studentClass")
            .value;


    const board =
        document
            .getElementById("board")
            .value;


    const schoolName =
        document
            .getElementById("schoolName")
            .value
            .trim();


    const schoolPlace =
        document
            .getElementById("schoolPlace")
            .value
            .trim();


    const genderElement =
        document.querySelector(
            'input[name="gender"]:checked'
        );


    const gender =
        genderElement
            ? genderElement.value
            : "";


    /* =====================================================
       VALIDATION
       ===================================================== */

    if (!fullName) {

        showRegistrationMessage(
            "Please enter your full name.",
            "error"
        );

        return;
    }


    /* Mobile validation */

    if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {

        showRegistrationMessage(
            "Please enter a valid 10-digit mobile number.",
            "error"
        );

        return;
    }


    /* Gender */

    if (!gender) {

        showRegistrationMessage(
            "Please select your gender.",
            "error"
        );

        return;
    }


    /* Email */

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)
    ) {

        showRegistrationMessage(
            "Please enter a valid email ID.",
            "error"
        );

        return;
    }


    /* Class */

    if (!studentClass) {

        showRegistrationMessage(
            "Please select your class.",
            "error"
        );

        return;
    }


    /* Board */

    if (!board) {

        showRegistrationMessage(
            "Please select your board.",
            "error"
        );

        return;
    }


    /* School */

    if (!schoolName) {

        showRegistrationMessage(
            "Please enter your school name.",
            "error"
        );

        return;
    }


    /* School Place */

    if (!schoolPlace) {

        showRegistrationMessage(
            "Please enter your school place.",
            "error"
        );

        return;
    }


    /* =====================================================
       GOOGLE SCRIPT URL CHECK
       ===================================================== */

    if (
        SSTC_GOOGLE_SCRIPT_URL ===
        "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
    ) {

        showRegistrationMessage(
            "Google Sheets connection is not configured yet.",
            "error"
        );

        return;
    }


    /* =====================================================
       BUTTON LOADING
       ===================================================== */

    button.disabled = true;

    button.textContent =
        "⏳ Registering...";


    message.className =
        "registration-message";

    message.textContent = "";


    /* =====================================================
       PREPARE FORM DATA
       ===================================================== */

    const formData =
        new FormData();


    formData.append(
        "fullName",
        fullName
    );


    formData.append(
        "mobileNumber",
        mobileNumber
    );


    formData.append(
        "gender",
        gender
    );


    formData.append(
        "emailId",
        emailId
    );


    formData.append(
        "studentClass",
        studentClass
    );


    formData.append(
        "board",
        board
    );


    formData.append(
        "schoolName",
        schoolName
    );


    formData.append(
        "schoolPlace",
        schoolPlace
    );


    formData.append(
        "registrationDate",
        new Date().toLocaleString("en-IN")
    );


    /* =====================================================
       SEND DATA TO GOOGLE APPS SCRIPT
       ===================================================== */

    fetch(
        SSTC_GOOGLE_SCRIPT_URL,
        {
            method: "POST",
            body: formData
        }
    )

    .then(function(response) {

        return response.text();

    })

    .then(function(result) {


        /* ================================================
           SUCCESS
           ================================================ */

        showRegistrationMessage(
            "🎉 Registration successful! Your details have been saved.",
            "success"
        );


        button.textContent =
            "✅ Registration Completed";


        /* Clear form */

        form.reset();


        /* ================================================
           OPTIONAL REDIRECT

           Keep disabled for now.
           ================================================ */

        /*
        setTimeout(function () {

            window.location.href =
                "student-login.html";

        }, 2000);
        */

    })

    .catch(function(error) {


        console.error(
            "Registration Error:",
            error
        );


        showRegistrationMessage(
            "Registration failed. Please try again.",
            "error"
        );


        button.disabled = false;

        button.textContent =
            "🎓 Register Student";

    });

}



/* =========================================================
   MESSAGE
   ========================================================= */

function showRegistrationMessage(
    text,
    type
) {

    const message =
        document.getElementById(
            "registrationMessage"
        );


    if (!message) {
        return;
    }


    message.textContent =
        text;


    message.className =
        "registration-message " +
        type;

}



/* =========================================================
   MOBILE NUMBER — ONLY NUMBERS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const mobileInput =
            document.getElementById(
                "mobileNumber"
            );


        if (mobileInput) {

            mobileInput.addEventListener(
                "input",
                function () {

                    this.value =
                        this.value
                            .replace(/\D/g, "")
                            .slice(0, 10);

                }
            );

        }

    }
);
