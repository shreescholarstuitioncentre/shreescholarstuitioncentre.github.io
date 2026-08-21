/* =========================================================
   SSTC ACCESS PAGE
   STUDENT LOGIN + COMMON UI
   ========================================================= */


/* =========================================================
   GOOGLE APPS SCRIPT WEB APP URL
   =========================================================

   IMPORTANT:

   Yahan apne Google Apps Script ka DEPLOYED WEB APP URL
   paste karein.

   Example:

   https://script.google.com/macros/s/XXXXXXXXXXXX/exec

   Google Sheet ka URL yahan mat daalna.
   ========================================================= */

const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxjXvW2heX5EFVc40j3x9q9xqF4w1xODK2s-j4zvhtH/dev";


/* =========================================================
   HEADER SCROLL
   ========================================================= */

window.addEventListener("scroll", function(){

  const header =
    document.getElementById("mainHeader");

  if(!header) return;


  if(window.scrollY > 40){

    header.classList.add("scrolled");

  }else{

    header.classList.remove("scrolled");

  }

});


/* =========================================================
   LOGIN TAB SWITCH
   ========================================================= */

function switchLogin(type){

  const studentTab =
    document.getElementById("studentTab");

  const adminTab =
    document.getElementById("adminTab");

  const studentLogin =
    document.getElementById("studentLogin");

  const adminLogin =
    document.getElementById("adminLogin");


  if(!studentTab ||
     !adminTab ||
     !studentLogin ||
     !adminLogin){

    return;

  }


  studentTab.classList.remove("active");

  adminTab.classList.remove("active");

  studentLogin.classList.remove("active-form");

  adminLogin.classList.remove("active-form");


  if(type === "student"){

    studentTab.classList.add("active");

    studentLogin.classList.add("active-form");

  }


  if(type === "admin"){

    adminTab.classList.add("active");

    adminLogin.classList.add("active-form");

  }

}


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

function togglePassword(inputId, button){

  const input =
    document.getElementById(inputId);


  if(!input || !button){

    return;

  }


  if(input.type === "password"){

    input.type = "text";

    button.innerText = "🙈";

  }else{

    input.type = "password";

    button.innerText = "👁";

  }

}


/* =========================================================
   STUDENT LOGIN
   ========================================================= */

async function studentLoginSubmit(event){

  event.preventDefault();


  const studentIdInput =
    document.getElementById("studentId");

  const passwordInput =
    document.getElementById("studentPassword");

  const rememberCheckbox =
    document.getElementById("rememberStudent");

  const message =
    document.getElementById("studentMessage");

  const loginButton =
    document.getElementById("studentLoginButton");


  if(
    !studentIdInput ||
    !passwordInput ||
    !message
  ){

    return;

  }


  const studentId =
    studentIdInput.value
      .trim()
      .toUpperCase();

  const password =
    passwordInput.value.trim();


  /* =====================================================
     BASIC VALIDATION
  ===================================================== */

  if(studentId === "" || password === ""){

    showStudentMessage(
      "Please enter Student ID and Password.",
      "error"
    );

    return;

  }


  /* =====================================================
     CHECK API URL
  ===================================================== */

  if(
    !GOOGLE_APPS_SCRIPT_URL ||
    GOOGLE_APPS_SCRIPT_URL.includes(
      "PASTE_YOUR_GOOGLE_APPS_SCRIPT"
    )
  ){

    showStudentMessage(
      "Student login service is not configured yet.",
      "error"
    );

    console.error(
      "Please add your Google Apps Script Web App URL in sstc-access.js"
    );

    return;

  }


  /* =====================================================
     LOADING
  ===================================================== */

  if(loginButton){

    loginButton.disabled = true;

    loginButton.innerText =
      "⏳ Verifying Student...";

  }


  showStudentMessage(
    "Checking Student ID and Password...",
    "loading"
  );


  try{

    /* ===================================================
       SEND LOGIN REQUEST TO GOOGLE APPS SCRIPT
    =================================================== */

    const response =
      await fetch(
        GOOGLE_APPS_SCRIPT_URL,
        {

          method:"POST",

          headers:{
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:JSON.stringify({

            action:"studentLogin",

            studentId:
              studentId,

            password:
              password

          })

        }
      );


    /* ===================================================
       GET JSON RESPONSE
    =================================================== */

    const result =
      await response.json();


    console.log(
      "SSTC Student Login Response:",
      result
    );


    /* ===================================================
       LOGIN SUCCESS
    =================================================== */

    if(
      result &&
      result.success === true &&
      result.student
    ){

      showStudentMessage(
        "Login successful! Opening Student Dashboard...",
        "success"
      );


      /* ================================================
         REMEMBER STUDENT ID
      ================================================= */

      if(
        rememberCheckbox &&
        rememberCheckbox.checked
      ){

        localStorage.setItem(
          "sstcRememberedStudent",
          studentId
        );

      }else{

        localStorage.removeItem(
          "sstcRememberedStudent"
        );

      }


      /* ================================================
         SAVE STUDENT SESSION
      =================================================

         Password ko browser storage me save nahi kar rahe.
      ================================================= */

      const studentSession = {

        studentId:
          result.student.studentId || studentId,

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
        "sstcStudentLoggedIn",
        "true"
      );


      sessionStorage.setItem(
        "sstcStudentData",
        JSON.stringify(
          studentSession
        )
      );


      /* ================================================
         OPEN STUDENT PAGE
      ================================================= */

      setTimeout(function(){

        window.location.href =
          "student-page.html";

      },700);


      return;

    }


    /* ===================================================
       LOGIN FAILED
    =================================================== */

    let errorMessage =
      "Invalid Student ID or Password.";


    if(result){

      if(
        result.type ===
        "student_not_found"
      ){

        errorMessage =
          "Student ID not found.";

      }


      else if(
        result.type ===
        "invalid_password"
      ){

        errorMessage =
          "Incorrect Student Password.";

      }


      else if(
        result.type ===
        "inactive"
      ){

        errorMessage =
          "Your Student Account is inactive. Please contact SSTC administration.";

      }


      else if(
        result.type ===
        "validation_error"
      ){

        errorMessage =
          result.message ||
          "Please enter Student ID and Password.";

      }


      else if(
        result.message
      ){

        errorMessage =
          result.message;

      }

    }


    showStudentMessage(
      errorMessage,
      "error"
    );


  }catch(error){

    console.error(
      "Student Login Error:",
      error
    );


    showStudentMessage(

      "Unable to connect to Student Login Server. Please try again.",

      "error"

    );

  }


  /* =====================================================
     RESET BUTTON
  ===================================================== */

  if(loginButton){

    loginButton.disabled = false;

    loginButton.innerText =
      "🔐 Login as Student";

  }

}


/* =========================================================
   STUDENT MESSAGE
   ========================================================= */

function showStudentMessage(
  text,
  type
){

  const message =
    document.getElementById(
      "studentMessage"
    );


  if(!message){

    return;

  }


  message.innerText =
    text;


  if(type === "success"){

    message.style.color =
      "#16803c";

  }


  else if(type === "error"){

    message.style.color =
      "#d32f2f";

  }


  else{

    message.style.color =
      "#6c2bd9";

  }

}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function showForgotPassword(event){

  event.preventDefault();


  alert(
    "Please contact Shree Scholars Tuition Centre administration to reset your password."
  );

}


/* =========================================================
   QUICK ACCESS
   ========================================================= */

function studentQuickAccess(event){

  event.preventDefault();


  alert(
    "Please login as a student to access this feature."
  );

}


/* =========================================================
   REMEMBERED STUDENT
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


    if(
      savedStudent &&
      studentInput
    ){

      studentInput.value =
        savedStudent;


      if(rememberCheckbox){

        rememberCheckbox.checked =
          true;

      }

    }

  }
);
