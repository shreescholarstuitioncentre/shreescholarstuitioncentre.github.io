/* =========================================================
   SSTC ADMIN LOGIN
   ========================================================= */

const SSTC_ADMIN_ID = "SSTCGKP";

const SSTC_ADMIN_PASSWORD =
  "Maa@adarsh2023";


/* ================= PASSWORD TOGGLE ================= */

function togglePassword(inputId, button) {

  const input =
    document.getElementById(inputId);

  if (!input) return;

  if (input.type === "password") {

    input.type = "text";

    button.textContent = "🙈";

  } else {

    input.type = "password";

    button.textContent = "👁️";

  }
}


/* ================= ADMIN LOGIN ================= */

function adminLoginSubmit(event) {

  event.preventDefault();


  const adminId =
    document
      .getElementById("adminId")
      ?.value
      .trim();

  const adminPassword =
    document
      .getElementById("adminPassword")
      ?.value;

  const rememberAdmin =
    document
      .getElementById("rememberAdmin")
      ?.checked;

  const message =
    document.getElementById("adminMessage");


  /* Clear old message */

  if (message) {

    message.textContent = "";

    message.className =
      "login-message";

  }


  /* ================= VALIDATION ================= */

  if (!adminId || !adminPassword) {

    showAdminMessage(
      "Please enter Admin ID and Password.",
      "error"
    );

    return;
  }


  /* ================= AUTHENTICATION ================= */

  if (
    adminId === SSTC_ADMIN_ID &&
    adminPassword === SSTC_ADMIN_PASSWORD
  ) {

    /*
      Session authentication
    */

    sessionStorage.setItem(
      "sstcAdminAuthenticated",
      "true"
    );


    /*
      Remember Me

      NOTE:
      This stores only the Admin ID.
      Do NOT store the password in localStorage.
    */

    if (rememberAdmin) {

      localStorage.setItem(
        "sstcRememberedAdmin",
        adminId
      );

    } else {

      localStorage.removeItem(
        "sstcRememberedAdmin"
      );

    }


    /* SUCCESS MESSAGE */

    showAdminMessage(
      "Login successful! Opening Admin Dashboard...",
      "success"
    );


    /*
      Small delay so user can see
      success message.
    */

    setTimeout(() => {

      window.location.href =
        "admin-page.html";

    }, 600);


    return;
  }


  /* ================= INVALID LOGIN ================= */

  showAdminMessage(
    "Invalid Admin ID or Password.",
    "error"
  );

}


/* ================= MESSAGE ================= */

function showAdminMessage(
  text,
  type
) {

  const message =
    document.getElementById("adminMessage");

  if (!message) return;


  message.textContent = text;

  message.className =
    "login-message " + type;

}


/* ================= REMEMBERED ADMIN ================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const savedAdmin =
      localStorage.getItem(
        "sstcRememberedAdmin"
      );

    const adminInput =
      document.getElementById("adminId");

    const rememberCheckbox =
      document.getElementById(
        "rememberAdmin"
      );


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
