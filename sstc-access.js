/* =========================================================
   SSTC STUDENT LOGIN
   ========================================================= */

/*
   IMPORTANT:
   Yahan Apps Script ka WEB APP URL paste karo.

   Example:
   https://script.google.com/macros/s/XXXXXXXXXXXX/exec

   "script.google.com/u/0/home/projects/..."
   wala editor URL yahan MAT lagana.
*/

const SSTC_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbx1ezqxhDMXZnL_SJ95IAe3e0a-pJVQssgGw4IonCdfXvpGnhLFZN0UHdVOlSwkR1ERGg/exec";


/* =========================
   STUDENT LOGIN
========================= */

async function studentLoginSubmit(event) {

  event.preventDefault();


  const studentId =
    document
      .getElementById("studentId")
      ?.value
      .trim();


  const password =
    document
      .getElementById("studentPassword")
      ?.value;


  const message =
    document.getElementById(
      "studentMessage"
    );


  const rememberStudent =
    document.getElementById(
      "rememberStudent"
    )?.checked;


  /* =========================
     CLEAR MESSAGE
  ========================= */

  if (message) {

    message.style.color =
      "#6c2bd9";

    message.innerText =
      "";

  }


  /* =========================
     VALIDATION
  ========================= */

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


  /* =========================
     CHECK API URL
  ========================= */

  if (
    SSTC_WEB_APP_URL
      ===
    "https://script.google.com/macros/s/AKfycbx1ezqxhDMXZnL_SJ95IAe3e0a-pJVQssgGw4IonCdfXvpGnhLFZN0UHdVOlSwkR1ERGg/exec"
  ) {

    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        "Student login API is not configured yet.";

    }

    return;

  }


  /* =========================
     LOADING
  ========================= */

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

    /*
      GET request

      Apps Script:
      ?action=studentLogin

      We use URLSearchParams
      so Student ID / password
      are correctly encoded.
    */

    const params =
      new URLSearchParams({

        action:
          "studentLogin",

        studentId:
          studentId,

        password:
          password

      });


    const response =
      await fetch(

        SSTC_WEB_APP_URL +
        "?" +
        params.toString(),

        {

          method:
            "GET",

          redirect:
            "follow"

        }

      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Server response: " +
        response.status
      );

    }


    const result =
      await response.json();


    /* =========================
       LOGIN SUCCESS
    ========================= */

    if (
      result.success === true
    ) {

      if (message) {

        message.style.color =
          "#15803d";

        message.innerText =
          "Login successful! Opening student dashboard...";

      }


      /*
        Save only student profile/session data.
        Password is NOT saved.
      */

      if (
        result.student
      ) {

        sessionStorage.setItem(

          "sstcStudentData",

          JSON.stringify(
            result.student
          )

        );

      }


      sessionStorage.setItem(
        "sstcStudentLoggedIn",
        "true"
      );


      /* =========================
         REMEMBER STUDENT
      ========================= */

      if (
        rememberStudent
      ) {

        localStorage.setItem(

          "sstcRememberedStudent",

          studentId

        );

      } else {

        localStorage.removeItem(
          "sstcRememberedStudent"
        );

      }


      /* =========================
         OPEN STUDENT PAGE
      ========================= */

      setTimeout(

        function(){

          window.location.href =
            "student-page.html";

        },

        700

      );


      return;

    }


    /* =========================
       INACTIVE ACCOUNT
    ========================= */

    if (
      result.type ===
      "inactive"
    ) {

      if (message) {

        message.style.color =
          "#d32f2f";

        message.innerText =
          result.message ||
          "Your account is inactive.";

      }

      return;

    }


    /* =========================
       INVALID LOGIN
    ========================= */

    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        result.message ||
        "Invalid Student ID or Password.";

    }


  } catch (error) {

    console.error(
      "Student Login Error:",
      error
    );


    if (message) {

      message.style.color =
        "#d32f2f";

      message.innerText =
        "Unable to connect to Student Database. Please try again.";

    }

  } finally {

    /* =========================
       RESTORE BUTTON
    ========================= */

    if (loginButton) {

      loginButton.disabled =
        false;

      loginButton.innerHTML =
        originalButtonText;

    }

  }

}


/* =========================================================
   REST OF YOUR EXISTING SSTC ACCESS JS
   ========================================================= */


/* =========================
   HEADER SCROLL
========================= */

window.addEventListener(
  "scroll",
  function(){

    const header =
      document.getElementById(
        "mainHeader"
      );

    if (
      !header
    ) return;


    if (
      window.scrollY > 40
    ){

      header.classList.add(
        "scrolled"
      );

    } else {

      header.classList.remove(
        "scrolled"
      );

    }

  }
);


/* =========================
   LOGIN TAB SWITCH
========================= */

function switchLogin(
  type
){

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


  if (
    type === "student"
  ){

    studentTab.classList.add(
      "active"
    );

    studentLogin.classList.add(
      "active-form"
    );

  }


  if (
    type === "admin"
  ){

    adminTab.classList.add(
      "active"
    );

    adminLogin.classList.add(
      "active-form"
    );

  }

}


/* =========================
   PASSWORD SHOW / HIDE
========================= */

function togglePassword(
  inputId,
  button
){

  const input =
    document.getElementById(
      inputId
    );


  if (
    !input
  ) return;


  if (
    input.type ===
    "password"
  ){

    input.type =
      "text";

    button.innerText =
      "🙈";

  } else {

    input.type =
      "password";

    button.innerText =
      "👁";

  }

}


/* =========================
   FORGOT PASSWORD
========================= */

function showForgotPassword(
  event
){

  event.preventDefault();

  alert(
    "Please contact Shree Scholars Tuition Centre administration to reset your password."
  );

}


/* =========================
   QUICK ACCESS
========================= */

function studentQuickAccess(
  event
){

  event.preventDefault();

  alert(
    "Please login as a student to access this feature."
  );

}


/* =========================================================
   REMEMBERED STUDENT ID
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function(){

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
    ){

      studentInput.value =
        savedStudent;


      if (
        rememberCheckbox
      ){

        rememberCheckbox.checked =
          true;

      }

    }

  }
);
