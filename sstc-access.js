/* =========================
   HEADER SCROLL
========================= */

window.addEventListener("scroll", function(){

  const header =
    document.getElementById("mainHeader");

  if(window.scrollY > 40){

    header.classList.add("scrolled");

  }else{

    header.classList.remove("scrolled");

  }

});


/* =========================
   LOGIN TAB SWITCH
========================= */

function switchLogin(type){

  const studentTab =
    document.getElementById("studentTab");

  const adminTab =
    document.getElementById("adminTab");

  const studentLogin =
    document.getElementById("studentLogin");

  const adminLogin =
    document.getElementById("adminLogin");


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


/* =========================
   PASSWORD SHOW / HIDE
========================= */

function togglePassword(inputId, button){

  const input =
    document.getElementById(inputId);


  if(input.type === "password"){

    input.type = "text";

    button.innerText = "🙈";

  }else{

    input.type = "password";

    button.innerText = "👁";

  }

}


/* =========================
   STUDENT LOGIN
========================= */

function studentLoginSubmit(event){

  event.preventDefault();


  const studentId =
    document.getElementById("studentId").value.trim();

  const password =
    document.getElementById("studentPassword").value.trim();

  const message =
    document.getElementById("studentMessage");


  if(studentId === "" || password === ""){

    message.style.color = "#d32f2f";

    message.innerText =
      "Please enter Student ID and Password.";

    return;

  }


  /*
    IMPORTANT:

    Abhi ye DEMO LOGIN hai.

    Real student database ke liye
    backend / Google Sheets / database
    connect karna hoga.
  */


  message.style.color = "#6c2bd9";

  message.innerText =
    "Login system is ready. Student dashboard will open after database connection.";

}


/* =========================
   ADMIN LOGIN
========================= */

function adminLoginSubmit(event){

  event.preventDefault();


  const adminId =
    document.getElementById("adminId").value.trim();

  const password =
    document.getElementById("adminPassword").value.trim();

  const message =
    document.getElementById("adminMessage");


  if(adminId === "" || password === ""){

    message.style.color = "#d32f2f";

    message.innerText =
      "Please enter Admin ID and Password.";

    return;

  }


  /*
    DEMO ONLY

    Do NOT store real admin passwords
    directly inside frontend JavaScript.

    Real authentication should use
    a secure backend.
  */


  message.style.color = "#6c2bd9";

  message.innerText =
    "Admin authentication is ready for backend connection.";

}


/* =========================
   FORGOT PASSWORD
========================= */

function showForgotPassword(event){

  event.preventDefault();

  alert(
    "Please contact Shree Scholars Tuition Centre administration to reset your password."
  );

}


/* =========================
   QUICK ACCESS
========================= */

function studentQuickAccess(event){

  event.preventDefault();

  alert(
    "Please login as a student to access this feature."
  );

}
