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


const fullNameInput =
    document.getElementById(
        "fullName"
    );


const classInput =
    document.getElementById(
        "studentClass"
    );


const regeneratePasswordButton =
    document.getElementById(
        "regeneratePassword"
    );


const toggleGeneratedPassword =
    document.getElementById(
        "toggleGeneratedPassword"
    );


const successStudentId =
    document.getElementById(
        "successStudentId"
    );


const successPassword =
    document.getElementById(
        "successPassword"
    );


const toggleSuccessPassword =
    document.getElementById(
        "toggleSuccessPassword"
    );


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text, type) {

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
   SHOW REGISTRATION SUCCESS
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

        /*
           Save actual password in dataset.
           Eye button will use this value.
        */

        successPassword.dataset.password =
            password || "";


        /*
           Initially hide password.
        */

        successPassword.textContent =
            "••••••••";


        successPassword.dataset.visible =
            "false";

    }


    if (toggleSuccessPassword) {

        toggleSuccessPassword.textContent =
            "👁️";

        toggleSuccessPassword.title =
            "Show Password";

    }


    if (registrationSuccess) {

        registrationSuccess.style.display =
            "block";

    }

}


/* =========================================================
   LOCAL PREVIEW STUDENT ID
   ---------------------------------------------------------
   Final unique Student ID will be generated
   by Google Apps Script.
   ========================================================= */

function generatePreviewStudentId() {

    const timestamp =
        Date.now()
            .toString()
            .slice(-6);


    const random =
        Math.floor(
            1000 +
            Math.random() * 9000
        );


    return (
        "SSTC" +
        timestamp +
        random
    );

}


/* =========================================================
   CLEAN NAME
   ========================================================= */

function cleanName(name) {

    return String(
        name || ""
    )
        .trim()
        .replace(
            /[^a-zA-Z]/g,
            ""
        );

}


/* =========================================================
   GENERATE PASSWORD PREVIEW
   ---------------------------------------------------------
   Example:
   Adarsh + 11 = Adarsh11
   Ram Kumar + 10 = Ram10
   ========================================================= */

function generatePasswordPreview() {

    const fullName =
        fullNameInput
            ?.value
            .trim() || "";


    const studentClass =
        classInput
            ?.value
            .trim() || "";


    let firstName =
        fullName
            .split(" ")[0] || "";


    firstName =
        cleanName(
            firstName
        );


    if (!firstName) {

        firstName =
            "Student";

    }


    firstName =
        firstName
            .charAt(0)
            .toUpperCase()
        +
        firstName
            .slice(1)
            .toLowerCase();


    if (!studentClass) {

        return firstName;

    }


    return (
        firstName +
        studentClass
    );

}


/* =========================================================
   REFRESH PASSWORD PREVIEW
   ========================================================= */

function refreshPasswordPreview() {

    if (!passwordInput) return;

    passwordInput.value =
        generatePasswordPreview();

}


/* =========================================================
   INITIAL PREVIEW
   ========================================================= */

function initializeRegistration() {

    if (studentIdInput) {

        studentIdInput.value =
            "Auto-generated after registration";

    }


    if (passwordInput) {

        passwordInput.value =
            generatePasswordPreview();

        /*
           Password starts hidden.
        */

        passwordInput.type =
            "password";

    }


    hideRegistrationSuccess();

}


/* =========================================================
   NAME CHANGE
   ========================================================= */

fullNameInput
    ?.addEventListener(
        "input",
        function() {

            refreshPasswordPreview();

        }
    );


/* =========================================================
   CLASS CHANGE
   ========================================================= */

classInput
    ?.addEventListener(
        "change",
        function() {

            refreshPasswordPreview();

        }
    );


/* =========================================================
   TOGGLE GENERATED PASSWORD
   ========================================================= */

toggleGeneratedPassword
    ?.addEventListener(
        "click",
        function() {

            if (!passwordInput) return;


            const isHidden =
                passwordInput.type ===
                "password";


            if (isHidden) {

                passwordInput.type =
                    "text";

                toggleGeneratedPassword.textContent =
                    "🙈";

                toggleGeneratedPassword.title =
                    "Hide Password";

            }

            else {

                passwordInput.type =
                    "password";

                toggleGeneratedPassword.textContent =
                    "👁️";

                toggleGeneratedPassword.title =
                    "Show Password";

            }

        }
    );


/* =========================================================
   REGENERATE PASSWORD BUTTON
   ---------------------------------------------------------
   Password is based on First Name + Class.
   ========================================================= */

regeneratePasswordButton
    ?.addEventListener(
        "click",
        function() {

            refreshPasswordPreview();

            showMessage(
                "Password preview updated.",
                "success"
            );

        }
    );


/* =========================================================
   SUCCESS PASSWORD SHOW / HIDE
   ========================================================= */

toggleSuccessPassword
    ?.addEventListener(
        "click",
        function() {

            if (!successPassword) return;


            /*
               Get actual password saved
               after successful registration.
            */

            const actualPassword =
                successPassword.dataset.password ||
                "";


            if (!actualPassword) {

                console.warn(
                    "No password available."
                );

                return;

            }


            /*
               Check visibility state.
            */

            const isVisible =
                successPassword.dataset.visible ===
                "true";


            /* =============================================
               SHOW PASSWORD
               ============================================= */

            if (!isVisible) {

                successPassword.textContent =
                    actualPassword;


                successPassword.dataset.visible =
                    "true";


                toggleSuccessPassword.textContent =
                    "🙈";


                toggleSuccessPassword.title =
                    "Hide Password";

            }


            /* =============================================
               HIDE PASSWORD
               ============================================= */

            else {

                successPassword.textContent =
                    "••••••••";


                successPassword.dataset.visible =
                    "false";


                toggleSuccessPassword.textContent =
                    "👁️";


                toggleSuccessPassword.title =
                    "Show Password";

            }

        }
    );


/* =========================================================
   MOBILE VALIDATION
   ========================================================= */

function validateMobile(mobile) {

    return /^[6-9]\d{9}$/.test(
        mobile
    );

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function validateEmail(email) {

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
   DISABLE / ENABLE REGISTER BUTTON
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
   REGISTER STUDENT
   ========================================================= */

registrationForm
    ?.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            clearMessage();


            /*
               Hide old success box before
               new registration attempt.
            */

            hideRegistrationSuccess();


            /* =============================================
               GET FORM VALUES
               ============================================= */

            const fullName =
                fullNameInput
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
                classInput
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
                   DUPLICATE
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

                    return;

                }


                /* =============================================
                   SERVER ERROR
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
                   UPDATE FORM CREDENTIALS
                   ============================================= */

                if (studentIdInput) {

                    studentIdInput.value =
                        result.studentId ||
                        "";

                }


                if (passwordInput) {

                    passwordInput.value =
                        result.password ||
                        "";

                    passwordInput.type =
                        "password";

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

                    "🎉 Registration successful! Your Student ID and Password are shown below. Please save them safely.",

                    "success"

                );


                /* =============================================
                   BUTTON
                   ============================================= */

                if (registerButton) {

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
                   Student can see registration details.
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

            }


            finally {

                setTimeout(
                    function() {

                        if (
                            registerButton
                                ?.textContent !==
                            "✅ Registration Completed"
                        ) {

                            setRegisterButtonLoading(
                                false
                            );

                        }

                    },
                    300
                );

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
