/* =========================================================
   SSTC STUDENT PORTAL
   LIVE STUDENT DATA
   SESSION + PROFILE + E-BOOK LIBRARY + PDF READER
   + RENT SUBJECTS (3 / 6 / 12 months -> saved in Google Sheet)
   + PAY NOW (UPI payment + Payment Claim + Admin Email)
   ========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
   ========================================================= */

let studentData = null;
let sstcRedirecting = false;
let sstcLoggingOut = false;
let sstcZoom = 100;

/* --- rent state --- */
let sstcRentals = [];               // server se aayi rentals (Pending / Active / Expired)
let sstcRentalsLoaded = false;      // rentals server se load ho chuki hain?
let sstcRentalsError = "";          // load fail hua to reason
let sstcRequiresApproval = true;    // server: rent ke baad admin approval chahiye?
let sstcSubjectFilter = "all";      // "all" | "mine"
let sstcShownSubject = "";          // chapter list me abhi kaun sa subject khula hai
let sstcRentModalSubject = "";      // rent window kis subject ki hai
let sstcRentModalMonths = 0;        // rent window me chuna hua plan
let sstcRentBusy = false;           // rent/cancel request chal rahi hai?
let sstcRentModalReturnFocus = null;
let sstcPaymentSelected = new Set();  // Pay Now window me chuni hui rentals
let sstcPaymentReturnFocus = null;


/* =========================================================
   STUDENT DATABASE API + RENT SETTINGS
   ---------------------------------------------------------
   ⚠️ ZAROORI: Apps Script ka "Web App" deployment URL yahan
   paste karein (jo "https://script.google.com/macros/s/.../exec"
   se shuru hota hai). Wahi URL jo sstc-access.html / admin
   page me use ho raha hai.

   Jab tak ye khaali hai, rent Google Sheet me SAVE NAHI hoga -
   page par "setup incomplete" ka warning dikhega.
   ========================================================= */

const SSTC_STUDENT_API_URL = "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";


/* =========================================================
   RENT SETTINGS
   ========================================================= */

/*
 * true  = subject rent kiye bina uske chapters read nahi honge
 * false = sab chapters pehle jaise free khulenge (rent sirf record)
 */
const SSTC_REQUIRE_RENT_TO_READ = true;

/*
 * Rent request bhejne ke baad student ko ye message dikhega.
 * Yahan apna UPI ID / phone number bhi likh sakte hain.
 */
const SSTC_PAYMENT_HELP = "Please contact SSTC administration to complete the payment.";

/*
 * UPI PAYMENT SETTINGS
 * ---------------------------------------------------------
 * SSTC_UPI_ID khaali rahega to "Pay Now" window me sirf ye
 * message dikhega: "UPI payment is not set up yet." Apna
 * asli UPI ID daalne ke baad hi "Pay via UPI" button aur
 * QR code dikhenge.
 */
const SSTC_UPI_ID = "jeetbrother.alekhlife-3@okaxis";                      // jaise "sstc@okaxis"
const SSTC_UPI_PAYEE_NAME = "Shree Scholars Tuition Center";
const SSTC_SHOW_UPI_QR = true;

/*
 * Rent plans. Yahan ka price sirf screen par dikhane ke liye hai;
 * asli (final) price Code.gs ke RENT_PLANS se aata hai. Price badalna
 * ho to DONO jagah badlein.
 */
const SSTC_RENT_PLANS = [
    { months: 3, label: "3 Months", price: 49 },
    { months: 6, label: "6 Months", price: 69 },
    { months: 12, label: "12 Months (1 Year)", price: 99 }
];

let sstcRentPlans = SSTC_RENT_PLANS.slice();


/* =========================================================
   SESSION KEYS
   ========================================================= */

const SSTC_SESSION_LOGIN = "sstcStudentLoggedIn";
const SSTC_SESSION_DATA = "sstcStudentData";
const SSTC_SESSION_LOGIN_TIME = "sstcStudentLoginTime";
const SSTC_CURRENT_BOOK = "sstcCurrentBook";
const SSTC_CURRENT_CHAPTER = "sstcCurrentChapter";
const SSTC_CURRENT_PAGE = "sstcCurrentPage";


/* =========================================================
   GITHUB PAGES BASE URL
   ========================================================= */

const SSTC_SITE_BASE_URL = window.location.origin;


/* =========================================================
   PDF URL BUILDER
   ========================================================= */

function getPdfUrl(pdfPath) {

    if (!pdfPath) {
        return "";
    }

    let cleanPath = String(pdfPath).trim().replace(/^\/+/, "");

    if (/^https?:\/\//i.test(cleanPath)) {
        return cleanPath;
    }

    return SSTC_SITE_BASE_URL + "/" + cleanPath;
}


/* =========================================================
   E-BOOK LIBRARY
   ========================================================= */

const SSTC_EBOOKS = {

    "10": {

        "Science": {
            description: "Class 10 Science E-Book Library",
            image: "subject-images/science.png",
            chapters: [
                { number: 1, title: "Chemical Reactions and Equations", pdf: "ebooks/class-10/science/chapter-01.pdf" },
                { number: 2, title: "Acids, Bases and Salts", pdf: "ebooks/class-10/science/chapter-02.pdf" },
                { number: 3, title: "Metals and Non-metals", pdf: "ebooks/class-10/science/chapter-03.pdf" },
                { number: 4, title: "Carbon and Its Compounds", pdf: "ebooks/class-10/science/chapter-04.pdf" },
                { number: 5, title: "Life Processes", pdf: "ebooks/class-10/science/chapter-05.pdf" },
                { number: 6, title: "Control and Coordination", pdf: "ebooks/class-10/science/chapter-06.pdf" },
                { number: 7, title: "How do Organisms Reproduce?", pdf: "ebooks/class-10/science/chapter-07.pdf" },
                { number: 8, title: "Heredity", pdf: "ebooks/class-10/science/chapter-08.pdf" },
                { number: 9, title: "Light – Reflection and Refraction", pdf: "ebooks/class-10/science/chapter-09.pdf" },
                { number: 10, title: "The Human Eye and the Colourful World", pdf: "ebooks/class-10/science/chapter-10.pdf" },
                { number: 11, title: "Electricity", pdf: "ebooks/class-10/science/chapter-11.pdf" },
                { number: 12, title: "Magnetic Effects of Electric Current", pdf: "ebooks/class-10/science/chapter-12.pdf" },
                { number: 13, title: "Our Environment", pdf: "ebooks/class-10/science/chapter-13.pdf" }
            ]
        },

        "Mathematics": {
            description: "Class 10 Mathematics E-Book Library",
            image: "subject-images/maths.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/mathematics/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/mathematics/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/mathematics/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/mathematics/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/mathematics/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/mathematics/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/mathematics/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/mathematics/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/mathematics/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/mathematics/chapter-10.pdf" },
                { number: 11, title: "Chapter 11", pdf: "ebooks/class-10/mathematics/chapter-11.pdf" },
                { number: 12, title: "Chapter 12", pdf: "ebooks/class-10/mathematics/chapter-12.pdf" },
                { number: 13, title: "Chapter 13", pdf: "ebooks/class-10/mathematics/chapter-13.pdf" },
                { number: 14, title: "Chapter 14", pdf: "ebooks/class-10/mathematics/chapter-14.pdf" },
                { number: 15, title: "Chapter 15", pdf: "ebooks/class-10/mathematics/chapter-15.pdf" }
            ]
        },

        "Hindi": {
            description: "Class 10 Hindi E-Book Library",
            image: "subject-images/Hindi.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/hindi/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/hindi/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/hindi/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/hindi/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/hindi/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/hindi/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/hindi/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/hindi/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/hindi/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/hindi/chapter-10.pdf" }
            ]
        },

        "English": {
            description: "Class 10 English E-Book Library",
            image: "subject-images/english.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/english/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/english/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/english/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/english/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/english/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/english/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/english/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/english/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/english/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/english/chapter-10.pdf" }
            ]
        },

        "Social Science": {
            description: "Class 10 Social Science E-Book Library",
            image: "subject-images/socialscience.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/social-science/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/social-science/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/social-science/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/social-science/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/social-science/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/social-science/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/social-science/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/social-science/chapter-08.pdf" },
                { number: 9, title: "Chapter 9", pdf: "ebooks/class-10/social-science/chapter-09.pdf" },
                { number: 10, title: "Chapter 10", pdf: "ebooks/class-10/social-science/chapter-10.pdf" }
            ]
        },

        "Chitrakala": {
            description: "Class 10 Chitrakala E-Book Library",
            image: "subject-images/chitrakala.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/chitrakala/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/chitrakala/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/chitrakala/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/chitrakala/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/chitrakala/chapter-05.pdf" }
            ]
        },

        "Home Science": {
            description: "Class 10 Home Science E-Book Library",
            image: "subject-images/homescience.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/home-science/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/home-science/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/home-science/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/home-science/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/home-science/chapter-05.pdf" }
            ]
        },

        "Computer": {
            description: "Class 10 Computer E-Book Library",
            image: "subject-images/computer.png",
            chapters: [
                { number: 1, title: "Chapter 1", pdf: "ebooks/class-10/computer/chapter-01.pdf" },
                { number: 2, title: "Chapter 2", pdf: "ebooks/class-10/computer/chapter-02.pdf" },
                { number: 3, title: "Chapter 3", pdf: "ebooks/class-10/computer/chapter-03.pdf" },
                { number: 4, title: "Chapter 4", pdf: "ebooks/class-10/computer/chapter-04.pdf" },
                { number: 5, title: "Chapter 5", pdf: "ebooks/class-10/computer/chapter-05.pdf" },
                { number: 6, title: "Chapter 6", pdf: "ebooks/class-10/computer/chapter-06.pdf" },
                { number: 7, title: "Chapter 7", pdf: "ebooks/class-10/computer/chapter-07.pdf" },
                { number: 8, title: "Chapter 8", pdf: "ebooks/class-10/computer/chapter-08.pdf" }
            ]
        }

    }

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    loadLoggedInStudent();
    setupStudentSecurity();
    setupReaderDefaults();
    setupRentalUI();
    setCurrentYear();
});


/* =========================================================
   CHECK SESSION
   ========================================================= */

function checkStudentSession() {

    const loggedIn = sessionStorage.getItem(SSTC_SESSION_LOGIN);
    const savedData = sessionStorage.getItem(SSTC_SESSION_DATA);

    if (loggedIn !== "true" || !savedData) {
        redirectToAccessPage();
        return false;
    }

    return true;
}


/* =========================================================
   LOAD STUDENT
   ========================================================= */

function loadLoggedInStudent() {

    const loggedIn = sessionStorage.getItem(SSTC_SESSION_LOGIN);
    const savedData = sessionStorage.getItem(SSTC_SESSION_DATA);

    if (loggedIn !== "true" || !savedData) {
        redirectToAccessPage();
        return;
    }

    try {
        studentData = JSON.parse(savedData);
    }
    catch (error) {
        console.error("SSTC student session error:", error);
        clearStudentSession();
        redirectToAccessPage();
        return;
    }

    if (!studentData || !studentData.studentId) {
        clearStudentSession();
        redirectToAccessPage();
        return;
    }

    let loginTime = sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME);

    if (!loginTime) {
        loginTime = createLoginTime();
        sessionStorage.setItem(SSTC_SESSION_LOGIN_TIME, loginTime);
    }

    renderStudentData();
}


/* =========================================================
   CREATE LOGIN TIME
   ========================================================= */

function createLoginTime() {

    const now = new Date();

    return now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}


/* =========================================================
   NORMALIZE CLASS
   ========================================================= */

function normalizeStudentClass(value) {

    const text = String(value || "").trim();
    const match = text.match(/\d+/);

    if (!match) {
        return "";
    }

    return match[0];
}


/* =========================================================
   RENDER STUDENT DATA
   ========================================================= */

function renderStudentData() {

    if (!studentData) {
        return;
    }

    const fullName = getStudentValue(["fullName", "name"], "Student");

    setText("studentName", fullName);
    setText("studentFullName", fullName);
    setText("studentId", getStudentValue(["studentId", "id"], "-"));

    const classValue = getStudentValue(["className", "Class", "class", "studentClass"], "-");

    setText("studentClass", classValue);
    setText("studentClassDetail", classValue);
    setText("studentBoard", getStudentValue(["board"], "-"));
    setText("studentGender", getStudentValue(["gender"], "-"));
    setText("studentMobile", getStudentValue(["mobileNumber", "mobile", "phone"], "-"));
    setText("studentEmail", getStudentValue(["emailId", "email"], "-"));
    setText("studentSchool", getStudentValue(["schoolName", "school"], "-"));
    setText("studentSchoolPlace", getStudentValue(["schoolPlace"], "-"));

    const registrationDate = getStudentValue(["registrationDate", "registrationDateTime"], "-");

    setText("studentRegistrationDate", registrationDate);
    setText("registrationDate", registrationDate);

    const loginTime = sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME) || createLoginTime();

    sessionStorage.setItem(SSTC_SESSION_LOGIN_TIME, loginTime);

    setText("studentLoginTime", loginTime);
    setText("loginTime", loginTime);

    const status = String(studentData.status || "Active").trim();

    setText("studentStatus", status);

    const statusElement = document.getElementById("studentStatus");

    if (statusElement) {

        statusElement.classList.remove("status-active", "status-inactive");

        if (status.toLowerCase() === "active") {
            statusElement.classList.add("status-active");
        }
        else {
            statusElement.classList.add("status-inactive");
        }
    }

    const firstLetter = fullName.trim().charAt(0).toUpperCase();

    setText("studentAvatar", firstLetter || "S");
    setText("studentInitial", firstLetter || "S");

    document.title = "SSTC | " + fullName + " - Student Portal";

    renderStudentLibrary();

    try {
        document.dispatchEvent(new CustomEvent("sstcStudentLoaded", { detail: studentData }));
    }
    catch (error) {
        console.warn("SSTC student event warning:", error);
    }
}


/* =========================================================
   CURRENT CLASS LIBRARY (helper)
   ========================================================= */

function getCurrentClassLibrary() {

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    return SSTC_EBOOKS[classNumber] || null;
}


/* =========================================================
   RENDER STUDENT LIBRARY
   ========================================================= */

function renderStudentLibrary() {

    const rawClass = getStudentValue(["className", "Class", "class", "studentClass"], "");
    const classNumber = normalizeStudentClass(rawClass);
    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary || Object.keys(classLibrary).length === 0) {
        renderNoLibrary();
        return;
    }

    renderSubjects(classLibrary);
    updateLibraryCounts(classLibrary);
    refreshRentalUI();

    const subjectNames = Object.keys(classLibrary);

    if (subjectNames.length === 1) {
        selectSubject(subjectNames[0]);
    }

    /* Google Sheet se meri rentals load karo */
    loadRentals();
}


/* =========================================================
   RENDER SUBJECT CAROUSEL
   ========================================================= */

function renderSubjects(classLibrary) {

    const carousel = document.getElementById("subjectCarousel");

    if (!carousel) {
        return;
    }

    carousel.innerHTML = "";

    const subjectNames = Object.keys(classLibrary);

    subjectNames.forEach(function (subjectName) {

        const subject = classLibrary[subjectName];

        /*
         * Card ab <div role="button"> hai (pehle <button> tha),
         * kyunki <button> ke andar <button> (Rent This Subject)
         * HTML me valid nahi hota aur kuch browsers me click
         * properly kaam nahi karta.
         */
        const card = document.createElement("div");
        card.className = "subject-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("data-subject", subjectName);
        card.setAttribute("data-rent", "none");

        card.addEventListener("click", function () {
            selectSubject(subjectName);
        });

        card.addEventListener("keydown", function (event) {

            if (event.target !== card) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectSubject(subjectName);
            }
        });

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "subject-card-image";

        const image = document.createElement("img");
        image.src = subject.image || "Logo.png";
        image.alt = subjectName + " Subject";
        image.draggable = false;
        image.loading = "lazy";

        image.onerror = function () {
            this.onerror = null;
            this.src = "Logo.png";
        };

        imageWrapper.appendChild(image);

        const content = document.createElement("div");
        content.className = "subject-card-content";

        const badge = document.createElement("span");
        badge.className = "subject-card-badge";
        badge.textContent = "E-BOOK";

        const title = document.createElement("h3");
        title.textContent = subjectName;

        const description = document.createElement("p");
        description.textContent = subject.description || "View available chapters";

        const count = document.createElement("span");
        count.className = "subject-chapter-count";
        count.textContent = (Array.isArray(subject.chapters) ? subject.chapters.length : 0) + " Chapters";

        /*
         * RENT THIS SUBJECT BUTTON
         * Card ke click se alag hai (event.stopPropagation).
         * Isse rent window khulti hai jahan 3 / 6 / 12 months
         * ka plan chunte hain.
         */
        const rentToggle = document.createElement("button");
        rentToggle.type = "button";
        rentToggle.className = "subject-rent-toggle";

        updateRentButtonUI(rentToggle, subjectName);

        rentToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            openRentModal(subjectName);
        });

        content.appendChild(badge);
        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(count);
        content.appendChild(rentToggle);

        card.appendChild(imageWrapper);
        card.appendChild(content);

        carousel.appendChild(card);
    });
}


/* =========================================================
   RENT SUBJECT  (3 / 6 / 12 months)
   ---------------------------------------------------------
   - Har subject card par "Rent This Subject" button
   - Plan chuno -> Google Sheet ("Rentals") me request save
   - Status: Pending -> Active -> Expired
   ========================================================= */

function normalizeSubjectKey(name) {

    return String(name || "").trim().toLowerCase();
}

function formatRentDate(iso) {

    if (!iso) {
        return "";
    }

    const date = new Date(iso);

    if (isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getRentalDaysLeft(rental) {

    if (!rental || !rental.expiryDate) {
        return null;
    }

    const expiry = new Date(rental.expiryDate);

    if (isNaN(expiry.getTime())) {
        return null;
    }

    return Math.ceil((expiry.getTime() - Date.now()) / 86400000);
}

function getPlanByMonths(months) {

    for (let i = 0; i < sstcRentPlans.length; i++) {

        if (Number(sstcRentPlans[i].months) === Number(months)) {
            return sstcRentPlans[i];
        }
    }

    return null;
}

function getPlanTag(months) {

    if (Number(months) === 6) {
        return "POPULAR";
    }

    if (Number(months) === 12) {
        return "BEST VALUE";
    }

    return "";
}

/*
 * Ek subject ki current rental:
 * Active > Pending > Expired (barabar ho to sabse nayi).
 * return { status: "none" | "pending" | "active" | "expired", rental }
 */

function getRentalState(subjectName) {

    const key = normalizeSubjectKey(subjectName);
    const priority = { active: 3, pending: 2, expired: 1 };

    let best = null;
    let bestStatus = "none";
    let bestScore = 0;

    sstcRentals.forEach(function (rental) {

        if (normalizeSubjectKey(rental.subject) !== key) {
            return;
        }

        let status = String(rental.status || "").toLowerCase();

        /* Browser ki clock se bhi expiry check */

        if (status === "active" && rental.expiryDate) {

            const expiry = new Date(rental.expiryDate);

            if (!isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()) {
                status = "expired";
            }
        }

        const score = priority[status] || 0;

        if (score > bestScore) {
            best = rental;
            bestStatus = status;
            bestScore = score;
        }
    });

    return { status: bestStatus, rental: best };
}

function canReadSubject(subjectName) {

    if (!SSTC_REQUIRE_RENT_TO_READ) {
        return true;
    }

    return getRentalState(subjectName).status === "active";
}

/*
 * Chapter 1 hamesha free hai (rent ki state kuch bhi ho) -
 * ek "free preview" jisse student khareedne se pehle dekh sake.
 * Baaki chapters rent honi chahiye (canReadSubject).
 */

function canReadChapter(subjectName, chapterIndex) {

    if (Number(chapterIndex) === 0) {
        return true;
    }

    return canReadSubject(subjectName);
}

/* Card ka rent button (text + colour state) */

function updateRentButtonUI(button, subjectName) {

    const state = getRentalState(subjectName);
    const rental = state.rental;

    let text = "🔑 Rent This Subject";
    let title = "Rent this subject for 3, 6 or 12 months";

    if (state.status === "active") {

        const days = getRentalDaysLeft(rental);

        text = (days !== null && days > 0)
            ? "✓ Rented · " + days + (days === 1 ? " day left" : " days left")
            : "✓ Rented";

        title = (rental && rental.expiryDate)
            ? "Rented till " + formatRentDate(rental.expiryDate)
            : "Rented";
    }
    else if (state.status === "pending") {

        text = "⏳ Rent Pending";
        title = "Waiting for SSTC to confirm your payment";
    }
    else if (state.status === "expired") {

        text = "↻ Renew Rental";
        title = "Your rental has expired. Tap to renew.";
    }

    button.textContent = text;
    button.title = title;
    button.setAttribute("data-rent", state.status);
    button.setAttribute("aria-label", subjectName + ": " + text);
}

/* Subject names jinki koi rental hai (library ke order me) */

function getRentedSubjectNames() {

    const library = getCurrentClassLibrary();

    if (!library) {
        return [];
    }

    return Object.keys(library).filter(function (name) {
        return getRentalState(name).status !== "none";
    });
}

/* Saare cards, chips, counts, filter aur chapter locks update */

function refreshRentalUI() {

    const cards = document.querySelectorAll(".subject-card");

    cards.forEach(function (card) {

        const name = card.getAttribute("data-subject");
        const state = getRentalState(name);

        card.setAttribute("data-rent", state.status);

        const button = card.querySelector(".subject-rent-toggle");

        if (button) {
            updateRentButtonUI(button, name);
        }
    });

    renderRentedChips();
    applySubjectFilter();
    updateChapterLocks();
    updateRentedSummary();
    updatePayButton();
}

/* "My Rented Subjects" chips */

function renderRentedChips() {

    const box = document.getElementById("studyChips");
    const names = getRentedSubjectNames();
    const library = getCurrentClassLibrary();

    updateNumber("selectedCount", names.length);
    updateNumber("filterMineCount", names.length);
    updateNumber("filterAllCount", library ? Object.keys(library).length : 0);

    if (!box) {
        return;
    }

    box.innerHTML = "";

    if (names.length === 0) {

        const empty = document.createElement("span");
        empty.className = "study-empty";
        empty.textContent = sstcRentalsLoaded
            ? "You have not rented any subject yet. Tap “Rent This Subject” on a subject card below."
            : "Your rented subjects will appear here.";

        box.appendChild(empty);
        return;
    }

    names.forEach(function (name) {

        const state = getRentalState(name);

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "rented-chip";
        chip.setAttribute("data-rent", state.status);
        chip.title = "View rental details";

        const label = document.createElement("strong");
        label.textContent = name;

        const info = document.createElement("span");

        if (state.status === "active") {
            info.textContent = state.rental && state.rental.expiryDate
                ? "till " + formatRentDate(state.rental.expiryDate)
                : "Active";
        }
        else if (state.status === "pending") {
            info.textContent = "Pending";
        }
        else {
            info.textContent = "Expired";
        }

        chip.appendChild(label);
        chip.appendChild(info);

        chip.addEventListener("click", function () {
            openRentModal(name);
        });

        box.appendChild(chip);
    });
}

/* Summary card: "Rented" = active rental wale subjects ke e-books (chapters) */

function updateRentedSummary() {

    const library = getCurrentClassLibrary();

    let total = 0;

    if (library) {

        Object.keys(library).forEach(function (name) {

            if (getRentalState(name).status === "active") {

                const subject = library[name];

                if (subject && Array.isArray(subject.chapters)) {
                    total += subject.chapters.length;
                }
            }
        });
    }

    updateNumber("rentedBooks", total);
}

/* Chapter list me lock label / banner refresh (rental badalne par) */

function updateChapterLocks() {

    if (!sstcShownSubject) {
        return;
    }

    const library = getCurrentClassLibrary();
    const subject = library ? library[sstcShownSubject] : null;

    if (!subject) {
        return;
    }

    renderChapters(sstcShownSubject, subject);

    if (sstcPdfDocument) {

        const currentChapter = sessionStorage.getItem(SSTC_CURRENT_CHAPTER);

        const item = document.querySelector('.chapter-item[data-chapter="' + currentChapter + '"]');

        if (item) {
            item.classList.add("active");
        }
    }
}

/* Chapters ke upar rent banner (lock / pending / expired / active) */

function createRentBanner(subjectName) {

    if (!SSTC_REQUIRE_RENT_TO_READ) {
        return null;
    }

    const state = getRentalState(subjectName);

    const banner = document.createElement("div");
    banner.className = "chapter-rent-banner";

    const text = document.createElement("span");

    let actionLabel = "";

    if (!sstcRentalsLoaded) {

        banner.setAttribute("data-rent", "loading");

        text.textContent = sstcRentalsError
            ? "⚠ Could not check your rentals."
            : "⏳ Checking your rentals…";
    }
    else if (state.status === "active") {

        const days = getRentalDaysLeft(state.rental);

        banner.setAttribute("data-rent", "active");

        text.textContent = "✓ Rented – valid till " +
            formatRentDate(state.rental && state.rental.expiryDate) +
            ((days !== null && days > 0) ? " (" + days + (days === 1 ? " day" : " days") + " left)" : "");

        actionLabel = "Details";
    }
    else if (state.status === "pending") {

        banner.setAttribute("data-rent", "pending");

        text.textContent = "⏳ Your rent request is pending. Chapter 1 is free to read; the rest unlock after SSTC confirms your payment.";

        actionLabel = "View Request";
    }
    else if (state.status === "expired") {

        banner.setAttribute("data-rent", "expired");

        text.textContent = "⌛ Your rental has expired. Chapter 1 is still free — renew to keep reading the rest.";

        actionLabel = "Renew";
    }
    else {

        banner.setAttribute("data-rent", "none");

        text.textContent = "📖 Chapter 1 is free to read. Rent this subject to unlock the rest.";

        actionLabel = "Rent Now";
    }

    banner.appendChild(text);

    if (actionLabel) {

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = actionLabel;

        button.addEventListener("click", function () {
            openRentModal(subjectName);
        });

        banner.appendChild(button);
    }

    return banner;
}

/* Locked chapter par click */

function handleLockedSubject(subjectName) {

    if (!sstcRentalsLoaded) {

        showSstcToast(
            SSTC_STUDENT_API_URL
                ? "Checking your rentals… please try again in a moment."
                : "Rental server is not connected yet (setup incomplete).",
            "info"
        );

        if (SSTC_STUDENT_API_URL && sstcRentalsError) {
            loadRentals();
        }

        return;
    }

    const state = getRentalState(subjectName);

    showSstcToast(
        state.status === "pending"
            ? "Your rent request for " + subjectName + " is pending."
            : "Rent " + subjectName + " to read this chapter.",
        "info"
    );

    openRentModal(subjectName);
}


/* =========================================================
   FILTER: All Subjects / My Rented
   ========================================================= */

function setSubjectFilter(mode) {

    sstcSubjectFilter = (mode === "mine") ? "mine" : "all";

    applySubjectFilter();

    const carousel = document.getElementById("subjectCarousel");

    if (carousel) {
        carousel.scrollLeft = 0;
    }
}

function applySubjectFilter() {

    const cards = document.querySelectorAll(".subject-card");

    let visible = 0;

    cards.forEach(function (card) {

        const name = card.getAttribute("data-subject");
        const hide = sstcSubjectFilter === "mine" && getRentalState(name).status === "none";

        card.classList.toggle("is-hidden", hide);

        if (!hide) {
            visible++;
        }
    });

    const buttons = document.querySelectorAll(".subject-filter button");

    buttons.forEach(function (button) {

        const active = button.getAttribute("data-filter") === sstcSubjectFilter;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const message = document.getElementById("subjectFilterEmpty");

    if (message) {
        message.hidden = !(sstcSubjectFilter === "mine" && cards.length > 0 && visible === 0);
    }
}

function setupRentalUI() {

    /* Status par click = dobara try (error hone par) */

    const statusElement = document.getElementById("saveStatus");

    if (statusElement) {

        statusElement.addEventListener("click", function () {

            if (statusElement.getAttribute("data-state") === "error") {
                loadRentals();
            }
        });
    }

    /* Esc = rent window band */

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            closeRentModal();
            closePaymentModal();
        }
    });
}


/* =========================================================
   STATUS + TOAST
   ========================================================= */

function setSaveStatus(state, detail) {

    const element = document.getElementById("saveStatus");

    if (!element) {
        return;
    }

    const labels = {
        idle: "",
        loading: "⏳ Loading your rentals…",
        error: "⚠ Could not load rentals – tap to retry",
        nourl: "⚠ Rental server not connected – setup incomplete"
    };

    element.setAttribute("data-state", state);

    let text = labels[state] || "";

    /* Error ka reason screen par bhi dikhao (admin ko debug me help) */

    if (state === "error" && detail) {
        text = "⚠ " + String(detail).substring(0, 110);
    }

    element.textContent = text;
    element.title = detail || "";
}

function showSstcToast(message, type) {

    const old = document.querySelector(".sstc-toast");

    if (old) {
        old.remove();
    }

    const box = document.createElement("div");
    box.className = "sstc-toast sstc-toast-" + (type || "info");
    box.setAttribute("role", "status");
    box.textContent = message;

    document.body.appendChild(box);

    requestAnimationFrame(function () {
        box.classList.add("show");
    });

    setTimeout(function () {

        box.classList.remove("show");

        setTimeout(function () {

            if (box && box.parentNode) {
                box.remove();
            }

        }, 250);

    }, 2600);
}


/* =========================================================
   RENT API (Google Apps Script)
   ========================================================= */

function buildStudentApiUrl(action, params) {

    let url =
        SSTC_STUDENT_API_URL +
        (SSTC_STUDENT_API_URL.indexOf("?") > -1 ? "&" : "?") +
        "action=" + encodeURIComponent(action);

    Object.keys(params).forEach(function (key) {
        url += "&" + key + "=" + encodeURIComponent(params[key]);
    });

    return url;
}

function expectResultType(result, type) {

    /*
     * Purana Apps Script deployment kisi bhi unknown action par
     * {success:true, type:"api"} deta hai. Isliye type bhi check karo.
     */

    if (!result || result.type !== type) {
        throw new Error("Apps Script is running an OLD version. Deploy > Manage deployments > Edit > New version > Deploy.");
    }
}

async function callRentalApi(action, params) {

    if (!SSTC_STUDENT_API_URL) {

        throw new Error("Rental server is not connected yet (setup incomplete). Please contact SSTC administration.");
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const password = getStudentValue(["password"], "");

    if (!studentId || !password) {

        throw new Error("Student ID / password missing in session. Please logout and login again.");
    }

    const payload = Object.assign({ studentId: studentId, password: password }, params || {});

    const response = await fetch(buildStudentApiUrl(action, payload), { cache: "no-store" });

    const text = await response.text();

    let result;

    try {
        result = JSON.parse(text);
    }
    catch (parseError) {
        throw new Error("Server did not return valid data. Check that the Web App access is set to 'Anyone'.");
    }

    if (!result || !result.success) {
        throw new Error((result && result.message) || "Request failed.");
    }

    return result;
}

function applyRentalsResult(result) {

    sstcRentals = Array.isArray(result.rentals) ? result.rentals : [];

    if (Array.isArray(result.plans) && result.plans.length) {
        sstcRentPlans = result.plans;
    }

    if (typeof result.requiresApproval === "boolean") {
        sstcRequiresApproval = result.requiresApproval;
    }
}

/* Page open hone par Google Sheet se meri rentals laao */

async function loadRentals() {

    if (!SSTC_STUDENT_API_URL) {

        sstcRentalsError = "nourl";

        setSaveStatus("nourl", "SSTC_STUDENT_API_URL is empty in student-page.js");

        console.warn("SSTC: ❌ SSTC_STUDENT_API_URL khaali hai - rentals Google Sheet se load/save NAHI ho sakte. student-page.js me Apps Script Web App URL paste karein.");

        refreshRentalUI();

        return;
    }

    setSaveStatus("loading");

    try {

        const result = await callRentalApi("getrentals");

        expectResultType(result, "rentals");

        applyRentalsResult(result);

        sstcRentalsLoaded = true;
        sstcRentalsError = "";

        setSaveStatus("idle");

        console.log("SSTC: ✅ Rentals Google Sheet se load hui:", sstcRentals.length);
    }
    catch (error) {

        sstcRentalsError = error.message || "error";

        setSaveStatus("error", error.message);

        console.error("SSTC rentals load error:", error);
    }

    refreshRentalUI();
}


/* =========================================================
   RENT WINDOW (plan chuno / details)
   ========================================================= */

function getRentEl(id) {

    return document.getElementById(id);
}

function showRentError(message) {

    const box = getRentEl("rentError");

    if (!box) {
        return;
    }

    box.textContent = message || "";
    box.hidden = !message;
}

function openRentModal(subjectName) {

    const modal = getRentEl("rentModal");

    if (!modal) {
        return;
    }

    sstcRentModalSubject = subjectName;
    sstcRentModalMonths = 0;
    sstcRentModalReturnFocus = document.activeElement;

    const state = getRentalState(subjectName);

    if (state.status === "pending" || state.status === "active") {
        renderRentModalDetails(state.rental, state.status, "");
    }
    else {
        renderRentModalPlans(subjectName, state.status === "expired");
    }

    modal.hidden = false;
    document.body.classList.add("sstc-modal-open");

    const focusTarget =
        modal.querySelector(".sstc-rent-plan") ||
        modal.querySelector(".sstc-rent-close");

    if (focusTarget) {
        focusTarget.focus();
    }
}

function closeRentModal() {

    const modal = getRentEl("rentModal");

    if (!modal || modal.hidden) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove("sstc-modal-open");

    if (sstcRentModalReturnFocus && sstcRentModalReturnFocus.focus) {

        try {
            sstcRentModalReturnFocus.focus();
        }
        catch (error) {
            /* ignore */
        }
    }

    sstcRentModalReturnFocus = null;
}

/* --- Plan selection screen --- */

function renderRentModalPlans(subjectName, isRenew) {

    getRentEl("rentModalTitle").textContent = (isRenew ? "Renew " : "Rent ") + subjectName;
    getRentEl("rentModalSubtitle").textContent = "Choose how long you want to rent this subject.";

    const plansBox = getRentEl("rentPlans");
    const details = getRentEl("rentDetails");
    const success = getRentEl("rentSuccess");
    const confirm = getRentEl("rentConfirmBtn");
    const cancelRequest = getRentEl("rentCancelRequestBtn");

    plansBox.hidden = false;
    details.hidden = true;
    success.hidden = true;
    cancelRequest.hidden = true;

    plansBox.innerHTML = "";

    sstcRentPlans.forEach(function (plan) {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "sstc-rent-plan";
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("data-months", String(plan.months));

        const main = document.createElement("span");
        main.className = "sstc-rent-plan-main";

        const label = document.createElement("strong");
        label.textContent = plan.label;

        const perMonth = document.createElement("small");
        perMonth.textContent = "≈ ₹" + Math.round(plan.price / plan.months) + " / month";

        main.appendChild(label);
        main.appendChild(perMonth);

        const price = document.createElement("span");
        price.className = "sstc-rent-plan-price";
        price.textContent = "₹" + plan.price;

        button.appendChild(main);
        button.appendChild(price);

        const tagText = getPlanTag(plan.months);

        if (tagText) {

            const tag = document.createElement("em");
            tag.className = "sstc-rent-plan-tag";
            tag.textContent = tagText;

            button.appendChild(tag);
        }

        button.addEventListener("click", function () {
            selectRentPlan(plan.months);
        });

        plansBox.appendChild(button);
    });

    confirm.hidden = false;
    confirm.disabled = true;
    confirm.textContent = "Choose a plan";

    getRentEl("rentNote").textContent = sstcRequiresApproval
        ? "Your rental starts after SSTC confirms your payment."
        : "Your rental starts immediately.";

    if (!SSTC_STUDENT_API_URL) {

        showRentError("Rental server is not connected yet (setup incomplete). Please contact SSTC administration.");

        confirm.disabled = true;
    }
    else {
        showRentError("");
    }
}

function selectRentPlan(months) {

    const plan = getPlanByMonths(months);

    if (!plan) {
        return;
    }

    sstcRentModalMonths = Number(months);

    const buttons = document.querySelectorAll("#rentPlans .sstc-rent-plan");

    buttons.forEach(function (button) {

        const selected = Number(button.getAttribute("data-months")) === sstcRentModalMonths;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    const confirm = getRentEl("rentConfirmBtn");

    confirm.textContent = "Confirm Rent · ₹" + plan.price;
    confirm.disabled = !SSTC_STUDENT_API_URL;

    getRentEl("rentNote").textContent =
        plan.label + " for ₹" + plan.price + ". " +
        (sstcRequiresApproval
            ? "Your rental starts after SSTC confirms your payment. " + SSTC_PAYMENT_HELP
            : "Your rental starts immediately.");
}

/* --- Details screen (pending / active / just requested) --- */

function renderRentModalDetails(rental, status, successText) {

    const plansBox = getRentEl("rentPlans");
    const details = getRentEl("rentDetails");
    const success = getRentEl("rentSuccess");
    const confirm = getRentEl("rentConfirmBtn");
    const cancelRequest = getRentEl("rentCancelRequestBtn");

    plansBox.hidden = true;
    confirm.hidden = true;
    details.hidden = false;

    cancelRequest.hidden = status !== "pending";

    showRentError("");

    success.textContent = successText || "";
    success.hidden = !successText;

    details.innerHTML = "";

    if (!rental) {
        return;
    }

    getRentEl("rentModalTitle").textContent = rental.subject;

    const statusLabels = {
        active: "✓ Active",
        pending: "⏳ Pending approval",
        expired: "Expired"
    };

    getRentEl("rentModalSubtitle").textContent = statusLabels[status] || "";

    const rows = [
        ["Subject", rental.subject],
        ["Plan", rental.plan + " · ₹" + rental.price],
        ["Requested on", formatRentDate(rental.requestedOn)]
    ];

    if (rental.startDate) {
        rows.push(["Started on", formatRentDate(rental.startDate)]);
    }

    if (rental.expiryDate) {

        const days = getRentalDaysLeft(rental);

        rows.push([
            status === "expired" ? "Expired on" : "Valid till",
            formatRentDate(rental.expiryDate) +
                ((status === "active" && days !== null && days > 0)
                    ? " (" + days + (days === 1 ? " day" : " days") + " left)"
                    : "")
        ]);
    }

    rows.forEach(function (pair) {

        const row = document.createElement("div");
        row.className = "sstc-rent-detail-row";

        const label = document.createElement("span");
        label.textContent = pair[0];

        const value = document.createElement("strong");
        value.textContent = pair[1] || "-";

        row.appendChild(label);
        row.appendChild(value);

        details.appendChild(row);
    });

    getRentEl("rentNote").textContent =
        status === "pending"
            ? SSTC_PAYMENT_HELP
            : (status === "active"
                ? "You can renew this subject after it expires."
                : "");
}

/* --- Confirm rent --- */

async function confirmRent() {

    const subjectName = sstcRentModalSubject;
    const months = sstcRentModalMonths;

    if (!subjectName || !months || sstcRentBusy) {
        return;
    }

    sstcRentBusy = true;

    const confirm = getRentEl("rentConfirmBtn");
    const previousText = confirm.textContent;

    confirm.disabled = true;
    confirm.textContent = "Sending…";

    showRentError("");

    try {

        const result = await callRentalApi("rentsubject", { subject: subjectName, months: months });

        expectResultType(result, "rent_requested");

        applyRentalsResult(result);

        sstcRentalsLoaded = true;
        sstcRentalsError = "";

        setSaveStatus("idle");

        refreshRentalUI();

        const state = getRentalState(subjectName);

        renderRentModalDetails(
            state.rental,
            state.status,
            state.status === "active"
                ? "✅ Subject rented successfully!"
                : "✅ Rent request sent! " + SSTC_PAYMENT_HELP
        );

        console.log("SSTC: ✅ Rent Google Sheet me save hua:", result.rental);
    }
    catch (error) {

        console.error("SSTC rent error:", error);

        showRentError(error.message);

        confirm.textContent = previousText;
        confirm.disabled = false;
    }
    finally {

        sstcRentBusy = false;
    }
}

/* --- Cancel a pending request --- */

async function cancelRentRequest() {

    const subjectName = sstcRentModalSubject;
    const state = getRentalState(subjectName);

    if (!state.rental || state.status !== "pending" || sstcRentBusy) {
        return;
    }

    if (!window.confirm("Cancel your rent request for " + subjectName + "?")) {
        return;
    }

    sstcRentBusy = true;

    const button = getRentEl("rentCancelRequestBtn");

    button.disabled = true;

    showRentError("");

    try {

        const result = await callRentalApi("cancelrental", { rentalId: state.rental.rentalId });

        expectResultType(result, "rental_cancelled");

        applyRentalsResult(result);

        refreshRentalUI();

        closeRentModal();

        showSstcToast("Rent request for " + subjectName + " cancelled.", "info");
    }
    catch (error) {

        console.error("SSTC cancel rent error:", error);

        showRentError(error.message);
    }
    finally {

        sstcRentBusy = false;

        button.disabled = false;
    }
}


/* =========================================================
   PAY NOW  (pending rentals ka total + UPI payment)
   ---------------------------------------------------------
   "My Rented Subjects" panel ka "Pay Now" button:
   - Saare Pending rentals list karta hai (checkbox se
     student chun sakta hai kis-kis ka abhi payment karna hai)
   - Chuni hui rentals ka total (₹) calculate karta hai
   - UPI ID, Student ID aur payment note dikhata hai, saath
     me "Pay via UPI App" link aur QR code
   - "I Have Paid" par PaymentClaimedOn Google Sheet me save
     hota hai aur admin ko email notification jaati hai (ye
     kaunse Student ID ne kaunse Subject/Plan ka payment
     claim kiya hai, saath me Total Amount)
   ========================================================= */

function getPendingRentalsList() {

    return sstcRentals.filter(function (rental) {
        return String(rental.status || "").toLowerCase() === "pending";
    });
}

/* "Pay Now" button dikhana / chhupana + total dikhana */

function updatePayButton() {

    const button = document.getElementById("payNowBtn");

    if (!button) {
        return;
    }

    const pending = getPendingRentalsList();

    if (pending.length === 0) {

        button.hidden = true;
        return;
    }

    const total = pending.reduce(function (sum, rental) {
        return sum + (Number(rental.price) || 0);
    }, 0);

    button.hidden = false;

    button.textContent =
        "💳 Pay Now · ₹" + total +
        " (" + pending.length + (pending.length === 1 ? " subject" : " subjects") + ")";
}

function buildUpiLink(amount, note) {

    const params = [
        "pa=" + encodeURIComponent(SSTC_UPI_ID),
        "pn=" + encodeURIComponent(SSTC_UPI_PAYEE_NAME),
        "am=" + encodeURIComponent(amount),
        "cu=INR",
        "tn=" + encodeURIComponent(note)
    ];

    return "upi://pay?" + params.join("&");
}

function openPaymentModal() {

    const modal = getRentEl("paymentModal");

    if (!modal) {
        return;
    }

    const pending = getPendingRentalsList();

    if (pending.length === 0) {

        showSstcToast("No pending rent request to pay for.", "info");
        return;
    }

    /* Default: saare pending rentals chune hue */

    sstcPaymentSelected = new Set(
        pending.map(function (rental) {
            return rental.rentalId;
        })
    );

    sstcPaymentReturnFocus = document.activeElement;

    renderPaymentList();
    updatePaymentTotal();

    modal.hidden = false;
    document.body.classList.add("sstc-modal-open");

    const focusTarget = modal.querySelector(".sstc-pay-close");

    if (focusTarget) {
        focusTarget.focus();
    }
}

function closePaymentModal() {

    const modal = getRentEl("paymentModal");

    if (!modal || modal.hidden) {
        return;
    }

    modal.hidden = true;
    document.body.classList.remove("sstc-modal-open");

    if (sstcPaymentReturnFocus && sstcPaymentReturnFocus.focus) {

        try {
            sstcPaymentReturnFocus.focus();
        }
        catch (error) {
            /* ignore */
        }
    }

    sstcPaymentReturnFocus = null;
}

/* Har pending rental ki checkbox row */

function renderPaymentList() {

    const box = getRentEl("paymentList");

    if (!box) {
        return;
    }

    box.innerHTML = "";

    getPendingRentalsList().forEach(function (rental) {

        const row = document.createElement("label");
        row.className = "sstc-pay-row";

        const left = document.createElement("span");
        left.className = "sstc-pay-row-main";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = sstcPaymentSelected.has(rental.rentalId);
        checkbox.setAttribute("data-rental-id", rental.rentalId);

        checkbox.addEventListener("change", function () {

            if (checkbox.checked) {
                sstcPaymentSelected.add(rental.rentalId);
            }
            else {
                sstcPaymentSelected.delete(rental.rentalId);
            }

            updatePaymentTotal();
        });

        const text = document.createElement("span");
        text.className = "sstc-pay-row-text";

        const name = document.createElement("strong");
        name.textContent = rental.subject;

        const plan = document.createElement("small");
        plan.textContent = rental.plan;

        text.appendChild(name);
        text.appendChild(plan);

        left.appendChild(checkbox);
        left.appendChild(text);

        const price = document.createElement("span");
        price.className = "sstc-pay-row-price";
        price.textContent = "₹" + (Number(rental.price) || 0);

        row.appendChild(left);
        row.appendChild(price);

        box.appendChild(row);
    });
}

/* Checkbox badalne par total, UPI link, QR sab refresh */

function updatePaymentTotal() {

    const chosen = getPendingRentalsList().filter(function (rental) {
        return sstcPaymentSelected.has(rental.rentalId);
    });

    const total = chosen.reduce(function (sum, rental) {
        return sum + (Number(rental.price) || 0);
    }, 0);

    getRentEl("paymentTotal").textContent = "₹" + total;

    const confirmButton = getRentEl("payConfirmBtn");

    if (confirmButton) {
        confirmButton.disabled = chosen.length === 0;
    }

    const upiSection = getRentEl("paySection");
    const upiEmpty = getRentEl("payUpiEmpty");

    if (!SSTC_UPI_ID) {

        if (upiSection) {
            upiSection.hidden = true;
        }

        if (upiEmpty) {
            upiEmpty.hidden = false;
        }

        return;
    }

    if (upiEmpty) {
        upiEmpty.hidden = true;
    }

    if (upiSection) {
        upiSection.hidden = total === 0;
    }

    if (total === 0) {
        return;
    }

    const studentId = getStudentValue(["studentId", "id"], "");
    const studentName = getStudentValue(["fullName", "name"], "");

    const subjectNames = chosen
        .map(function (rental) {
            return rental.subject;
        })
        .join("+");

    const note = "SSTC " + studentId + " " + subjectNames;

    setText("payUpiId", SSTC_UPI_ID);
    setText("payStudentId", studentId + (studentName ? " · " + studentName : ""));
    setText("payNote", note);

    const link = getRentEl("payUpiLink");

    if (link) {
        link.href = buildUpiLink(total, note);
    }

    if (SSTC_SHOW_UPI_QR) {

        const qr = getRentEl("payQr");

        if (qr) {

            qr.hidden = false;
            qr.src =
                "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
                encodeURIComponent(buildUpiLink(total, note));
        }
    }
}

function copyUpiId() {

    if (!SSTC_UPI_ID) {
        return;
    }

    const finish = function (ok) {

        showSstcToast(
            ok ? "UPI ID copied!" : "Could not copy. UPI ID: " + SSTC_UPI_ID,
            ok ? "success" : "info"
        );
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {

        navigator.clipboard
            .writeText(SSTC_UPI_ID)
            .then(function () {
                finish(true);
            })
            .catch(function () {
                finish(false);
            });
    }
    else {
        finish(false);
    }
}

/*
 * "I Have Paid"
 * ---------------------------------------------------------
 * - Google Apps Script ko "claimpayment" action call karta
 *   hai (rentalIds ek comma-separated list ke roop me)
 * - Server Rentals sheet me PaymentClaimedOn column fill
 *   karta hai aur admin ko email bhejta hai (Student ID,
 *   Name, Subjects, Plans, Total Amount)
 * - Koi automatic payment verify nahi hota - admin manually
 *   Sheet me Status ko "Active" karega
 */

async function markPaymentSent() {

    const chosenIds = Array.from(sstcPaymentSelected);

    if (chosenIds.length === 0) {
        showSstcToast("Please select at least one subject.", "info");
        return;
    }

    const button = getRentEl("payConfirmBtn");
    const previousText = button ? button.textContent : "";

    if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
    }

    try {

        const result = await callRentalApi("claimpayment", {
            rentalIds: chosenIds.join(",")
        });

        expectResultType(result, "payment_claimed");

        applyRentalsResult(result);

        refreshRentalUI();

        closePaymentModal();

        showSstcToast(
            "✅ Payment claim sent! SSTC will confirm shortly and activate your subject.",
            "success"
        );

        console.log("SSTC: ✅ Payment claim saved + admin email sent:", result);
    }
    catch (error) {

        console.error("SSTC claim payment error:", error);

        showSstcToast("Could not send claim: " + error.message, "info");
    }
    finally {

        if (button) {
            button.disabled = false;
            button.textContent = previousText || "✅ I Have Paid";
        }
    }
}


/* =========================================================
   SELECT SUBJECT
   ========================================================= */

function selectSubject(subjectName) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    sessionStorage.setItem(SSTC_CURRENT_BOOK, subjectName);

    sstcShownSubject = subjectName;

    setText("selectedSubjectTitle", subjectName);
    setText("selectedSubjectDescription", subject.description || "Select a chapter to start reading.");

    const cards = document.querySelectorAll(".subject-card");

    cards.forEach(function (card) {
        card.classList.remove("active");

        if (card.getAttribute("data-subject") === subjectName) {
            card.classList.add("active");
        }
    });

    renderChapters(subjectName, subject);

    const chapterSection = document.getElementById("chapterSection");

    if (chapterSection) {
        chapterSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}


/* =========================================================
   RENDER CHAPTER LIST
   ========================================================= */

function renderChapters(subjectName, subject) {

    const grid = document.getElementById("chapterGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML = "";

    const rentBanner = createRentBanner(subjectName);

    if (rentBanner) {
        grid.appendChild(rentBanner);
    }

    if (!subject.chapters || subject.chapters.length === 0) {

        const empty = document.createElement("div");
        empty.className = "chapter-empty";

        empty.innerHTML = `
            <div>📚</div>
            <h3>No Chapters Available</h3>
            <p>Chapters for this subject are not available yet.</p>
        `;

        grid.appendChild(empty);
        return;
    }

    subject.chapters.forEach(function (chapter, index) {

        const item = document.createElement("button");
        item.type = "button";
        item.className = "chapter-item";
        item.setAttribute("data-chapter", String(chapter.number));

        item.addEventListener("click", function () {
            openChapter(subjectName, index);
        });

        const number = document.createElement("div");
        number.className = "chapter-number";
        number.textContent = String(chapter.number);

        const icon = document.createElement("div");
        icon.className = "chapter-icon";
        icon.textContent = "📖";

        const info = document.createElement("div");
        info.className = "chapter-info";

        const title = document.createElement("h3");
        title.textContent = chapter.title;

        const subtitle = document.createElement("p");
        subtitle.textContent = "Chapter " + chapter.number + " • E-Book";

        info.appendChild(title);
        info.appendChild(subtitle);

        if (index === 0) {

            const freeBadge = document.createElement("span");
            freeBadge.className = "chapter-free-badge";
            freeBadge.textContent = "FREE PREVIEW";

            info.appendChild(freeBadge);
        }

        const open = document.createElement("span");
        open.className = "chapter-open";

        if (canReadChapter(subjectName, index)) {
            open.textContent = "Open PDF →";
        }
        else {
            open.classList.add("locked");
            open.textContent = "🔒 Rent to read";
        }

        item.appendChild(number);
        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(open);

        grid.appendChild(item);
    });
}


/* =========================================================
   SSTC PDF.JS COMPLETE VIEWER
   Mobile + Tablet + Desktop
   ========================================================= */

let sstcPdfDocument = null;
let sstcPdfUrl = "";
let sstcPdfPages = 0;
let sstcPdfCurrentPage = 1;
let sstcPdfScale = 1;
let sstcPdfJsLoading = null;
let sstcPdfBaseWidth = 0;


/* =========================================================
   LOAD PDF.JS
   ========================================================= */

const SSTC_PDFJS_VERSION = "4.10.38";
const SSTC_PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + SSTC_PDFJS_VERSION + "/pdf.worker.min.mjs";

function loadSstcPdfJs() {

    if (window.pdfjsLib && window.pdfjsLib.getDocument) {

        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = SSTC_PDFJS_WORKER_SRC;
        }

        return Promise.resolve();
    }

    if (sstcPdfJsLoading) {
        return sstcPdfJsLoading;
    }

    sstcPdfJsLoading = new Promise(function (resolve, reject) {

        const script = document.createElement("script");

        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + SSTC_PDFJS_VERSION + "/pdf.min.mjs";
        script.type = "module";

        script.onload = function () {

            let tries = 0;

            const timer = setInterval(function () {

                tries++;

                if (window.pdfjsLib && window.pdfjsLib.getDocument) {

                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = SSTC_PDFJS_WORKER_SRC;

                    clearInterval(timer);
                    resolve();
                    return;
                }

                if (tries > 100) {
                    clearInterval(timer);
                    reject(new Error("PDF.js could not be initialized."));
                }

            }, 100);
        };

        script.onerror = function () {
            reject(new Error("PDF.js library could not be loaded."));
        };

        document.head.appendChild(script);
    });

    return sstcPdfJsLoading;
}


/* =========================================================
   CREATE PDF.JS VIEWER
   ========================================================= */

function createSstcPdfJsViewer() {

    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        return null;
    }

    let viewer = document.getElementById("sstcPdfJsViewer");

    if (viewer) {
        return viewer;
    }

    viewer = document.createElement("div");
    viewer.id = "sstcPdfJsViewer";

    viewer.style.cssText = [
        "position:relative",
        "width:100%",
        "height:100%",
        "display:flex",
        "flex-direction:column",
        "background:#525659",
        "box-sizing:border-box",
        "overflow:hidden"
    ].join(";");

    const pages = document.createElement("div");
    pages.id = "sstcPdfJsPages";

    pages.style.cssText = [
        "position:relative",
        "flex:1 1 auto",
        "min-height:0",
        "width:100%",
        "overflow:auto",
        "box-sizing:border-box",
        "padding:14px 10px 40px",
        "overscroll-behavior:contain",
        "-webkit-overflow-scrolling:touch"
    ].join(";");

    viewer.appendChild(pages);

    pdfViewer.appendChild(viewer);

    return viewer;
}


/* =========================================================
   GET PAGES CONTAINER
   ========================================================= */

function getSstcPdfPagesContainer() {
    return document.getElementById("sstcPdfJsPages");
}


/* =========================================================
   PDF.JS VIEWER CSS
   ========================================================= */

function injectSstcPdfJsStyles() {

    if (document.getElementById("sstcPdfJsStyles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "sstcPdfJsStyles";

    style.textContent = `

        #sstcPdfJsPages {
            scrollbar-width: thin;
        }

        #sstcPdfJsPages .sstc-pdf-page {
            position:relative;
            display:block;
            margin:0 auto 18px;
            background:#ffffff;
            box-shadow:0 4px 18px rgba(0,0,0,.35);
            max-width:none;
        }

        #sstcPdfJsPages canvas {
            display:block;
            width:100%;
            height:auto;
        }

        #sstcPdfJsViewer .sstc-pdf-loading {
            min-height:180px;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:10px;
            color:#ffffff;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
            box-sizing:border-box;
        }

        #sstcPdfJsViewer .sstc-pdf-error {
            min-height:220px;
            display:flex;
            align-items:center;
            justify-content:center;
            flex-direction:column;
            gap:12px;
            color:#ffffff;
            font-family:Arial,sans-serif;
            text-align:center;
            padding:30px;
            box-sizing:border-box;
        }

        #sstcPdfJsViewer .sstc-pdf-error strong {
            font-size:18px;
        }

        #sstcPdfJsViewer .sstc-pdf-error span {
            font-size:13px;
            opacity:.85;
        }

        #sstcPdfJsToolbar {
            position:relative;
            flex:0 0 auto;
            z-index:2;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:7px;
            flex-wrap:wrap;
            width:100%;
            box-sizing:border-box;
            margin:0;
            padding:8px 9px;
            background:rgba(15,23,42,.96);
            box-shadow:0 2px 10px rgba(0,0,0,.3);
        }

        #sstcPdfJsToolbar button {
            border:0;
            border-radius:7px;
            padding:7px 10px;
            background:#ffffff;
            color:#111827;
            cursor:pointer;
            font-size:13px;
            font-weight:600;
            min-width:38px;
        }

        #sstcPdfJsToolbar button:disabled {
            opacity:.4;
            cursor:not-allowed;
        }

        #sstcPdfJsToolbar .sstc-pdf-page-info {
            color:#ffffff;
            font-size:13px;
            font-weight:600;
            min-width:78px;
            text-align:center;
        }

        @media (max-width:600px) {

            #sstcPdfJsPages {
                padding:10px 5px 25px;
            }

            #sstcPdfJsToolbar {
                gap:4px;
                padding:6px;
            }

            #sstcPdfJsToolbar button {
                padding:6px 8px;
                font-size:12px;
            }

            #sstcPdfJsPages .sstc-pdf-page {
                margin-bottom:12px;
            }
        }

        #pdfViewer.sstc-pdf-active #pdfFrame {
            display:none !important;
        }

    `;

    document.head.appendChild(style);
}


/* =========================================================
   CREATE TOOLBAR
   ========================================================= */

function createSstcPdfToolbar(viewer) {

    let toolbar = document.getElementById("sstcPdfJsToolbar");

    if (toolbar) {
        return toolbar;
    }

    toolbar = document.createElement("div");
    toolbar.id = "sstcPdfJsToolbar";

    toolbar.innerHTML = `

        <button type="button" id="sstcPdfPrev" title="Previous PDF page">◀</button>

        <span class="sstc-pdf-page-info" id="sstcPdfPageInfo">1 / 1</span>

        <button type="button" id="sstcPdfNext" title="Next PDF page">▶</button>

        <button type="button" id="sstcPdfZoomOut" title="Zoom out">−</button>

        <span class="sstc-pdf-page-info" id="sstcPdfZoomInfo">100%</span>

        <button type="button" id="sstcPdfZoomIn" title="Zoom in">+</button>

        <button type="button" id="sstcPdfFit" title="Fit width">Fit</button>

    `;

    viewer.prepend(toolbar);

    const prev = document.getElementById("sstcPdfPrev");
    const next = document.getElementById("sstcPdfNext");
    const zoomOut = document.getElementById("sstcPdfZoomOut");
    const zoomIn = document.getElementById("sstcPdfZoomIn");
    const fit = document.getElementById("sstcPdfFit");

    if (prev) {
        prev.onclick = function () {
            sstcPdfGoToPage(sstcPdfCurrentPage - 1);
        };
    }

    if (next) {
        next.onclick = function () {
            sstcPdfGoToPage(sstcPdfCurrentPage + 1);
        };
    }

    if (zoomOut) {
        zoomOut.onclick = function () {
            sstcPdfScale = Math.max(0.5, sstcPdfScale - 0.1);
            renderSstcPdfDocument();
        };
    }

    if (zoomIn) {
        zoomIn.onclick = function () {
            sstcPdfScale = Math.min(2.5, sstcPdfScale + 0.1);
            renderSstcPdfDocument();
        };
    }

    if (fit) {
        fit.onclick = function () {
            fitSstcPdfWidth();
        };
    }

    return toolbar;
}


/* =========================================================
   UPDATE TOOLBAR
   ========================================================= */

function updateSstcPdfToolbar() {

    const info = document.getElementById("sstcPdfPageInfo");
    const zoom = document.getElementById("sstcPdfZoomInfo");
    const prev = document.getElementById("sstcPdfPrev");
    const next = document.getElementById("sstcPdfNext");

    if (info) {
        info.textContent = sstcPdfCurrentPage + " / " + sstcPdfPages;
    }

    if (zoom) {
        zoom.textContent = Math.round(sstcPdfScale * 100) + "%";
    }

    if (prev) {
        prev.disabled = sstcPdfCurrentPage <= 1;
    }

    if (next) {
        next.disabled = sstcPdfCurrentPage >= sstcPdfPages;
    }
}


/* =========================================================
   OPEN PDF.JS
   ========================================================= */

async function openSstcPdfJs(pdfUrl) {

    const empty = document.getElementById("viewerEmpty");
    const frame = document.getElementById("pdfFrame");
    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        console.error("SSTC PDF Viewer not found.");
        return;
    }

    injectSstcPdfJsStyles();

    const viewer = createSstcPdfJsViewer();

    if (!viewer) {
        return;
    }

    if (frame) {
        frame.src = "about:blank";
        frame.style.display = "none";
    }

    pdfViewer.classList.add("sstc-pdf-active");

    viewer.innerHTML = `
        <div class="sstc-pdf-loading">
            <div style="font-size:32px;">📖</div>
            <strong>Opening PDF...</strong>
            <span>Please wait</span>
        </div>
    `;

    try {

        await loadSstcPdfJs();

        const loadingTask = window.pdfjsLib.getDocument({
            url: pdfUrl,
            disableAutoFetch: false,
            disableStream: false
        });

        sstcPdfDocument = await loadingTask.promise;
        sstcPdfUrl = pdfUrl;
        sstcPdfPages = sstcPdfDocument.numPages;
        sstcPdfCurrentPage = 1;

        const firstPage = await sstcPdfDocument.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        sstcPdfBaseWidth = baseViewport.width;

        sstcPdfScale = getSstcPdfInitialScale();

        viewer.innerHTML = "";

        createSstcPdfToolbar(viewer);

        const pages = document.createElement("div");
        pages.id = "sstcPdfJsPages";
        pages.style.cssText = [
            "position:relative",
            "flex:1 1 auto",
            "min-height:0",
            "width:100%",
            "overflow:auto",
            "box-sizing:border-box",
            "padding:14px 10px 40px",
            "overscroll-behavior:contain",
            "-webkit-overflow-scrolling:touch"
        ].join(";");
        viewer.appendChild(pages);

        await renderSstcPdfDocument();

        updateSstcPdfToolbar();

        if (empty) {
            empty.style.display = "none";
        }
    }
    catch (error) {

        console.error("SSTC PDF.js error:", error);

        viewer.innerHTML = `
            <div class="sstc-pdf-error">
                <strong>PDF could not be opened</strong>
                <span>${escapeHtml((error && error.message) || "Please check the PDF file path.")}</span>
            </div>
        `;

        if (empty) {
            empty.style.display = "none";
        }
    }
}


/* =========================================================
   INITIAL SCALE
   ========================================================= */

function getSstcPdfInitialScale() {

    const pdfViewer = document.getElementById("pdfViewer");

    if (!pdfViewer) {
        return 1;
    }

    const width = pdfViewer.clientWidth;

    if (!width || !sstcPdfBaseWidth) {
        return 1;
    }

    const available = Math.max(280, width - 30);

    return Math.max(0.5, Math.min(1.5, available / sstcPdfBaseWidth));
}


/* =========================================================
   RENDER ALL PDF PAGES
   ========================================================= */

async function renderSstcPdfDocument() {

    if (!sstcPdfDocument) {
        return;
    }

    const pages = getSstcPdfPagesContainer();

    if (!pages) {
        return;
    }

    pages.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= sstcPdfPages; pageNumber++) {

        try {

            const page = await sstcPdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: sstcPdfScale });

            const pageBox = document.createElement("div");
            pageBox.className = "sstc-pdf-page";
            pageBox.dataset.page = String(pageNumber);
            pageBox.style.width = viewport.width + "px";
            pageBox.style.height = viewport.height + "px";

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(viewport.width * deviceScale);
            canvas.height = Math.floor(viewport.height * deviceScale);
            canvas.style.width = viewport.width + "px";
            canvas.style.height = viewport.height + "px";

            context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, viewport.width, viewport.height);

            pageBox.appendChild(canvas);
            pages.appendChild(pageBox);

            await page.render({ canvasContext: context, viewport: viewport }).promise;

        }
        catch (error) {
            console.error("SSTC PDF page render error:", pageNumber, error);
        }
    }

    updateSstcPdfToolbar();
}


/* =========================================================
   GO TO PDF PAGE
   ========================================================= */

function sstcPdfGoToPage(pageNumber) {

    if (!sstcPdfDocument) {
        return;
    }

    pageNumber = Math.max(1, Math.min(sstcPdfPages, pageNumber));
    sstcPdfCurrentPage = pageNumber;

    const pages = getSstcPdfPagesContainer();

    if (!pages) {
        return;
    }

    const pageBox = pages.querySelector('.sstc-pdf-page[data-page="' + pageNumber + '"]');

    if (pageBox) {
        pageBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    updateSstcPdfToolbar();
}


/* =========================================================
   FIT PDF WIDTH
   ========================================================= */

function fitSstcPdfWidth() {

    const pages = getSstcPdfPagesContainer();

    if (!pages || !sstcPdfBaseWidth) {
        return;
    }

    const width = pages.clientWidth;
    const available = Math.max(280, width - 30);

    sstcPdfScale = Math.max(0.5, Math.min(2.5, available / sstcPdfBaseWidth));

    renderSstcPdfDocument();
}


/* =========================================================
   CLEAN PDF.JS VIEWER
   ========================================================= */

function destroySstcPdfJsViewer() {

    sstcPdfDocument = null;
    sstcPdfUrl = "";
    sstcPdfPages = 0;
    sstcPdfCurrentPage = 1;
    sstcPdfBaseWidth = 0;

    const viewer = document.getElementById("sstcPdfJsViewer");

    if (viewer) {
        viewer.innerHTML = "";
    }

    const pdfViewer = document.getElementById("pdfViewer");

    if (pdfViewer) {
        pdfViewer.classList.remove("sstc-pdf-active");
    }
}


/* =========================================================
   OPEN CHAPTER / PDF
   ========================================================= */

function openChapter(subjectName, chapterIndex) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    const chapter = subject.chapters[chapterIndex];

    if (!chapter) {
        return;
    }

    /* Chapter 1 free hai, baaki rent kiye bina nahi khulenge */
    if (!canReadChapter(subjectName, chapterIndex)) {
        handleLockedSubject(subjectName);
        return;
    }

    if (!chapter.pdf) {
        showSecurityMessage("This chapter PDF is not available yet.");
        return;
    }

    sessionStorage.setItem(SSTC_CURRENT_BOOK, subjectName);
    sessionStorage.setItem(SSTC_CURRENT_CHAPTER, String(chapter.number));
    sessionStorage.setItem(SSTC_CURRENT_PAGE, "1");

    const chapterItems = document.querySelectorAll(".chapter-item");

    chapterItems.forEach(function (item) {
        item.classList.remove("active");
    });

    const selectedChapter = document.querySelector('.chapter-item[data-chapter="' + chapter.number + '"]');

    if (selectedChapter) {
        selectedChapter.classList.add("active");
    }

    setText("currentBookTitle", chapter.title);
    setText("currentBookStatus", subjectName + " • Chapter " + chapter.number);
    setText("currentChapterNumber", chapter.number);

    const frame = document.getElementById("pdfFrame");
    const empty = document.getElementById("viewerEmpty");

    if (!frame) {
        console.error("SSTC PDF ERROR: #pdfFrame not found.");
        showSecurityMessage("PDF viewer is not available.");
        return;
    }

    const pdfUrl = getPdfUrl(chapter.pdf);

    console.log("SSTC PDF:", pdfUrl);

    if (empty) {

        empty.style.display = "flex";

        empty.innerHTML = `
            <div class="empty-icon">📖</div>
            <h3>Opening Chapter...</h3>
            <p>${escapeHtml(chapter.title)}</p>
        `;
    }

    destroySstcPdfJsViewer();
    openSstcPdfJs(pdfUrl);

    const readerSection = document.getElementById("readerSection");

    if (readerSection) {

        setTimeout(function () {
            readerSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
    }
}


/* =========================================================
   SUBJECT CAROUSEL SCROLL
   ========================================================= */

function scrollSubjects(direction) {

    const carousel = document.getElementById("subjectCarousel");

    if (!carousel) {
        return;
    }

    const amount = carousel.clientWidth;

    carousel.scrollBy({ left: direction * amount, behavior: "smooth" });
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NO LIBRARY
   ========================================================= */

function renderNoLibrary() {

    const carousel = document.getElementById("subjectCarousel");
    const grid = document.getElementById("chapterGrid");

    if (carousel) {
        carousel.innerHTML = `
            <div class="library-empty">
                <div>📚</div>
                <h3>No E-Books Available</h3>
                <p>Your class library is not available yet.</p>
            </div>
        `;
    }

    if (grid) {
        grid.innerHTML = `
            <div class="chapter-empty">
                <div>📚</div>
                <h3>Select a Subject</h3>
                <p>Available chapters will appear here.</p>
            </div>
        `;
    }

    setText("selectedSubjectTitle", "No Subject Available");
    setText("selectedSubjectDescription", "E-books for your class are not available yet.");

    updateNumber("ebookCount", 0);
    updateNumber("totalBooks", 0);
    updateNumber("totalSubjects", 0);
    updateNumber("rentedBooks", 0);
    updateNumber("purchasedBooks", 0);
}


/* =========================================================
   UPDATE LIBRARY COUNTS
   ========================================================= */

function updateLibraryCounts(classLibrary) {

    const subjectNames = Object.keys(classLibrary);

    let totalChapters = 0;

    subjectNames.forEach(function (subjectName) {

        const subject = classLibrary[subjectName];

        if (subject && Array.isArray(subject.chapters)) {
            totalChapters += subject.chapters.length;
        }
    });

    updateNumber("ebookCount", totalChapters);
    updateNumber("totalBooks", totalChapters);
    updateNumber("totalSubjects", subjectNames.length);
    updateNumber("rentedBooks", 0);
    updateNumber("purchasedBooks", 0);
}


/* =========================================================
   UPDATE NUMBER
   ========================================================= */

function updateNumber(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = String(value);
}


/* =========================================================
   GET STUDENT VALUE
   ========================================================= */

function getStudentValue(keys, fallback) {

    if (!studentData || !Array.isArray(keys)) {
        return fallback;
    }

    for (let i = 0; i < keys.length; i++) {

        const key = keys[i];

        if (
            studentData[key] !== undefined &&
            studentData[key] !== null &&
            String(studentData[key]).trim() !== ""
        ) {
            return String(studentData[key]).trim();
        }
    }

    return fallback;
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    if (value === undefined || value === null || String(value).trim() === "") {
        element.textContent = "-";
    }
    else {
        element.textContent = String(value);
    }
}


/* =========================================================
   CLEAR SESSION
   ========================================================= */

function clearStudentSession() {

    try {
        sessionStorage.removeItem(SSTC_SESSION_LOGIN);
        sessionStorage.removeItem(SSTC_SESSION_DATA);
        sessionStorage.removeItem(SSTC_SESSION_LOGIN_TIME);
        sessionStorage.removeItem(SSTC_CURRENT_BOOK);
        sessionStorage.removeItem(SSTC_CURRENT_CHAPTER);
        sessionStorage.removeItem(SSTC_CURRENT_PAGE);
    }
    catch (error) {
        console.error("SSTC session clear error:", error);
    }

    studentData = null;
}


/* =========================================================
   REDIRECT
   ========================================================= */

function redirectToAccessPage() {

    if (sstcRedirecting) {
        return;
    }

    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    if (currentPage === "sstc-access.html") {
        return;
    }

    sstcRedirecting = true;

    window.location.replace("sstc-access.html");
}


/* =========================================================
   LOGOUT
   ========================================================= */

function studentLogout(event) {

    if (event) {
        event.preventDefault();
    }

    if (sstcLoggingOut) {
        return false;
    }

    sstcLoggingOut = true;

    const pdfFrame = document.getElementById("pdfFrame");

    if (pdfFrame) {
        try {
            pdfFrame.src = "about:blank";
        }
        catch (error) {
            console.warn("PDF cleanup warning:", error);
        }
    }

    clearStudentSession();

    window.location.replace("sstc-access.html");

    return false;
}


/* =========================================================
   READER DEFAULTS
   ========================================================= */

function setupReaderDefaults() {

    const frame = document.getElementById("pdfFrame");

    if (frame) {

        frame.setAttribute("draggable", "false");
        frame.setAttribute("loading", "eager");

        frame.addEventListener("load", function () {
            pdfLoaded();
        });

        frame.addEventListener("error", function () {
            console.error("SSTC PDF iframe failed to load.");
            showSecurityMessage("PDF could not be loaded.");
        });
    }

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.addEventListener("contextmenu", function (event) {
            event.preventDefault();
        });
    }
}


/* =========================================================
   PDF LOADED
   ========================================================= */

function pdfLoaded() {

    const empty = document.getElementById("viewerEmpty");
    const frame = document.getElementById("pdfFrame");

    if (!frame) {
        return;
    }

    if (frame.src && frame.src !== "about:blank" && frame.src !== window.location.href) {

        if (empty) {
            empty.style.display = "none";
        }
    }
}


/* =========================================================
   ZOOM IN
   ========================================================= */

function zoomIn() {
    sstcZoom = Math.min(200, sstcZoom + 10);
    applyZoom();
}


/* =========================================================
   ZOOM OUT
   ========================================================= */

function zoomOut() {
    sstcZoom = Math.max(50, sstcZoom - 10);
    applyZoom();
}


/* =========================================================
   APPLY ZOOM
   ========================================================= */

function applyZoom() {

    setText("zoomLevel", sstcZoom + "%");

    const frame = document.getElementById("pdfFrame");

    if (frame) {
        frame.style.transform = "scale(" + (sstcZoom / 100) + ")";
        frame.style.transformOrigin = "top left";
        frame.style.width = (10000 / sstcZoom) + "%";
        frame.style.height = (10000 / sstcZoom) + "%";
    }
}


/* =========================================================
   FIT WIDTH
   ========================================================= */

function fitWidth() {

    sstcZoom = 100;

    applyZoom();

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.scrollLeft = 0;
    }
}


/* =========================================================
   FIT PAGE
   ========================================================= */

function fitPage() {

    sstcZoom = 90;

    applyZoom();

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.scrollTop = 0;
        viewer.scrollLeft = 0;
    }
}


/* =========================================================
   FULLSCREEN
   ========================================================= */

function toggleFullscreen() {

    const viewer = document.getElementById("pdfViewer");

    if (!viewer) {
        return;
    }

    if (document.fullscreenElement) {

        if (document.exitFullscreen) {
            document.exitFullscreen();
        }

        return;
    }

    if (viewer.requestFullscreen) {
        viewer.requestFullscreen().catch(function (error) {
            console.warn("Fullscreen unavailable:", error);
        });
    }
}


/* =========================================================
   PREVIOUS CHAPTER
   ========================================================= */

function previousPage() {
    navigateChapter(-1);
}


/* =========================================================
   NEXT CHAPTER
   ========================================================= */

function nextPage() {
    navigateChapter(1);
}


/* =========================================================
   NAVIGATE CHAPTER
   ========================================================= */

function navigateChapter(direction) {

    if (!studentData) {
        return;
    }

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    const classLibrary = SSTC_EBOOKS[classNumber];

    if (!classLibrary) {
        return;
    }

    const subjectName = sessionStorage.getItem(SSTC_CURRENT_BOOK);

    if (!subjectName) {
        showSecurityMessage("Please select a subject first.");
        return;
    }

    const subject = classLibrary[subjectName];

    if (!subject) {
        return;
    }

    let currentChapter = parseInt(sessionStorage.getItem(SSTC_CURRENT_CHAPTER) || "1", 10);

    let newChapter = currentChapter + direction;

    if (newChapter < 1) {
        newChapter = 1;
    }

    if (newChapter > subject.chapters.length) {
        newChapter = subject.chapters.length;
    }

    openChapter(subjectName, newChapter - 1);
}


/* =========================================================
   CURRENT YEAR
   ========================================================= */

function setCurrentYear() {

    const year = new Date().getFullYear();

    setText("currentYear", year);
}


/* =========================================================
   SECURITY
   ========================================================= */

function setupStudentSecurity() {

    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    document.addEventListener("dragstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("selectstart", function (event) {
        event.preventDefault();
    });

    document.addEventListener("keydown", function (event) {

        const key = String(event.key || "").toLowerCase();

        if (event.ctrlKey && key === "s") {
            event.preventDefault();
            showSecurityMessage("Downloading is disabled.");
            return;
        }

        if (event.ctrlKey && key === "p") {
            event.preventDefault();
            showSecurityMessage("Printing is disabled.");
            return;
        }

        if (event.ctrlKey && key === "u") {
            event.preventDefault();
            showSecurityMessage("This page is protected.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "i") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "j") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }

        if (event.ctrlKey && event.shiftKey && key === "c") {
            event.preventDefault();
            showSecurityMessage("Inspection is disabled.");
            return;
        }

        if (event.key === "F12") {
            event.preventDefault();
            showSecurityMessage("Developer tools are disabled.");
            return;
        }
    });

    window.addEventListener("beforeprint", function () {
        document.body.classList.add("print-blocked");
        showSecurityMessage("Printing is disabled.");
    });

    window.addEventListener("afterprint", function () {
        document.body.classList.remove("print-blocked");
    });

    document.addEventListener("visibilitychange", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (!viewer) {
            return;
        }

        if (document.hidden) {
            viewer.classList.add("viewer-hidden");
        }
        else {
            viewer.classList.remove("viewer-hidden");
        }
    });

    window.addEventListener("blur", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (viewer) {
            viewer.classList.add("viewer-hidden");
        }
    });

    window.addEventListener("focus", function () {

        const viewer = document.getElementById("pdfViewer") || document.getElementById("ebookViewer");

        if (viewer) {
            viewer.classList.remove("viewer-hidden");
        }
    });
}


/* =========================================================
   SECURITY MESSAGE
   ========================================================= */

function showSecurityMessage(message) {

    const old = document.querySelector(".security-message");

    if (old) {
        old.remove();
    }

    const box = document.createElement("div");
    box.className = "security-message";
    box.textContent = message;

    document.body.appendChild(box);

    setTimeout(function () {

        if (box && box.parentNode) {
            box.remove();
        }

    }, 2000);
}


/* =========================================================
   PAGE HIDE
   ========================================================= */

window.addEventListener("pagehide", function () {
});


/* =========================================================
   EXPOSE FUNCTIONS
   ========================================================= */

window.studentLogout = studentLogout;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.fitWidth = fitWidth;
window.fitPage = fitPage;
window.toggleFullscreen = toggleFullscreen;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.pdfLoaded = pdfLoaded;
window.scrollSubjects = scrollSubjects;
window.selectSubject = selectSubject;
window.openChapter = openChapter;
window.setSubjectFilter = setSubjectFilter;
window.openRentModal = openRentModal;
window.closeRentModal = closeRentModal;
window.confirmRent = confirmRent;
window.cancelRentRequest = cancelRentRequest;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.copyUpiId = copyUpiId;
window.markPaymentSent = markPaymentSent;
