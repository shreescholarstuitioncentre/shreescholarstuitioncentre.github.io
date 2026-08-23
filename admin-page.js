/* =====================================================
   SSTC ADMIN DASHBOARD
   LIVE GOOGLE SHEETS VERSION
===================================================== */


/* =====================================================
   GOOGLE APPS SCRIPT WEB APP URL
===================================================== */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =====================================================
   GLOBAL STUDENT DATA
===================================================== */

// let students = [];


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const year =
            document.getElementById(
                "currentYear"
            );

        if (year) {

            year.textContent =
                new Date().getFullYear();

        }


        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );

        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                loadStudents
            );

        }


        /*
           ADMIN SESSION CHECK

           अगर आपके admin login में
           sstcAdminLoggedIn = true
           save होता है तो यह check काम करेगा.
        */

        const loggedIn =
            sessionStorage.getItem(
                "sstcAdminLoggedIn"
            );


        if (
            loggedIn &&
            loggedIn !== "true"
        ) {

            window.location.href =
                "index.html";

            return;

        }


        loadStudents();

    }
);


/* =====================================================
   LOAD STUDENTS FROM GOOGLE SHEETS
===================================================== */

async function loadStudents() {

    showLoading();

    hideError();

    hideEmpty();


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
                "Google Apps Script server error: " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "Google Sheet Response:",
            data
        );


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data &&
                data.message
                    ? data.message
                    : "Google Sheet data load failed."
            );

        }


        students =
            Array.isArray(data.students)
                ? data.students
                : [];


        hideLoading();


        if (students.length === 0) {

            showEmpty();

        }


        renderStudentTable();


        updateStats();


        const lastUpdated =
            document.getElementById(
                "lastUpdated"
            );


        if (lastUpdated) {

            lastUpdated.textContent =
                new Date().toLocaleTimeString(
                    "en-IN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

        }


        showDashboardMessage(
            "✅ Google Sheets data loaded"
        );

    }


    catch (error) {

        console.error(
            "LOAD ERROR:",
            error
        );


        hideLoading();


        showError(
            "❌ Google Sheets से data load नहीं हो पाया. " +
            error.message
        );

    }

}


/* =====================================================
   RENDER STUDENT TABLE
===================================================== */

function renderStudentTable() {

    const tbody =
        document.getElementById(
            "studentTableBody"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    students.forEach(
        function (student, index) {


            const row =
                document.createElement("tr");


            const status =
                String(
                    student.status || "Active"
                )
                .trim();


            const isActive =
                status.toLowerCase() ===
                "active";


            if (!isActive) {

                row.classList.add(
                    "record-inactive"
                );

            }


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>

                    <strong class="student-id">

                        ${escapeHTML(
                            student.studentId
                        )}

                    </strong>

                </td>


                <td>

                    <div class="password-cell">

                        <span
                            class="password-value"
                            data-password="${escapeHTML(
                                student.password
                            )}"
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
                    ${escapeHTML(
                        student.fullName
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        student.mobileNumber
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        student.gender
                    )}
                </td>


                <td
                    class="email-cell"
                    title="${escapeHTML(
                        student.emailId
                    )}"
                >

                    ${escapeHTML(
                        student.emailId
                    )}

                </td>


                <td>
                    ${escapeHTML(
                        student.className
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        student.board
                    )}
                </td>


                <td
                    class="school-cell"
                    title="${escapeHTML(
                        student.schoolName
                    )}"
                >

                    ${escapeHTML(
                        student.schoolName
                    )}

                </td>


                <td
                    class="school-cell"
                    title="${escapeHTML(
                        student.schoolPlace
                    )}"
                >

                    ${escapeHTML(
                        student.schoolPlace
                    )}

                </td>


                <td class="date-cell">

                    ${escapeHTML(
                        student.registrationDate
                    )}

                </td>


                <td>

                    <span
                        class="
                            status-badge
                            ${
                                isActive
                                    ? "status-active"
                                    : "status-inactive"
                            }
                        "
                    >

                        ${
                            isActive
                                ? "🟢 Active"
                                : "⚪ Inactive"
                        }

                    </span>

                </td>


                <td>

                    <div class="action-buttons">


                        ${
                            isActive

                                ?

                            `
                            <button
                                type="button"
                                class="
                                    action-btn
                                    deactivate-btn
                                "
                                onclick="changeStudentStatus(
                                    ${index},
                                    'Inactive'
                                )"
                                title="Deactivate Student"
                            >
                                ⚪
                            </button>
                            `

                                :

                            `
                            <button
                                type="button"
                                class="
                                    action-btn
                                    activate-btn
                                "
                                onclick="changeStudentStatus(
                                    ${index},
                                    'Active'
                                )"
                                title="Activate Student"
                            >
                                🟢
                            </button>
                            `
                        }


                        <button
                            type="button"
                            class="
                                action-btn
                                delete-btn
                            "
                            onclick="deleteStudent(${index})"
                            title="Delete Student"
                        >

                            🗑️

                        </button>


                    </div>

                </td>

            `;


            tbody.appendChild(row);

        }
    );

}


/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

function toggleStudentPassword(button) {

    const parent =
        button.parentElement;


    if (!parent) return;


    const passwordElement =
        parent.querySelector(
            ".password-value"
        );


    if (!passwordElement) return;


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

    }

    else {

        passwordElement.textContent =
            password;

        passwordElement.dataset.visible =
            "true";

        button.textContent =
            "🙈";

    }

}


/* =====================================================
   CHANGE STATUS
===================================================== */

async function changeStudentStatus(
    index,
    newStatus
) {

    const student =
        students[index];


    if (!student) return;


    const actionText =
        newStatus === "Active"
            ? "activate"
            : "deactivate";


    const confirmation =
        confirm(
            "Are you sure you want to " +
            actionText +
            " this student?\n\n" +
            "Student ID: " +
            student.studentId
        );


    if (!confirmation) return;


    showDashboardMessage(
        "⏳ Updating student status..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=updateStatus" +
            "&studentId=" +
            encodeURIComponent(
                student.studentId
            ) +
            "&status=" +
            encodeURIComponent(
                newStatus
            ) +
            "&_=" +
            Date.now();


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        console.log(
            "Status Response:",
            data
        );


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data &&
                data.message
                    ? data.message
                    : "Status update failed."
            );

        }


        /*
           Local data update
        */

        students[index].status =
            newStatus;


        renderStudentTable();


        updateStats();


        showDashboardMessage(
            newStatus === "Active"
                ? "🟢 Student Activated"
                : "⚪ Student Deactivated"
        );

    }


    catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );


        showDashboardMessage(
            "❌ Status update failed"
        );


        alert(
            "Status update failed.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   DELETE STUDENT
===================================================== */

async function deleteStudent(index) {

    const student =
        students[index];


    if (!student) return;


    const confirmation =
        confirm(
            "⚠️ DELETE STUDENT\n\n" +

            "Student ID: " +
            student.studentId +
            "\n\n" +

            "Full Name: " +
            student.fullName +
            "\n\n" +

            "यह record Google Sheet से permanently delete होगा.\n\n" +

            "Continue?"
        );


    if (!confirmation) return;


    showDashboardMessage(
        "⏳ Deleting student..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=deleteStudent" +
            "&studentId=" +
            encodeURIComponent(
                student.studentId
            ) +
            "&_=" +
            Date.now();


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        console.log(
            "Delete Response:",
            data
        );


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data &&
                data.message
                    ? data.message
                    : "Delete failed."
            );

        }


        /*
           Local array से भी remove
        */

        students.splice(
            index,
            1
        );


        renderStudentTable();


        updateStats();


        if (students.length === 0) {

            showEmpty();

        }


        showDashboardMessage(
            "🗑️ Student deleted successfully"
        );

    }


    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showDashboardMessage(
            "❌ Delete failed"
        );


        alert(
            "Student delete failed.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   UPDATE STATS
===================================================== */

function updateStats() {

    const total =
        students.length;


    const active =
        students.filter(
            function (student) {

                return String(
                    student.status || ""
                )
                .trim()
                .toLowerCase() ===
                "active";

            }
        ).length;


    const inactive =
        total - active;


    setText(
        "totalStudents",
        total
    );


    setText(
        "activeAccounts",
        active
    );


    setText(
        "inactiveAccounts",
        inactive
    );

}


/* =====================================================
   SET TEXT
===================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

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
   LOADING
===================================================== */

function showLoading() {

    const box =
        document.getElementById(
            "loadingBox"
        );


    if (box) {

        box.style.display =
            "flex";

    }

}


function hideLoading() {

    const box =
        document.getElementById(
            "loadingBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


/* =====================================================
   ERROR
===================================================== */

function showError(message) {

    const box =
        document.getElementById(
            "errorBox"
        );


    if (!box) return;


    box.textContent =
        message;


    box.style.display =
        "block";

}


function hideError() {

    const box =
        document.getElementById(
            "errorBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


/* =====================================================
   EMPTY
===================================================== */

function showEmpty() {

    const box =
        document.getElementById(
            "emptyBox"
        );


    if (box) {

        box.style.display =
            "block";

    }

}


function hideEmpty() {

    const box =
        document.getElementById(
            "emptyBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


/* =====================================================
   DASHBOARD MESSAGE
===================================================== */

function showDashboardMessage(
    message
) {

    const old =
        document.querySelector(
            ".dashboard-message"
        );


    if (old) {

        old.remove();

    }


    const box =
        document.createElement(
            "div"
        );


    box.className =
        "dashboard-message";


    box.textContent =
        message;


    document.body.appendChild(
        box
    );


    setTimeout(
        function () {

            box.remove();

        },
        2500
    );

}


/* =====================================================
   ADMIN LOGOUT
===================================================== */

function adminLogout() {

    const confirmation =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmation) return;


    sessionStorage.removeItem(
        "sstcAdminLoggedIn"
    );


    localStorage.removeItem(
        "sstcAdminLoggedIn"
    );


    window.location.href =
        "index.html";

}
