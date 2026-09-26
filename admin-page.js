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
           SHOW INCOME (Custom Date Range) BUTTON
        --------------------------------------------- */

        const showIncomeRangeBtn =
            document.getElementById(
                "showIncomeRangeBtn"
            );

        if (showIncomeRangeBtn) {

            showIncomeRangeBtn.addEventListener(
                "click",
                function () {

                    showIncomeForRange();

                }
            );

        }


        /* ---------------------------------------------
           CALCULATE TAX BUTTON
        --------------------------------------------- */

        const calculateTaxBtn =
            document.getElementById(
                "calculateTaxBtn"
            );

        if (calculateTaxBtn) {

            calculateTaxBtn.addEventListener(
                "click",
                function () {

                    calculateTaxEstimate();

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


        /*
           Agar Apps Script ka NAYA deployment nahi banaya gaya,
           to purana code "getallrentals" ko unknown action samajh
           kar {success:true, type:"api"} laut a deta hai - error
           to nahi aata, lekin data.rentals bhi nahi hota. Isliye
           "type" bhi check karte hain taaki saaf error dikhe.
        */

        if (
            data.type !== "allrentals"
        ) {

            throw new Error(
                "Apps Script is running an OLD version (Rental Management not found). " +
                "Please go to Apps Script → Deploy → Manage deployments → Edit → New version → Deploy."
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


        updateIncomeReport();


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


        updateIncomeReport();


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


        updateIncomeReport();


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
   =====================================================
   INCOME & TAX REPORT SECTION
   ---------------------------------------------------------
   "Income" = rentals jinki Status "Active" ya "Expired" hai
   (matlab payment admin ne confirm/approve kar diya hai).
   "Pending" wali rentals ko income nahi, "Pending Amount"
   me count kiya jaata hai (abhi tak paisa confirm nahi hua).

   Income ki date = rental.startDate (jab admin ne approve
   kiya, StartDate set hoti hai) - agar wo na ho to
   rental.requestedOn use hota hai (fallback).
   =====================================================
===================================================== */

/*
 * Ek rental ki "income date" nikalta hai - StartDate ko
 * priority (jab admin ne payment confirm/approve kiya),
 * warna RequestedOn.
 */

function getIncomeDate(rental) {

    const raw =
        (rental && rental.startDate) ||
        (rental && rental.requestedOn) ||
        "";

    if (!raw) {
        return null;
    }

    const date = new Date(raw);

    return isNaN(date.getTime()) ? null : date;
}

/* Kya ye rental "income" ginne layak hai (Active ya Expired)? */

function isIncomeRental(rental) {

    const status =
        String(
            (rental && rental.status) || ""
        )
        .trim()
        .toLowerCase();

    return status === "active" || status === "expired";
}

/* Do dates same calendar din ki hain kya? (local time) */

function isSameLocalDay(a, b) {

    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/* Diye gaye date ke calendar-week ka Monday (00:00) nikalta hai */

function getMondayOfWeek(date) {

    const d = new Date(date);
    const day = d.getDay(); // 0=Sunday .. 6=Saturday

    const diffToMonday =
        (day === 0) ? -6 : (1 - day);

    d.setDate(d.getDate() + diffToMonday);
    d.setHours(0, 0, 0, 0);

    return d;
}

/*
 * Today / This Week / This Month / This Year / Pending -
 * sab ek saath calculate karke stat cards update karta hai.
 * Ye rentals[] (jo already loadRentals() se load ho chuka
 * hota hai) par kaam karta hai - koi extra server call nahi.
 */

function updateIncomeReport() {

    if (!Array.isArray(rentals)) {
        return;
    }

    const now = new Date();
    const monday = getMondayOfWeek(now);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;
    let pendingTotal = 0;

    rentals.forEach(function (rental) {

        const price = Number(rental.price) || 0;

        const status =
            String(rental.status || "")
                .trim()
                .toLowerCase();

        if (status === "pending") {

            pendingTotal += price;
            return;
        }

        if (!isIncomeRental(rental)) {
            return;
        }

        const incomeDate = getIncomeDate(rental);

        if (!incomeDate) {
            return;
        }

        if (isSameLocalDay(incomeDate, now)) {
            todayTotal += price;
        }

        if (incomeDate >= monday && incomeDate <= now) {
            weekTotal += price;
        }

        if (
            incomeDate.getFullYear() === now.getFullYear() &&
            incomeDate.getMonth() === now.getMonth()
        ) {
            monthTotal += price;
        }

        if (incomeDate.getFullYear() === now.getFullYear()) {
            yearTotal += price;
        }
    });

    setText("incomeToday", "₹" + todayTotal);
    setText("incomeWeek", "₹" + weekTotal);
    setText("incomeMonth", "₹" + monthTotal);
    setText("incomeYear", "₹" + yearTotal);
    setText("incomePending", "₹" + pendingTotal);

    /*
       Jab tak admin koi custom date range nahi chunta, tax
       calculator "This Year" ke total ko default base bana
       kar rakhta hai.
    */

    lastRangeIncomeTotal = yearTotal;
    lastRangeIncomeLabel = "This Year";
}

/* Tax calculator ka "base" amount - custom range ya (default) This Year */

let lastRangeIncomeTotal = 0;
let lastRangeIncomeLabel = "This Year";

/*
 * "Show Income" button - From/To date choose karke us range
 * ki gross income, transaction count, aur poori list dikhata
 * hai. Isi range ka total tax calculator ka base ban jaata
 * hai jab tak admin dusra range na chune.
 */

function showIncomeForRange() {

    const fromInput = document.getElementById("incomeFromDate");
    const toInput = document.getElementById("incomeToDate");

    const fromValue = fromInput ? fromInput.value : "";
    const toValue = toInput ? toInput.value : "";

    if (!fromValue || !toValue) {

        alert("Please choose both 'From' and 'To' dates.");
        return;
    }

    const fromDate = new Date(fromValue + "T00:00:00");
    const toDate = new Date(toValue + "T23:59:59");

    if (fromDate > toDate) {

        alert("'From' date 'To' date ke baad nahi ho sakti.");
        return;
    }

    const matched = (Array.isArray(rentals) ? rentals : [])
        .filter(function (rental) {

            if (!isIncomeRental(rental)) {
                return false;
            }

            const incomeDate = getIncomeDate(rental);

            if (!incomeDate) {
                return false;
            }

            return incomeDate >= fromDate && incomeDate <= toDate;
        });

    const total = matched.reduce(function (sum, rental) {
        return sum + (Number(rental.price) || 0);
    }, 0);

    setText("rangeIncomeAmount", "₹" + total);
    setText("rangeIncomeCount", matched.length);

    const resultBox = document.getElementById("incomeRangeResult");

    if (resultBox) {
        resultBox.style.display = "block";
    }

    /* Table me sabse nayi entry sabse upar */

    matched.sort(function (a, b) {

        const aDate = getIncomeDate(a);
        const bDate = getIncomeDate(b);

        return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
    });

    const tbody = document.getElementById("incomeRangeTableBody");

    if (tbody) {

        tbody.innerHTML = "";

        matched.forEach(function (rental, index) {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td class="date-cell">
                    ${escapeHTML(formatAdminDate(rental.startDate || rental.requestedOn))}
                </td>

                <td>
                    <strong class="student-id">
                        ${escapeHTML(rental.studentId || "")}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(rental.studentName || "")}
                </td>

                <td>
                    ${escapeHTML(rental.subject || "")}
                </td>

                <td>
                    ${escapeHTML(rental.plan || "")}
                </td>

                <td>
                    ₹${escapeHTML(String(rental.price || 0))}
                </td>

            `;

            tbody.appendChild(row);
        });
    }

    /* Ab tax calculator isi chuni hui range ke total ko base banayega */

    lastRangeIncomeTotal = total;
    lastRangeIncomeLabel = fromValue + " to " + toValue;
}

/*
 * GST + Income Tax estimator.
 * ---------------------------------------------------------
 * "Prices already GST-inclusive" checked (default):
 *     GST Amount   = Gross × Rate / (100 + Rate)   (reverse calc)
 *     Taxable Value = Gross − GST Amount
 *
 * Checkbox unchecked (prices GST-exclusive, GST alag se lagta hai):
 *     GST Amount   = Gross × Rate / 100             (forward calc)
 *     Taxable Value = Gross (GST alag se add hoga, income me nahi)
 *
 * Income Tax hamesha Taxable Value par lagta hai (GST hata kar),
 * kyunki income tax turnover par nahi, net profit/income par
 * lagta hai. Ye sirf ek estimate hai - CA se confirm zaroor karein.
 */

function calculateTaxEstimate() {

    const gstRateInput = document.getElementById("gstRateInput");
    const incomeTaxRateInput = document.getElementById("incomeTaxRateInput");
    const gstInclusiveCheckbox = document.getElementById("gstInclusiveCheckbox");

    const gstRate = Number(gstRateInput ? gstRateInput.value : 0) || 0;
    const incomeTaxRate = Number(incomeTaxRateInput ? incomeTaxRateInput.value : 0) || 0;
    const gstInclusive = gstInclusiveCheckbox ? gstInclusiveCheckbox.checked : true;

    const gross = lastRangeIncomeTotal || 0;

    let gstAmount = 0;
    let taxableValue = gross;

    if (gstInclusive) {

        gstAmount = (gross * gstRate) / (100 + gstRate);
        taxableValue = gross - gstAmount;
    }
    else {

        gstAmount = (gross * gstRate) / 100;
        taxableValue = gross;
    }

    const incomeTaxAmount = (taxableValue * incomeTaxRate) / 100;
    const netIncome = taxableValue - incomeTaxAmount;

    setText(
        "taxGross",
        "₹" + gross.toFixed(2) + " (" + lastRangeIncomeLabel + ")"
    );

    setText("taxGst", "₹" + gstAmount.toFixed(2));
    setText("taxTaxable", "₹" + taxableValue.toFixed(2));
    setText("taxIncomeTax", "₹" + incomeTaxAmount.toFixed(2));
    setText("taxNet", "₹" + netIncome.toFixed(2));

    const box = document.getElementById("taxResultBox");

    if (box) {
        box.style.display = "block";
    }
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
