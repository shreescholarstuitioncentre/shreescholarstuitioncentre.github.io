/* =========================================================
   SSTC STUDENT REGISTRATION
   GOOGLE SHEETS VERSION
   ========================================================= */


/* =========================================================
   GOOGLE APPS SCRIPT API URL
   ========================================================= */

const SSTC_API_URL =
    "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const registrationForm =
    document.getElementById(
        "studentRegistrationForm"
    );


const registerButton =
    document.getElementById(
        "registerButton"
    );


const messageBox =
    document.getElementById(
        "registrationMessage"
    );


const registrationSuccess =
    document.getElementById(
        "registrationSuccess"
    );


const studentIdInput =
    document.getElementById(
        "studentId"
    );


const passwordInput =
    document.getElementById(
        "generatedPassword"
    );


const successStudentId =
    document.getElementById(
        "successStudentId"
    );


const successPassword =
    document.getElementById(
        "successPassword"
    );


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
    text,
    type
) {

    if (!messageBox) return;


    messageBox.textContent =
        text;


    messageBox.className =
        "registration-message";


    if (type) {

        messageBox.classList.add(
            type
        );

    }

}


/* =========================================================
   CLEAR MESSAGE
   ========================================================= */

function clearMessage() {

    if (!messageBox) return;


    messageBox.textContent =
        "";


    messageBox.className =
        "registration-message";

}


/* =========================================================
   HIDE SUCCESS BOX
   ========================================================= */

function hideRegistrationSuccess() {

    if (!registrationSuccess) return;


    registrationSuccess.style.display =
        "none";

}


/* =========================================================
   SHOW SUCCESS BOX
   ========================================================= */

function showRegistrationSuccess(
    studentId,
    password
) {

    if (successStudentId) {

        successStudentId.textContent =
            studentId || "-";

    }


    if (successPassword) {

        successPassword.textContent =
            password || "-";

    }


    if (registrationSuccess) {

        registrationSuccess.style.display =
            "block";

    }

}


/* =========================================================
   INITIALIZE REGISTRATION
   ---------------------------------------------------------
   Student ID and Password are generated
   only after successful registration.
   ========================================================= */

function initializeRegistration() {

    if (studentIdInput) {

        studentIdInput.value =
            "Auto-generated after registration";

    }


    if (passwordInput) {

        passwordInput.value =
            "Auto-generated after registration";

        passwordInput.type =
            "text";

    }


    hideRegistrationSuccess();

}


/* =========================================================
   MOBILE VALIDATION
   ========================================================= */

function validateMobile(
    mobile
) {

    return /^[6-9]\d{9}$/.test(
        mobile
    );

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function validateEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


/* =========================================================
   GET SELECTED GENDER
   ========================================================= */

function getSelectedGender() {

    const selected =
        document.querySelector(
            'input[name="gender"]:checked'
        );


    return selected
        ? selected.value
        : "";

}


/* =========================================================
   REGISTER BUTTON LOADING
   ========================================================= */

function setRegisterButtonLoading(
    isLoading
) {

    if (!registerButton) return;


    registerButton.disabled =
        isLoading;


    if (isLoading) {

        registerButton.textContent =
            "⏳ Registering...";

    }

    else {

        registerButton.textContent =
            "🎓 Register Student";

    }

}


/* =========================================================
   RESET BUTTON
   ========================================================= */

function resetRegisterButton() {

    if (!registerButton) return;


    registerButton.disabled =
        false;


    registerButton.textContent =
        "🎓 Register Student";

}


/* =========================================================
   REGISTER STUDENT
   ========================================================= */

registrationForm
    ?.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            clearMessage();


            /*
               Hide old success details
               when a new registration starts.
            */

            hideRegistrationSuccess();


            /* =============================================
               GET FORM VALUES
               ============================================= */

            const fullName =
                document
                    .getElementById(
                        "fullName"
                    )
                    ?.value
                    .trim() || "";


            const mobile =
                document
                    .getElementById(
                        "mobile"
                    )
                    ?.value
                    .trim() || "";


            const gender =
                getSelectedGender();


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    ?.value
                    .trim()
                    .toLowerCase() || "";


            const studentClass =
                document
                    .getElementById(
                        "studentClass"
                    )
                    ?.value
                    .trim() || "";


            const board =
                document
                    .getElementById(
                        "board"
                    )
                    ?.value
                    .trim() || "";


            const schoolName =
                document
                    .getElementById(
                        "schoolName"
                    )
                    ?.value
                    .trim() || "";


            const schoolPlace =
                document
                    .getElementById(
                        "schoolPlace"
                    )
                    ?.value
                    .trim() || "";


            const confirmed =
                document
                    .getElementById(
                        "confirmInformation"
                    )
                    ?.checked;


            /* =============================================
               VALIDATION
               ============================================= */

            if (!fullName) {

                showMessage(
                    "Please enter student's full name.",
                    "error"
                );

                return;

            }


            if (!validateMobile(mobile)) {

                showMessage(
                    "Please enter a valid 10-digit mobile number.",
                    "error"
                );

                return;

            }


            if (!gender) {

                showMessage(
                    "Please select gender.",
                    "error"
                );

                return;

            }


            if (!validateEmail(email)) {

                showMessage(
                    "Please enter a valid Email ID.",
                    "error"
                );

                return;

            }


            if (!studentClass) {

                showMessage(
                    "Please select class.",
                    "error"
                );

                return;

            }


            if (!board) {

                showMessage(
                    "Please select board.",
                    "error"
                );

                return;

            }


            if (!schoolName) {

                showMessage(
                    "Please enter school name.",
                    "error"
                );

                return;

            }


            if (!schoolPlace) {

                showMessage(
                    "Please enter school place.",
                    "error"
                );

                return;

            }


            if (!confirmed) {

                showMessage(
                    "Please confirm that the information is correct.",
                    "error"
                );

                return;

            }


            /* =============================================
               LOADING
               ============================================= */

            setRegisterButtonLoading(
                true
            );


            try {


                /* =============================================
                   DATA FOR GOOGLE APPS SCRIPT
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

                    className:
                        studentClass,

                    board:
                        board,

                    schoolName:
                        schoolName,

                    schoolPlace:
                        schoolPlace

                };


                /* =============================================
                   SEND TO GOOGLE APPS SCRIPT
                   ============================================= */

                const response =
                    await fetch(
                        SSTC_API_URL,
                        {

                            method:
                                "POST",

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


                if (!response.ok) {

                    throw new Error(
                        "Unable to connect to SSTC registration server."
                    );

                }


                const result =
                    await response.json();


                console.log(
                    "Registration Result:",
                    result
                );


                /* =============================================
                   DUPLICATE STUDENT
                   ============================================= */

                if (
                    result.type ===
                    "duplicate"
                ) {

                    showMessage(

                        result.message ||

                        `This student is already registered with Student ID: ${result.studentId}`,

                        "error"

                    );


                    resetRegisterButton();

                    return;

                }


                /* =============================================
                   SERVER / VALIDATION ERROR
                   ============================================= */

                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||

                        "Registration failed. Please try again."

                    );

                }


                /* =============================================
                   UPDATE STUDENT ID FIELD
                   ============================================= */

                if (studentIdInput) {

                    studentIdInput.value =
                        result.studentId ||
                        "";

                }


                /* =============================================
                   UPDATE PASSWORD FIELD
                   -------------------------------------------------
                   Password remains readonly.
                   Only Google Apps Script result is displayed.
                   ============================================= */

                if (passwordInput) {

                    passwordInput.value =
                        result.password ||
                        "";

                    passwordInput.type =
                        "text";

                }


                /* =============================================
                   SHOW SUCCESS BOX
                   ============================================= */

                showRegistrationSuccess(

                    result.studentId,

                    result.password

                );


                /* =============================================
                   SUCCESS MESSAGE
                   ============================================= */

                showMessage(

                    "🎉 Registration successful! Your Student ID and Login Password are shown below. Please save them safely.",

                    "success"

                );


                /* =============================================
                   SUCCESS BUTTON
                   ============================================= */

                if (registerButton) {

                    registerButton.disabled =
                        true;


                    registerButton.textContent =
                        "✅ Registration Completed";

                }


                /* =============================================
                   SCROLL SUCCESS BOX INTO VIEW
                   ============================================= */

                registrationSuccess
                    ?.scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "center"

                    });


                /*
                   Form is intentionally not reset.

                   Student ID and Password remain
                   visible in readonly fields.
                */

            }


            catch (error) {

                console.error(
                    "Registration Error:",
                    error
                );


                showMessage(

                    error.message ||

                    "Registration failed. Please try again.",

                    "error"

                );


                resetRegisterButton();

            }

        }
    );


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeRegistration();

    }
);
