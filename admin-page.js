/* =====================================================
   SSTC ADMIN DASHBOARD
===================================================== */


/* =====================================================
   PRICES
===================================================== */

const EBOOK_PRICES = {

    "3": 15,

    "6": 25,

    "9": 49,

    "12": 99,

    "lifetime": 199

};


/* =====================================================
   STUDENT E-BOOK RECORDS
===================================================== */

let students = [

    {
        id: "STU001",
        password: "student123",
        loginDate: "18 Aug 2026, 09:15 PM",
        ebook: "Mathematics E-Book",
        type: "Rent",
        duration: "3 Months",
        status: "Active"
    },


    {
        id: "STU001",
        password: "student123",
        loginDate: "18 Aug 2026, 09:16 PM",
        ebook: "Science E-Book",
        type: "Rent",
        duration: "6 Months",
        status: "Active"
    },


    {
        id: "STU001",
        password: "student123",
        loginDate: "18 Aug 2026, 09:17 PM",
        ebook: "English E-Book",
        type: "Buy",
        duration: "Lifetime",
        status: "Active"
    },


    {
        id: "STU002",
        password: "science456",
        loginDate: "18 Aug 2026, 09:42 PM",
        ebook: "Science E-Book",
        type: "Rent",
        duration: "12 Months",
        status: "Active"
    },


    {
        id: "STU003",
        password: "sst2026",
        loginDate: "18 Aug 2026, 10:20 PM",
        ebook: "Social Science E-Book",
        type: "Buy",
        duration: "Lifetime",
        status: "Active"
    }

];


/* =====================================================
   GET PRICE
===================================================== */

function getPlanPrice(student) {

    if (student.type === "Buy") {

        return EBOOK_PRICES.lifetime;

    }


    const months =
        String(student.duration)
            .replace(/\D/g, "");


    return EBOOK_PRICES[months] || 0;

}


/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */

function toggleStudentPassword(button) {

    const passwordElement =
        button.parentElement
            .querySelector(".password-value");


    if (!passwordElement) return;


    const password =
        passwordElement.dataset.password;


    if (
        passwordElement.dataset.visible === "true"
    ) {

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
   ACTIVE
===================================================== */

function activateRecord(index) {

    if (!students[index]) return;


    students[index].status =
        "Active";


    renderStudentTable();


    showDashboardMessage(
        "🟢 E-Book access activated"
    );

}


/* =====================================================
   DEACTIVE
===================================================== */

function deactivateRecord(index) {

    if (!students[index]) return;


    students[index].status =
        "Inactive";


    renderStudentTable();


    showDashboardMessage(
        "⚪ E-Book access deactivated"
    );

}


/* =====================================================
   DELETE
===================================================== */

function deleteRecord(index) {

    if (!students[index]) return;


    const student =
        students[index];


    const confirmation =
        confirm(
            "Delete this e-book record?\n\n" +
            "Student: " +
            student.id +
            "\n" +
            "E-Book: " +
            student.ebook
        );


    if (!confirmation) return;


    students.splice(index, 1);


    renderStudentTable();


    showDashboardMessage(
        "🗑️ E-Book record deleted"
    );

}


/* =====================================================
   RENDER TABLE
===================================================== */

function renderStudentTable() {

    const tbody =
        document.getElementById(
            "studentTableBody"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    /* -----------------------------------------------
       COUNT E-BOOKS FOR EACH STUDENT
    ------------------------------------------------ */

    const studentBookCount = {};


    students.forEach(student => {

        if (!studentBookCount[student.id]) {

            studentBookCount[student.id] = 0;

        }

        studentBookCount[student.id]++;

    });


    /* -----------------------------------------------
       CREATE ROWS
    ------------------------------------------------ */

    students.forEach(
        (student, index) => {

            const price =
                getPlanPrice(student);


            const isBuy =
                student.type === "Buy";


            const isActive =
                student.status === "Active";


            const multipleBooks =
                studentBookCount[student.id] > 1;


            const row =
                document.createElement("tr");


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

                    <strong>
                        ${escapeHTML(student.id)}
                    </strong>


                    ${
                        multipleBooks
                        ?
                        `<span class="multiple-book">
                            ${studentBookCount[student.id]} Books
                        </span>`
                        :
                        ""
                    }

                </td>


                <td>

                    <div class="password-cell">

                        <span
                            class="password-value"
                            data-password="${escapeHTML(student.password)}"
                            data-visible="false">

                            ••••••••

                        </span>


                        <button
                            type="button"
                            class="password-eye"
                            onclick="toggleStudentPassword(this)"
                            title="Show / Hide Password">

                            👁️

                        </button>

                    </div>

                </td>


                <td>
                    ${escapeHTML(student.loginDate)}
                </td>


                <td>

                    📖
                    ${escapeHTML(student.ebook)}

                </td>


                <td>

                    <span class="
                        access-badge
                        ${
                            isBuy
                            ?
                            "access-buy"
                            :
                            "access-rent"
                        }
                    ">

                        ${
                            isBuy
                            ?
                            "🛒 Buy"
                            :
                            "🔄 Rent"
                        }

                    </span>

                </td>


                <td>
                    ${escapeHTML(student.duration)}
                </td>


                <td class="price-value">

                    ₹${price}

                </td>


                <td>

                    <span class="
                        status-badge
                        ${
                            isActive
                            ?
                            "status-active"
                            :
                            "status-inactive"
                        }
                    ">

                        ${
                            isActive
                            ?
                            "🟢 Active"
                            :
                            "⚪ Inactive"
                        }

                    </span>

                </td>


                <td>

                    <div class="action-buttons">


                        ${
                            isActive

                            ?

                            `<button
                                type="button"
                                class="action-btn deactivate-btn"
                                onclick="deactivateRecord(${index})"
                                title="Deactivate">

                                ⚪

                            </button>`

                            :

                            `<button
                                type="button"
                                class="action-btn activate-btn"
                                onclick="activateRecord(${index})"
                                title="Activate">

                                🟢

                            </button>`
                        }


                        <button
                            type="button"
                            class="action-btn delete-btn"
                            onclick="deleteRecord(${index})"
                            title="Delete">

                            🗑️

                        </button>


                    </div>

                </td>

            `;


            tbody.appendChild(row);

        }

    );


    updateRevenue();

}


/* =====================================================
   REVENUE
===================================================== */

function calculateRevenue() {

    let total = 0;

    let income3 = 0;

    let income6 = 0;

    let income9 = 0;

    let income12 = 0;

    let incomeLifetime = 0;


    students.forEach(student => {

        const price =
            getPlanPrice(student);


        total += price;


        if (student.type === "Buy") {

            incomeLifetime += price;

        }

        else {

            const months =
                String(student.duration)
                    .replace(/\D/g, "");


            if (months === "3") {

                income3 += price;

            }

            else if (months === "6") {

                income6 += price;

            }

            else if (months === "9") {

                income9 += price;

            }

            else if (months === "12") {

                income12 += price;

            }

        }

    });


    return {

        total,

        income3,

        income6,

        income9,

        income12,

        incomeLifetime

    };

}


/* =====================================================
   UPDATE REVENUE
===================================================== */

function updateRevenue() {

    const revenue =
        calculateRevenue();


    /* -----------------------------------------------
       UNIQUE STUDENTS
    ------------------------------------------------ */

    const uniqueStudents =
        new Set(
            students.map(
                student => student.id
            )
        );


    const activeRecords =
        students.filter(
            student =>
                student.status === "Active"
        );


    setText(
        "totalStudents",
        uniqueStudents.size
    );


    setText(
        "totalBooks",
        students.length
    );


    setText(
        "totalActive",
        activeRecords.length
    );


    setText(
        "overallIncome",
        "₹" + revenue.total
    );


    setText(
        "income3",
        "₹" + revenue.income3
    );


    setText(
        "income6",
        "₹" + revenue.income6
    );


    setText(
        "income9",
        "₹" + revenue.income9
    );


    setText(
        "income12",
        "₹" + revenue.income12
    );


    setText(
        "incomeLifetime",
        "₹" + revenue.incomeLifetime
    );

}


/* =====================================================
   ADD E-BOOK TO STUDENT
===================================================== */

function addStudentEbook(
    id,
    password,
    ebook,
    type,
    duration
) {

    students.push({

        id: id,

        password: password,

        loginDate:
            new Date().toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            ),

        ebook: ebook,

        type: type,

        duration: duration,

        status: "Active"

    });


    renderStudentTable();

}


/* =====================================================
   DASHBOARD MESSAGE
===================================================== */

function showDashboardMessage(message) {

    const old =
        document.querySelector(
            ".dashboard-message"
        );


    if (old) {

        old.remove();

    }


    const messageBox =
        document.createElement("div");


    messageBox.className =
        "dashboard-message";


    messageBox.textContent =
        message;


    document.body.appendChild(
        messageBox
    );


    setTimeout(() => {

        messageBox.remove();

    }, 2500);

}


/* =====================================================
   HELPER
===================================================== */

function setText(id, value) {

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

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

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


    /* Remove admin login session */

    sessionStorage.removeItem(
        "sstcAdminLoggedIn"
    );


    localStorage.removeItem(
        "sstcAdminLoggedIn"
    );


    /*
       IMPORTANT:
       यहाँ अपने actual Sign-In page
       का filename रखें.
    */

    window.location.href =
        "index.html";

}


/* =====================================================
   ADMIN SESSION CHECK
===================================================== */

function checkAdminSession() {

    const loggedIn =
        sessionStorage.getItem(
            "sstcAdminLoggedIn"
        );


    if (loggedIn !== "true") {

        /*
           अगर आपका login page
           index.html है तो यही रखें.
        */

        window.location.href =
            "index.html";

        return false;

    }


    return true;

}


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           Session check को तभी enable करें
           जब आपका login JS
           sstcAdminLoggedIn set करता हो.
        */

        renderStudentTable();

    }
);
