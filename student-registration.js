/* =========================================================
   SSTC STUDENT REGISTRATION
   SUPABASE VERSION
   ========================================================= */


/* =========================================================
   DOM
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

const studentIdInput =
    document.getElementById(
        "studentId"
    );

const passwordInput =
    document.getElementById(
        "generatedPassword"
    );


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text, type) {

    if (!messageBox) return;

    messageBox.textContent = text;

    messageBox.className =
        "registration-message " + type;

}


/* =========================================================
   NAME CLEANING
   ========================================================= */

function cleanName(name) {

    return name
        .trim()
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();

}


/* =========================================================
   STUDENT ID
   ========================================================= */

function generateStudentId() {

    const randomPart =
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    const timePart =
        Date.now()
            .toString(36)
            .slice(-4)
            .toUpperCase();

    return `SSTC${timePart}${randomPart}`;

}


/* =========================================================
   PASSWORD
   ========================================================= */

function generateStudentPassword() {

    const name =
        document
            .getElementById("fullName")
            ?.value
            .trim() || "Student";

    const studentClass =
        document
            .getElementById("studentClass")
            ?.value || "10";

    const clean =
        cleanName(name)
            .substring(0, 6);

    const random =
        Math.floor(
            100 +
            Math.random() * 900
        );

    return `${clean}${studentClass}@${random}`;

}


/* =========================================================
   INITIAL VALUES
   ========================================================= */

function refreshGeneratedCredentials() {

    const name =
        document
            .getElementById("fullName")
            ?.value
            .trim();

    if (!studentIdInput.value) {

        studentIdInput.value =
            generateStudentId();

    }

    passwordInput.value =
        generateStudentPassword();

}


/* =========================================================
   REGENERATE PASSWORD
   ========================================================= */

document
    .getElementById(
        "regeneratePassword"
    )
    ?.addEventListener(
        "click",
        () => {

            passwordInput.value =
                generateStudentPassword();

        }
    );


/* =========================================================
   GENERATE PASSWORD WHEN NAME / CLASS CHANGES
   ========================================================= */

document
    .getElementById("fullName")
    ?.addEventListener(
        "input",
        () => {

            passwordInput.value =
                generateStudentPassword();

        }
    );


document
    .getElementById("studentClass")
    ?.addEventListener(
        "change",
        () => {

            passwordInput.value =
                generateStudentPassword();

        }
    );


/* =========================================================
   VALIDATE MOBILE
   ========================================================= */

function validateMobile(mobile) {

    return /^[6-9]\d{9}$/.test(mobile);

}


/* =========================================================
   CHECK DUPLICATE MOBILE
   ========================================================= */

async function checkDuplicateMobile(mobile) {

    const {
        data,
        error
    } = await supabaseClient

        .from("students")

        .select(
            "student_id, mobile"
        )

        .eq(
            "mobile",
            mobile
        )

        .limit(1);


    if (error) {

        console.error(
            "Mobile duplicate check:",
            error
        );

        throw error;

    }


    if (data && data.length > 0) {

        return data[0];

    }

    return null;

}


/* =========================================================
   CHECK DUPLICATE EMAIL
   ========================================================= */

async function checkDuplicateEmail(email) {

    const {
        data,
        error
    } = await supabaseClient

        .from("students")

        .select(
            "student_id, email"
        )

        .eq(
            "email",
            email.toLowerCase()
        )

        .limit(1);


    if (error) {

        console.error(
            "Email duplicate check:",
            error
        );

        throw error;

    }


    if (data && data.length > 0) {

        return data[0];

    }

    return null;

}


/* =========================================================
   REGISTRATION
   ========================================================= */

registrationForm
    ?.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            showMessage(
                "",
                ""
            );


            /* ================= GET VALUES ================= */

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


            const gender =
                document
                    .querySelector(
                        'input[name="gender"]:checked'
                    )
                    ?.value;


            const email =
                document
                    .getElementById(
                        "email"
                    )
                    .value
                    .trim()
                    .toLowerCase();


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


            const confirm =
                document
                    .getElementById(
                        "confirmInformation"
                    )
                    .checked;


            const studentId =
                studentIdInput.value ||
                generateStudentId();


            const password =
                passwordInput.value ||
                generateStudentPassword();



            /* ================= VALIDATION ================= */

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


            if (!email) {

                showMessage(
                    "Please enter email ID.",
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


            if (!confirm) {

                showMessage(
                    "Please confirm that the information is correct.",
                    "error"
                );

                return;

            }



            /* ================= BUTTON ================= */

            registerButton.disabled =
                true;

            registerButton.textContent =
                "⏳ Registering...";


            try {


                /* =================================================
                   DUPLICATE MOBILE
                   ================================================= */

                const duplicateMobile =
                    await checkDuplicateMobile(
                        mobile
                    );


                if (duplicateMobile) {

                    showMessage(
                        `This mobile number is already registered with Student ID: ${duplicateMobile.student_id}`,
                        "error"
                    );

                    return;

                }



                /* =================================================
                   DUPLICATE EMAIL
                   ================================================= */

                const duplicateEmail =
                    await checkDuplicateEmail(
                        email
                    );


                if (duplicateEmail) {

                    showMessage(
                        `This email is already registered with Student ID: ${duplicateEmail.student_id}`,
                        "error"
                    );

                    return;

                }



                /* =================================================
                   SUPABASE AUTH SIGNUP
                   ================================================= */

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .auth
                        .signUp({

                            email: email,

                            password: password,

                            options: {

                                data: {

                                    student_id:
                                        studentId,

                                    full_name:
                                        fullName,

                                    mobile:
                                        mobile,

                                    gender:
                                        gender,

                                    class:
                                        studentClass,

                                    board:
                                        board,

                                    school_name:
                                        schoolName,

                                    school_place:
                                        schoolPlace

                                }

                            }

                        });


                if (error) {

                    console.error(
                        "Supabase signup:",
                        error
                    );

                    throw error;

                }


                if (!data || !data.user) {

                    throw new Error(
                        "Registration could not be completed."
                    );

                }



                /* =================================================
                   SUCCESS
                   ================================================= */

                showMessage(
                    `Registration successful! Your Student ID is ${studentId}. Your password is ${password}. Please save these credentials safely.`,
                    "success"
                );


                /*
                   Do not display password permanently
                   after registration.
                */


                studentIdInput.value =
                    studentId;


                registerButton.textContent =
                    "✅ Registration Completed";


                /*
                   Keep user signed in only if
                   Supabase returned a session.
                */


                if (!data.session) {

                    showMessage(
                        `Registration created successfully. Student ID: ${studentId}. Password: ${password}. If email confirmation is enabled in Supabase, please confirm your email before login.`,
                        "success"
                    );

                }


            }

            catch (error) {

                console.error(
                    error
                );


                let errorMessage =
                    error?.message ||
                    "Registration failed.";


                if (
                    errorMessage
                        .toLowerCase()
                        .includes(
                            "already registered"
                        )
                ) {

                    errorMessage =
                        "This email is already registered.";

                }


                if (
                    errorMessage
                        .toLowerCase()
                        .includes(
                            "duplicate"
                        )
                ) {

                    errorMessage =
                        "This information is already registered.";

                }


                showMessage(
                    errorMessage,
                    "error"
                );

            }

            finally {

                registerButton.disabled =
                    false;

                if (
                    registerButton.textContent
                        .includes(
                            "Registering"
                        )
                ) {

                    registerButton.textContent =
                        "🎓 Register Student";

                }

            }

        }
    );


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        studentIdInput.value =
            generateStudentId();

        passwordInput.value =
            generateStudentPassword();

    }
);
