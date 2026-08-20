/* =========================================================
   SSTC STUDENT REGISTRATION
   FRONTEND JAVASCRIPT
   ========================================================= */


/* =========================================================
   GOOGLE APPS SCRIPT WEB APP URL
   ========================================================= */

/*
   IMPORTANT:

   Neeche apna Google Apps Script
   Web App URL paste karo.
*/

const SSTC_GOOGLE_SCRIPT_URL =
    "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";


/* =========================================================
   FORM
   ========================================================= */

const registrationForm =
    document.getElementById(
        "studentRegistrationForm"
    );


/* =========================================================
   MOBILE NUMBER
   ========================================================= */

const mobileInput =
    document.getElementById(
        "mobile"
    );


if (mobileInput) {

    mobileInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(
                        /[^0-9]/g,
                        ""
                    )
                    .slice(
                        0,
                        10
                    );

        }
    );

}


/* =========================================================
   FORM SUBMIT
   ========================================================= */

if (registrationForm) {

    registrationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =============================================
               ELEMENTS
               ============================================= */

            const registerButton =
                document.getElementById(
                    "registerButton"
                );


            const message =
                document.getElementById(
                    "registrationMessage"
                );


            /* =============================================
               FORM DATA
               ============================================= */

            const fullName =
                document
                    .getElementById(
                        "fullName"
                    )
                    .value
                    .trim();


            const mobile =
                document
                    .getElementById(
                        "mobile"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim();


            const studentClass =
                document
                    .getElementById(
                        "studentClass"
                    )
                    .value;


            const board =
                document
                    .getElementById(
                        "board"
                    )
                    .value;


            const schoolName =
                document
                    .getElementById(
                        "schoolName"
                    )
                    .value
                    .trim();


            const schoolPlace =
                document
                    .getElementById(
                        "schoolPlace"
                    )
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


            /* =============================================
               BASIC VALIDATION
               ============================================= */

            if (
                !fullName ||
                !mobile ||
                !gender ||
                !email ||
                !studentClass ||
                !board ||
                !schoolName ||
                !schoolPlace
            ) {

                showRegistrationMessage(
                    "Please fill all required fields.",
                    "error"
                );

                return;

            }


            /* =============================================
               MOBILE VALIDATION
               ============================================= */

            if (
                !/^[0-9]{10}$/.test(
                    mobile
                )
            ) {

                showRegistrationMessage(
                    "Please enter a valid 10-digit mobile number.",
                    "error"
                );

                return;

            }


            /* =============================================
               EMAIL VALIDATION
               ============================================= */

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email
                )
            ) {

                showRegistrationMessage(
                    "Please enter a valid email address.",
                    "error"
                );

                return;

            }


            /* =============================================
               GOOGLE SCRIPT URL CHECK
               ============================================= */

            if (
                SSTC_GOOGLE_SCRIPT_URL.includes(
                    "PASTE_YOUR"
                )
            ) {

                showRegistrationMessage(
                    "Google Sheets connection is not configured yet.",
                    "error"
                );

                return;

            }


            /* =============================================
               BUTTON LOADING
               ============================================= */

            registerButton.disabled =
                true;


            registerButton.textContent =
                "⏳ Registering...";


            message.className =
                "registration-message";

            message.textContent =
                "";


            /* =============================================
               DATA OBJECT
               ============================================= */

            const studentData = {

                fullName:
                    fullName,

                mobile:
                    mobile,

                gender:
                    gender,

                email:
                    email,

                studentClass:
                    studentClass,

                board:
                    board,

                schoolName:
                    schoolName,

                schoolPlace:
                    schoolPlace

            };


            /* =============================================
               SEND TO GOOGLE SHEETS
               ============================================= */

            try {

                const response =
                    await fetch(
                        SSTC_GOOGLE_SCRIPT_URL,
                        {

                            method: "POST",

                            mode: "cors",

                            headers: {

                                "Content-Type":
                                    "text/plain;charset=utf-8"

                            },

                            body:
                                JSON.stringify(
                                    studentData
                                )

                        }
                    );


                const result =
                    await response.json();


                /* =========================================
                   SUCCESS
                   ========================================= */

                if (
                    result.success
                ) {

                    showRegistrationMessage(
                        "🎉 Registration successful! Your Student ID is: " +
                        result.studentId,
                        "success"
                    );


                    /* =====================================
                       SHOW ID
                       ===================================== */

                    registerButton.textContent =
                        "✅ Registration Completed";


                    /* =====================================
                       SAVE ID LOCALLY

                       Useful for student login page.
                       ===================================== */

                    localStorage.setItem(
                        "sstcLastRegisteredStudentId",
                        result.studentId
                    );


                    /* =====================================
                       RESET FORM
                       ===================================== */

                    registrationForm.reset();


                    /*
                       Keep button disabled after successful
                       registration so accidental duplicate
                       submission does not happen.
                    */

                    registerButton.disabled =
                        true;


                }

                else {

                    throw new Error(
                        result.message ||
                        "Registration failed."
                    );

                }


            } catch (error) {


                console.error(
                    "SSTC Registration Error:",
                    error
                );


                showRegistrationMessage(
                    "❌ Registration failed. Please try again.",
                    "error"
                );


                registerButton.disabled =
                    false;


                registerButton.textContent =
                    "🎓 Register Student";

            }

        }
    );

}


/* =========================================================
   MESSAGE FUNCTION
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


    message.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}
