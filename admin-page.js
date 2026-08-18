/* =========================================================
   SSTC ADMIN DASHBOARD
   Front-end demo data manager
   ========================================================= */

const ADMIN_ID = "SSTCGKP";

/*
  SECURITY:
  This file intentionally does NOT contain the admin password.
  Put the credential check in your login/access page and redirect
  to admin-page.html after successful server-side authentication.
*/

const STORAGE_KEY = "sstc_student_records_v1";

const defaultStudents = [
  {
    id: "SSTC001",
    password: "••••••••",
    lastLogin: "18 Aug 2026, 08:42 PM",
    ebook: "rent",
    duration: "6",
    active: true
  },
  {
    id: "SSTC002",
    password: "••••••••",
    lastLogin: "18 Aug 2026, 07:18 PM",
    ebook: "buy",
    duration: "lifetime",
    active: true
  },
  {
    id: "SSTC003",
    password: "••••••••",
    lastLogin: "17 Aug 2026, 05:36 PM",
    ebook: "rent",
    duration: "3",
    active: true
  },
  {
    id: "SSTC004",
    password: "••••••••",
    lastLogin: "16 Aug 2026, 04:05 PM",
    ebook: "none",
    duration: "",
    active: true
  }
];

const $ = (selector) => document.querySelector(selector);

function getStudents() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    return saved
      ? JSON.parse(saved)
      : [...defaultStudents];

  } catch (error) {

    console.error(
      "Unable to read student records:",
      error
    );

    return [...defaultStudents];
  }
}

function saveStudents(students) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(students)
  );
}

let students = getStudents();

function formatPlan(student) {

  if (student.ebook === "buy") {

    return `
      <span class="badge badge-buy">
        ♾️ Lifetime Buy
      </span>
    `;
  }

  if (student.ebook === "rent") {

    return `
      <span class="badge badge-rent">
        📚 Rent
      </span>
    `;
  }

  return `
    <span class="badge badge-none">
      — No eBook —
    </span>
  `;
}

function formatDuration(student) {

  if (student.ebook === "buy") {

    return `
      <span class="duration">
        Lifetime
      </span>
    `;
  }

  if (student.ebook === "rent") {

    return `
      <span class="duration">
        ${student.duration} Months
      </span>
    `;
  }

  return "—";
}

function renderTable() {

  const tbody = $("#studentTableBody");

  const search =
    ($("#searchInput").value || "")
      .trim()
      .toLowerCase();

  const filter =
    $("#planFilter").value;

  const filtered = students.filter(student => {

    const matchesSearch =
      student.id
        .toLowerCase()
        .includes(search);

    const matchesFilter =
      filter === "all" ||
      (filter === "none" &&
        student.ebook === "none") ||
      (filter === "rent" &&
        student.ebook === "rent") ||
      (filter === "buy" &&
        student.ebook === "buy");

    return matchesSearch && matchesFilter;

  });

  tbody.innerHTML =
    filtered.map((student, index) => `

      <tr>

        <td>
          ${index + 1}
        </td>

        <td>
          <span class="student-id">
            ${escapeHtml(student.id)}
          </span>
        </td>

        <td>
          <span class="password">
            ${escapeHtml(student.password)}
          </span>
        </td>

        <td>
          <span class="login-time">
            ${escapeHtml(
              student.lastLogin || "Never"
            )}
          </span>
        </td>

        <td>
          ${formatPlan(student)}
        </td>

        <td>
          ${formatDuration(student)}
        </td>

        <td>
          <span class="badge status-active">
            ● Active
          </span>
        </td>

        <td>

          <button
            class="delete-btn"
            data-id="${escapeHtml(student.id)}">

            Delete

          </button>

        </td>

      </tr>

    `).join("");

  $("#emptyState").style.display =
    filtered.length
      ? "none"
      : "block";

  tbody
    .querySelectorAll(".delete-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteStudent(
            button.dataset.id
          )
      );

    });

  updateStats();
}

function updateStats() {

  $("#totalStudents").textContent =
    students.length;

  $("#activeAccounts").textContent =
    students.filter(
      s => s.active
    ).length;

  $("#ebookMembers").textContent =
    students.filter(
      s => s.ebook !== "none"
    ).length;

  $("#lifetimeBuyers").textContent =
    students.filter(
      s => s.ebook === "buy"
    ).length;
}

function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}

function deleteStudent(id) {

  const student =
    students.find(
      s => s.id === id
    );

  if (!student) return;

  if (
    !confirm(
      `Delete student record "${id}"?`
    )
  ) return;

  students =
    students.filter(
      s => s.id !== id
    );

  saveStudents(students);

  renderTable();
}

function openModal() {

  $("#studentModal")
    .classList
    .add("show");

  $("#studentModal")
    .setAttribute(
      "aria-hidden",
      "false"
    );

  $("#studentId").focus();
}

function closeModal() {

  $("#studentModal")
    .classList
    .remove("show");

  $("#studentModal")
    .setAttribute(
      "aria-hidden",
      "true"
    );

  $("#studentForm").reset();

  $("#rentDurationWrap")
    .style.display = "block";
}

function updateRentField() {

  $("#rentDurationWrap")
    .style.display =
      $("#ebookAccess").value === "rent"
        ? "block"
        : "none";
}

/* SEARCH */

$("#searchInput")
  .addEventListener(
    "input",
    renderTable
  );

/* FILTER */

$("#planFilter")
  .addEventListener(
    "change",
    renderTable
  );

/* ADD STUDENT */

$("#addStudentBtn")
  .addEventListener(
    "click",
    openModal
  );

/* CLOSE MODAL */

$("#closeModalBtn")
  .addEventListener(
    "click",
    closeModal
  );

/* CLICK OUTSIDE MODAL */

$("#studentModal")
  .addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        $("#studentModal")
      ) {

        closeModal();

      }

    }
  );

/* EBOOK TYPE */

$("#ebookAccess")
  .addEventListener(
    "change",
    updateRentField
  );

/* ADD STUDENT FORM */

$("#studentForm")
  .addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      const id =
        $("#studentId")
          .value
          .trim()
          .toUpperCase();

      const password =
        $("#studentPassword")
          .value
          .trim();

      const ebook =
        $("#ebookAccess").value;

      const duration =
        ebook === "rent"
          ? $("#rentDuration").value
          : (
              ebook === "buy"
                ? "lifetime"
                : ""
            );

      if (!id || !password)
        return;

      if (
        students.some(
          student =>
            student.id.toUpperCase() === id
        )
      ) {

        alert(
          "This Student ID already exists."
        );

        return;
      }

      students.unshift({

        id,

        password: "••••••••",

        lastLogin:
          "Not logged in yet",

        ebook,

        duration,

        active: true

      });

      saveStudents(students);

      renderTable();

      closeModal();

      alert(
        `Student ${id} added successfully.`
      );

    }
  );

/* LOGOUT */

$("#logoutBtn")
  .addEventListener(
    "click",
    () => {

      sessionStorage.removeItem(
        "sstcAdminAuthenticated"
      );

      window.location.href =
        "access.html";

    }
  );

/* CURRENT YEAR */

$("#currentYear")
  .textContent =
    new Date().getFullYear();

/* INITIALIZE */

updateRentField();

renderTable();
