/* =====================================================
   SSTC ADMIN DASHBOARD
   E-BOOK PRICE & REVENUE SYSTEM
===================================================== */


/* ===============================
   E-BOOK PRICES
================================ */

const EBOOK_PRICES = {

    "3": 15,
    "6": 25,
    "9": 49,
    "12": 99,
    "lifetime": 199

};


/* ===============================
   SAMPLE STUDENT DATA
================================ */

let students = [

    {
        id: "STU001",
        password: "student123",
        loginDate: "18 Aug 2026, 09:15 PM",
        ebook: "Mathematics E-Book",
        type: "Rent",
        duration: "3 Months"
    },

    {
        id: "STU002",
        password: "science456",
        loginDate: "18 Aug 2026, 09:42 PM",
        ebook: "Science E-Book",
        type: "Rent",
        duration: "6 Months"
    },

    {
        id: "STU003",
        password: "english789",
        loginDate: "18 Aug 2026, 10:05 PM",
        ebook: "English E-Book",
        type: "Rent",
        duration: "12 Months"
    },

    {
        id: "STU004",
        password: "sst2026",
        loginDate: "18 Aug 2026, 10:20 PM",
        ebook: "Social Science E-Book",
        type: "Buy",
        duration: "Lifetime"
    }

];


/* ===============================
   GET PRICE
================================ */

function getPlanPrice(student) {

    if (student.type === "Buy") {
        return EBOOK_PRICES.lifetime;
    }

    const months = String(student.duration)
        .replace(/\D/g, "");

    return EBOOK_PRICES[months] || 0;
}


/* ===============================
   PASSWORD SHOW / HIDE
================================ */

function toggleStudentPassword(button) {

    const passwordElement =
        button.parentElement.querySelector(".password-value");

    if (!passwordElement) return;


    const realPassword =
        passwordElement.dataset.password;


    if (passwordElement.dataset.visible === "true") {

        passwordElement.textContent = "••••••••";
        passwordElement.dataset.visible = "false";

        button.textContent = "👁️";

    } else {

        passwordElement.textContent = realPassword;
        passwordElement.dataset.visible = "true";

        button.textContent = "🙈";

    }

}


/* ===============================
   RENDER STUDENT TABLE
================================ */

function renderStudentTable() {

    const tbody =
        document.getElementById("studentTableBody");

    if (!tbody) return;


    tbody.innerHTML = "";


    students.forEach((student, index) => {

        const price = getPlanPrice(student);

        const isBuy =
            student.type.toLowerCase() === "buy";


        const row = document.createElement("tr");


        row.innerHTML = `

            <td>${index + 1}</td>

            <td>
                <strong>${escapeHTML(student.id)}</strong>
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
                📖 ${escapeHTML(student.ebook)}
            </td>


            <td>

                <span class="
                    access-badge
                    ${isBuy ? "access-buy" : "access-rent"}
                ">

                    ${isBuy ? "🛒 Buy" : "🔄 Rent"}

                </span>

            </td>


            <td>
                ${escapeHTML(student.duration)}
            </td>


            <td class="price-value">
                ₹${price}
            </td>

        `;


        tbody.appendChild(row);

    });


    updateRevenue();

}


/* ===============================
   REVENUE CALCULATION
================================ */

function calculateRevenue() {

    let total = 0;

    let income3 = 0;
    let income6 = 0;
    let income9 = 0;
    let income12 = 0;
    let incomeLifetime = 0;


    students.forEach(student => {

        const price = getPlanPrice(student);

        total += price;


        if (student.type === "Buy") {

            incomeLifetime += price;

        } else {

            const months =
                String(student.duration)
                    .replace(/\D/g, "");


            if (months === "3")
                income3 += price;

            else if (months === "6")
                income6 += price;

            else if (months === "9")
                income9 += price;

            else if (months === "12")
                income12 += price;

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


/* ===============================
   UPDATE REVENUE DASHBOARD
================================ */

function updateRevenue() {

    const revenue = calculateRevenue();


    const totalStudents =
        document.getElementById("totalStudents");

    const totalBooks =
        document.getElementById("totalBooks");

    const totalRentals =
        document.getElementById("totalRentals");

    const overallIncome =
        document.getElementById("overallIncome");


    if (totalStudents)
        totalStudents.textContent =
            students.length;


    if (totalBooks)
        totalBooks.textContent =
            students.length;


    if (totalRentals)
        totalRentals.textContent =
            students.filter(
                student => student.type === "Rent"
            ).length;


    if (overallIncome)
        overallIncome.textContent =
            "₹" + revenue.total;


    setText("income3", "₹" + revenue.income3);

    setText("income6", "₹" + revenue.income6);

    setText("income9", "₹" + revenue.income9);

    setText("income12", "₹" + revenue.income12);

    setText(
        "incomeLifetime",
        "₹" + revenue.incomeLifetime
    );

}


/* ===============================
   HELPER
================================ */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


/* ===============================
   HTML SECURITY HELPER
================================ */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ===============================
   ADD NEW STUDENT
================================ */

function addStudentRecord(
    id,
    password,
    ebook,
    type,
    duration
) {

    students.push({

        id: id,
        password: password,
        ebook: ebook,
        type: type,
        duration: duration,

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
            )

    });


    renderStudentTable();

}


/* ===============================
   INITIALIZE
================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderStudentTable();

    }
);
