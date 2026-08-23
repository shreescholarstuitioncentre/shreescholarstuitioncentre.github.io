/* =====================================================
   SSTC ADMIN DASHBOARD
   LIVE GOOGLE SHEETS VERSION
===================================================== */


/* =====================================================
   GOOGLE APPS SCRIPT WEB APP URL
   IMPORTANT:
   URL SIRF EK BAAR DECLARE HONA CHAHIYE
===================================================== */

const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =====================================================
   GLOBAL STUDENT DATA
===================================================== */

let students = [];


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* ---------------------------------------------
           CURRENT YEAR
        --------------------------------------------- */

        const year =
            document.getElementById(
                "currentYear"
            );

        if (year) {

            year.textContent =
                new Date().getFullYear();

        }


        /* ---------------------------------------------
           REFRESH BUTTON
        --------------------------------------------- */

        const refreshBtn =
            document.getElementById(
                "refreshBtn"
            );

        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                function () {

                    loadStudents();

                }
            );

        }


        /* ---------------------------------------------
           ADMIN SESSION CHECK
        --------------------------------------------- */

        const loggedIn =
            sessionStorage.getItem(
                "sstcAdminLoggedIn"
            );


        /*
           Agar login value exist karti hai
           aur true nahi hai to login page par bhejo.
        */

        if (
            loggedIn &&
            loggedIn !== "true"
        ) {

            window.location.href =
                "index.html";

            return;

        }


        /* ---------------------------------------------
           LOAD LIVE GOOGLE SHEET DATA
        --------------------------------------------- */

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


    /*
       Table ko temporarily clear kar dete hain
       taaki purana data na dikhe.
    */

    const tbody =
        document.getElementById(
            "studentTableBody"
        );

    if (tbody) {

        tbody.innerHTML = "";

    }


    try {

        /* ---------------------------------------------
           GOOGLE APPS SCRIPT URL
        --------------------------------------------- */

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=getStudents&_=" +
            Date.now();


        console.log(
            "Fetching Google Sheet:",
            url
        );


        /* ---------------------------------------------
           FETCH
        --------------------------------------------- */

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store",
                    redirect: "follow"
                }
            );


        console.log(
            "Google Apps Script HTTP Status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                "Google Apps Script server error: " +
                response.status
            );

        }


        /* ---------------------------------------------
           JSON RESPONSE
        --------------------------------------------- */

        const data =
            await response.json();


        console.log(
            "Google Sheet Response:",
            data
        );


        /* ---------------------------------------------
           CHECK SUCCESS
        --------------------------------------------- */

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


        /* ---------------------------------------------
           STORE STUDENTS
        --------------------------------------------- */

        students =
            Array.isArray(
                data.students
            )
                ? data.students
                : [];


        console.log(
            "Students Loaded:",
            students.length
        );


        /* ---------------------------------------------
           HIDE LOADING
        --------------------------------------------- */

        hideLoading();


        /* ---------------------------------------------
           EMPTY CHECK
        --------------------------------------------- */

        if (
            students.length === 0
        ) {

            showEmpty();

        }


        /* ---------------------------------------------
           RENDER TABLE
        --------------------------------------------- */

        renderStudentTable();


        /* ---------------------------------------------
           UPDATE STATS
        --------------------------------------------- */

        updateStats();


        /* ---------------------------------------------
           LAST UPDATED
        --------------------------------------------- */

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


        /* ---------------------------------------------
           SUCCESS MESSAGE
        --------------------------------------------- */

        showDashboardMessage(
            "✅ Google Sheets data loaded — " +
            students.length +
            " student(s)"
        );

    }


    catch (error) {

        console.error(
            "GOOGLE SHEET LOAD ERROR:",
            error
        );


        hideLoading();


        students = [];


        renderStudentTable();


        updateStats();


        showError(
            "❌ Google Sheets से data load नहीं हो पाया.\n\n" +
            error.message
        );


        showDashboardMessage(
            "❌ Google Sheets data load failed"
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


    if (!tbody) {

        console.error(
            "studentTableBody not found in HTML."
        );

        return;

    }


    tbody.innerHTML = "";


    /* ---------------------------------------------
       NO STUDENTS
    --------------------------------------------- */

    if (
        !Array.isArray(students) ||
        students.length === 0
    ) {

        return;

    }


    /* ---------------------------------------------
       CREATE ROWS
    --------------------------------------------- */

    students.forEach(
        function (student, index) {


            const row =
                document.createElement(
                    "tr"
                );


            /* -----------------------------------------
               STATUS
            ----------------------------------------- */

            const status =
                String(
                    student.status ||
                    "Active"
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


            /* -----------------------------------------
               SAFE VALUES
            ----------------------------------------- */

            const studentId =
                student.studentId ||
                "";


            const password =
                student.password ||
                "";


            const fullName =
                student.fullName ||
                "";


            const mobileNumber =
                student.mobileNumber ||
                "";


            const gender =
                student.gender ||
                "";


            const emailId =
                student.emailId ||
                "";


            const className =
                student.className ||
                "";


            const board =
                student.board ||
                "";


            const schoolName =
                student.schoolName ||
                "";


            const schoolPlace =
                student.schoolPlace ||
                "";


            const registrationDate =
                student.registrationDate ||
                "";


            /* -----------------------------------------
               TABLE ROW
            ----------------------------------------- */

            row.innerHTML = `

                <!-- # -->

                <td>
                    ${index + 1}
                </td>


                <!-- STUDENT ID -->

                <td>

                    <strong class="student-id">

                        ${escapeHTML(
                            studentId
                        )}

                    </strong>

                </td>


                <!-- PASSWORD -->

                <td>

                    <div class="password-cell">

                        <span
                            class="password-value"
                            data-password="${escapeHTML(
                                password
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


                <!-- FULL NAME -->

                <td>

                    ${escapeHTML(
                        fullName
                    )}

                </td>


                <!-- MOBILE -->

                <td>

                    ${escapeHTML(
                        mobileNumber
                    )}

                </td>


                <!-- GENDER -->

                <td>

                    ${escapeHTML(
                        gender
                    )}

                </td>


                <!-- EMAIL -->

                <td
                    class="email-cell"
                    title="${escapeHTML(
                        emailId
                    )}"
                >

                    ${escapeHTML(
                        emailId
                    )}

                </td>


                <!-- CLASS -->

                <td>

                    ${escapeHTML(
                        className
                    )}

                </td>


                <!-- BOARD -->

                <td>

                    ${escapeHTML(
                        board
                    )}

                </td>


                <!-- SCHOOL NAME -->

                <td
                    class="school-cell"
                    title="${escapeHTML(
                        schoolName
                    )}"
                >

                    ${escapeHTML(
                        schoolName
                    )}

                </td>


                <!-- SCHOOL PLACE -->

                <td
                    class="school-cell"
                    title="${escapeHTML(
                        schoolPlace
                    )}"
                >

                    ${escapeHTML(
                        schoolPlace
                    )}

                </td>


                <!-- REGISTRATION DATE -->

                <td class="date-cell">

                    ${escapeHTML(
                        registrationDate
                    )}

                </td>


                <!-- STATUS -->

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


                <!-- ACTION -->

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


            tbody.appendChild(
                row
            );

        }
    );

}


/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

function toggleStudentPassword(
    button
) {

    if (!button) return;


    const parent =
        button.parentElement;


    if (!parent) return;


    const passwordElement =
        parent.querySelector(
            ".password-value"
        );


    if (!passwordElement) return;


    const password =
        passwordElement.dataset.password ||
        "";


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
   CHANGE STUDENT STATUS
===================================================== */

async function changeStudentStatus(
    index,
    newStatus
) {

    const student =
        students[index];


    if (!student) {

        return;

    }


    const studentId =
        student.studentId ||
        "";


    if (!studentId) {

        alert(
            "Student ID not found."
        );

        return;

    }


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
            studentId
        );


    if (!confirmation) {

        return;

    }


    showDashboardMessage(
        "⏳ Updating student status..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=updateStatus" +
            "&studentId=" +
            encodeURIComponent(
                studentId
            ) +
            "&status=" +
            encodeURIComponent(
                newStatus
            ) +
            "&_=" +
            Date.now();


        console.log(
            "Status Update URL:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store",
                    redirect: "follow"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "Status Update Response:",
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


        /* -----------------------------------------
           LOCAL UPDATE
        ----------------------------------------- */

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
            "STATUS UPDATE ERROR:",
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

async function deleteStudent(
    index
) {

    const student =
        students[index];


    if (!student) {

        return;

    }


    const studentId =
        student.studentId ||
        "";


    const fullName =
        student.fullName ||
        "";


    if (!studentId) {

        alert(
            "Student ID not found."
        );

        return;

    }


    const confirmation =
        confirm(

            "⚠️ DELETE STUDENT\n\n" +

            "Student ID: " +
            studentId +
            "\n\n" +

            "Full Name: " +
            fullName +
            "\n\n" +

            "यह record Google Sheet से permanently delete होगा.\n\n" +

            "Continue?"

        );


    if (!confirmation) {

        return;

    }


    showDashboardMessage(
        "⏳ Deleting student..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=deleteStudent" +
            "&studentId=" +
            encodeURIComponent(
                studentId
            ) +
            "&_=" +
            Date.now();


        console.log(
            "Delete URL:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store",
                    redirect: "follow"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


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


        /* -----------------------------------------
           REMOVE FROM LOCAL ARRAY
        ----------------------------------------- */

        students.splice(
            index,
            1
        );


        renderStudentTable();


        updateStats();


        if (
            students.length === 0
        ) {

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
   UPDATE DASHBOARD STATS
===================================================== */

function updateStats() {

    const total =
        Array.isArray(students)
            ? students.length
            : 0;


    const active =
        students.filter(
            function (student) {

                return String(
                    student.status ||
                    ""
                )
                .trim()
                .toLowerCase() ===
                "active";

            }
        ).length;


    const inactive =
        total -
        active;


    /* ---------------------------------------------
       TOTAL
    --------------------------------------------- */

    setText(
        "totalStudents",
        total
    );


    /* ---------------------------------------------
       ACTIVE
    --------------------------------------------- */

    setText(
        "activeAccounts",
        active
    );


    /* ---------------------------------------------
       INACTIVE
    --------------------------------------------- */

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

function showError(
    message
) {

    const box =
        document.getElementById(
            "errorBox"
        );


    if (!box) {

        console.error(
            message
        );

        return;

    }


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

            if (box) {

                box.remove();

            }

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
