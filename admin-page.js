/* =====================================================
   SSTC ADMIN DASHBOARD
   LIVE GOOGLE SHEETS VERSION
   + RENTAL MANAGEMENT SECTION
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
   GLOBAL RENTAL DATA
===================================================== */

let rentals = [];


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
           REFRESH BUTTON (Students)
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
           REFRESH BUTTON (Rentals)
        --------------------------------------------- */

        const refreshRentalsBtn =
            document.getElementById(
                "refreshRentalsBtn"
            );

        if (refreshRentalsBtn) {

            refreshRentalsBtn.addEventListener(
                "click",
                function () {

                    loadRentals();

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

        loadRentals();

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
   UPDATE DASHBOARD STATS (Students)
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
   =====================================================
   RENTAL MANAGEMENT SECTION
   =====================================================
===================================================== */


/* =====================================================
   LOAD RENTALS FROM GOOGLE SHEETS
===================================================== */

async function loadRentals() {

    showRentalsLoading();

    hideRentalsError();

    hideRentalsEmpty();


    const tbody =
        document.getElementById(
            "rentalTableBody"
        );

    if (tbody) {

        tbody.innerHTML = "";

    }


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=getallrentals&_=" +
            Date.now();


        console.log(
            "Fetching Rentals:",
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


        console.log(
            "Rentals HTTP Status:",
            response.status
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
            "Rentals Response:",
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
                    : "Rental data load failed."
            );

        }


        rentals =
            Array.isArray(
                data.rentals
            )
                ? data.rentals
                : [];


        console.log(
            "Rentals Loaded:",
            rentals.length
        );


        hideRentalsLoading();


        if (
            rentals.length === 0
        ) {

            showRentalsEmpty();

        }


        renderRentalTable();


        updateRentalStats();


        showDashboardMessage(
            "✅ Rentals loaded — " +
            rentals.length +
            " record(s)"
        );

    }


    catch (error) {

        console.error(
            "RENTALS LOAD ERROR:",
            error
        );


        hideRentalsLoading();


        rentals = [];


        renderRentalTable();


        updateRentalStats();


        showRentalsError(
            "❌ Google Sheets से rental data load नहीं हो पाया.\n\n" +
            error.message
        );


        showDashboardMessage(
            "❌ Rentals data load failed"
        );

    }

}


/* =====================================================
   RENDER RENTAL TABLE
===================================================== */

function renderRentalTable() {

    const tbody =
        document.getElementById(
            "rentalTableBody"
        );


    if (!tbody) {

        console.error(
            "rentalTableBody not found in HTML."
        );

        return;

    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(rentals) ||
        rentals.length === 0
    ) {

        return;

    }


    rentals.forEach(
        function (rental, index) {


            const row =
                document.createElement(
                    "tr"
                );


            const status =
                String(
                    rental.status ||
                    ""
                )
                .trim();


            const statusLower =
                status.toLowerCase();


            if (
                statusLower === "expired" ||
                statusLower === "cancelled"
            ) {

                row.classList.add(
                    "record-inactive"
                );

            }


            /* -----------------------------------------
               SAFE VALUES
            ----------------------------------------- */

            const rentalId =
                rental.rentalId ||
                "";

            const studentId =
                rental.studentId ||
                "";

            const studentName =
                rental.studentName ||
                "";

            const className =
                rental.className ||
                "";

            const subject =
                rental.subject ||
                "";

            const plan =
                rental.plan ||
                "";

            const price =
                rental.price ||
                0;

            const requestedOn =
                formatAdminDate(
                    rental.requestedOn
                );

            const startDate =
                formatAdminDate(
                    rental.startDate
                );

            const expiryDate =
                formatAdminDate(
                    rental.expiryDate
                );

            const paymentClaimedOn =
                rental.paymentClaimedOn ||
                "";


            /* -----------------------------------------
               STATUS BADGE
            ----------------------------------------- */

            let statusBadgeClass = "status-inactive";
            let statusLabel = "⚪ " + (status || "Unknown");

            if (statusLower === "active") {
                statusBadgeClass = "status-active";
                statusLabel = "🟢 Active";
            }
            else if (statusLower === "pending") {
                statusBadgeClass = "status-inactive";
                statusLabel = "⏳ Pending";
            }
            else if (statusLower === "expired") {
                statusBadgeClass = "status-inactive";
                statusLabel = "⌛ Expired";
            }
            else if (statusLower === "cancelled") {
                statusBadgeClass = "status-inactive";
                statusLabel = "❌ Cancelled";
            }


            /* -----------------------------------------
               PAYMENT BADGE
            ----------------------------------------- */

            const paymentBadge =
                paymentClaimedOn
                    ? '<span class="status-badge status-active">💰 Claimed</span>'
                    : '<span class="status-badge status-inactive">— Not yet</span>';


            /* -----------------------------------------
               ACTION BUTTONS
            ----------------------------------------- */

            let actionButtonsHtml = "";

            if (statusLower === "pending") {

                actionButtonsHtml += `
                    <button
                        type="button"
                        class="action-btn activate-btn"
                        onclick="changeRentalStatus(${index}, 'Active')"
                        title="Approve Rental"
                    >
                        ✅
                    </button>

                    <button
                        type="button"
                        class="action-btn deactivate-btn"
                        onclick="changeRentalStatus(${index}, 'Cancelled')"
                        title="Reject Rental"
                    >
                        ❌
                    </button>
                `;

            }

            else if (statusLower === "active") {

                actionButtonsHtml += `
                    <button
                        type="button"
                        class="action-btn deactivate-btn"
                        onclick="changeRentalStatus(${index}, 'Expired')"
                        title="Mark as Expired"
                    >
                        ⌛
                    </button>
                `;

            }

            actionButtonsHtml += `
                <button
                    type="button"
                    class="action-btn delete-btn"
                    onclick="deleteRental(${index})"
                    title="Delete Rental"
                >
                    🗑️
                </button>
            `;


            /* -----------------------------------------
               TABLE ROW
            ----------------------------------------- */

            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong class="student-id">
                        ${escapeHTML(rentalId)}
                    </strong>
                </td>

                <td>
                    <strong class="student-id">
                        ${escapeHTML(studentId)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(studentName)}
                </td>

                <td>
                    ${escapeHTML(className)}
                </td>

                <td>
                    ${escapeHTML(subject)}
                </td>

                <td>
                    ${escapeHTML(plan)}
                </td>

                <td>
                    ₹${escapeHTML(String(price))}
                </td>

                <td>
                    <span class="status-badge ${statusBadgeClass}">
                        ${statusLabel}
                    </span>
                </td>

                <td>
                    ${paymentBadge}
                </td>

                <td class="date-cell">
                    ${escapeHTML(requestedOn)}
                </td>

                <td class="date-cell">
                    ${escapeHTML(startDate) || "-"}
                </td>

                <td class="date-cell">
                    ${escapeHTML(expiryDate) || "-"}
                </td>

                <td>
                    <div class="action-buttons">
                        ${actionButtonsHtml}
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
   CHANGE RENTAL STATUS (Approve / Reject / Expire)
===================================================== */

async function changeRentalStatus(
    index,
    newStatus
) {

    const rental =
        rentals[index];


    if (!rental) {

        return;

    }


    const rentalId =
        rental.rentalId ||
        "";


    if (!rentalId) {

        alert(
            "Rental ID not found."
        );

        return;

    }


    const actionTextMap = {
        Active: "approve",
        Cancelled: "reject",
        Expired: "mark as expired"
    };


    const actionText =
        actionTextMap[newStatus] ||
        "update";


    const confirmation =
        confirm(
            "Are you sure you want to " +
            actionText +
            " this rental?\n\n" +

            "Rental ID: " +
            rentalId +
            "\n" +

            "Student ID: " +
            (rental.studentId || "") +
            "\n" +

            "Subject: " +
            (rental.subject || "")
        );


    if (!confirmation) {

        return;

    }


    showDashboardMessage(
        "⏳ Updating rental status..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=updaterentalstatus" +
            "&rentalId=" +
            encodeURIComponent(
                rentalId
            ) +
            "&status=" +
            encodeURIComponent(
                newStatus
            ) +
            "&_=" +
            Date.now();


        console.log(
            "Rental Status Update URL:",
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
            "Rental Status Update Response:",
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
                    : "Rental status update failed."
            );

        }


        /*
           Server se poori updated list dobara le lete hain,
           kyunki "Active" karne par StartDate/ExpiryDate bhi
           server-side calculate hote hain jo humein turant
           table me dikhane hain.
        */

        await loadRentals();


        showDashboardMessage(
            newStatus === "Active"
                ? "✅ Rental Approved"
                : (
                    newStatus === "Cancelled"
                        ? "❌ Rental Rejected"
                        : "⌛ Rental marked as Expired"
                )
        );

    }


    catch (error) {

        console.error(
            "RENTAL STATUS UPDATE ERROR:",
            error
        );


        showDashboardMessage(
            "❌ Rental status update failed"
        );


        alert(
            "Rental status update failed.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   DELETE RENTAL
===================================================== */

async function deleteRental(
    index
) {

    const rental =
        rentals[index];


    if (!rental) {

        return;

    }


    const rentalId =
        rental.rentalId ||
        "";


    if (!rentalId) {

        alert(
            "Rental ID not found."
        );

        return;

    }


    const confirmation =
        confirm(

            "⚠️ DELETE RENTAL\n\n" +

            "Rental ID: " +
            rentalId +
            "\n\n" +

            "Student ID: " +
            (rental.studentId || "") +
            "\n" +

            "Subject: " +
            (rental.subject || "") +
            "\n\n" +

            "यह record Google Sheet से permanently delete होगा.\n\n" +

            "Continue?"

        );


    if (!confirmation) {

        return;

    }


    showDashboardMessage(
        "⏳ Deleting rental..."
    );


    try {

        const url =
            GOOGLE_SCRIPT_URL +
            "?action=deleterentaladmin" +
            "&rentalId=" +
            encodeURIComponent(
                rentalId
            ) +
            "&_=" +
            Date.now();


        console.log(
            "Delete Rental URL:",
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
            "Delete Rental Response:",
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


        rentals.splice(
            index,
            1
        );


        renderRentalTable();


        updateRentalStats();


        if (
            rentals.length === 0
        ) {

            showRentalsEmpty();

        }


        showDashboardMessage(
            "🗑️ Rental deleted successfully"
        );

    }


    catch (error) {

        console.error(
            "DELETE RENTAL ERROR:",
            error
        );


        showDashboardMessage(
            "❌ Rental delete failed"
        );


        alert(
            "Rental delete failed.\n\n" +
            error.message
        );

    }

}


/* =====================================================
   UPDATE RENTAL STATS
===================================================== */

function updateRentalStats() {

    const total =
        Array.isArray(rentals)
            ? rentals.length
            : 0;


    const pendingList =
        rentals.filter(
            function (rental) {

                return String(
                    rental.status ||
                    ""
                )
                .trim()
                .toLowerCase() ===
                "pending";

            }
        );


    const activeCount =
        rentals.filter(
            function (rental) {

                return String(
                    rental.status ||
                    ""
                )
                .trim()
                .toLowerCase() ===
                "active";

            }
        ).length;


    const pendingAmount =
        pendingList.reduce(
            function (sum, rental) {

                return sum + (
                    Number(rental.price) ||
                    0
                );

            },
            0
        );


    setText(
        "totalRentals",
        total
    );


    setText(
        "pendingRentals",
        pendingList.length
    );


    setText(
        "activeRentals",
        activeCount
    );


    setText(
        "pendingRentalAmount",
        pendingAmount
    );

}


/* =====================================================
   FORMAT DATE (for rental table - ISO string -> readable)
===================================================== */

function formatAdminDate(isoString) {

    if (!isoString) {

        return "";

    }

    const date =
        new Date(isoString);

    if (isNaN(date.getTime())) {

        return String(isoString);

    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
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
   LOADING / ERROR / EMPTY  (STUDENTS)
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
   LOADING / ERROR / EMPTY  (RENTALS)
===================================================== */

function showRentalsLoading() {

    const box =
        document.getElementById(
            "rentalsLoadingBox"
        );


    if (box) {

        box.style.display =
            "flex";

    }

}


function hideRentalsLoading() {

    const box =
        document.getElementById(
            "rentalsLoadingBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


function showRentalsError(
    message
) {

    const box =
        document.getElementById(
            "rentalsErrorBox"
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


function hideRentalsError() {

    const box =
        document.getElementById(
            "rentalsErrorBox"
        );


    if (box) {

        box.style.display =
            "none";

    }

}


function showRentalsEmpty() {

    const box =
        document.getElementById(
            "rentalsEmptyBox"
        );


    if (box) {

        box.style.display =
            "block";

    }

}


function hideRentalsEmpty() {

    const box =
        document.getElementById(
            "rentalsEmptyBox"
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
