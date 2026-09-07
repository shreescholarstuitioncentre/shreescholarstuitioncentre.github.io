/* =========================================================
   SSTC STUDENT ACCESS + LOGIN
   =========================================================
   
   FEATURES
   ---------------------------------------------------------
   ✅ Student Login
   ✅ Google Sheets Verification
   ✅ Active / Inactive Account Check
   ✅ Student Session
   ✅ Remember Student ID
   ✅ Login Tab Switch
   ✅ Password Show / Hide
   ✅ Forgot Password
   ✅ Header Scroll
   ========================================================= */


/* =========================================================
   GOOGLE APPS SCRIPT WEB APP URL
   ---------------------------------------------------------
   IMPORTANT:
   This MUST be the SAME deployment URL used by Code.gs.
========================================================= */

const SSTC_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =========================================================
   STUDENT LOGIN
========================================================= */

async function studentLoginSubmit(event) {

  event.preventDefault();


  /* =====================================================
     GET INPUTS
  ===================================================== */

  const studentIdInput =
    document.getElementById(
      "studentId"
    );


  const passwordInput =
    document.getElementById(
      "studentPassword"
    );


  const message =
    document.getElementById(
      "studentMessage"
    );


  const rememberStudent =
    document.getElementById(
      "rememberStudent"
    )?.checked;


  const studentId =
    studentIdInput
      ? studentIdInput.value.trim()
      : "";


  const password =
    passwordInput
      ? passwordInput.value
      : "";


  /* =====================================================
     CLEAR OLD MESSAGE
  ===================================================== */

  if (message) {

    message.style.color =
      "#6c2bd9";

    message.innerText =
      "";

  }


  /* =====================================================
     VALIDATION
  ===================================================== */

  if (
    !studentId ||
    !password
  ) {

    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        "Please enter Student ID and Password.";

    }

    return;

  }


  /* =====================================================
     CHECK API URL
  ===================================================== */

  if (
    !SSTC_WEB_APP_URL ||
    !SSTC_WEB_APP_URL.includes(
      "script.google.com/macros/s/"
    )
  ) {

    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        "Student login API is not configured.";

    }

    return;

  }


  /* =====================================================
     LOGIN BUTTON
  ===================================================== */

  const loginButton =
    document.querySelector(
      "#studentLogin .login-button"
    );


  const originalButtonText =
    loginButton
      ? loginButton.innerHTML
      : "";


  if (loginButton) {

    loginButton.disabled =
      true;

    loginButton.innerHTML =
      "⏳ Checking Login...";

  }


  try {

    /* ===================================================
       BUILD API REQUEST
    =================================================== */

    const params =
      new URLSearchParams();


    params.set(
      "action",
      "studentlogin"
    );


    params.set(
      "studentId",
      studentId
    );


    params.set(
      "password",
      password
    );


    const apiUrl =
      SSTC_WEB_APP_URL +
      "?" +
      params.toString();


    console.log(
      "SSTC Student Login API:",
      apiUrl
    );


    /* ===================================================
       FETCH GOOGLE APPS SCRIPT
    =================================================== */

    const response =
      await fetch(
        apiUrl,
        {
          method: "GET",
          cache: "no-store",
          redirect: "follow"
        }
      );


    console.log(
      "Student Login HTTP Status:",
      response.status
    );


    if (!response.ok) {

      throw new Error(
        "Server response: " +
        response.status
      );

    }


    /* ===================================================
       READ JSON
    =================================================== */

    const result =
      await response.json();


    console.log(
      "Student Login API Response:",
      result
    );


    /* ===================================================
       SUCCESS
    =================================================== */

    if (
      result &&
      result.success === true
    ) {

      if (message) {

        message.style.color =
          "#15803d";

        message.innerText =
          "Login successful! Opening student dashboard...";

      }


      /* ================================================
         SAVE STUDENT SESSION
         
         Password ko session mein save nahi karenge.
      ================================================= */

      if (
        result.student
      ) {

        const studentData = {

          studentId:
            result.student.studentId || "",

          fullName:
            result.student.fullName || "",

          mobile:
            result.student.mobile || "",

          gender:
            result.student.gender || "",

          email:
            result.student.email || "",

          className:
            result.student.className || "",

          board:
            result.student.board || "",

          schoolName:
            result.student.schoolName || "",

          schoolPlace:
            result.student.schoolPlace || "",

          registrationDate:
            result.student.registrationDate || "",

          status:
            result.student.status || "Active"

        };


        sessionStorage.setItem(

          "sstcStudentData",

          JSON.stringify(
            studentData
          )

        );

      }


      /* ================================================
         LOGIN SESSION
      ================================================= */

      sessionStorage.setItem(
        "sstcStudentLoggedIn",
        "true"
      );


      /* ================================================
         REMEMBER STUDENT ID
      ================================================= */

      if (
        rememberStudent
      ) {

        localStorage.setItem(

          "sstcRememberedStudent",

          studentId

        );

      }

      else {

        localStorage.removeItem(
          "sstcRememberedStudent"
        );

      }


      /* ================================================
         OPEN STUDENT DASHBOARD
      ================================================= */

      setTimeout(
        function () {

          window.location.href =
            "student-page.html";

        },
        700
      );


      return;

    }


    /* ===================================================
       INACTIVE ACCOUNT
    =================================================== */

    if (
      result &&
      result.type === "inactive"
    ) {

      if (message) {

        message.style.color =
          "#d32f2f";

        message.innerText =
          result.message ||
          "Your student account is currently inactive.";

      }

      return;

    }


    /* ===================================================
       INVALID CREDENTIALS
    =================================================== */

    if (
      message
    ) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        result &&
        result.message
          ? result.message
          : "Invalid Student ID or Password.";

    }

  }

  catch (error) {

    console.error(
      "STUDENT LOGIN ERROR:",
      error
    );


    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        "Unable to connect to Student Database. Please try again.";

    }

  }

  finally {

    /* =================================================
       RESTORE LOGIN BUTTON
    ================================================= */

    if (loginButton) {

      loginButton.disabled =
        false;

      loginButton.innerHTML =
        originalButtonText;

    }

  }

}


/* =========================================================
   HEADER SCROLL
========================================================= */

window.addEventListener(
  "scroll",
  function () {

    const header =
      document.getElementById(
        "mainHeader"
      );


    if (!header) {

      return;

    }


    if (
      window.scrollY > 40
    ) {

      header.classList.add(
        "scrolled"
      );

    }

    else {

      header.classList.remove(
        "scrolled"
      );

    }

  }
);


/* =========================================================
   LOGIN TAB SWITCH
========================================================= */

function switchLogin(
  type
) {

  const studentTab =
    document.getElementById(
      "studentTab"
    );


  const adminTab =
    document.getElementById(
      "adminTab"
    );


  const studentLogin =
    document.getElementById(
      "studentLogin"
    );


  const adminLogin =
    document.getElementById(
      "adminLogin"
    );


  if (
    !studentTab ||
    !adminTab ||
    !studentLogin ||
    !adminLogin
  ) {

    return;

  }


  /* =====================================================
     REMOVE ACTIVE STATE
  ===================================================== */

  studentTab.classList.remove(
    "active"
  );


  adminTab.classList.remove(
    "active"
  );


  studentLogin.classList.remove(
    "active-form"
  );


  adminLogin.classList.remove(
    "active-form"
  );


  /* =====================================================
     STUDENT TAB
  ===================================================== */

  if (
    type === "student"
  ) {

    studentTab.classList.add(
      "active"
    );


    studentLogin.classList.add(
      "active-form"
    );

  }


  /* =====================================================
     ADMIN TAB
  ===================================================== */

  if (
    type === "admin"
  ) {

    adminTab.classList.add(
      "active"
    );


    adminLogin.classList.add(
      "active-form"
    );

  }

}


/* =========================================================
   PASSWORD SHOW / HIDE
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
   FORGOT PASSWORD
========================================================= */

function showForgotPassword(
  event
) {

  if (event) {

    event.preventDefault();

  }


  alert(
    "Please contact Shree Scholars Tuition Centre administration to reset your password."
  );

}


/* =========================================================
   QUICK ACCESS
========================================================= */

function studentQuickAccess(
  event
) {

  if (event) {

    event.preventDefault();

  }


  alert(
    "Please login as a student to access this feature."
  );

}


/* =========================================================
   REMEMBERED STUDENT ID
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const savedStudent =
      localStorage.getItem(
        "sstcRememberedStudent"
      );


    const studentInput =
      document.getElementById(
        "studentId"
      );


    const rememberCheckbox =
      document.getElementById(
        "rememberStudent"
      );


    if (
      savedStudent &&
      studentInput
    ) {

      studentInput.value =
        savedStudent;


      if (
        rememberCheckbox
      ) {

        rememberCheckbox.checked =
          true;

      }

    }

  }
);
