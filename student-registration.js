/* =========================================================
   SSTC STUDENT REGISTRATION JS
   ========================================================= */


/*
   =========================================================
   IMPORTANT
   =========================================================

   Yahan apne Google Apps Script Web App ka URL paste karein.

   Example:

   const GOOGLE_SCRIPT_URL =
   "https://script.google.com/macros/s/XXXXXXXXXXXX/exec";

*/

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxjXvW2heX5EFVc40j3x9q9xqF4w1xODK2s-j4zvhtH/dev";


/* =========================================================
   ELEMENTS
   ========================================================= */

const form =
  document.getElementById(
    "studentRegistrationForm"
  );

const fullNameInput =
  document.getElementById(
    "fullName"
  );

const mobileInput =
  document.getElementById(
    "mobile"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const genderInput =
  document.getElementById(
    "gender"
  );

const classInput =
  document.getElementById(
    "studentClass"
  );

const boardInput =
  document.getElementById(
    "board"
  );

const schoolNameInput =
  document.getElementById(
    "schoolName"
  );

const schoolPlaceInput =
  document.getElementById(
    "schoolPlace"
  );

const studentIdInput =
  document.getElementById(
    "studentId"
  );

const passwordInput =
  document.getElementById(
    "studentPassword"
  );

const termsInput =
  document.getElementById(
    "terms"
  );

const messageBox =
  document.getElementById(
    "registrationMessage"
  );

const registerButton =
  document.getElementById(
    "registerButton"
  );

const buttonText =
  document.getElementById(
    "buttonText"
  );

const buttonLoader =
  document.getElementById(
    "buttonLoader"
  );

const togglePasswordButton =
  document.getElementById(
    "togglePassword"
  );


/* =========================================================
   CURRENT YEAR
   ========================================================= */

const currentYear =
  document.getElementById(
    "currentYear"
  );

if (currentYear) {

  currentYear.textContent =
    new Date().getFullYear();

}


/* =========================================================
   STUDENT ID GENERATOR
   ========================================================= */

function generateStudentId() {

  /*
     SSTC + YEAR + RANDOM NUMBER

     Example:

     SSTC26058321

     Random part makes repeated ID
     generation very unlikely.
  */

  const year =
    String(
      new Date().getFullYear()
    ).slice(-2);

  const randomPart =
    Math.floor(
      100000 +
      Math.random() * 900000
    );

  return (
    "SSTC" +
    year +
    randomPart
  );
}


/* =========================================================
   LOCAL UNIQUE ID CHECK
   ========================================================= */

function generateUniqueStudentId() {

  let id;

  let attempts = 0;

  do {

    id =
      generateStudentId();

    attempts++;

  } while (
    localStorage.getItem(
      "sstc_student_" + id
    ) &&
    attempts < 20
  );

  return id;
}


/* =========================================================
   PASSWORD GENERATOR
   ========================================================= */

function generateStudentPassword(
  fullName,
  studentClass
) {

  /*
     Example:

     Full Name:
     Rahul Kumar

     Class:
     10

     Password:

     Rahul10@SSTC

  */

  const cleanName =
    fullName
      .trim()
      .replace(
        /[^a-zA-Z]/g,
        ""
      );


  let namePart =
    cleanName.substring(
      0,
      6
    );


  if (!namePart) {

    namePart = "Student";

  }


  /*
     First letter uppercase
     remaining letters lowercase
  */

  namePart =
    namePart.charAt(0).toUpperCase() +
    namePart.slice(1).toLowerCase();


  return (
    namePart +
    studentClass +
    "@SSTC"
  );
}


/* =========================================================
   INITIAL AUTO GENERATION
   ========================================================= */

function updateAutoCredentials() {

  const name =
    fullNameInput.value.trim();

  const studentClass =
    classInput.value;


  /*
     Student ID
  */

  if (!studentIdInput.value) {

    studentIdInput.value =
      generateUniqueStudentId();

  }


  /*
     Password
  */

  if (
    name &&
    studentClass
  ) {

    passwordInput.value =
      generateStudentPassword(
        name,
        studentClass
      );

  } else {

    passwordInput.value = "";

  }

}


/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

togglePasswordButton.addEventListener(
  "click",
  () => {

    if (
      passwordInput.type ===
      "password"
    ) {

      passwordInput.type =
        "text";

      togglePasswordButton.textContent =
        "🙈";

      togglePasswordButton.setAttribute(
        "aria-label",
        "Hide password"
      );

    } else {

      passwordInput.type =
        "password";

      togglePasswordButton.textContent =
        "👁️";

      togglePasswordButton.setAttribute(
        "aria-label",
        "Show password"
      );

    }

  }
);


/* =========================================================
   NAME / CLASS CHANGE
   ========================================================= */

fullNameInput.addEventListener(
  "input",
  () => {

    const name =
      fullNameInput.value.trim();

    const studentClass =
      classInput.value;


    if (
      name &&
      studentClass
    ) {

      passwordInput.value =
        generateStudentPassword(
          name,
          studentClass
        );

    } else {

      passwordInput.value =
        "";

    }

  }
);


classInput.addEventListener(
  "change",
  () => {

    const name =
      fullNameInput.value.trim();

    const studentClass =
      classInput.value;


    if (
      name &&
      studentClass
    ) {

      passwordInput.value =
        generateStudentPassword(
          name,
          studentClass
        );

    }

  }
);


/* =========================================================
   MOBILE VALIDATION
   ========================================================= */

mobileInput.addEventListener(
  "input",
  () => {

    mobileInput.value =
      mobileInput.value
        .replace(
          /\D/g,
          ""
        )
        .substring(
          0,
          10
        );

  }
);


/* =========================================================
   MESSAGE FUNCTION
   ========================================================= */

function showMessage(
  text,
  type = "error"
) {

  messageBox.textContent =
    text;

  messageBox.className =
    "registration-message show " +
    type;

  messageBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


function clearMessage() {

  messageBox.textContent =
    "";

  messageBox.className =
    "registration-message";

}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateForm() {

  const name =
    fullNameInput.value.trim();

  const mobile =
    mobileInput.value.trim();

  const email =
    emailInput.value.trim();

  const gender =
    genderInput.value;

  const studentClass =
    classInput.value;

  const board =
    boardInput.value;

  const schoolName =
    schoolNameInput.value.trim();

  const schoolPlace =
    schoolPlaceInput.value.trim();


  if (
    name.length < 2
  ) {

    showMessage(
      "Please enter a valid full name.",
      "error"
    );

    fullNameInput.focus();

    return false;

  }


  if (
    !/^[6-9]\d{9}$/.test(
      mobile
    )
  ) {

    showMessage(
      "Please enter a valid 10 digit mobile number.",
      "error"
    );

    mobileInput.focus();

    return false;

  }


  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  if (
    !emailPattern.test(
      email
    )
  ) {

    showMessage(
      "Please enter a valid email ID.",
      "error"
    );

    emailInput.focus();

    return false;

  }


  if (!gender) {

    showMessage(
      "Please select your gender.",
      "error"
    );

    genderInput.focus();

    return false;

  }


  if (!studentClass) {

    showMessage(
      "Please select your class.",
      "error"
    );

    classInput.focus();

    return false;

  }


  if (!board) {

    showMessage(
      "Please select your board.",
      "error"
    );

    boardInput.focus();

    return false;

  }


  if (
    schoolName.length < 2
  ) {

    showMessage(
      "Please enter your school name.",
      "error"
    );

    schoolNameInput.focus();

    return false;

  }


  if (
    schoolPlace.length < 2
  ) {

    showMessage(
      "Please enter your school place.",
      "error"
    );

    schoolPlaceInput.focus();

    return false;

  }


  if (
    !termsInput.checked
  ) {

    showMessage(
      "Please confirm that the information provided is correct.",
      "warning"
    );

    return false;

  }


  return true;
}


/* =========================================================
   LOCAL DUPLICATE CHECK
   ========================================================= */

function checkLocalDuplicate(
  mobile,
  email
) {

  const records = [];

  /*
     Search all SSTC student records
     stored in this browser.
  */

  for (
    let i = 0;
    i < localStorage.length;
    i++
  ) {

    const key =
      localStorage.key(i);

    if (
      !key ||
      !key.startsWith(
        "sstc_student_"
      )
    ) {

      continue;

    }


    try {

      const record =
        JSON.parse(
          localStorage.getItem(key)
        );

      if (!record) continue;


      const sameMobile =
        record.mobile === mobile;

      const sameEmail =
        record.email === email;


      if (
        sameMobile ||
        sameEmail
      ) {

        return record;

      }

    } catch (error) {

      console.warn(
        "Invalid local record:",
        key
      );

    }

  }

  return null;
}


/* =========================================================
   SAVE LOCAL RECORD
   ========================================================= */

function saveLocalRecord(
  record
) {

  localStorage.setItem(
    "sstc_student_" +
    record.studentId,
    JSON.stringify(record)
  );

}


/* =========================================================
   GOOGLE SHEETS SUBMISSION
   ========================================================= */

async function saveToGoogleSheets(
  record
) {

  /*
     Agar URL set nahi hai to
     local registration ko continue
     karne diya jayega.

     Google Sheets ke liye
     URL zaroor set karein.
  */

  if (
    !GOOGLE_SCRIPT_URL ||
    GOOGLE_SCRIPT_URL ===
      "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"
  ) {

    console.warn(
      "Google Apps Script URL is not configured."
    );

    return {
      success: true,
      sheetsSaved: false
    };

  }


  try {

    const response =
      await fetch(
        GOOGLE_SCRIPT_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(record)

        }
      );


    const text =
      await response.text();


    let result;


    try {

      result =
        JSON.parse(text);

    } catch {

      result = {
        success: true,
        raw: text
      };

    }


    if (
      result &&
      result.success === false
    ) {

      return {
        success: false,
        duplicate:
          result.duplicate || false,
        studentId:
          result.studentId || "",
        message:
          result.message ||
          "Registration could not be completed."
      };

    }


    return {
      success: true,
      sheetsSaved: true,
      result
    };

  } catch (error) {

    console.error(
      "Google Sheets Error:",
      error
    );


    return {
      success: false,
      networkError: true,
      message:
        "Unable to connect to Google Sheets. Please try again."
    };

  }

}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setLoading(
  loading
) {

  registerButton.disabled =
    loading;


  if (loading) {

    buttonText.hidden =
      true;

    buttonLoader.hidden =
      false;

  } else {

    buttonText.hidden =
      false;

    buttonLoader.hidden =
      true;

  }

}


/* =========================================================
   REGISTRATION SUCCESS
   ========================================================= */

function registrationSuccess(
  record
) {

  showMessage(
    "Registration successful! Your Student ID is " +
      record.studentId +
      " and your password is " +
      record.password +
      ". Please save these credentials safely.",
    "success"
  );


  /*
     Store locally so duplicate
     registration in same browser
     can also be detected.
  */

  saveLocalRecord(
    record
  );


  /*
     Disable form after successful
     registration.
  */

  form
    .querySelectorAll(
      "input, select, button"
    )
    .forEach(
      element => {

        if (
          element.id !==
          "togglePassword"
        ) {

          element.disabled =
            true;

        }

      }
    );


  /*
     Keep password visible
     after successful registration.
  */

  passwordInput.type =
    "text";

  togglePasswordButton.textContent =
    "🙈";

}


/* =========================================================
   FORM SUBMIT
   ========================================================= */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage();


    /* VALIDATION */

    if (!validateForm()) {

      return;

    }


    /* GENERATE ID */

    const studentId =
      studentIdInput.value ||
      generateUniqueStudentId();


    /* GENERATE PASSWORD */

    const password =
      generateStudentPassword(
        fullNameInput.value.trim(),
        classInput.value
      );


    studentIdInput.value =
      studentId;

    passwordInput.value =
      password;


    /* GET DATA */

    const mobile =
      mobileInput.value.trim();

    const email =
      emailInput.value
        .trim()
        .toLowerCase();


    /* LOCAL DUPLICATE */

    const localDuplicate =
      checkLocalDuplicate(
        mobile,
        email
      );


    if (localDuplicate) {

      showMessage(
        "This mobile number or email ID is already registered with Student ID: " +
          localDuplicate.studentId +
          ". Please use your existing account.",
        "warning"
      );

      return;

    }


    /* CREATE RECORD */

    const record = {

      action:
        "registerStudent",

      studentId:
        studentId,

      password:
        password,

      fullName:
        fullNameInput.value.trim(),

      mobile:
        mobile,

      email:
        email,

      gender:
        genderInput.value,

      class:
        classInput.value,

      board:
        boardInput.value,

      schoolName:
        schoolNameInput.value.trim(),

      schoolPlace:
        schoolPlaceInput.value.trim(),

      registrationDate:
        new Date().toISOString(),

      registrationDateTime:
        new Date().toLocaleString(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata"
          }
        ),

      status:
        "Active"

    };


    /* LOADING */

    setLoading(true);


    /*
       SAVE TO GOOGLE SHEETS
    */

    const result =
      await saveToGoogleSheets(
        record
      );


    /* NETWORK / SERVER ERROR */

    if (!result.success) {

      setLoading(false);


      if (
        result.duplicate
      ) {

        showMessage(
          "This mobile number or email ID is already registered with Student ID: " +
            (
              result.studentId ||
              "Already Registered"
            ),
          "warning"
        );

      } else {

        showMessage(
          result.message ||
            "Registration failed. Please try again.",
          "error"
        );

      }

      return;

    }


    /* SUCCESS */

    setLoading(false);

    registrationSuccess(
      record
    );

  }
);


/* =========================================================
   PREPARE INITIAL ID
   ========================================================= */

studentIdInput.value =
  generateUniqueStudentId();


/* =========================================================
   SECURITY / UI
   ========================================================= */

document.addEventListener(
  "contextmenu",
  event => {

    /*
       Only registration page UI.
       This does NOT provide real server security.
    */

    // Intentionally not disabled.
    // Users should remain able to use normal browser controls.

  }
);
