/* =====================================================
   SSTC ADMIN DASHBOARD
   GOOGLE SHEET LIVE STUDENT DATABASE
===================================================== */


/* =====================================================
   GOOGLE APPS SCRIPT WEB APP URL
===================================================== */

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =====================================================
   GLOBAL STUDENT DATA
===================================================== */

let students = [];

let filteredStudents = [];

let pendingAction = null;


/* =====================================================
   SHEET COLUMN MAPPING
=====================================================

   A  = Student ID
   B  = Password
   C  = Full Name
   D  = Mobile Number
   E  = Gender
   F  = Email ID
   G  = Class
   H  = Board
   I  = School Name
   J  = School Place
   K  = Registration Date & Time
   L  = Status

===================================================== */


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setCurrentYear();

    setupSearch();

    setupStatusFilter();

    setupRefreshButton();

    setupConfirmModal();

    loadStudents();

  }
);


/* =====================================================
   LOAD STUDENTS
===================================================== */

async function loadStudents() {

  setDashboardStatus(
    "⏳ Google Sheet से student records load हो रहे हैं..."
  );


  const tbody =
    document.getElementById(
      "studentTableBody"
    );


  if (tbody) {

    tbody.innerHTML = "";

  }


  try {

    const url =
      GOOGLE_SCRIPT_URL +
      "?action=getStudents&_=" +
      Date.now();


    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "Server response: " +
        response.status
      );

    }


    const data =
      await response.json();


    /*
       Different possible response formats
       are handled here.
    */

    let records = [];


    if (Array.isArray(data)) {

      records = data;

    }

    else if (
      Array.isArray(data.students)
    ) {

      records = data.students;

    }

    else if (
      Array.isArray(data.data)
    ) {

      records = data.data;

    }

    else if (
      Array.isArray(data.records)
    ) {

      records = data.records;

    }


    if (
      data.success === false
    ) {

      throw new Error(
        data.message ||
        "Google Apps Script error."
      );

    }


    students =
      normalizeStudents(records);


    filteredStudents =
      [...students];


    renderStudentTable();


    updateStatistics();


    setDashboardStatus(
      "✅ Google Sheet से " +
      students.length +
      " student record successfully loaded.",
      "success"
    );


  }

  catch (error) {

    console.error(
      "LOAD STUDENTS ERROR:",
      error
    );


    students = [];

    filteredStudents = [];


    renderStudentTable();

    updateStatistics();


    setDashboardStatus(
      "❌ Google Sheet data load नहीं हो पाया. " +
      "Apps Script URL और getStudents action check करें.",
      "error"
    );

  }

}


/* =====================================================
   NORMALIZE STUDENTS
===================================================== */

function normalizeStudents(records) {

  return records.map(
    function (student, index) {

      /*
         Object format
      */

      if (
        student &&
        !Array.isArray(student)
      ) {

        return {

          rowNumber:
            Number(
              student.rowNumber ||
              student.row ||
              student.sheetRow ||
              index + 2
            ),

          id:
            String(
              student.id ??
              student.studentId ??
              student["Student ID"] ??
              ""
            ),

          password:
            String(
              student.password ??
              student.Password ??
              ""
            ),

          fullName:
            String(
              student.fullName ??
              student.name ??
              student["Full Name"] ??
              ""
            ),

          mobile:
            String(
              student.mobile ??
              student.mobileNumber ??
              student["Mobile Number"] ??
              ""
            ),

          gender:
            String(
              student.gender ??
              student.Gender ??
              ""
            ),

          email:
            String(
              student.email ??
              student.emailId ??
              student["Email ID"] ??
              ""
            ),

          className:
            String(
              student.className ??
              student.class ??
              student["Class"] ??
              ""
            ),

          board:
            String(
              student.board ??
              student.Board ??
              ""
            ),

          schoolName:
            String(
              student.schoolName ??
              student["School Name"] ??
              ""
            ),

          schoolPlace:
            String(
              student.schoolPlace ??
              student["School Place"] ??
              ""
            ),

          registrationDate:
            String(
              student.registrationDate ??
              student.registrationDateTime ??
              student["Registration Date & Time"] ??
              ""
            ),

          status:
            normalizeStatus(
              student.status ??
              student.Status ??
              "Active"
            )

        };

      }


      /*
         Array format
      */

      return {

        rowNumber:
          index + 2,

        id:
          String(
            records[index][0] ??
            ""
          ),

        password:
          String(
            records[index][1] ??
            ""
          ),

        fullName:
          String(
            records[index][2] ??
            ""
          ),

        mobile:
          String(
            records[index][3] ??
            ""
          ),

        gender:
          String(
            records[index][4] ??
            ""
          ),

        email:
          String(
            records[index][5] ??
            ""
          ),

        className:
          String(
            records[index][6] ??
            ""
          ),

        board:
          String(
            records[index][7] ??
            ""
          ),

        schoolName:
          String(
            records[index][8] ??
            ""
          ),

        schoolPlace:
          String(
            records[index][9] ??
            ""
          ),

        registrationDate:
          String(
            records[index][10] ??
            ""
          ),

        status:
          normalizeStatus(
            records[index][11] ??
            "Active"
          )

      };

    }
  );

}


/* =====================================================
   NORMALIZE STATUS
===================================================== */

function normalizeStatus(status) {

  const value =
    String(status)
      .trim()
      .toLowerCase();


  if (
    value === "inactive" ||
    value === "deactive" ||
    value === "deactivated" ||
    value === "disabled"
  ) {

    return "Inactive";

  }


  return "Active";

}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderStudentTable() {

  const tbody =
    document.getElementById(
      "studentTableBody"
    );


  const emptyState =
    document.getElementById(
      "emptyState"
    );


  if (!tbody) return;


  tbody.innerHTML = "";


  if (
    filteredStudents.length === 0
  ) {

    if (emptyState) {

      emptyState.classList.add(
        "show"
      );

    }

    return;

  }


  if (emptyState) {

    emptyState.classList.remove(
      "show"
    );

  }


  filteredStudents.forEach(
    function (student, index) {

      const row =
        document.createElement(
          "tr"
        );


      if (
        student.status ===
        "Inactive"
      ) {

        row.classList.add(
          "inactive-row"
        );

      }


      const originalIndex =
        students.indexOf(
          student
        );


      row.innerHTML = `

        <td>
          ${index + 1}
        </td>


        <td class="student-id-cell">
          ${escapeHTML(student.id)}
        </td>


        <td>

          <div class="password-cell">

            <span
              class="password-value"
              data-password="${escapeHTML(student.password)}"
              data-visible="false"
            >
              ••••••••
            </span>


            <button
              type="button"
              class="password-eye"
              onclick="toggleStudentPassword(this)"
              title="Show / Hide Password"
            >
              👁️
            </button>

          </div>

        </td>


        <td>
          ${escapeHTML(student.fullName)}
        </td>


        <td>
          ${escapeHTML(student.mobile)}
        </td>


        <td>
          ${escapeHTML(student.gender)}
        </td>


        <td>
          ${escapeHTML(student.email)}
        </td>


        <td>
          ${escapeHTML(student.className)}
        </td>


        <td>
          ${escapeHTML(student.board)}
        </td>


        <td>
          ${escapeHTML(student.schoolName)}
        </td>


        <td>
          ${escapeHTML(student.schoolPlace)}
        </td>


        <td class="registration-date">
          ${escapeHTML(student.registrationDate)}
        </td>


        <td>

          ${
            student.status === "Active"

            ?

            `
              <span class="status-badge status-active">
                🟢 Active
              </span>
            `

            :

            `
              <span class="status-badge status-inactive">
                ⚪ Inactive
              </span>
            `
          }

        </td>


        <td>

          <div class="action-buttons">


            ${
              student.status === "Active"

              ?

              `
                <button
                  type="button"
                  class="action-btn deactivate-btn"
                  onclick="changeStudentStatus(${originalIndex}, 'Inactive')"
                  title="Deactivate Student"
                >
                  ⚪
                </button>
              `

              :

              `
                <button
                  type="button"
                  class="action-btn activate-btn"
                  onclick="changeStudentStatus(${originalIndex}, 'Active')"
                  title="Activate Student"
                >
                  🟢
                </button>
              `
            }


            <button
              type="button"
              class="action-btn delete-btn"
              onclick="deleteStudent(${originalIndex})"
              title="Delete Student"
            >
              🗑️
            </button>


          </div>

        </td>

      `;


      tbody.appendChild(
        row
      );

    }
  );

}


/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

function toggleStudentPassword(button) {

  const passwordElement =
    button.parentElement
      .querySelector(
        ".password-value"
      );


  if (!passwordElement) {
    return;
  }


  const password =
    passwordElement.dataset.password;


  const visible =
    passwordElement.dataset.visible ===
    "true";


  if (visible) {

    passwordElement.textContent =
      "••••••••";

    passwordElement.dataset.visible =
      "false";

    button.textContent =
      "👁️";

    button.title =
      "Show Password";

  }

  else {

    passwordElement.textContent =
      password ||
      "(No Password)";

    passwordElement.dataset.visible =
      "true";

    button.textContent =
      "🙈";

    button.title =
      "Hide Password";

  }

}


/* =====================================================
   CHANGE STATUS
===================================================== */

function changeStudentStatus(
  index,
  newStatus
) {

  const student =
    students[index];


  if (!student) {
    return;
  }


  const actionText =
    newStatus === "Active"
      ? "activate"
      : "deactivate";


  showConfirm(
    "Confirm Status Change",

    "क्या आप " +
    student.fullName +
    " (" +
    student.id +
    ") को " +
    actionText +
    " करना चाहते हैं?",

    async function () {

      setDashboardStatus(
        "⏳ Student status update हो रहा है..."
      );


      try {

        await sendSheetAction(
          "updateStatus",
          {
            rowNumber:
              student.rowNumber,

            studentId:
              student.id,

            status:
              newStatus
          }
        );


        student.status =
          newStatus;


        applyCurrentFilters();


        updateStatistics();


        setDashboardStatus(
          newStatus === "Active"

            ?

            "🟢 Student account activated successfully."

            :

            "⚪ Student account deactivated successfully.",

          "success"
        );


      }

      catch (error) {

        console.error(
          "STATUS ERROR:",
          error
        );


        setDashboardStatus(
          "❌ Status update failed: " +
          error.message,

          "error"
        );

      }

    }
  );

}


/* =====================================================
   DELETE STUDENT
===================================================== */

function deleteStudent(index) {

  const student =
    students[index];


  if (!student) {
    return;
  }


  showConfirm(
    "Delete Student",

    "क्या आप इस student record को permanently delete करना चाहते हैं?\n\n" +
    "Student ID: " +
    student.id +
    "\n" +
    "Name: " +
    student.fullName,

    async function () {

      setDashboardStatus(
        "⏳ Student record delete हो रहा है..."
      );


      try {

        await sendSheetAction(
          "deleteStudent",
          {
            rowNumber:
              student.rowNumber,

            studentId:
              student.id
          }
        );


        students =
          students.filter(
            function (item) {

              return item !==
                student;

            }
          );


        applyCurrentFilters();


        updateStatistics();


        setDashboardStatus(
          "🗑️ Student record deleted successfully.",

          "success"
        );


      }

      catch (error) {

        console.error(
          "DELETE ERROR:",
          error
        );


        setDashboardStatus(
          "❌ Student delete failed: " +
          error.message,

          "error"
        );

      }

    }
  );

}


/* =====================================================
   SEND ACTION TO GOOGLE APPS SCRIPT
===================================================== */

async function sendSheetAction(
  action,
  payload
) {

  const body = {

    action:
      action,

    ...payload

  };


  /*
     POST request
  */

  const response =
    await fetch(
      GOOGLE_SCRIPT_URL,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "text/plain;charset=utf-8"

        },

        body:
          JSON.stringify(body)

      }
    );


  if (!response.ok) {

    throw new Error(
      "Server response: " +
      response.status
    );

  }


  const text =
    await response.text();


  let data;


  try {

    data =
      JSON.parse(text);

  }

  catch {

    /*
       Some Apps Script deployments
       return plain text.
    */

    data = {

      success:
        true,

      message:
        text

    };

  }


  if (
    data &&
    data.success === false
  ) {

    throw new Error(
      data.message ||
      "Google Apps Script action failed."
    );

  }


  return data;

}


/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {

  const input =
    document.getElementById(
      "studentSearch"
    );


  if (!input) return;


  input.addEventListener(
    "input",
    function () {

      applyCurrentFilters();

    }
  );

}


/* =====================================================
   STATUS FILTER
===================================================== */

function setupStatusFilter() {

  const filter =
    document.getElementById(
      "statusFilter"
    );


  if (!filter) return;


  filter.addEventListener(
    "change",
    function () {

      applyCurrentFilters();

    }
  );

}


/* =====================================================
   APPLY SEARCH + FILTER
===================================================== */

function applyCurrentFilters() {

  const searchInput =
    document.getElementById(
      "studentSearch"
    );


  const statusFilter =
    document.getElementById(
      "statusFilter"
    );


  const search =
    searchInput
      ? searchInput.value
          .trim()
          .toLowerCase()
      : "";


  const status =
    statusFilter
      ? statusFilter.value
      : "all";


  filteredStudents =
    students.filter(
      function (student) {

        const searchableText = [

          student.id,

          student.fullName,

          student.mobile,

          student.gender,

          student.email,

          student.className,

          student.board,

          student.schoolName,

          student.schoolPlace,

          student.registrationDate

        ]
        .join(" ")
        .toLowerCase();


        const matchesSearch =
          !search ||
          searchableText.includes(
            search
          );


        const matchesStatus =
          status === "all" ||
          student.status === status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  renderStudentTable();

}


/* =====================================================
   REFRESH BUTTON
===================================================== */

function setupRefreshButton() {

  const button =
    document.getElementById(
      "refreshStudentsBtn"
    );


  if (!button) return;


  button.addEventListener(
    "click",
    function () {

      loadStudents();

    }
  );

}


/* =====================================================
   STATISTICS
===================================================== */

function updateStatistics() {

  const total =
    students.length;


  const active =
    students.filter(
      function (student) {

        return student.status ===
          "Active";

      }
    ).length;


  const inactive =
    students.filter(
      function (student) {

        return student.status ===
          "Inactive";

      }
    ).length;


  setText(
    "statTotalStudents",
    total
  );


  setText(
    "statActiveAccounts",
    active
  );


  setText(
    "statInactiveAccounts",
    inactive
  );


  setText(
    "statLastUpdated",
    new Date().toLocaleTimeString(
      "en-IN",
      {
        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    )
  );

}


/* =====================================================
   CONFIRM MODAL
===================================================== */

function setupConfirmModal() {

  const cancelButton =
    document.getElementById(
      "confirmCancel"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      closeConfirm
    );

  }


  const overlay =
    document.getElementById(
      "confirmModal"
    );


  if (overlay) {

    overlay.addEventListener(
      "click",
      function (event) {

        if (
          event.target === overlay
        ) {

          closeConfirm();

        }

      }
    );

  }

}


/* =====================================================
   SHOW CONFIRM
===================================================== */

function showConfirm(
  title,
  message,
  callback
) {

  const modal =
    document.getElementById(
      "confirmModal"
    );


  const titleElement =
    document.getElementById(
      "confirmTitle"
    );


  const textElement =
    document.getElementById(
      "confirmText"
    );


  const proceed =
    document.getElementById(
      "confirmProceed"
    );


  if (
    !modal ||
    !titleElement ||
    !textElement ||
    !proceed
  ) {

    return;

  }


  titleElement.textContent =
    title;


  textElement.textContent =
    message;


  pendingAction =
    callback;


  proceed.onclick =
    async function () {

      const action =
        pendingAction;


      closeConfirm();


      if (action) {

        await action();

      }

    };


  modal.classList.add(
    "show"
  );

}


/* =====================================================
   CLOSE CONFIRM
===================================================== */

function closeConfirm() {

  const modal =
    document.getElementById(
      "confirmModal"
    );


  if (modal) {

    modal.classList.remove(
      "show"
    );

  }


  pendingAction =
    null;

}


/* =====================================================
   DASHBOARD STATUS
===================================================== */

function setDashboardStatus(
  message,
  type = ""
) {

  const element =
    document.getElementById(
      "dashboardStatus"
    );


  if (!element) return;


  element.textContent =
    message;


  element.classList.remove(
    "success",
    "error"
  );


  if (type) {

    element.classList.add(
      type
    );

  }

}


/* =====================================================
   SET TEXT
===================================================== */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =====================================================
   CURRENT YEAR
===================================================== */

function setCurrentYear() {

  const element =
    document.getElementById(
      "currentYear"
    );


  if (element) {

    element.textContent =
      new Date().getFullYear();

  }

}


/* =====================================================
   ADMIN LOGOUT
===================================================== */

function adminLogout() {

  const confirmation =
    confirm(
      "Are you sure you want to logout?"
    );


  if (!confirmation) {
    return;
  }


  sessionStorage.removeItem(
    "sstcAdminLoggedIn"
  );


  localStorage.removeItem(
    "sstcAdminLoggedIn"
  );


  window.location.href =
    "index.html";

}
