/* =========================================================
   SSTC STUDENT PORTAL
   LIVE STUDENT DATA
   SESSION + PROFILE + LIBRARY + PDF READER
   + RENT SUBJECTS (3 / 6 / 12 months -> saved in Google Sheet)
   + PAY NOW (UPI payment + payment claim + admin email)
   + SINGLE-DEVICE LOGIN ENFORCEMENT (heartbeat check,
     auto-logout on another-device login, auto-logout on
     browser/tab close - NO 2-hour time-based auto-logout)
   + 30-MINUTE "PLEASE LOGOUT AFTER READING" REMINDER TOAST
   ========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
   ========================================================= */

let studentData = null;
let sstcRedirecting = false;
let sstcLoggingOut = false;
let sstcZoom = 0;

/* --- PDF toolbar: Print / Download / Fullscreen settings --- */
const SSTC_ALLOW_PDF_PRINT = true;      // false = Print button hat jayega
const SSTC_ALLOW_PDF_DOWNLOAD = true;   // false = Download button hat jayega
const SSTC_PDF_MIN_SCALE = 0.5;
const SSTC_PDF_MAX_SCALE = 2.5;
const SSTC_PDF_STEP = 0.1;
let sstcPdfBaseHeight = 0;
let sstcPdfRenderId = 0;                // purane render ko cancel karne ke liye
let sstcAllowPrint = false;             // hamara Print button chalte waqt true
let sstcPrintBusy = false;
let sstcPrintCleanup = null;

/* --- session enforcement state --- */
const SSTC_SESSION_HEARTBEAT_MS = 30 * 1000;               // har 30 second me server check
let sstcSessionHeartbeatTimer = null;
let sstcSessionEnding = false;   // duplicate "forced logout" na ho isliye guard
let sstcHeartbeatBusy = false;   // heartbeat overlap na ho

/* --- 30-minute "please logout" reminder state --- */
const SSTC_LOGOUT_REMINDER_MS = 30 * 60 * 1000;   // 30 minute
let sstcLogoutReminderTimer = null;

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
 */
const SSTC_PAYMENT_HELP = "Please contact SSTC administration to complete the payment.";

/*
 * UPI PAYMENT SETTINGS
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
    // Normal single-subject plans
    {
        months: 3,
        label: "3 Months",
        price: 49,
        actualPrice: 49,
        subjects: 1
    },
    {
        months: 6,
        label: "6 Months",
        price: 69,
        actualPrice: 69,
        subjects: 1
    },
    {
        months: 12,
        label: "12 Months (1 Year)",
        price: 99,
        actualPrice: 99,
        subjects: 1
    },

    // Any 6 Subjects Bundle Plans
    {
        months: 6,
        label: "6 Months · Any 6 Subjects",
        price: 199,
        actualPrice: 414,
        subjects: 6,
        bundle: true
    },
    {
        months: 12,
        label: "12 Months (1 Year) · Any 6 Subjects",
        price: 399,
        actualPrice: 594,
        subjects: 6,
        bundle: true
    }
];


// Notes Rental Plans
const SSTC_RENT_NOTES_PLANS = [
    // Normal single-subject notes plans
    {
        months: 3,
        label: "3 Months",
        price: 69,
        actualPrice: 140,
        subjects: 1
    },
    {
        months: 6,
        label: "6 Months",
        price: 99,
        actualPrice: 200,
        subjects: 1
    },
    {
        months: 12,
        label: "12 Months (1 Year)",
        price: 149,
        actualPrice: 300,
        subjects: 1
    },

    // Any 6 Subject Notes Bundle Plans
    {
        months: 6,
        label: "6 Months · Any 6 Subject Notes",
        price: 399,
        actualPrice: 800,
        subjects: 6,
        bundle: true
    },
    {
        months: 12,
        label: "12 Months (1 Year) · Any 6 Subject Notes",
        price: 599,
        actualPrice: 1200,
        subjects: 6,
        bundle: true
    }
];


// Existing rental modal mein sirf single-subject plans dikhaye jayenge
let sstcRentPlans = SSTC_RENT_PLANS.filter(function (plan) {
    return !plan.bundle;
});



/*
 * Common calculation: rentals ko months ke hisaab se group karta hai.
 * Har group me 6 subjects = ek "Any 6 Subjects" bundle, bache hue = per subject price.
 * kind = "subjects" ya "notes"
 */
function sstcComputeRentalBreakdown(rentals, kind) {

    const isNotes = kind === "notes";
    const getSingle = isNotes ? getSstcSingleNotesPlan : getSstcSingleRentPlan;
    const getBundle = isNotes ? getSstcBundleNotesPlan : getSstcBundleRentPlan;

    const result = {
        total: 0,
        perSubjectTotal: 0,
        bundles: 0,
        count: 0,
        lines: [],
        hints: []
    };

    if (!Array.isArray(rentals) || rentals.length === 0) {
        return result;
    }

    const groups = {};

    rentals.forEach(function (rental) {

        const months = Number(rental.months) || 0;

        if (!groups[months]) {
            groups[months] = [];
        }

        groups[months].push(rental);
    });

    Object.keys(groups)
        .map(Number)
        .sort(function (a, b) { return a - b; })
        .forEach(function (months) {

            const list = groups[months];
            const count = list.length;
            const single = getSingle(months);
            const bundle = getBundle(months);

            result.count += count;

            /* Plan na mile (unknown months) to rental ka apna price jod do */
            if (!single) {

                const sum = list.reduce(function (s, r) {
                    return s + (Number(r.price) || 0);
                }, 0);

                result.total += sum;
                result.perSubjectTotal += sum;
                result.lines.push(count + " subject(s) × " + months + " months = ₹" + sum);
                return;
            }

            const singlePrice = Number(single.price);
            const size = bundle ? (Number(bundle.subjects) || 6) : 0;

            const bundleCount = bundle ? Math.floor(count / size) : 0;
            const remaining = bundle ? (count % size) : count;

            result.perSubjectTotal += count * singlePrice;

            if (bundleCount > 0) {

                const bundleSum = bundleCount * Number(bundle.price);

                result.total += bundleSum;
                result.bundles += bundleCount;

                result.lines.push(
                    months + " Months · Any " + size + " Subjects plan × " + bundleCount +
                    " = ₹" + bundleSum
                );
            }

            if (remaining > 0) {

                const remainingSum = remaining * singlePrice;

                result.total += remainingSum;

                result.lines.push(
                    months + " Months · " + remaining + (remaining === 1 ? " subject" : " subjects") +
                    " × ₹" + singlePrice + " = ₹" + remainingSum
                );

                if (bundle) {

                    const need = size - remaining;

                    if (remainingSum > Number(bundle.price)) {
                        result.hints.push(
                            "💡 " + months + " Months: sirf " + need + " subject aur jodein to Any " + size +
                            " Subjects plan sirf ₹" + bundle.price + " me lagega (abhi ₹" + remainingSum + " hai)."
                        );
                    }
                    else {
                        result.hints.push(
                            "💡 " + months + " Months: " + need + " subject aur jodne par Any " + size +
                            " Subjects plan (₹" + bundle.price + ") lag jayega."
                        );
                    }
                }
            }
        });

    return result;
}

function calculateSstcSubjectRentalTotal(rentals) {
    return sstcComputeRentalBreakdown(rentals, "subjects").total;
}

function calculateSstcNotesRentalTotal(rentals) {
    return sstcComputeRentalBreakdown(rentals, "notes").total;
}




/* =========================================================
   SESSION KEYS
   ========================================================= */

const SSTC_SESSION_LOGIN = "sstcStudentLoggedIn";
const SSTC_SESSION_DATA = "sstcStudentData";
const SSTC_SESSION_LOGIN_TIME = "sstcStudentLoginTime";
const SSTC_SESSION_TOKEN = "sstcSessionToken";
const SSTC_SESSION_START_MS = "sstcSessionStartMs";
const SSTC_CURRENT_BOOK = "sstcCurrentBook";
const SSTC_CURRENT_CHAPTER = "sstcCurrentChapter";
const SSTC_CURRENT_PAGE = "sstcCurrentPage";
const SSTC_SW_KEY_ACC = "sstcSwAccMs";
const SSTC_SW_KEY_START = "sstcSwStartMs";

/* =========================================================
   GITHUB PAGES BASE URL
   ========================================================= */

const SSTC_SITE_BASE_URL = window.location.origin;

/* =========================================================
   SSTC NOTES BUTTON
   Login hone par hi Subject-notes.html khulta hai
   ========================================================= */

const SSTC_NOTES_PAGE = "Subject-notes.html";

function openSstcNotes() {

    /* Login nahi hai to checkStudentSession() khud access page par bhej deta hai */

    if (!checkStudentSession()) {
        return;
    }

    if (sstcSessionEnding || sstcLoggingOut) {
        return;
    }

    /*
     * NEW TAB me kholte hain (same tab me nahi), kyunki is page se
     * jaate waqt "pagehide" par endsession chalta hai aur student
     * logout ho jata. New tab me sessionStorage copy ho jata hai,
     * isliye student wahan bhi logged-in rehta hai.
     */

    const notesWindow = window.open(SSTC_NOTES_PAGE, "_blank");

    if (!notesWindow) {
        showSstcToast("Popup blocked hai. Kripya popup allow karein aur dobara try karein.", "info");
    }
}
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
    /* =====================  CLASS 8  ===================== */
    "8": {

        "Science": {
            "description": "Class 8 Science E-Book Library",
            "image": "subject-images/class-8/science.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Crop Production and Management / अध्याय 1: फसल उत्पादन एवं प्रबंध", "pdf": "ebooks/class-8/science/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Microorganisms: Friend and Foe / अध्याय 2: सूक्ष्मजीव: मित्र एवं शत्रु", "pdf": "ebooks/class-8/science/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Synthetic Fibres and Plastics / अध्याय 3: संश्लेषित रेशे और प्लास्टिक", "pdf": "ebooks/class-8/science/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Materials: Metals and Non-Metals / अध्याय 4: पदार्थ: धातु और अधातु", "pdf": "ebooks/class-8/science/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: Coal and Petroleum / अध्याय 5: कोयला और पेट्रोलियम", "pdf": "ebooks/class-8/science/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Combustion and Flame / अध्याय 6: दहन और ज्वाला", "pdf": "ebooks/class-8/science/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Conservation of Plants and Animals / अध्याय 7: पौधों एवं जंतुओं का संरक्षण", "pdf": "ebooks/class-8/science/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Cell – Structure and Functions / अध्याय 8: कोशिका – संरचना एवं प्रकार्य", "pdf": "ebooks/class-8/science/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Reproduction in Animals / अध्याय 9: जंतुओं में जनन", "pdf": "ebooks/class-8/science/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Reaching the Age of Adolescence / अध्याय 10: किशोरावस्था की ओर", "pdf": "ebooks/class-8/science/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: Force and Pressure / अध्याय 11: बल तथा दाब", "pdf": "ebooks/class-8/science/chapter-11.pdf" },
                { "number": 12, "title": "Chapter 12: Friction / अध्याय 12: घर्षण", "pdf": "ebooks/class-8/science/chapter-12.pdf" },
                { "number": 13, "title": "Chapter 13: Sound / अध्याय 13: ध्वनि", "pdf": "ebooks/class-8/science/chapter-13.pdf" },
                { "number": 14, "title": "Chapter 14: Chemical Effects of Electric Current / अध्याय 14: विद्युत धारा के रासायनिक प्रभाव", "pdf": "ebooks/class-8/science/chapter-14.pdf" },
                { "number": 15, "title": "Chapter 15: Some Natural Phenomena / अध्याय 15: कुछ प्राकृतिक परिघटनाएँ", "pdf": "ebooks/class-8/science/chapter-15.pdf" },
                { "number": 16, "title": "Chapter 16: Light / अध्याय 16: प्रकाश", "pdf": "ebooks/class-8/science/chapter-16.pdf" },
                { "number": 17, "title": "Chapter 17: Stars and the Solar System / अध्याय 17: तारे एवं सौर परिवार", "pdf": "ebooks/class-8/science/chapter-17.pdf" },
                { "number": 18, "title": "Chapter 18: Pollution of Air and Water / अध्याय 18: वायु तथा जल का प्रदूषण", "pdf": "ebooks/class-8/science/chapter-18.pdf" }
            ]
        },

        "Social Science": {
            "description": "Class 8 Social Science E-Book Library",
            "image": "subject-images/class-8/socialscience.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: How, When and Where / अध्याय 1: कब, कहाँ और कैसे", "pdf": "ebooks/class-8/social-science/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: From Trade to Territory / अध्याय 2: व्यापार से साम्राज्य तक", "pdf": "ebooks/class-8/social-science/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Ruling the Countryside / अध्याय 3: ग्रामीण क्षेत्र पर शासन", "pdf": "ebooks/class-8/social-science/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Tribals, Dikus and the Vision of a Golden Age / अध्याय 4: जनजातीय, दीकू और एक स्वर्ण युग की कल्पना", "pdf": "ebooks/class-8/social-science/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: When People Rebel (1857) / अध्याय 5: जब जनता बग़ावत करती है (1857)", "pdf": "ebooks/class-8/social-science/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Weavers, Iron Smelters and Factory Owners / अध्याय 6: बुनकर, लोहा बनाने वाले और फैक्ट्री मालिक", "pdf": "ebooks/class-8/social-science/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Civilising the Native / अध्याय 7: देशी जनता को सभ्य बनाना", "pdf": "ebooks/class-8/social-science/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Women, Caste and Reform / अध्याय 8: महिलाएँ, जाति एवं सुधार", "pdf": "ebooks/class-8/social-science/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: The Making of the National Movement / अध्याय 9: राष्ट्रीय आंदोलन का संघटन", "pdf": "ebooks/class-8/social-science/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: India After Independence / अध्याय 10: स्वतंत्रता के बाद भारत", "pdf": "ebooks/class-8/social-science/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: Resources / अध्याय 11: संसाधन", "pdf": "ebooks/class-8/social-science/chapter-11.pdf" },
                { "number": 12, "title": "Chapter 12: Land, Soil, Water, Natural Vegetation and Wildlife / अध्याय 12: भूमि, मृदा, जल, प्राकृतिक वनस्पति और वन्य जीव", "pdf": "ebooks/class-8/social-science/chapter-12.pdf" },
                { "number": 13, "title": "Chapter 13: Mineral and Power Resources / अध्याय 13: खनिज और शक्ति संसाधन", "pdf": "ebooks/class-8/social-science/chapter-13.pdf" },
                { "number": 14, "title": "Chapter 14: Agriculture / अध्याय 14: कृषि", "pdf": "ebooks/class-8/social-science/chapter-14.pdf" },
                { "number": 15, "title": "Chapter 15: Industries / अध्याय 15: उद्योग", "pdf": "ebooks/class-8/social-science/chapter-15.pdf" },
                { "number": 16, "title": "Chapter 16: Human Resources / अध्याय 16: मानव संसाधन", "pdf": "ebooks/class-8/social-science/chapter-16.pdf" },
                { "number": 17, "title": "Chapter 17: The Indian Constitution / अध्याय 17: भारतीय संविधान", "pdf": "ebooks/class-8/social-science/chapter-17.pdf" },
                { "number": 18, "title": "Chapter 18: Understanding Secularism / अध्याय 18: धर्मनिरपेक्षता की समझ", "pdf": "ebooks/class-8/social-science/chapter-18.pdf" },
                { "number": 19, "title": "Chapter 19: Why Do We Need a Parliament? / अध्याय 19: हमें संसद क्यों चाहिए?", "pdf": "ebooks/class-8/social-science/chapter-19.pdf" },
                { "number": 20, "title": "Chapter 20: Understanding Laws / अध्याय 20: कानूनों की समझ", "pdf": "ebooks/class-8/social-science/chapter-20.pdf" },
                { "number": 21, "title": "Chapter 21: Judiciary / अध्याय 21: न्यायपालिका", "pdf": "ebooks/class-8/social-science/chapter-21.pdf" },
                { "number": 22, "title": "Chapter 22: Understanding Our Criminal Justice System / अध्याय 22: हमारी आपराधिक न्याय प्रणाली को समझना", "pdf": "ebooks/class-8/social-science/chapter-22.pdf" },
                { "number": 23, "title": "Chapter 23: Understanding Marginalisation / अध्याय 23: हाशियाकरण की समझ", "pdf": "ebooks/class-8/social-science/chapter-23.pdf" },
                { "number": 24, "title": "Chapter 24: Confronting Marginalisation / अध्याय 24: हाशियाकरण से निपटना", "pdf": "ebooks/class-8/social-science/chapter-24.pdf" },
                { "number": 25, "title": "Chapter 25: Public Facilities / अध्याय 25: जन सुविधाएँ", "pdf": "ebooks/class-8/social-science/chapter-25.pdf" },
                { "number": 26, "title": "Chapter 26: Law and Social Justice / अध्याय 26: कानून और सामाजिक न्याय", "pdf": "ebooks/class-8/social-science/chapter-26.pdf" }
            ]
        },

        "Mathematics": {
            "description": "Class 8 Mathematics E-Book Library",
            "image": "subject-images/class-8/maths.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Rational Numbers / अध्याय 1: परिमेय संख्याएँ", "pdf": "ebooks/class-8/mathematics/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Linear Equations in One Variable / अध्याय 2: एक चर वाले रैखिक समीकरण", "pdf": "ebooks/class-8/mathematics/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Understanding Quadrilaterals / अध्याय 3: चतुर्भुजों को समझना", "pdf": "ebooks/class-8/mathematics/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Practical Geometry / अध्याय 4: प्रायोगिक ज्यामिति", "pdf": "ebooks/class-8/mathematics/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: Data Handling / अध्याय 5: आँकड़ों का प्रबंधन", "pdf": "ebooks/class-8/mathematics/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Squares and Square Roots / अध्याय 6: वर्ग और वर्गमूल", "pdf": "ebooks/class-8/mathematics/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Cubes and Cube Roots / अध्याय 7: घन और घनमूल", "pdf": "ebooks/class-8/mathematics/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Comparing Quantities / अध्याय 8: राशियों की तुलना", "pdf": "ebooks/class-8/mathematics/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Algebraic Expressions and Identities / अध्याय 9: बीजीय व्यंजक एवं सर्वसमिकाएँ", "pdf": "ebooks/class-8/mathematics/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Visualising Solid Shapes / अध्याय 10: ठोस आकारों का चित्रण", "pdf": "ebooks/class-8/mathematics/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: Mensuration / अध्याय 11: क्षेत्रमिति", "pdf": "ebooks/class-8/mathematics/chapter-11.pdf" },
                { "number": 12, "title": "Chapter 12: Exponents and Powers / अध्याय 12: घात और घातांक", "pdf": "ebooks/class-8/mathematics/chapter-12.pdf" },
                { "number": 13, "title": "Chapter 13: Direct and Inverse Proportions / अध्याय 13: सीधा और प्रतिलोम अनुपात", "pdf": "ebooks/class-8/mathematics/chapter-13.pdf" },
                { "number": 14, "title": "Chapter 14: Factorisation / अध्याय 14: गुणनखंडन", "pdf": "ebooks/class-8/mathematics/chapter-14.pdf" },
                { "number": 15, "title": "Chapter 15: Introduction to Graphs / अध्याय 15: आलेख से परिचय", "pdf": "ebooks/class-8/mathematics/chapter-15.pdf" },
                { "number": 16, "title": "Chapter 16: Playing with Numbers / अध्याय 16: संख्याओं के साथ खेलना", "pdf": "ebooks/class-8/mathematics/chapter-16.pdf" }
            ]
        },

        "Hindi": {
            "description": "Class 8 Hindi E-Book Library",
            "image": "subject-images/class-8/hindi.png",
            "chapters": [
                { "number": 1, "title": "अध्याय 1: लाख की चूड़ियाँ", "pdf": "ebooks/class-8/hindi/chapter-01.pdf" },
                { "number": 2, "title": "अध्याय 2: बस की यात्रा", "pdf": "ebooks/class-8/hindi/chapter-02.pdf" },
                { "number": 3, "title": "अध्याय 3: दीवानों की हस्ती", "pdf": "ebooks/class-8/hindi/chapter-03.pdf" },
                { "number": 4, "title": "अध्याय 4: भगवान के डाकिए", "pdf": "ebooks/class-8/hindi/chapter-04.pdf" },
                { "number": 5, "title": "अध्याय 5: क्या निराश हुआ जाए", "pdf": "ebooks/class-8/hindi/chapter-05.pdf" },
                { "number": 6, "title": "अध्याय 6: यह सबसे कठिन समय नहीं", "pdf": "ebooks/class-8/hindi/chapter-06.pdf" },
                { "number": 7, "title": "अध्याय 7: कबीर की साखियाँ", "pdf": "ebooks/class-8/hindi/chapter-07.pdf" },
                { "number": 8, "title": "अध्याय 8: सुदामा चरित", "pdf": "ebooks/class-8/hindi/chapter-08.pdf" },
                { "number": 9, "title": "अध्याय 9: जहाँ पहिया है", "pdf": "ebooks/class-8/hindi/chapter-09.pdf" },
                { "number": 10, "title": "अध्याय 10: अकबरी लोटा", "pdf": "ebooks/class-8/hindi/chapter-10.pdf" },
                { "number": 11, "title": "अध्याय 11: सूरदास के पद", "pdf": "ebooks/class-8/hindi/chapter-11.pdf" },
                { "number": 12, "title": "अध्याय 12: पानी की कहानी", "pdf": "ebooks/class-8/hindi/chapter-12.pdf" },
                { "number": 13, "title": "अध्याय 13: बाज और साँप", "pdf": "ebooks/class-8/hindi/chapter-13.pdf" }
            ]
        },

        "English": {
            "description": "Class 8 English E-Book Library",
            "image": "subject-images/class-8/english.png",
            "chapters": [
                { "number": 1, "title": "Prose 1: The Best Christmas Present in the World", "pdf": "ebooks/class-8/english/chapter-01.pdf" },
                { "number": 2, "title": "Prose 2: The Tsunami", "pdf": "ebooks/class-8/english/chapter-02.pdf" },
                { "number": 3, "title": "Prose 3: Glimpses of the Past", "pdf": "ebooks/class-8/english/chapter-03.pdf" },
                { "number": 4, "title": "Prose 4: Bepin Choudhury's Lapse of Memory", "pdf": "ebooks/class-8/english/chapter-04.pdf" },
                { "number": 5, "title": "Prose 5: The Summit Within", "pdf": "ebooks/class-8/english/chapter-05.pdf" },
                { "number": 6, "title": "Prose 6: This is Jody's Fawn", "pdf": "ebooks/class-8/english/chapter-06.pdf" },
                { "number": 7, "title": "Prose 7: A Visit to Cambridge", "pdf": "ebooks/class-8/english/chapter-07.pdf" },
                { "number": 8, "title": "Prose 8: A Short Monsoon Diary", "pdf": "ebooks/class-8/english/chapter-08.pdf" },
                { "number": 9, "title": "Prose 9: The Great Stone Face – I", "pdf": "ebooks/class-8/english/chapter-09.pdf" },
                { "number": 10, "title": "Prose 10: The Great Stone Face – II", "pdf": "ebooks/class-8/english/chapter-10.pdf" },
                { "number": 11, "title": "Poem 1: The Ant and the Cricket", "pdf": "ebooks/class-8/english/chapter-11.pdf" },
                { "number": 12, "title": "Poem 2: Geography Lesson", "pdf": "ebooks/class-8/english/chapter-12.pdf" },
                { "number": 13, "title": "Poem 3: Macavity: The Mystery Cat", "pdf": "ebooks/class-8/english/chapter-13.pdf" },
                { "number": 14, "title": "Poem 4: The Last Bargain", "pdf": "ebooks/class-8/english/chapter-14.pdf" },
                { "number": 15, "title": "Poem 5: The School Boy", "pdf": "ebooks/class-8/english/chapter-15.pdf" },
                { "number": 16, "title": "Poem 6: The Duck and the Kangaroo", "pdf": "ebooks/class-8/english/chapter-16.pdf" },
                { "number": 17, "title": "Poem 7: When I Set Out for Lyonnesse", "pdf": "ebooks/class-8/english/chapter-17.pdf" },
                { "number": 18, "title": "Poem 8: On the Grasshopper and Cricket", "pdf": "ebooks/class-8/english/chapter-18.pdf" },
                { "number": 19, "title": "Supplementary 1: How the Camel Got His Hump", "pdf": "ebooks/class-8/english/chapter-19.pdf" },
                { "number": 20, "title": "Supplementary 2: Children at Work", "pdf": "ebooks/class-8/english/chapter-20.pdf" },
                { "number": 21, "title": "Supplementary 3: The Selfish Giant", "pdf": "ebooks/class-8/english/chapter-21.pdf" },
                { "number": 22, "title": "Supplementary 4: The Treasure Within", "pdf": "ebooks/class-8/english/chapter-22.pdf" },
                { "number": 23, "title": "Supplementary 5: Princess September", "pdf": "ebooks/class-8/english/chapter-23.pdf" },
                { "number": 24, "title": "Supplementary 6: The Fight", "pdf": "ebooks/class-8/english/chapter-24.pdf" },
                { "number": 25, "title": "Supplementary 7: The Open Window", "pdf": "ebooks/class-8/english/chapter-25.pdf" },
                { "number": 26, "title": "Supplementary 8: Jalebis", "pdf": "ebooks/class-8/english/chapter-26.pdf" },
                { "number": 27, "title": "Supplementary 9: The Comet – I", "pdf": "ebooks/class-8/english/chapter-27.pdf" },
                { "number": 28, "title": "Supplementary 10: The Comet – II", "pdf": "ebooks/class-8/english/chapter-28.pdf" }
            ]
        },

        "GK": {
            "description": "Class 8 General Knowledge E-Book Library",
            "image": "subject-images/class-8/gk.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: India – General Knowledge / अध्याय 1: भारत – सामान्य ज्ञान", "pdf": "ebooks/class-8/gk/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: World Geography / अध्याय 2: विश्व भूगोल", "pdf": "ebooks/class-8/gk/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Indian History Basics / अध्याय 3: भारतीय इतिहास की मूल बातें", "pdf": "ebooks/class-8/gk/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Constitution and Government / अध्याय 4: संविधान एवं सरकार", "pdf": "ebooks/class-8/gk/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: Science and Inventions / अध्याय 5: विज्ञान एवं आविष्कार", "pdf": "ebooks/class-8/gk/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Sports and Games / अध्याय 6: खेल-कूद", "pdf": "ebooks/class-8/gk/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Awards and Honours / अध्याय 7: पुरस्कार एवं सम्मान", "pdf": "ebooks/class-8/gk/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Books and Authors / अध्याय 8: पुस्तकें एवं लेखक", "pdf": "ebooks/class-8/gk/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Important Days / अध्याय 9: महत्वपूर्ण दिवस", "pdf": "ebooks/class-8/gk/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Current Affairs / अध्याय 10: समसामयिकी", "pdf": "ebooks/class-8/gk/chapter-10.pdf" }
            ]
        },

        "Computer": {
            "description": "Class 8 Computer E-Book Library",
            "image": "subject-images/class-8/computer.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Computer Hardware and Software", "pdf": "ebooks/class-8/computer/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Operating System", "pdf": "ebooks/class-8/computer/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: MS Word", "pdf": "ebooks/class-8/computer/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: MS Excel", "pdf": "ebooks/class-8/computer/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: MS PowerPoint", "pdf": "ebooks/class-8/computer/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Internet and Email", "pdf": "ebooks/class-8/computer/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Introduction to HTML", "pdf": "ebooks/class-8/computer/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Cyber Safety and Security", "pdf": "ebooks/class-8/computer/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Programming Basics (Scratch)", "pdf": "ebooks/class-8/computer/chapter-09.pdf" }
            ]
        },

        "Sanskrit": {
            "description": "Class 8 Sanskrit E-Book Library",
            "image": "subject-images/class-8/sanskrit.png",
            "chapters": [
                { "number": 1, "title": "अध्याय 1: सुभाषितानि", "pdf": "ebooks/class-8/sanskrit/chapter-01.pdf" },
                { "number": 2, "title": "अध्याय 2: बिलस्य वाणी न कदापि मे श्रुता", "pdf": "ebooks/class-8/sanskrit/chapter-02.pdf" },
                { "number": 3, "title": "अध्याय 3: डिजिभारतम्", "pdf": "ebooks/class-8/sanskrit/chapter-03.pdf" },
                { "number": 4, "title": "अध्याय 4: सदैव पुरतो निधेहि चरणम्", "pdf": "ebooks/class-8/sanskrit/chapter-04.pdf" },
                { "number": 5, "title": "अध्याय 5: कण्टकेनैव कण्टकम्", "pdf": "ebooks/class-8/sanskrit/chapter-05.pdf" },
                { "number": 6, "title": "अध्याय 6: गृहं शून्यं सुतां विना", "pdf": "ebooks/class-8/sanskrit/chapter-06.pdf" },
                { "number": 7, "title": "अध्याय 7: भारतजनताऽहम्", "pdf": "ebooks/class-8/sanskrit/chapter-07.pdf" },
                { "number": 8, "title": "अध्याय 8: संसारसागरस्य नायकाः", "pdf": "ebooks/class-8/sanskrit/chapter-08.pdf" },
                { "number": 9, "title": "अध्याय 9: सप्तभगिन्यः", "pdf": "ebooks/class-8/sanskrit/chapter-09.pdf" },
                { "number": 10, "title": "अध्याय 10: अशोकवनिका", "pdf": "ebooks/class-8/sanskrit/chapter-10.pdf" },
                { "number": 11, "title": "अध्याय 11: सावित्री बाई फुले", "pdf": "ebooks/class-8/sanskrit/chapter-11.pdf" },
                { "number": 12, "title": "अध्याय 12: कः रक्षति कः रक्षितः", "pdf": "ebooks/class-8/sanskrit/chapter-12.pdf" },
                { "number": 13, "title": "अध्याय 13: हिमालयः", "pdf": "ebooks/class-8/sanskrit/chapter-13.pdf" },
                { "number": 14, "title": "अध्याय 14: आर्यभटः", "pdf": "ebooks/class-8/sanskrit/chapter-14.pdf" }
            ]
        }

    },

    /* =====================  CLASS 9  ===================== */
    "9": {

        "Science": {
            "description": "Class 9 Science E-Book Library",
            "image": "subject-images/class-9/science.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Matter in Our Surroundings / अध्याय 1: हमारे आस-पास के पदार्थ", "pdf": "ebooks/class-9/science/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Is Matter Around Us Pure? / अध्याय 2: क्या हमारे आस-पास के पदार्थ शुद्ध हैं?", "pdf": "ebooks/class-9/science/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Atoms and Molecules / अध्याय 3: परमाणु एवं अणु", "pdf": "ebooks/class-9/science/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Structure of the Atom / अध्याय 4: परमाणु की संरचना", "pdf": "ebooks/class-9/science/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: The Fundamental Unit of Life / अध्याय 5: जीवन की मौलिक इकाई", "pdf": "ebooks/class-9/science/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Tissues / अध्याय 6: ऊतक", "pdf": "ebooks/class-9/science/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Motion / अध्याय 7: गति", "pdf": "ebooks/class-9/science/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Force and Laws of Motion / अध्याय 8: बल तथा गति के नियम", "pdf": "ebooks/class-9/science/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Gravitation / अध्याय 9: गुरुत्वाकर्षण", "pdf": "ebooks/class-9/science/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Work and Energy / अध्याय 10: कार्य तथा ऊर्जा", "pdf": "ebooks/class-9/science/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: Sound / अध्याय 11: ध्वनि", "pdf": "ebooks/class-9/science/chapter-11.pdf" },
                { "number": 12, "title": "Chapter 12: Improvement in Food Resources / अध्याय 12: खाद्य संसाधनों में सुधार", "pdf": "ebooks/class-9/science/chapter-12.pdf" }
            ]
        },

        "Mathematics": {
            "description": "Class 9 Mathematics E-Book Library",
            "image": "subject-images/class-9/maths.png",
             "chapters": [
                 {"number": 1,"title": "Chapter 1: Number Systems / अध्याय 1: संख्या पद्धति","pdf": "ebooks/class-9/mathematics/chapter-01.pdf"},
                 {"number": 2,"title": "Chapter 2: Exponents / अध्याय 2: घातांक","pdf": "ebooks/class-9/mathematics/chapter-14.pdf"},
                 {"number": 3,"title": "Chapter 3: Rationalisation / अध्याय 3: हर का परिमेयकरण","pdf": "ebooks/class-9/mathematics/chapter-15.pdf"},
                 {"number": 4,"title": "Chapter 4: Algebraic Identities / अध्याय 4: बीजीय सर्वसमिकाएँ","pdf": "ebooks/class-9/mathematics/chapter-16.pdf"},
                 {"number": 5,"title": "Chapter 5: Polynomials / अध्याय 5: बहुपद","pdf": "ebooks/class-9/mathematics/chapter-02.pdf"},
                 {"number": 6,"title": "Chapter 6: Remainder and Factor Theorem / अध्याय 6: शेषफल और गुणनखंड प्रमेय","pdf": "ebooks/class-9/mathematics/chapter-17.pdf"},
                 {"number": 7,"title": "Chapter 7: Coordinate Geometry / अध्याय 7: निर्देशांक ज्यामिति","pdf": "ebooks/class-9/mathematics/chapter-03.pdf"},
                 {"number": 8,"title": "Chapter 8: Linear Equations in Two Variables / अध्याय 8: दो चरों वाले रैखिक समीकरण","pdf": "ebooks/class-9/mathematics/chapter-04.pdf"},
                 {"number": 9,"title": "Chapter 9: Introduction to Euclid's Geometry / अध्याय 9: यूक्लिड की ज्यामिति का परिचय","pdf": "ebooks/class-9/mathematics/chapter-05.pdf"},
                 {"number": 10,"title": "Chapter 10: Lines and Angles / अध्याय 10: रेखाएँ और कोण","pdf": "ebooks/class-9/mathematics/chapter-06.pdf"},
                 {"number": 11,"title": "Chapter 11: Triangles / अध्याय 11: त्रिभुज","pdf": "ebooks/class-9/mathematics/chapter-07.pdf"},
                 {"number": 12,"title": "Chapter 12: Quadrilaterals / अध्याय 12: चतुर्भुज","pdf": "ebooks/class-9/mathematics/chapter-08.pdf"},
                 {"number": 13,"title": "Chapter 13: Circles / अध्याय 13: वृत्त","pdf": "ebooks/class-9/mathematics/chapter-09.pdf"},
                 {"number": 14,"title": "Chapter 14: Surface Areas and Volumes / अध्याय 14: पृष्ठीय क्षेत्रफल और आयतन","pdf": "ebooks/class-9/mathematics/chapter-11.pdf"},
                 {"number": 15,"title": "Chapter 15: Statistics / अध्याय 15: सांख्यिकी","pdf": "ebooks/class-9/mathematics/chapter-12.pdf"},
                 {"number": 16,"title": "Chapter 16: Probability / अध्याय 16: प्रायिकता","pdf": "ebooks/class-9/mathematics/chapter-13.pdf"},
                 {"number": 17,"title": "Chapter 17: Heron's Formula / अध्याय 17: हीरोन का सूत्र","pdf": "ebooks/class-9/mathematics/chapter-10.pdf"}
               ]
        },

        "English": {
            "description": "Class 9 English E-Book Library",
            "image": "subject-images/class-9/english.png",
            "chapters": [
                { "number": 1, "title": "Prose 1: The Fun They Had", "pdf": "ebooks/class-9/english/chapter-01.pdf" },
                { "number": 2, "title": "Prose 2: The Sound of Music", "pdf": "ebooks/class-9/english/chapter-02.pdf" },
                { "number": 3, "title": "Prose 3: The Little Girl", "pdf": "ebooks/class-9/english/chapter-03.pdf" },
                { "number": 4, "title": "Prose 4: A Truly Beautiful Mind", "pdf": "ebooks/class-9/english/chapter-04.pdf" },
                { "number": 5, "title": "Prose 5: The Snake and the Mirror", "pdf": "ebooks/class-9/english/chapter-05.pdf" },
                { "number": 6, "title": "Prose 6: My Childhood", "pdf": "ebooks/class-9/english/chapter-06.pdf" },
                { "number": 7, "title": "Prose 7: Packing", "pdf": "ebooks/class-9/english/chapter-07.pdf" },
                { "number": 8, "title": "Prose 8: Reach for the Top", "pdf": "ebooks/class-9/english/chapter-08.pdf" },
                { "number": 9, "title": "Prose 9: The Bond of Love", "pdf": "ebooks/class-9/english/chapter-09.pdf" },
                { "number": 10, "title": "Prose 10: Kathmandu", "pdf": "ebooks/class-9/english/chapter-10.pdf" },
                { "number": 11, "title": "Prose 11: If I Were You", "pdf": "ebooks/class-9/english/chapter-11.pdf" },
                { "number": 12, "title": "Poem 1: The Road Not Taken", "pdf": "ebooks/class-9/english/chapter-12.pdf" },
                { "number": 13, "title": "Poem 2: Wind", "pdf": "ebooks/class-9/english/chapter-13.pdf" },
                { "number": 14, "title": "Poem 3: Rain on the Roof", "pdf": "ebooks/class-9/english/chapter-14.pdf" },
                { "number": 15, "title": "Poem 4: The Lake Isle of Innisfree", "pdf": "ebooks/class-9/english/chapter-15.pdf" },
                { "number": 16, "title": "Poem 5: A Legend of the Northland", "pdf": "ebooks/class-9/english/chapter-16.pdf" },
                { "number": 17, "title": "Poem 6: No Men Are Foreign", "pdf": "ebooks/class-9/english/chapter-17.pdf" },
                { "number": 18, "title": "Poem 7: The Duck and the Kangaroo", "pdf": "ebooks/class-9/english/chapter-18.pdf" },
                { "number": 19, "title": "Poem 8: On Killing a Tree", "pdf": "ebooks/class-9/english/chapter-19.pdf" },
                { "number": 20, "title": "Poem 9: The Snake Trying", "pdf": "ebooks/class-9/english/chapter-20.pdf" },
                { "number": 21, "title": "Poem 10: A Slumber Did My Spirit Seal", "pdf": "ebooks/class-9/english/chapter-21.pdf" },
                { "number": 22, "title": "Supplementary 1: The Lost Child", "pdf": "ebooks/class-9/english/chapter-22.pdf" },
                { "number": 23, "title": "Supplementary 2: The Adventures of Toto", "pdf": "ebooks/class-9/english/chapter-23.pdf" },
                { "number": 24, "title": "Supplementary 3: Iswaran the Storyteller", "pdf": "ebooks/class-9/english/chapter-24.pdf" },
                { "number": 25, "title": "Supplementary 4: In the Kingdom of Fools", "pdf": "ebooks/class-9/english/chapter-25.pdf" },
                { "number": 26, "title": "Supplementary 5: The Happy Prince", "pdf": "ebooks/class-9/english/chapter-26.pdf" },
                { "number": 27, "title": "Supplementary 6: Weathering the Storm in Ersama", "pdf": "ebooks/class-9/english/chapter-27.pdf" },
                { "number": 28, "title": "Supplementary 7: The Last Leaf", "pdf": "ebooks/class-9/english/chapter-28.pdf" },
                { "number": 29, "title": "Supplementary 8: A House Is Not a Home", "pdf": "ebooks/class-9/english/chapter-29.pdf" },
                { "number": 30, "title": "Supplementary 9: The Accidental Tourist", "pdf": "ebooks/class-9/english/chapter-30.pdf" },
                { "number": 31, "title": "Supplementary 10: The Beggar", "pdf": "ebooks/class-9/english/chapter-31.pdf" }
            ]
        },

        "Hindi": {
            "description": "Class 9 Hindi E-Book Library",
            "image": "subject-images/class-9/hindi.png",
            "chapters": [
                { "number": 1, "title": "क्षितिज (गद्य) 1: दो बैलों की कथा", "pdf": "ebooks/class-9/hindi/chapter-01.pdf" },
                { "number": 2, "title": "क्षितिज (गद्य) 2: ल्हासा की ओर", "pdf": "ebooks/class-9/hindi/chapter-02.pdf" },
                { "number": 3, "title": "क्षितिज (गद्य) 3: उपभोक्तावाद की संस्कृति", "pdf": "ebooks/class-9/hindi/chapter-03.pdf" },
                { "number": 4, "title": "क्षितिज (गद्य) 4: साँवले सपनों की याद", "pdf": "ebooks/class-9/hindi/chapter-04.pdf" },
                { "number": 5, "title": "क्षितिज (गद्य) 5: नाना साहब की पुत्री देवी मैना को भस्म कर दिया गया", "pdf": "ebooks/class-9/hindi/chapter-05.pdf" },
                { "number": 6, "title": "क्षितिज (गद्य) 6: प्रेमचंद के फटे जूते", "pdf": "ebooks/class-9/hindi/chapter-06.pdf" },
                { "number": 7, "title": "क्षितिज (गद्य) 7: मेरे बचपन के दिन", "pdf": "ebooks/class-9/hindi/chapter-07.pdf" },
                { "number": 8, "title": "क्षितिज (गद्य) 8: एक कुत्ता और एक मैना", "pdf": "ebooks/class-9/hindi/chapter-08.pdf" },
                { "number": 9, "title": "क्षितिज (काव्य) 1: साखियाँ एवं सबद", "pdf": "ebooks/class-9/hindi/chapter-09.pdf" },
                { "number": 10, "title": "क्षितिज (काव्य) 2: वाख", "pdf": "ebooks/class-9/hindi/chapter-10.pdf" },
                { "number": 11, "title": "क्षितिज (काव्य) 3: सवैये", "pdf": "ebooks/class-9/hindi/chapter-11.pdf" },
                { "number": 12, "title": "क्षितिज (काव्य) 4: कैदी और कोकिला", "pdf": "ebooks/class-9/hindi/chapter-12.pdf" },
                { "number": 13, "title": "क्षितिज (काव्य) 5: ग्राम श्री", "pdf": "ebooks/class-9/hindi/chapter-13.pdf" },
                { "number": 14, "title": "क्षितिज (काव्य) 6: चंद्र गहना से लौटती बेर", "pdf": "ebooks/class-9/hindi/chapter-14.pdf" },
                { "number": 15, "title": "क्षितिज (काव्य) 7: मेघ आए", "pdf": "ebooks/class-9/hindi/chapter-15.pdf" },
                { "number": 16, "title": "क्षितिज (काव्य) 8: यमराज की दिशा", "pdf": "ebooks/class-9/hindi/chapter-16.pdf" },
                { "number": 17, "title": "क्षितिज (काव्य) 9: बच्चे काम पर जा रहे हैं", "pdf": "ebooks/class-9/hindi/chapter-17.pdf" },
                { "number": 18, "title": "कृतिका 1: इस जल प्रलय में", "pdf": "ebooks/class-9/hindi/chapter-18.pdf" },
                { "number": 19, "title": "कृतिका 2: मेरे संग की औरतें", "pdf": "ebooks/class-9/hindi/chapter-19.pdf" },
                { "number": 20, "title": "कृतिका 3: रीढ़ की हड्डी", "pdf": "ebooks/class-9/hindi/chapter-20.pdf" },
                { "number": 21, "title": "कृतिका 4: माटी वाली", "pdf": "ebooks/class-9/hindi/chapter-21.pdf" },
                { "number": 22, "title": "कृतिका 5: किस तरह आखिरकार मैं हिंदी में आया", "pdf": "ebooks/class-9/hindi/chapter-22.pdf" }
            ]
        },

        "Social Science": {
            "description": "Class 9 Social Science E-Book Library",
            "image": "subject-images/class-9/socialscience.png",
            "chapters": [
                { "number": 1, "title": "History 1: The French Revolution / इतिहास 1: फ्रांसीसी क्रांति", "pdf": "ebooks/class-9/social-science/chapter-01.pdf" },
                { "number": 2, "title": "History 2: Socialism in Europe and the Russian Revolution / इतिहास 2: यूरोप में समाजवाद और रूसी क्रांति", "pdf": "ebooks/class-9/social-science/chapter-02.pdf" },
                { "number": 3, "title": "History 3: Nazism and the Rise of Hitler / इतिहास 3: नात्सीवाद और हिटलर का उदय", "pdf": "ebooks/class-9/social-science/chapter-03.pdf" },
                { "number": 4, "title": "History 4: Forest Society and Colonialism / इतिहास 4: वन्य समाज और उपनिवेशवाद", "pdf": "ebooks/class-9/social-science/chapter-04.pdf" },
                { "number": 5, "title": "History 5: Pastoralists in the Modern World / इतिहास 5: आधुनिक विश्व में चरवाहे", "pdf": "ebooks/class-9/social-science/chapter-05.pdf" },
                { "number": 6, "title": "Geography 1: India – Size and Location / भूगोल 1: भारत – आकार और स्थिति", "pdf": "ebooks/class-9/social-science/chapter-06.pdf" },
                { "number": 7, "title": "Geography 2: Physical Features of India / भूगोल 2: भारत का भौतिक स्वरूप", "pdf": "ebooks/class-9/social-science/chapter-07.pdf" },
                { "number": 8, "title": "Geography 3: Drainage / भूगोल 3: अपवाह", "pdf": "ebooks/class-9/social-science/chapter-08.pdf" },
                { "number": 9, "title": "Geography 4: Climate / भूगोल 4: जलवायु", "pdf": "ebooks/class-9/social-science/chapter-09.pdf" },
                { "number": 10, "title": "Geography 5: Natural Vegetation and Wildlife / भूगोल 5: प्राकृतिक वनस्पति और वन्य जीवन", "pdf": "ebooks/class-9/social-science/chapter-10.pdf" },
                { "number": 11, "title": "Geography 6: Population / भूगोल 6: जनसंख्या", "pdf": "ebooks/class-9/social-science/chapter-11.pdf" },
                { "number": 12, "title": "Civics 1: What Is Democracy? Why Democracy? / नागरिक शास्त्र 1: लोकतंत्र क्या? लोकतंत्र क्यों?", "pdf": "ebooks/class-9/social-science/chapter-12.pdf" },
                { "number": 13, "title": "Civics 2: Constitutional Design / नागरिक शास्त्र 2: संविधान निर्माण", "pdf": "ebooks/class-9/social-science/chapter-13.pdf" },
                { "number": 14, "title": "Civics 3: Electoral Politics / नागरिक शास्त्र 3: चुनावी राजनीति", "pdf": "ebooks/class-9/social-science/chapter-14.pdf" },
                { "number": 15, "title": "Civics 4: Working of Institutions / नागरिक शास्त्र 4: संस्थाओं का कामकाज", "pdf": "ebooks/class-9/social-science/chapter-15.pdf" },
                { "number": 16, "title": "Civics 5: Democratic Rights / नागरिक शास्त्र 5: लोकतांत्रिक अधिकार", "pdf": "ebooks/class-9/social-science/chapter-16.pdf" },
                { "number": 17, "title": "Economics 1: The Story of Village Palampur / अर्थशास्त्र 1: पालमपुर गाँव की कहानी", "pdf": "ebooks/class-9/social-science/chapter-17.pdf" },
                { "number": 18, "title": "Economics 2: People as Resource / अर्थशास्त्र 2: संसाधन के रूप में लोग", "pdf": "ebooks/class-9/social-science/chapter-18.pdf" },
                { "number": 19, "title": "Economics 3: Poverty as a Challenge / अर्थशास्त्र 3: निर्धनता: एक चुनौती", "pdf": "ebooks/class-9/social-science/chapter-19.pdf" },
                { "number": 20, "title": "Economics 4: Food Security in India / अर्थशास्त्र 4: भारत में खाद्य सुरक्षा", "pdf": "ebooks/class-9/social-science/chapter-20.pdf" }
            ]
        },

        "Home Science": {
            "description": "Class 9 Home Science E-Book Library",
            "image": "subject-images/class-9/homescience.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Elements and Scope of Home Science / अध्याय 1: गृह विज्ञान के तत्त्व और क्षेत्र", "pdf": "ebooks/class-9/home-science/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Home Management: In the Context of Family / अध्याय 2: गृह-व्यवस्था : परिवार के सन्दर्भ में", "pdf": "ebooks/class-9/home-science/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Work Management / अध्याय 3: कार्य-व्यवस्था", "pdf": "ebooks/class-9/home-science/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Economy: Basic Needs of the Family / अध्याय 4: अर्थव्यवस्था : परिवार की मूलभूत आवश्यकताएँ", "pdf": "ebooks/class-9/home-science/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Meaning and Definition of Health and Personal Health Care and Protection / अध्याय 5: स्वास्थ्य का अर्थ एवं परिभाषा तथा व्यक्तिगत स्वास्थ्य की देख-रेख और रक्षा", "pdf": "ebooks/class-9/home-science/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Local Health Organizations and Services / अध्याय 6: स्थानीय स्वास्थ्य संस्थाएँ एवं सेवाएँ", "pdf": "ebooks/class-9/home-science/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Impact of Environmental Pollution on Public Life / अध्याय 7: पर्यावरण-प्रदूषण का जनजीवन पर प्रभाव", "pdf": "ebooks/class-9/home-science/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Air: Importance of Pure Air and Ventilation / अध्याय 8: वायु : शुद्ध वायु का महत्त्व एवं संवातन", "pdf": "ebooks/class-9/home-science/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Diseases Caused by Impure Air / अध्याय 9: अशुद्ध वायु से होने वाले रोग", "pdf": "ebooks/class-9/home-science/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Clothing Fibres: Types and Their Use in Daily Life / अध्याय 10: कपड़े के तन्तु : प्रकार एवं दैनिक जीवन में इनका प्रयोग", "pdf": "ebooks/class-9/home-science/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Personal Grooming: Appropriate Attire / अध्याय 11: व्यक्तिगत सज्जा : उचित वेशभूषा", "pdf": "ebooks/class-9/home-science/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Digestion of Food and Related Anatomy / अध्याय 12: भोजन का पाचन एवं सम्बन्धित शरीर-क्रिया विज्ञान", "pdf": "ebooks/class-9/home-science/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Composition, Classification and Functions of Food / अध्याय 13: खाद्य पदार्थों का संगठन, वर्गीकरण और उनके कार्य", "pdf": "ebooks/class-9/home-science/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Balanced Diet / अध्याय 14: सन्तुलित आहार", "pdf": "ebooks/class-9/home-science/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Principles of First Aid / अध्याय 15: प्राथमिक चिकित्सा के प्रमुख सिद्धान्त", "pdf": "ebooks/class-9/home-science/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Common Household Accidents and Their Prevention / अध्याय 16: सामान्य घरेलू दुर्घटनाएँ और उनसे बचाव", "pdf": "ebooks/class-9/home-science/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: Common Domestic Indigenous Medicines and Antidotes for Common Poisons / अध्याय 17: सामान्य घरेलू देशज औषधियाँ तथा सामान्य विषों के प्रतिकारक पदार्थ", "pdf": "ebooks/class-9/home-science/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: Triangular and Roller Bandages and Their Use / अध्याय 18: तिकोनी और लम्बी पट्टियाँ तथा उनका प्रयोग", "pdf": "ebooks/class-9/home-science/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: Home Nursing and Home Nurse / अध्याय 19: गृह-परिचर्या और गृह-परिचारिका", "pdf": "ebooks/class-9/home-science/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: Patient's Room and Its Management / अध्याय 20: रोगी का कमरा एवं उसकी व्यवस्था", "pdf": "ebooks/class-9/home-science/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Patient's Bed / अध्याय 21: रोगी का बिस्तर", "pdf": "ebooks/class-9/home-science/chapter-21.pdf" }
             ]
        },

        "Computer": {
            "description": "Class 9 Computer E-Book Library",
            "image": "subject-images/class-9/computer.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Introduction & Development of Computer / अध्याय 1: कंप्यूटर का परिचय और विकास", "pdf": "ebooks/class-9/computer/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Computer Fundamentals, Parts & Types / अध्याय 2: कंप्यूटर के मूल तत्व, भाग और प्रकार", "pdf": "ebooks/class-9/computer/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Input/Output Devices, Hardware & Software / अध्याय 3: इनपुट/आउटपुट डिवाइस, हार्डवेयर और सॉफ्टवेयर", "pdf": "ebooks/class-9/computer/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Number System and Conversion / अध्याय 4: संख्या प्रणाली और रूपांतरण", "pdf": "ebooks/class-9/computer/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Binary Arithmetic / अध्याय 5: बाइनरी अंकगणित", "pdf": "ebooks/class-9/computer/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Introduction to Computer / अध्याय 6: कंप्यूटर का परिचय", "pdf": "ebooks/class-9/computer/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Computer Fundamentals / अध्याय 7: कंप्यूटर के मूल तत्व", "pdf": "ebooks/class-9/computer/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Input and Output Devices / अध्याय 8: इनपुट और आउटपुट डिवाइस", "pdf": "ebooks/class-9/computer/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Computer Memory / अध्याय 9: कंप्यूटर मेमोरी", "pdf": "ebooks/class-9/computer/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Computer Software / अध्याय 10: कंप्यूटर सॉफ्टवेयर", "pdf": "ebooks/class-9/computer/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Operating System / अध्याय 11: ऑपरेटिंग सिस्टम", "pdf": "ebooks/class-9/computer/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Introduction to Internet / अध्याय 12: इंटरनेट का परिचय", "pdf": "ebooks/class-9/computer/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Computer Virus and Security / अध्याय 13: कंप्यूटर वायरस और सुरक्षा", "pdf": "ebooks/class-9/computer/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Computer Network / अध्याय 14: कंप्यूटर नेटवर्क", "pdf": "ebooks/class-9/computer/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Computer Flowcharts and Algorithms / अध्याय 15: कंप्यूटर फ्लोचार्ट और एल्गोरिदम", "pdf": "ebooks/class-9/computer/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Introduction to Programming Techniques / अध्याय 16: प्रोग्रामिंग तकनीकों का परिचय", "pdf": "ebooks/class-9/computer/chapter-16.pdf" }
             ]
        },

        "Chitrakala": {
             "description": "Class 9 Chitrakala E-Book Library",
             "image": "subject-images/class-9/chitrakala.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Introduction to Painting / अध्याय 1: चित्रकला का परिचय", "pdf": "ebooks/class-9/chitrakala/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Basic Elements of Art / अध्याय 2: कला के मूल तत्व", "pdf": "ebooks/class-9/chitrakala/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Line and Drawing / अध्याय 3: रेखा एवं रेखांकन", "pdf": "ebooks/class-9/chitrakala/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Colours and Colour Combination / अध्याय 4: रंग एवं रंग संयोजन", "pdf": "ebooks/class-9/chitrakala/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Primary and Secondary Colours / अध्याय 5: प्राथमिक एवं द्वितीयक रंग", "pdf": "ebooks/class-9/chitrakala/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: History of Indian Painting / अध्याय 6: भारतीय चित्रकला का इतिहास", "pdf": "ebooks/class-9/chitrakala/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Landscape Drawing / अध्याय 7: प्राकृतिक दृश्य चित्रण", "pdf": "ebooks/class-9/chitrakala/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Still Life Drawing / अध्याय 8: स्थिर वस्तु चित्रण", "pdf": "ebooks/class-9/chitrakala/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Memory Drawing / अध्याय 9: स्मृति चित्रण", "pdf": "ebooks/class-9/chitrakala/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Designing and Decoration / अध्याय 10: आलेखन एवं अलंकरण", "pdf": "ebooks/class-9/chitrakala/chapter-10.pdf" }
             ]
         },

        "Commerce": {
             "description": "Class 9 Commerce E-Book Library",
             "image": "subject-images/class-9/commerce.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Double Entry System / अध्याय 1: दोहरा लेखा प्रणाली", "pdf": "ebooks/class-9/commerce/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Office / अध्याय 2: कार्यालय", "pdf": "ebooks/class-9/commerce/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Journal / अध्याय 3: रोजनामचा (जर्नल)", "pdf": "ebooks/class-9/commerce/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Book Keeping / अध्याय 4: बहीखाता", "pdf": "ebooks/class-9/commerce/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Ledger / अध्याय 5: खाता-बही (लेजर)", "pdf": "ebooks/class-9/commerce/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Cash Book / अध्याय 6: रोकड़ बही", "pdf": "ebooks/class-9/commerce/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Trial Balance / अध्याय 7: तलपट (कच्चा चिट्ठा)", "pdf": "ebooks/class-9/commerce/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Indian System of Book Keeping / अध्याय 8: भारतीय बहीखाता प्रणाली", "pdf": "ebooks/class-9/commerce/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Business / अध्याय 9: व्यवसाय", "pdf": "ebooks/class-9/commerce/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Correspondence / अध्याय 10: पत्राचार", "pdf": "ebooks/class-9/commerce/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Copying / अध्याय 11: प्रतिलिपि लेखन", "pdf": "ebooks/class-9/commerce/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Commercial Correspondence / अध्याय 12: व्यापारिक पत्राचार", "pdf": "ebooks/class-9/commerce/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Constituents of Money / अध्याय 13: मुद्रा के घटक", "pdf": "ebooks/class-9/commerce/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Barter System / अध्याय 14: वस्तु विनिमय प्रणाली", "pdf": "ebooks/class-9/commerce/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Origin and Growth of Money / अध्याय 15: मुद्रा की उत्पत्ति एवं विकास", "pdf": "ebooks/class-9/commerce/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Meaning, Functions, Importance and Evils of Money / अध्याय 16: मुद्रा का अर्थ, कार्य, महत्त्व एवं दोष", "pdf": "ebooks/class-9/commerce/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: Classification of Money: Metallic and Paper Money / अध्याय 17: मुद्रा का वर्गीकरण: धात्विक एवं कागजी मुद्रा", "pdf": "ebooks/class-9/commerce/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: Qualities of a Good Money Material / अध्याय 18: अच्छी मुद्रा सामग्री के गुण", "pdf": "ebooks/class-9/commerce/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: Principles and Methods of Note Issue / अध्याय 19: नोट निर्गमन के सिद्धांत एवं प्रणालियाँ", "pdf": "ebooks/class-9/commerce/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: Present Currency System in India / अध्याय 20: भारत की वर्तमान मुद्रा प्रणाली", "pdf": "ebooks/class-9/commerce/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Introduction and Definition of Economics / अध्याय 21: अर्थशास्त्र का परिचय एवं परिभाषा", "pdf": "ebooks/class-9/commerce/chapter-21.pdf" },
                 { "number": 22, "title": "Chapter 22: Scope of Economics / अध्याय 22: अर्थशास्त्र का क्षेत्र", "pdf": "ebooks/class-9/commerce/chapter-22.pdf" },
                 { "number": 23, "title": "Chapter 23: Enquiry Order / अध्याय 23: पूछताछ आदेश", "pdf": "ebooks/class-9/commerce/chapter-23.pdf" },
                 { "number": 24, "title": "Chapter 24: Importance of Economics / अध्याय 24: अर्थशास्त्र का महत्त्व", "pdf": "ebooks/class-9/commerce/chapter-24.pdf" },
                 { "number": 25, "title": "Chapter 25: Terminology Relating to Economics / अध्याय 25: अर्थशास्त्र संबंधी शब्दावली", "pdf": "ebooks/class-9/commerce/chapter-25.pdf" },
                 { "number": 26, "title": "Chapter 26: Consumption: Meaning, Types and Importance / अध्याय 26: उपभोग: अर्थ, प्रकार एवं महत्त्व", "pdf": "ebooks/class-9/commerce/chapter-26.pdf" },
                 { "number": 27, "title": "Chapter 27: Classification and Characteristics of Human Needs / अध्याय 27: मानवीय आवश्यकताओं का वर्गीकरण एवं विशेषताएँ", "pdf": "ebooks/class-9/commerce/chapter-27.pdf" },
                 { "number": 28, "title": "Chapter 28: Project Work / अध्याय 28: परियोजना कार्य", "pdf": "ebooks/class-9/commerce/chapter-28.pdf" }
             ]
         }

    },

    "10": {

        "Science": {
          "description": "Class 10 Science E-Book Library",
          "image": "subject-images/class-10/science.png",
          "chapters": [
              { "number": 1, "title": "Chapter 1: Chemical Reactions and Equations / अध्याय 1: रासायनिक अभिक्रियाएं एवं समीकरण", "pdf": "ebooks/class-10/science/chapter-01.pdf" },
              { "number": 2, "title": "Chapter 2: Acids, Bases and Salts / अध्याय 2: अम्ल, क्षारक एवं लवण", "pdf": "ebooks/class-10/science/chapter-02.pdf" },
              { "number": 3, "title": "Chapter 3: Metals and Non-metals / अध्याय 3: धातु एवं अधातु", "pdf": "ebooks/class-10/science/chapter-03.pdf" },
              { "number": 4, "title": "Chapter 4: Carbon and Its Compounds / अध्याय 4: कार्बन एवं उसके यौगिक", "pdf": "ebooks/class-10/science/chapter-04.pdf" },
              { "number": 5, "title": "Chapter 5: Life Processes / अध्याय 5: जैव प्रक्रम", "pdf": "ebooks/class-10/science/chapter-05.pdf" },
              { "number": 6, "title": "Chapter 6: Control and Coordination / अध्याय 6: नियंत्रण एवं समन्वय", "pdf": "ebooks/class-10/science/chapter-06.pdf" },
              { "number": 7, "title": "Chapter 7: How do Organisms Reproduce? / अध्याय 7: जीव जनन कैसे करते हैं?", "pdf": "ebooks/class-10/science/chapter-07.pdf" },
              { "number": 8, "title": "Chapter 8: Heredity / अध्याय 8: आनुवंशिकता", "pdf": "ebooks/class-10/science/chapter-08.pdf" },
              { "number": 9, "title": "Chapter 9: Light – Reflection and Refraction / अध्याय 9: प्रकाश – परावर्तन तथा अपवर्तन", "pdf": "ebooks/class-10/science/chapter-09.pdf" },
              { "number": 10, "title": "Chapter 10: The Human Eye and the Colourful World / अध्याय 10: मानव नेत्र तथा रंगबिरंगा संसार", "pdf": "ebooks/class-10/science/chapter-10.pdf" },
              { "number": 11, "title": "Chapter 11: Electricity / अध्याय 11: विद्युत", "pdf": "ebooks/class-10/science/chapter-11.pdf" },
              { "number": 12, "title": "Chapter 12: Magnetic Effects of Electric Current / अध्याय 12: विद्युत धारा के चुंबकीय प्रभाव", "pdf": "ebooks/class-10/science/chapter-12.pdf" },
              { "number": 13, "title": "Chapter 13: Our Environment / अध्याय 13: हमारा पर्यावरण", "pdf": "ebooks/class-10/science/chapter-13.pdf" }
          ]
      },

        "Mathematics": {
            description: "Class 10 Mathematics E-Book Library",
            image: "subject-images/class-10/maths.png",
            chapters: [
                { number: 1, title: "Chapter 1: Real Numbers * अध्याय 1: वास्तविक संख्याएँ", pdf: "ebooks/class-10/mathematics/chapter-01.pdf" },
                { number: 2, title: "Chapter 2: Polynomials * अध्याय 2: बहुपद", pdf: "ebooks/class-10/mathematics/chapter-02.pdf" },
                { number: 3, title: "Chapter 3: Pair of Linear Equations in Two Variables * अध्याय 3: दो चरों वाले रैखिक समीकरण युग्म", pdf: "ebooks/class-10/mathematics/chapter-03.pdf" },
                { number: 4, title: "Chapter 4: Quadratic Equations * अध्याय 4: द्विघात समीकरण", pdf: "ebooks/class-10/mathematics/chapter-04.pdf" },
                { number: 5, title: "Chapter 5: Arithmetic Progressions * अध्याय 5: समांतर श्रेढ़ियाँ", pdf: "ebooks/class-10/mathematics/chapter-05.pdf" },
                { number: 6, title: "Chapter 6: Triangles * अध्याय 6: त्रिभुज", pdf: "ebooks/class-10/mathematics/chapter-06.pdf" },
                { number: 7, title: "Chapter 7: Coordinate Geometry * अध्याय 7: निर्देशांक ज्यामिति", pdf: "ebooks/class-10/mathematics/chapter-07.pdf" },
                { number: 8, title: "Chapter 8: Introduction to Trigonometry * अध्याय 8: त्रिकोणमिति का परिचय", pdf: "ebooks/class-10/mathematics/chapter-08.pdf" },
                { number: 9, title: "Chapter 9: Some Applications of Trigonometry * अध्याय 9: त्रिकोणमिति के कुछ अनुप्रयोग", pdf: "ebooks/class-10/mathematics/chapter-09.pdf" },
                { number: 10, title: "Chapter 10: Circles * अध्याय 10: वृत्त", pdf: "ebooks/class-10/mathematics/chapter-10.pdf" },
                { number: 11, title: "Chapter 11: Areas Related to Circles * अध्याय 11: वृत्तों से संबंधित क्षेत्रफल", pdf: "ebooks/class-10/mathematics/chapter-11.pdf" },
                { number: 12, title: "Chapter 12: Surface Areas and Volumes * अध्याय 12: पृष्ठीय क्षेत्रफल और आयतन", pdf: "ebooks/class-10/mathematics/chapter-12.pdf" },
                { number: 13, title: "Chapter 13: Statistics * अध्याय 13: सांख्यिकी", pdf: "ebooks/class-10/mathematics/chapter-13.pdf" },
                { number: 14, title: "Chapter 14: Probability * अध्याय 14: प्रायिकता", pdf: "ebooks/class-10/mathematics/chapter-14.pdf" }
            ]
        },

        "Hindi": {
             "description": "Class 10 Hindi E-Book Library",
             "image": "subject-images/class-10/Hindi.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Mitrata (Gadya) / अध्याय 1: मित्रता (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Mamta (Gadya) / अध्याय 2: ममता (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Kya Likhoon? (Gadya) / अध्याय 3: क्या लिखूँ? (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Bhartiya Sanskriti (Gadya) / अध्याय 4: भारतीय संस्कृति (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Eershya, Tu Na Gayi Mere Man Se (Gadya) / अध्याय 5: ईर्ष्या, तू न गई मेरे मन से (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Ajanta (Gadya) / अध्याय 6: अजंता (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Paani Mein Chanda Aur Chaand Par Aadmi (Gadya) / अध्याय 7: पानी में चंदा और चाँद पर आदमी (गद्य)", "pdf": "ebooks/class-10/hindi/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Pad - Surdas (Kavya) / अध्याय 8: पद - सूरदास (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Dhanush Bhang - Van Path Par - Tulsidas (Kavya) / अध्याय 9: धनुष भंग - वन पथ पर - तुलसीदास (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Savaiye - Kavitt - Raskhan (Kavya) / अध्याय 10: सवैये - कवित्त - रसखान (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Bhakti Neeti - Bihari Lal (Kavya) / अध्याय 11: भक्ति नीति - बिहारी लाल (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Swadesh Prem - Ramnaresh Tripathi (Kavya) / अध्याय 12: स्वदेश प्रेम - रामनरेश त्रिपाठी (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Bharatmata Ka Mandir Yeh - Maithilisharan Gupt (Kavya) / अध्याय 13: भारतमाता का मन्दिर यह - मैथिलीशरण गुप्त (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Himalaya Se - Mahadevi Verma (Kavya) / अध्याय 14: हिमालय से - महादेवी वर्मा (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Nadi - Kedarnath Singh (Kavya)  / अध्याय 15: नदी - केदारनाथ सिंह (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Pushp Ki Abhilasha - Makhanlal Chaturvedi (Kavya) / अध्याय 16: पुष्प की अभिलाषा - माखनलाल चतुर्वेदी (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: Varanasi (Sanskrit) / अध्याय 17: वाराणसी (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: Veerah Veeren Poojyate (Sanskrit) / अध्याय 18: वीरः वीरेण पूज्यते (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: Prabuddho Graminah (Sanskrit) / अध्याय 19: प्रबुद्धो ग्रामीणः (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: देशभक्तः चन्द्रशेखरः (Sanskrit) / अध्याय 20: देशभक्तः चन्द्रशेखरः (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Bhartiya Sanskriti (Sanskrit) / अध्याय 21: भारतीय संस्कृति (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-21.pdf" },
                 { "number": 22, "title": "Chapter 22: Jivan-Sutrani (Sanskrit) / अध्याय 22: जीवन-सूत्राणि (अनिवार्य संस्कृत)", "pdf": "ebooks/class-10/hindi/chapter-22.pdf" },
                 { "number": 23, "title": "Chapter 23: Hindi Vyakaran - Rasa, Alankar, Chhand / अध्याय 23: हिंदी व्याकरण - रस, अलंकार, छंद", "pdf": "ebooks/class-10/hindi/chapter-23.pdf" },
                 { "number": 24, "title": "Chapter 24: Upasarg, Pratyay, Samas, Tatsam / अध्याय 24: उपसर्ग, प्रत्यय, समास, तत्सम तद्भव", "pdf": "ebooks/class-10/hindi/chapter-24.pdf" },
                 { "number": 25, "title": "Chapter 25: Sanskrit Vyakaran - Sandhi, Shabd Roop, Dhatu Roop / अध्याय 25: संस्कृत व्याकरण - संधि, शब्द रूप, धातु रूप", "pdf": "ebooks/class-10/hindi/chapter-25.pdf" },
                 { "number": 26, "title": "Chapter 26: Nibandh Aur Patra Lekhan / अध्याय 26: निबंध रचना एवं पत्र लेखन", "pdf": "ebooks/class-10/hindi/chapter-26.pdf" },
                { "number": 27, "title": "Chapter 27: Anyoktivilash: / अध्याय 27: अन्योक्तिविलासः", "pdf": "ebooks/class-10/hindi/chapter-27.pdf" },
                { "number": 28, "title": "Chapter 28: Aruni-shwetketu-samvaadah: / अध्याय 28: आरुणि-श्वेतकेतु-संवादः", "pdf": "ebooks/class-10/hindi/chapter-28.pdf" },
                { "number": 29, "title": "Chapter 29: Chiti - Chandralok me Pratham Baar - Sumitranandan Pant / अध्याय 29: चींटी - चन्द्रलोक में प्रथम बार - सुमित्रानन्दन पन्त", "pdf": "ebooks/class-10/hindi/chapter-29.pdf" },
                { "number": 30, "title": "Chapter 30: Haldighaati - Shyaamnarayan Pandey  / अध्याय 30: हल्दीघाटी - श्यामनारायण पाण्डेय", "pdf": "ebooks/class-10/hindi/chapter-30.pdf" },
                { "number": 31, "title": "Chapter 31: Ken kim Vardhate? / अध्याय 31: केन किं वर्धते?", "pdf": "ebooks/class-10/hindi/chapter-31.pdf" },
                { "number": 32, "title": "Chapter 32: Jhanshi ki Rani ki Samadhi par - Subhadrakumari Chauhan (Kavya) / अध्याय 32: झाँसी की रानी की समाधि परी - सुभद्राकुमारी चौहान (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-32.pdf" }
             ]
         },

        "English": {
             "description": "Class 10 English E-Book Library",
             "image": "subject-images/class-10/english.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: A Letter to God (Prose) / अध्याय 1: ए लेटर टू गॉड (गद्य)", "pdf": "ebooks/class-10/english/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Dust of Snow (Poem) / अध्याय 2: डस्ट ऑफ़ स्नो (कविता)", "pdf": "ebooks/class-10/english/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Fire and Ice (Poem) / अध्याय 3: फायर एंड आइस (कविता)", "pdf": "ebooks/class-10/english/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Nelson Mandela: Long Walk to Freedom (Prose) / अध्याय 4: नेल्सन मंडेला: लॉन्ग वॉक टू फ्रीडम (गद्य)", "pdf": "ebooks/class-10/english/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: A Tiger in the Zoo (Poem) / अध्याय 5: ए टाइगर इन द ज़ू (कविता)", "pdf": "ebooks/class-10/english/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Two Stories About Flying (Prose) / अध्याय 6: टू स्टोरीज़ अबाउट फ्लाइंग (गद्य)", "pdf": "ebooks/class-10/english/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: How to Tell Wild Animals (Poem) / अध्याय 7: हाउ टू टेल वाइल्ड एनिमल्स (कविता)", "pdf": "ebooks/class-10/english/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: The Ball Poem (Poem) / अध्याय 8: द बॉल पोयम (कविता)", "pdf": "ebooks/class-10/english/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: From the Diary of Anne Frank (Prose) / अध्याय 9: फ्रॉम द डायरी ऑफ़ एन फ्रैंक (गद्य)", "pdf": "ebooks/class-10/english/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Amanda! (Poem) / अध्याय 10: अमांडा! (कविता)", "pdf": "ebooks/class-10/english/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Glimpses of India (Prose) / अध्याय 11: ग्लिम्पसेस ऑफ़ इंडिया (गद्य)", "pdf": "ebooks/class-10/english/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: The Trees (Poem) / अध्याय 12: द ट्रीज़ (कविता)", "pdf": "ebooks/class-10/english/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Mijbil the Otter (Prose) / अध्याय 13: मिजबिल द ऑटर (गद्य)", "pdf": "ebooks/class-10/english/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Fog (Poem) / अध्याय 14: फॉग (कविता)", "pdf": "ebooks/class-10/english/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Madam Rides the Bus (Prose) / अध्याय 15: मैडम राइड्स द बस (गद्य)", "pdf": "ebooks/class-10/english/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: The Tale of Custard the Dragon (Poem) / अध्याय 16: द टेल ऑफ़ कस्टर्ड द ड्रैगन (कविता)", "pdf": "ebooks/class-10/english/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: The Sermon at Benares (Prose) / अध्याय 17: द सरमन एट बनारस (गद्य)", "pdf": "ebooks/class-10/english/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: For Anne Gregory (Poem) / अध्याय 18: फॉर एन ग्रेगरी (कविता)", "pdf": "ebooks/class-10/english/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: The Proposal (Prose) / अध्याय 19: द प्रपोज़ल (गद्य)", "pdf": "ebooks/class-10/english/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: A Triumph of Surgery (Supplementary) / अध्याय 20: ए ट्राइंफ ऑफ़ सर्जरी (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: The Thief's Story (Supplementary) / अध्याय 21: द थीफ़्स स्टोरी (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-21.pdf" },
                 { "number": 22, "title": "Chapter 22: The Midnight Visitor (Supplementary) / अध्याय 22: द मिडनाइट विज़िटर (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-22.pdf" },
                 { "number": 23, "title": "Chapter 23: A Question of Trust (Supplementary) / अध्याय 23: ए क्वेश्चन ऑफ़ ट्रस्ट (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-23.pdf" },
                 { "number": 24, "title": "Chapter 24: Footprints Without Feet (Supplementary) / अध्याय 24: फुटप्रिंट्स विदाउट फ़ीट (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-24.pdf" },
                 { "number": 25, "title": "Chapter 25: The Making of a Scientist (Supplementary) / अध्याय 25: द मेकिंग ऑफ़ ए साइंटिस्ट (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-25.pdf" },
                 { "number": 26, "title": "Chapter 26: The Necklace (Supplementary) / अध्याय 26: द नेकलेस (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-26.pdf" },
                 { "number": 27, "title": "Chapter 27: Bholi (Supplementary) / अध्याय 27: भोली (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-27.pdf" },
                 { "number": 28, "title": "Chapter 28: The Book That Saved the Earth (Supplementary) / अध्याय 28: द बुक दैट सेव्ड द अर्थ (पूरक पाठ)", "pdf": "ebooks/class-10/english/chapter-28.pdf" },
                 { "number": 29, "title": "Grammar: Tenses, Articles, Reordering of Sentences / व्याकरण: काल, आर्टिकल्स, वाक्यों को व्यवस्थित करना", "pdf": "ebooks/class-10/english/chapter-29.pdf" },
                 { "number": 30, "title": "Grammar: Voice, Narration, Punctuation / व्याकरण: वाच्य, कथन, विराम चिह्न", "pdf": "ebooks/class-10/english/chapter-30.pdf" },
                 { "number": 31, "title": "Composition: Letter, Application & Descriptive Paragraph Writing / पत्र, प्रार्थना पत्र एवं निबंध लेखन", "pdf": "ebooks/class-10/english/chapter-31.pdf" },
                 { "number": 32, "title": "Unseen Passage & Translation (Hindi to English) / अपठित गद्यांश एवं अनुवाद (हिंदी से अंग्रेजी)", "pdf": "ebooks/class-10/english/chapter-32.pdf" }
             ]
         },


        "Social Science": {
             "description": "Class 10 Social Science E-Book Library",
             "image": "subject-images/class-10/socialscience.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: The Rise of Nationalism in Europe / अध्याय 1: यूरोप में राष्ट्रवाद का उदय", "pdf": "ebooks/class-10/social-science/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Nationalism in India / अध्याय 2: भारत में राष्ट्रवाद", "pdf": "ebooks/class-10/social-science/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: The Making of a Global World / अध्याय 3: भूमंडलीकृत विश्व का बनना", "pdf": "ebooks/class-10/social-science/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: The Age of Industrialization / अध्याय 4: औद्योगिकीकरण का युग", "pdf": "ebooks/class-10/social-science/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Print Culture and the Modern World / अध्याय 5: मुद्रण संस्कृति और आधुनिक दुनिया", "pdf": "ebooks/class-10/social-science/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Resources and Development / अध्याय 6: संसाधन और विकास", "pdf": "ebooks/class-10/social-science/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Forest and Wildlife Resources / अध्याय 7: वन और वन्यजीव संसाधन", "pdf": "ebooks/class-10/social-science/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Water Resources / अध्याय 8: जल संसाधन", "pdf": "ebooks/class-10/social-science/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Agriculture / अध्याय 9: कृषि", "pdf": "ebooks/class-10/social-science/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Minerals and Energy Resources / अध्याय 10: खनिज और ऊर्जा संसाधन", "pdf": "ebooks/class-10/social-science/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Manufacturing Industries / अध्याय 11: विनिर्माण उद्योग", "pdf": "ebooks/class-10/social-science/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Lifelines of National Economy / अध्याय 12: राष्ट्रीय अर्थव्यवस्था की जीवन रेखाएँ", "pdf": "ebooks/class-10/social-science/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Power Sharing / अध्याय 13: सत्ता की साझेदारी", "pdf": "ebooks/class-10/social-science/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Federalism / अध्याय 14: संघवाद", "pdf": "ebooks/class-10/social-science/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Gender, Religion and Caste / अध्याय 15: जाति, धर्म और लैंगिक मसले", "pdf": "ebooks/class-10/social-science/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Political Parties / अध्याय 16: राजनीतिक दल", "pdf": "ebooks/class-10/social-science/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: Outcomes of Democracy / अध्याय 17: लोकतंत्र के परिणाम", "pdf": "ebooks/class-10/social-science/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: Development / अध्याय 18: विकास", "pdf": "ebooks/class-10/social-science/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: Sectors of the Indian Economy / अध्याय 19: भारतीय अर्थव्यवस्था के क्षेत्रक", "pdf": "ebooks/class-10/social-science/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: Money and Credit / अध्याय 20: मुद्रा और साख", "pdf": "ebooks/class-10/social-science/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Globalization and the Indian Economy / अध्याय 21: वैश्वीकरण और भारतीय अर्थव्यवस्था", "pdf": "ebooks/class-10/social-science/chapter-21.pdf" },
                 { "number": 22, "title": "Chapter 22: Consumer Rights / अध्याय 22: उपभोक्ता अधिकार", "pdf": "ebooks/class-10/social-science/chapter-22.pdf" }
             ]
         },

        "Chitrakala": {
          "description": "Class 10 Chitrakala E-Book Library",
          "image": "subject-images/class-10/chitrakala.png",
          "chapters": [
              { "number": 1, "title": "Chapter 1: Elements of Art & Color Theory / खण्ड 'क': कला के तत्व एवं रंग सिद्धांत", "pdf": "ebooks/class-10/chitrakala/chapter-01.pdf" },
              { "number": 2, "title": "Chapter 2: Choice of Core Practical Art / खण्ड 'ख': मुख्य व्यावहारिक कला", "pdf": "ebooks/class-10/chitrakala/chapter-02.pdf" },
              { "number": 3, "title": "Chapter 3: Natural Landscape Drawing / विकल्प 1: प्राकृतिक दृश्य चित्रण", "pdf": "ebooks/class-10/chitrakala/chapter-03.pdf" },
              { "number": 4, "title": "Chapter 4: Ornamental Design (Aalekhan) / विकल्प 2: आलेखन कला", "pdf": "ebooks/class-10/chitrakala/chapter-04.pdf" },
              { "number": 5, "title": "Chapter 5: Technical / Geometric Art (Pravaidhik) / विकल्प 3: प्राविधिक कला", "pdf": "ebooks/class-10/chitrakala/chapter-05.pdf" },
              { "number": 6, "title": "Chapter 6: Memory Drawing OR Indian Art / खण्ड 'ग': स्मृति चित्रण अथवा भारतीय चित्रकला", "pdf": "ebooks/class-10/chitrakala/chapter-06.pdf" },
              { "number": 7, "title": "Chapter 7: Memory Drawing (Shading Practice) / विकल्प 1: स्मृति चित्रण (पेंसिल शेडिंग)", "pdf": "ebooks/class-10/chitrakala/chapter-07.pdf" },
              { "number": 8, "title": "Chapter 8: History of Indian Art (Theory) / विकल्प 2: भारतीय चित्रकला का इतिहास (सैद्धांतिक)", "pdf": "ebooks/class-10/chitrakala/chapter-08.pdf" }
          ]
      },

       "Home Science": {
          "description": "Class 10 Home Science E-Book Library",
          "image": "subject-images/class-10/homescience.png",
          "chapters": [
              { "number": 1, "title": "Chapter 1: Family Budget / अध्याय 1: पारिवारिक बजट", "pdf": "ebooks/class-10/home-science/chapter-01.pdf" },
              { "number": 2, "title": "Chapter 2: Investment of Savings / अध्याय 2: बचत का निवेश", "pdf": "ebooks/class-10/home-science/chapter-02.pdf" },
              { "number": 3, "title": "Chapter 3: Home Cleanliness / अध्याय 3: घर की स्वच्छता", "pdf": "ebooks/class-10/home-science/chapter-03.pdf" },
              { "number": 4, "title": "Chapter 4: Waste Disposal and Cleanliness / अध्याय 4: अपशिष्ट निपटान और स्वच्छता", "pdf": "ebooks/class-10/home-science/chapter-04.pdf" },
              { "number": 5, "title": "Chapter 5: Home Decoration / अध्याय 5: गृह सज्जा", "pdf": "ebooks/class-10/home-science/chapter-05.pdf" },
              { "number": 6, "title": "Chapter 6: Household Mathematics (Home Arithmetic) / अध्याय 6: घरेलू गणित", "pdf": "ebooks/class-10/home-science/chapter-06.pdf" },
              { "number": 7, "title": "Chapter 7: Water Sources: Use and Purification / अध्याय 7: जल स्रोत: उपयोग और शुद्धिकरण", "pdf": "ebooks/class-10/home-science/chapter-07.pdf" },
              { "number": 8, "title": "Chapter 8: Water-Borne Diseases / अध्याय 8: जलजनित रोग", "pdf": "ebooks/class-10/home-science/chapter-08.pdf" },
              { "number": 9, "title": "Chapter 9: Environmental Pollution and its Effect on Human Life / अध्याय 9: पर्यावरण प्रदूषण और मानव जीवन पर इसके प्रभाव", "pdf": "ebooks/class-10/home-science/chapter-09.pdf" },
              { "number": 10, "title": "Chapter 10: Some Common Diseases, Causes and Prevention / अध्याय 10: कुछ सामान्य रोग, उनके कारण और रोकथाम", "pdf": "ebooks/class-10/home-science/chapter-10.pdf" },
              { "number": 11, "title": "Chapter 11: Sewing Kit and Garment Making Art / अध्याय 11: सिलाई किट एवं वस्त्र-निर्माण कला", "pdf": "ebooks/class-10/home-science/chapter-11.pdf" },
              { "number": 12, "title": "Chapter 12: Washing and Maintenance of Clothes / अध्याय 12: वस्त्रों की धुलाई एवं रख-रखाव", "pdf": "ebooks/class-10/home-science/chapter-12.pdf" },
              { "number": 13, "title": "Chapter 13: Kitchen Management, Care and Cleaning / अध्याय 13: रसोईघर की व्यवस्था, देख-रेख एवं सफाई", "pdf": "ebooks/class-10/home-science/chapter-13.pdf" },
              { "number": 14, "title": "Chapter 14: Cooking, Serving Food and Preservation of Nutrients / अध्याय 14: भोजन पकाना, परोसना एवं तत्त्वों की सुरक्षा", "pdf": "ebooks/class-10/home-science/chapter-14.pdf" },
              { "number": 15, "title": "Chapter 15: Human Skeleton and Joints / अध्याय 15: मानव अस्थि संस्थान तथा संधियाँ", "pdf": "ebooks/class-10/home-science/chapter-15.pdf" },
              { "number": 16, "title": "Chapter 16: Fractures and Sprains / अध्याय 16: हड्डियों की टूट और मोच", "pdf": "ebooks/class-10/home-science/chapter-16.pdf" },
              { "number": 17, "title": "Chapter 17: Respiratory System: Basic Knowledge / अध्याय 17: श्वसन तन्त्र का प्रारम्भिक ज्ञान", "pdf": "ebooks/class-10/home-science/chapter-17.pdf" },
              { "number": 18, "title": "Chapter 18: Natural and Artificial Respiration / अध्याय 18: प्राकृतिक और कृत्रिम श्वसन क्रिया", "pdf": "ebooks/class-10/home-science/chapter-18.pdf" },
              { "number": 19, "title": "Chapter 19: First Aid and Care of the Sick / अध्याय 19: प्राथमिक चिकित्सा और रोगी की परिचर्या", "pdf": "ebooks/class-10/home-science/chapter-19.pdf" }
          ]
      },


        "Computer": {
            description: "Class 10 Computer E-Book Library",
            image: "subject-images/class-10/computer.png",
            chapters: [
                { number: 1, title: "Chapter 1: Functions in C", pdf: "ebooks/class-10/computer/chapter-01.pdf" },
                { number: 2, title: "Chapter 2: Arrays in C", pdf: "ebooks/class-10/computer/chapter-02.pdf" },
                { number: 3, title: "Chapter 3: C - Function or Subroutine: Searching and Sorting Techniques", pdf: "ebooks/class-10/computer/chapter-03.pdf" },
                { number: 4, title: "Chapter 4: Structures and Union", pdf: "ebooks/class-10/computer/chapter-04.pdf" },
                { number: 5, title: "Chapter 5: Pointers and File Handling", pdf: "ebooks/class-10/computer/chapter-05.pdf" },
                { number: 6, title: "Chapter 6: Introduction to Artificial Intelligence (AI) and Types and Applications of AI", pdf: "ebooks/class-10/computer/chapter-06.pdf" },
                { number: 7, title: "Chapter 7: Drone / UAV Technology", pdf: "ebooks/class-10/computer/chapter-07.pdf" },
                { number: 8, title: "Chapter 8: E- and E-Governance", pdf: "ebooks/class-10/computer/chapter-08.pdf" },
               { number: 9, title: "Chapter 9: Cyber Crimes and Security", pdf: "ebooks/class-10/computer/chapter-09.pdf" },
               { number: 10, title: "Chapter 10: Programs Based on C Language", pdf: "ebooks/class-10/computer/chapter-10.pdf" }
            ]
        },

      //  "Music": {
      //     "description": "Class 10 Music E-Book Library",
      //     "image": "subject-images/class-10/music.png",
      //     "chapters": [
      //         { "number": 1, "title": "Chapter 1: Definition of Technical Terms (Nada, Shruti, Swara, Saptak) / अध्याय 1: पारिभाषिक शब्दों की व्याख्या (नाद, श्रुति, स्वर, सप्तक)", "pdf": "ebooks/class-10/music/chapter-01.pdf" },
      //         { "number": 2, "title": "Chapter 2: Raga Architecture: Aroha, Avaroha, Pakad, Vadi, Samvadi / अध्याय 2: राग लक्षण: आरोह, अवरोह, पकड़, वादी, संवादी स्वर", "pdf": "ebooks/class-10/music/chapter-02.pdf" },
      //         { "number": 3, "title": "Chapter 3: Study of Ragas: Bhairav, Asavari, Kafi, Bhupali / अध्याय 3: निर्धारित रागों का विस्तृत अध्ययन: भैरव, आसावरी, काफी, भूपाली", "pdf": "ebooks/class-10/music/chapter-03.pdf" },
      //         { "number": 4, "title": "Chapter 4: Study of Ragas: Yaman, Bilawal, Khamaj / अध्याय 4: रागों का अध्ययन: यमन, बिलावल, खमाज", "pdf": "ebooks/class-10/music/chapter-04.pdf" },
      //         { "number": 5, "title": "Chapter 5: Concepts of Tala & Laya (Vilambit, Madhya, Drut) / अध्याय 5: ताल एवं लय की अवधारणा (विलम्बित, मध्य, द्रुत)", "pdf": "ebooks/class-10/music/chapter-05.pdf" },
      //         { "number": 6, "title": "Chapter 6: Study of Talas: Teental, Dadra, Kaharwa, Jhaptal / अध्याय 6: निर्धारित तालों का परिचय: तीनताल, दादरा, कहरवा, झपताल", "pdf": "ebooks/class-10/music/chapter-06.pdf" },
      //         { "number": 7, "title": "Chapter 7: Study of Talas: Chartal, Sooltal, Rupak / अध्याय 7: तालों का परिचय: चारताल, शूलताल, रूपक", "pdf": "ebooks/class-10/music/chapter-07.pdf" },
      //         { "number": 8, "title": "Chapter 8: Introduction to Indian Notation System (Bhatkhande / Paluskar) / अध्याय 8: भारतीय स्वरलिपि पद्धति का परिचय (भातखण्डे / पलुस्कर)", "pdf": "ebooks/class-10/music/chapter-08.pdf" },
      //         { "number": 9, "title": "Chapter 9: Description of Musical Instruments (Tanpura, Tabla, Harmonium, Sitar) / अध्याय 9: प्रमुख वाद्यों का विवरण (तानपुरा, तबला, हारमोनियम, सितार)", "pdf": "ebooks/class-10/music/chapter-09.pdf" },
      //         { "number": 10, "title": "Chapter 10: Biographies of Eminent Musicians / Contributors / अध्याय 10: प्रसिद्ध संगीतज्ञों का जीवन परिचय एवं योगदान", "pdf": "ebooks/class-10/music/chapter-10.pdf" }
      //     ]
      // },

       "Commerce": {
             "description": "Class 10 Commerce E-Book Library",
             "image": "subject-images/class-10/commerce.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Final Accounts with Adjustments (Accountancy) / अध्याय 1: अंतिम खाते (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-01.pdf" },
                 // { "number": 2, "title": "Chapter 2: Partnership Accounts (Accountancy) / अध्याय 2: साझेदारी खाते (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 2: Partnership Accounts (Accountancy) Bank Reconciliation Statement (Accountancy) / अध्याय 2: साझेदारी खाते (बहीखाता) बैंक समाधान विवरण (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-03.pdf" },
                 // { "number": 4, "title": "Chapter 4: Depreciation (Accountancy) / अध्याय 4: ह्रास (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 3: Depreciation (Accountancy) Bills of Exchange, Promissory Notes & Hundi / अध्याय 3: ह्रास (बहीखाता) विनिमय-विपत्र, प्रतिज्ञा-पत्र व हुण्डी", "pdf": "ebooks/class-10/commerce/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 4: Filing / System of Filing (Business Methods) / अध्याय 4: नस्तीकरण या फाइलिंग (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 5: Indexing (Business Methods) / अध्याय 5: अनुक्रमणिका या श्रेणीबद्ध सूची (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 6: Means of Communication (Business Methods) / अध्याय 6: संदेशवाहन प्रणालियाँ (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 7: Time and Labor-Saving Appliances / अध्याय 7: समय व श्रम बचाने वाले यंत्र (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 8: Home Trade / Inland Trade (Business Methods) / अध्याय 8: देशी व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 9: Wholesale Trade (Business Methods) / अध्याय 9: थोक व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 10: Retail Trade (Business Methods) / अध्याय 10: फुटकर व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 11: Invoice and Statement of Account / अध्याय 11: बीजक एवं व्यवहार विवरण (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-13.pdf" },
                 // { "number": 14, "title": "Chapter 14: Export and Import Trade (Business Methods) / अध्याय 14: विदेशी व्यापार - आयात और निर्यात (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 12: Export and Import Trade (Business Methods) Banking: Origin and Functions (Banking) / अध्याय 12: विदेशी व्यापार - आयात और निर्यात (व्यावसायिक पद्धति) बैंक: उत्पत्ति एवं कार्य (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 13: Central Bank / Reserve Bank of India (Banking) / अध्याय 13: केन्द्रीय बैंक / भारतीय रिजर्व बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 14: Commercial Banks and Co-operative Banks / अध्याय 14: व्यापारिक बैंक एवं सहकारी बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 15: State Bank of India (Banking) / अध्याय 15: भारतीय स्टेट बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 16: Indigenous Bankers & Meaning and Scope of Economics (Economics) / अध्याय 16: देशी बैंकर या साहूकार (अधिकोषण तत्त्व) & अर्थशास्त्र का अर्थ एवं क्षेत्र (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-20.pdf" },
                 // { "number": 20, "title": "Chapter 16: Indigenous Bankers & Meaning and Scope of Economics (Economics) / अध्याय 16: देशी बैंकर या साहूकार (अधिकोषण तत्त्व) & अर्थशास्त्र का अर्थ एवं क्षेत्र (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Factors of Production: Land, Labor, Capital & Organization and Enterprise (Economics) & Consumer's Surplus (Economics) / अध्याय 21: उत्पादन के साधन: भूमि, श्रम, पूँजी (अर्थशास्त्र) & संगठन एवं साहस (अर्थशास्त्र) & उपभोक्ता की बचत (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-21.pdf" }
                 // { "number": 22, "title": "Chapter 22: Organization and Enterprise (Economics) / अध्याय 22: संगठन एवं साहस (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-22.pdf" },
                 // { "number": 23, "title": "Chapter 23: Consumer's Surplus (Economics) / अध्याय 23: उपभोक्ता की बचत (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-23.pdf" }
             ]
         }

    },

    /* =====================  CLASS 11  ===================== */
    "11": {

        "Physics": {
            "description": "Class 11 Physics E-Book Library",
            "image": "subject-images/class-11/physics.png",
            "chapters": [
               { "number": 1, "title": "Chapter 1: Physical World / अध्याय 1: भौतिक जगत", "pdf": "ebooks/class-11/physics/chapter-01.pdf" },
               { "number": 2, "title": "Chapter 2: Units and Measurements / अध्याय 2: मात्रक एवं मापन", "pdf": "ebooks/class-11/physics/chapter-02.pdf" },
               { "number": 3, "title": "Chapter 3: Motion in a Straight Line / अध्याय 3: सरल रेखा में गति", "pdf": "ebooks/class-11/physics/chapter-03.pdf" },
               { "number": 4, "title": "Chapter 4: Motion in a Plane / अध्याय 4: समतल में गति", "pdf": "ebooks/class-11/physics/chapter-04.pdf" },
               { "number": 5, "title": "Chapter 5: Laws of Motion / अध्याय 5: गति के नियम", "pdf": "ebooks/class-11/physics/chapter-05.pdf" },
               { "number": 6, "title": "Chapter 6: Work, Energy and Power / अध्याय 6: कार्य, ऊर्जा और शक्ति", "pdf": "ebooks/class-11/physics/chapter-06.pdf" },
               { "number": 7, "title": "Chapter 7: System of Particles and Rotational Motion / अध्याय 7: कणों के निकाय तथा घूर्णी गति", "pdf": "ebooks/class-11/physics/chapter-07.pdf" },
               { "number": 8, "title": "Chapter 8: Gravitation / अध्याय 8: गुरुत्वाकर्षण", "pdf": "ebooks/class-11/physics/chapter-08.pdf" },
               { "number": 9, "title": "Chapter 9: Mechanical Properties of Solids / अध्याय 9: ठोसों के यांत्रिक गुण", "pdf": "ebooks/class-11/physics/chapter-09.pdf" },
               { "number": 10, "title": "Chapter 10: Mechanical Properties of Fluids / अध्याय 10: तरलों के यांत्रिक गुण", "pdf": "ebooks/class-11/physics/chapter-10.pdf" },
               { "number": 11, "title": "Chapter 11: Thermal Properties of Matter / अध्याय 11: पदार्थ के तापीय गुण", "pdf": "ebooks/class-11/physics/chapter-11.pdf" },
               { "number": 12, "title": "Chapter 12: Thermodynamics / अध्याय 12: ऊष्मागतिकी", "pdf": "ebooks/class-11/physics/chapter-12.pdf" },
               { "number": 13, "title": "Chapter 13: Kinetic Theory / अध्याय 13: अणुगति सिद्धांत", "pdf": "ebooks/class-11/physics/chapter-13.pdf" },
               { "number": 14, "title": "Chapter 14: Oscillations / अध्याय 14: दोलन", "pdf": "ebooks/class-11/physics/chapter-14.pdf" },
               { "number": 15, "title": "Chapter 15: Waves / अध्याय 15: तरंगें", "pdf": "ebooks/class-11/physics/chapter-15.pdf" }
             ]
        },

        "Chemistry": {
            "description": "Class 11 Chemistry E-Book Library",
            "image": "subject-images/class-11/chemistry.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Some Basic Concepts of Chemistry / अध्याय 1: रसायन विज्ञान की कुछ मूल अवधारणाएँ", "pdf": "ebooks/class-11/chemistry/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Structure of Atom / अध्याय 2: परमाणु की संरचना", "pdf": "ebooks/class-11/chemistry/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Classification of Elements and Periodicity / अध्याय 3: तत्वों का वर्गीकरण एवं गुणधर्मों में आवर्तिता", "pdf": "ebooks/class-11/chemistry/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Chemical Bonding and Molecular Structure / अध्याय 4: रासायनिक आबंधन तथा आण्विक संरचना", "pdf": "ebooks/class-11/chemistry/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: States of Matter / अध्याय 5: पदार्थ की अवस्थाएँ", "pdf": "ebooks/class-11/chemistry/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Thermodynamics / अध्याय 6: ऊष्मागतिकी", "pdf": "ebooks/class-11/chemistry/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Equilibrium / अध्याय 7: साम्यावस्था", "pdf": "ebooks/class-11/chemistry/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Redox Reactions / अध्याय 8: अपचयोपचय अभिक्रियाएँ", "pdf": "ebooks/class-11/chemistry/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Hydrogen / अध्याय 9: हाइड्रोजन", "pdf": "ebooks/class-11/chemistry/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: s-Block Elements / अध्याय 10: s-ब्लॉक तत्व", "pdf": "ebooks/class-11/chemistry/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: Organic Chemistry – Basic Principles and Techniques / अध्याय 11: कार्बनिक रसायन – कुछ आधारभूत सिद्धांत तथा तकनीकें", "pdf": "ebooks/class-11/chemistry/chapter-11.pdf" },
                { "number": 12, "title": "Chapter 12: Hydrocarbons / अध्याय 12: हाइड्रोकार्बन", "pdf": "ebooks/class-11/chemistry/chapter-12.pdf" },
                { "number": 13, "title": "Chapter 13: Environmental Chemistry / अध्याय 13: पर्यावरणीय रसायन", "pdf": "ebooks/class-11/chemistry/chapter-13.pdf" }
            ]
        },

        "Mathematics": {
            "description": "Class 11 Mathematics E-Book Library",
            "image": "subject-images/class-11/maths.png",
           "chapters": [
               { "number": 1, "title": "Chapter 1: Sets / अध्याय 1: समुच्चय", "pdf": "ebooks/class-11/mathematics/chapter-01.pdf" },
               { "number": 2, "title": "Chapter 2: Relations and Functions / अध्याय 2: संबंध एवं फलन", "pdf": "ebooks/class-11/mathematics/chapter-02.pdf" },
               { "number": 3, "title": "Chapter 3: Trigonometric Functions / अध्याय 3: त्रिकोणमितीय फलन", "pdf": "ebooks/class-11/mathematics/chapter-03.pdf" },
               { "number": 4, "title": "Chapter 4: Complex Numbers and Quadratic Equations / अध्याय 4: सम्मिश्र संख्याएँ एवं द्विघात समीकरण", "pdf": "ebooks/class-11/mathematics/chapter-04.pdf" },
               { "number": 5, "title": "Chapter 5: Linear Inequalities / अध्याय 5: रैखिक असमिकाएँ", "pdf": "ebooks/class-11/mathematics/chapter-05.pdf" },
               { "number": 6, "title": "Chapter 6: Permutations and Combinations / अध्याय 6: क्रमचय और संचय", "pdf": "ebooks/class-11/mathematics/chapter-06.pdf" },
               { "number": 7, "title": "Chapter 7: Binomial Theorem / अध्याय 7: द्विपद प्रमेय", "pdf": "ebooks/class-11/mathematics/chapter-07.pdf" },
               { "number": 8, "title": "Chapter 8: Sequences and Series / अध्याय 8: अनुक्रम तथा श्रेणी", "pdf": "ebooks/class-11/mathematics/chapter-08.pdf" },
               { "number": 9, "title": "Chapter 9: Straight Lines / अध्याय 9: सरल रेखाएँ", "pdf": "ebooks/class-11/mathematics/chapter-09.pdf" },
               { "number": 10, "title": "Chapter 10: Cartesian Coordinates / अध्याय 10: कार्तीय निर्देशांक", "pdf": "ebooks/class-11/mathematics/chapter-10.pdf" },
               { "number": 11, "title": "Chapter 11: Circle / अध्याय 11: वृत्त", "pdf": "ebooks/class-11/mathematics/chapter-11.pdf" },
               { "number": 12, "title": "Chapter 12: Parabola / अध्याय 12: परवलय", "pdf": "ebooks/class-11/mathematics/chapter-12.pdf" },
               { "number": 13, "title": "Chapter 13: Ellipse / अध्याय 13: दीर्घवृत्त", "pdf": "ebooks/class-11/mathematics/chapter-13.pdf" },
               { "number": 14, "title": "Chapter 14: Hyperbola / अध्याय 14: अतिपरवलय", "pdf": "ebooks/class-11/mathematics/chapter-14.pdf" },
               { "number": 15, "title": "Chapter 15: Introduction to Three Dimensional Geometry / अध्याय 15: त्रिविमीय ज्यामिति का परिचय", "pdf": "ebooks/class-11/mathematics/chapter-15.pdf" },
               { "number": 16, "title": "Chapter 16: Limits / अध्याय 16: सीमा", "pdf": "ebooks/class-11/mathematics/chapter-16.pdf" },
               { "number": 17, "title": "Chapter 17: Derivatives / अध्याय 17: अवकलज", "pdf": "ebooks/class-11/mathematics/chapter-17.pdf" },
               { "number": 18, "title": "Chapter 18: Statistics / अध्याय 18: सांख्यिकी", "pdf": "ebooks/class-11/mathematics/chapter-18.pdf" },
               { "number": 19, "title": "Chapter 19: Probability / अध्याय 19: प्रायिकता", "pdf": "ebooks/class-11/mathematics/chapter-19.pdf" },
               { "number": 20, "title": "Chapter 20: Sine and Cosine Formulae / अध्याय 20: ज्या और कोज्या सूत्र", "pdf": "ebooks/class-11/mathematics/chapter-20.pdf" }
             ]
        },

        "English": {
            "description": "Class 11 English E-Book Library",
            "image": "subject-images/class-11/english.png",
            "chapters": [
                { "number": 1, "title": "Hornbill 1: The Portrait of a Lady", "pdf": "ebooks/class-11/english/chapter-01.pdf" },
                { "number": 2, "title": "Hornbill 2: We're Not Afraid to Die... If We Can All Be Together", "pdf": "ebooks/class-11/english/chapter-02.pdf" },
                { "number": 3, "title": "Hornbill 3: Discovering Tut: the Saga Continues", "pdf": "ebooks/class-11/english/chapter-03.pdf" },
                { "number": 4, "title": "Hornbill 4: Landscape of the Soul", "pdf": "ebooks/class-11/english/chapter-04.pdf" },
                { "number": 5, "title": "Hornbill 5: The Ailing Planet: the Green Movement's Role", "pdf": "ebooks/class-11/english/chapter-05.pdf" },
                { "number": 6, "title": "Hornbill 6: The Browning Version", "pdf": "ebooks/class-11/english/chapter-06.pdf" },
                { "number": 7, "title": "Hornbill 7: The Adventure", "pdf": "ebooks/class-11/english/chapter-07.pdf" },
                { "number": 8, "title": "Hornbill 8: Silk Road", "pdf": "ebooks/class-11/english/chapter-08.pdf" },
                { "number": 9, "title": "Poem 1: A Photograph", "pdf": "ebooks/class-11/english/chapter-09.pdf" },
                { "number": 10, "title": "Poem 2: The Laburnum Top", "pdf": "ebooks/class-11/english/chapter-10.pdf" },
                { "number": 11, "title": "Poem 3: The Voice of the Rain", "pdf": "ebooks/class-11/english/chapter-11.pdf" },
                { "number": 12, "title": "Poem 4: Childhood", "pdf": "ebooks/class-11/english/chapter-12.pdf" },
                { "number": 13, "title": "Poem 5: Father to Son", "pdf": "ebooks/class-11/english/chapter-13.pdf" },
                { "number": 14, "title": "Snapshots 1: The Summer of the Beautiful White Horse", "pdf": "ebooks/class-11/english/chapter-14.pdf" },
                { "number": 15, "title": "Snapshots 2: The Address", "pdf": "ebooks/class-11/english/chapter-15.pdf" },
                { "number": 16, "title": "Snapshots 3: Ranga's Marriage", "pdf": "ebooks/class-11/english/chapter-16.pdf" },
                { "number": 17, "title": "Snapshots 4: Albert Einstein at School", "pdf": "ebooks/class-11/english/chapter-17.pdf" },
                { "number": 18, "title": "Snapshots 5: Mother's Day", "pdf": "ebooks/class-11/english/chapter-18.pdf" },
                { "number": 19, "title": "Snapshots 6: The Ghat of the Only World", "pdf": "ebooks/class-11/english/chapter-19.pdf" },
                { "number": 20, "title": "Snapshots 7: Birth", "pdf": "ebooks/class-11/english/chapter-20.pdf" },
                { "number": 21, "title": "Snapshots 8: The Tale of Melon City", "pdf": "ebooks/class-11/english/chapter-21.pdf" }
            ]
        },

        "Hindi": {
            "description": "Class 11 Hindi E-Book Library",
            "image": "subject-images/class-11/hindi.png",
            "chapters": [
                { "number": 1, "title": "आरोह (गद्य) 1: नमक का दारोगा", "pdf": "ebooks/class-11/hindi/chapter-01.pdf" },
                { "number": 2, "title": "आरोह (गद्य) 2: मियाँ नसीरुद्दीन", "pdf": "ebooks/class-11/hindi/chapter-02.pdf" },
                { "number": 3, "title": "आरोह (गद्य) 3: अपू के साथ ढाई साल", "pdf": "ebooks/class-11/hindi/chapter-03.pdf" },
                { "number": 4, "title": "आरोह (गद्य) 4: विदाई-संभाषण", "pdf": "ebooks/class-11/hindi/chapter-04.pdf" },
                { "number": 5, "title": "आरोह (गद्य) 5: गलता लोहा", "pdf": "ebooks/class-11/hindi/chapter-05.pdf" },
                { "number": 6, "title": "आरोह (गद्य) 6: स्पीति में बारिश", "pdf": "ebooks/class-11/hindi/chapter-06.pdf" },
                { "number": 7, "title": "आरोह (गद्य) 7: रजनी", "pdf": "ebooks/class-11/hindi/chapter-07.pdf" },
                { "number": 8, "title": "आरोह (गद्य) 8: जामुन का पेड़", "pdf": "ebooks/class-11/hindi/chapter-08.pdf" },
                { "number": 9, "title": "आरोह (गद्य) 9: भारत माता", "pdf": "ebooks/class-11/hindi/chapter-09.pdf" },
                { "number": 10, "title": "आरोह (काव्य) 1: कबीर – हम तौ एक एक करि जाना", "pdf": "ebooks/class-11/hindi/chapter-10.pdf" },
                { "number": 11, "title": "आरोह (काव्य) 2: मीरा – मेरे तो गिरिधर गोपाल", "pdf": "ebooks/class-11/hindi/chapter-11.pdf" },
                { "number": 12, "title": "आरोह (काव्य) 3: पथिक", "pdf": "ebooks/class-11/hindi/chapter-12.pdf" },
                { "number": 13, "title": "आरोह (काव्य) 4: वे आँखें", "pdf": "ebooks/class-11/hindi/chapter-13.pdf" },
                { "number": 14, "title": "आरोह (काव्य) 5: घर की याद", "pdf": "ebooks/class-11/hindi/chapter-14.pdf" },
                { "number": 15, "title": "आरोह (काव्य) 6: चंपा काले-काले अच्छर नहीं चीन्हती", "pdf": "ebooks/class-11/hindi/chapter-15.pdf" },
                { "number": 16, "title": "आरोह (काव्य) 7: गजल", "pdf": "ebooks/class-11/hindi/chapter-16.pdf" },
                { "number": 17, "title": "आरोह (काव्य) 8: हे भूख! मत मचल", "pdf": "ebooks/class-11/hindi/chapter-17.pdf" },
                { "number": 18, "title": "आरोह (काव्य) 9: सबसे खतरनाक", "pdf": "ebooks/class-11/hindi/chapter-18.pdf" },
                { "number": 19, "title": "आरोह (काव्य) 10: आओ मिलकर बचाएँ", "pdf": "ebooks/class-11/hindi/chapter-19.pdf" },
                { "number": 20, "title": "वितान 1: भारतीय गायिकाओं में बेजोड़ लता मंगेशकर", "pdf": "ebooks/class-11/hindi/chapter-20.pdf" },
                { "number": 21, "title": "वितान 2: राजस्थान की रजत बूँदें", "pdf": "ebooks/class-11/hindi/chapter-21.pdf" },
                { "number": 22, "title": "वितान 3: आलो-आँधारि", "pdf": "ebooks/class-11/hindi/chapter-22.pdf" }
            ]
        },

        "Accountancy": {
            "description": "Class 11 Accountancy E-Book Library",
            "image": "subject-images/class-11/accountancy.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Introduction to Accounting / अध्याय 1: लेखाशास्त्र का परिचय", "pdf": "ebooks/class-11/accountancy/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Theory Base of Accounting / अध्याय 2: लेखांकन के सैद्धांतिक आधार", "pdf": "ebooks/class-11/accountancy/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Recording of Transactions – I / अध्याय 3: लेन-देनों का अभिलेखन – I", "pdf": "ebooks/class-11/accountancy/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Recording of Transactions – II / अध्याय 4: लेन-देनों का अभिलेखन – II", "pdf": "ebooks/class-11/accountancy/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: Bank Reconciliation Statement / अध्याय 5: बैंक समाधान विवरण", "pdf": "ebooks/class-11/accountancy/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Trial Balance and Rectification of Errors / अध्याय 6: तलपट एवं अशुद्धियों का शोधन", "pdf": "ebooks/class-11/accountancy/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Depreciation, Provisions and Reserves / अध्याय 7: ह्रास, प्रावधान तथा संचिति", "pdf": "ebooks/class-11/accountancy/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Bills of Exchange / अध्याय 8: विनिमय बिल", "pdf": "ebooks/class-11/accountancy/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Financial Statements – I / अध्याय 9: वित्तीय विवरण – I", "pdf": "ebooks/class-11/accountancy/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Financial Statements – II / अध्याय 10: वित्तीय विवरण – II", "pdf": "ebooks/class-11/accountancy/chapter-10.pdf" }
            ]
        },

        "Business Studies": {
            "description": "Class 11 Business Studies E-Book Library",
            "image": "subject-images/class-11/businessstudies.png",
            "chapters": [
                { "number": 1, "title": "Chapter 1: Nature and Purpose of Business / अध्याय 1: व्यवसाय की प्रकृति एवं उद्देश्य", "pdf": "ebooks/class-11/business-studies/chapter-01.pdf" },
                { "number": 2, "title": "Chapter 2: Forms of Business Organisation / अध्याय 2: व्यावसायिक संगठन के स्वरूप", "pdf": "ebooks/class-11/business-studies/chapter-02.pdf" },
                { "number": 3, "title": "Chapter 3: Private, Public and Global Enterprises / अध्याय 3: निजी, सार्वजनिक एवं भूमंडलीय उपक्रम", "pdf": "ebooks/class-11/business-studies/chapter-03.pdf" },
                { "number": 4, "title": "Chapter 4: Business Services / अध्याय 4: व्यावसायिक सेवाएँ", "pdf": "ebooks/class-11/business-studies/chapter-04.pdf" },
                { "number": 5, "title": "Chapter 5: Emerging Modes of Business / अध्याय 5: व्यवसाय के उदीयमान स्वरूप", "pdf": "ebooks/class-11/business-studies/chapter-05.pdf" },
                { "number": 6, "title": "Chapter 6: Social Responsibilities of Business / अध्याय 6: व्यवसाय के सामाजिक उत्तरदायित्व", "pdf": "ebooks/class-11/business-studies/chapter-06.pdf" },
                { "number": 7, "title": "Chapter 7: Formation of a Company / अध्याय 7: कंपनी का निर्माण", "pdf": "ebooks/class-11/business-studies/chapter-07.pdf" },
                { "number": 8, "title": "Chapter 8: Sources of Business Finance / अध्याय 8: व्यावसायिक वित्त के स्रोत", "pdf": "ebooks/class-11/business-studies/chapter-08.pdf" },
                { "number": 9, "title": "Chapter 9: Small Business / अध्याय 9: लघु व्यवसाय", "pdf": "ebooks/class-11/business-studies/chapter-09.pdf" },
                { "number": 10, "title": "Chapter 10: Internal Trade / अध्याय 10: आंतरिक व्यापार", "pdf": "ebooks/class-11/business-studies/chapter-10.pdf" },
                { "number": 11, "title": "Chapter 11: International Business / अध्याय 11: अंतर्राष्ट्रीय व्यापार", "pdf": "ebooks/class-11/business-studies/chapter-11.pdf" }
            ]
        },

        "Economics": {
            "description": "Class 11 Economics E-Book Library",
            "image": "subject-images/class-11/economics.png",
            "chapters": [
                { "number": 1, "title": "Statistics 1: Introduction / सांख्यिकी 1: परिचय", "pdf": "ebooks/class-11/economics/chapter-01.pdf" },
                { "number": 2, "title": "Statistics 2: Collection of Data / सांख्यिकी 2: आँकड़ों का संग्रह", "pdf": "ebooks/class-11/economics/chapter-02.pdf" },
                { "number": 3, "title": "Statistics 3: Organisation of Data / सांख्यिकी 3: आँकड़ों का संगठन", "pdf": "ebooks/class-11/economics/chapter-03.pdf" },
                { "number": 4, "title": "Statistics 4: Presentation of Data / सांख्यिकी 4: आँकड़ों का प्रस्तुतीकरण", "pdf": "ebooks/class-11/economics/chapter-04.pdf" },
                { "number": 5, "title": "Statistics 5: Measures of Central Tendency / सांख्यिकी 5: केंद्रीय प्रवृत्ति की माप", "pdf": "ebooks/class-11/economics/chapter-05.pdf" },
                { "number": 6, "title": "Statistics 6: Correlation / सांख्यिकी 6: सहसंबंध", "pdf": "ebooks/class-11/economics/chapter-06.pdf" },
                { "number": 7, "title": "Statistics 7: Index Numbers / सांख्यिकी 7: सूचकांक", "pdf": "ebooks/class-11/economics/chapter-07.pdf" },
                { "number": 8, "title": "Statistics 8: Use of Statistical Tools / सांख्यिकी 8: सांख्यिकीय औजारों का उपयोग", "pdf": "ebooks/class-11/economics/chapter-08.pdf" },
                { "number": 9, "title": "Microeconomics 1: Introduction / सूक्ष्म अर्थशास्त्र 1: परिचय", "pdf": "ebooks/class-11/economics/chapter-09.pdf" },
                { "number": 10, "title": "Microeconomics 2: Consumer's Equilibrium and Demand / सूक्ष्म अर्थशास्त्र 2: उपभोक्ता का संतुलन और माँग", "pdf": "ebooks/class-11/economics/chapter-10.pdf" },
                { "number": 11, "title": "Microeconomics 3: Producer Behaviour and Supply / सूक्ष्म अर्थशास्त्र 3: उत्पादक व्यवहार तथा पूर्ति", "pdf": "ebooks/class-11/economics/chapter-11.pdf" },
                { "number": 12, "title": "Microeconomics 4: Forms of Market and Price Determination / सूक्ष्म अर्थशास्त्र 4: बाज़ार के रूप और कीमत निर्धारण", "pdf": "ebooks/class-11/economics/chapter-12.pdf" }
            ]
        }

    },

    "12": {

    "English": {
        "description": "Class 12 English E-Book Library",
        "image": "subject-images/class-12/english.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: The Last Lesson / अध्याय 1: द लास्ट लेसन", "pdf": "ebooks/class-12/english/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Lost Spring / अध्याय 2: लॉस्ट स्प्रिंग", "pdf": "ebooks/class-12/english/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Deep Water / अध्याय 3: डीप वाटर", "pdf": "ebooks/class-12/english/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: The Rattrap / अध्याय 4: द रैट्रैप", "pdf": "ebooks/class-12/english/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Indigo / अध्याय 5: इंडिगो", "pdf": "ebooks/class-12/english/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Poets and Pancakes / अध्याय 6: पोएट्स एंड पैनकेक्स", "pdf": "ebooks/class-12/english/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: The Interview / अध्याय 7: द इंटरव्यू", "pdf": "ebooks/class-12/english/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Going Places / अध्याय 8: गोइंग प्लेसेस", "pdf": "ebooks/class-12/english/chapter-08.pdf" },

            { "number": 9, "title": "Poem 1: My Mother at Sixty-Six / कविता 1: माई मदर एट सिक्स्टी-सिक्स", "pdf": "ebooks/class-12/english/chapter-09.pdf" },
            { "number": 10, "title": "Poem 2: An Elementary School Classroom in a Slum / कविता 2: एन एलीमेंट्री स्कूल क्लासरूम इन ए स्लम", "pdf": "ebooks/class-12/english/chapter-10.pdf" },
            { "number": 11, "title": "Poem 3: Keeping Quiet / कविता 3: कीपिंग क्वाइट", "pdf": "ebooks/class-12/english/chapter-11.pdf" },
            { "number": 12, "title": "Poem 4: A Thing of Beauty / कविता 4: ए थिंग ऑफ ब्यूटी", "pdf": "ebooks/class-12/english/chapter-12.pdf" },
            { "number": 13, "title": "Poem 5: A Roadside Stand / कविता 5: ए रोडसाइड स्टैंड", "pdf": "ebooks/class-12/english/chapter-13.pdf" },
            { "number": 14, "title": "Poem 6: Aunt Jennifer's Tigers / कविता 6: आंट जेनिफर्स टाइगर्स", "pdf": "ebooks/class-12/english/chapter-14.pdf" },

            { "number": 15, "title": "Supplementary 1: The Third Level / पूरक पाठ 1: द थर्ड लेवल", "pdf": "ebooks/class-12/english/chapter-15.pdf" },
            { "number": 16, "title": "Supplementary 2: The Tiger King / पूरक पाठ 2: द टाइगर किंग", "pdf": "ebooks/class-12/english/chapter-16.pdf" },
            { "number": 17, "title": "Supplementary 3: Journey to the End of the Earth / पूरक पाठ 3: जर्नी टू द एंड ऑफ द अर्थ", "pdf": "ebooks/class-12/english/chapter-17.pdf" },
            { "number": 18, "title": "Supplementary 4: The Enemy / पूरक पाठ 4: द एनिमी", "pdf": "ebooks/class-12/english/chapter-18.pdf" },
            { "number": 19, "title": "Supplementary 5: On the Face of It / पूरक पाठ 5: ऑन द फेस ऑफ इट", "pdf": "ebooks/class-12/english/chapter-19.pdf" },
            { "number": 20, "title": "Supplementary 6: Memories of Childhood / पूरक पाठ 6: मेमोरीज ऑफ चाइल्डहुड", "pdf": "ebooks/class-12/english/chapter-20.pdf" },

            { "number": 21, "title": "Writing Skills: Notice, Invitation, Letter & Report / लेखन कौशल", "pdf": "ebooks/class-12/english/chapter-21.pdf" },
            { "number": 22, "title": "Reading Skills: Unseen Passages / पठन कौशल: अपठित गद्यांश", "pdf": "ebooks/class-12/english/chapter-22.pdf" }
        ]
    },

    "Mathematics": {
        "description": "Class 12 Mathematics E-Book Library",
        "image": "subject-images/class-12/maths.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Relations and Functions / अध्याय 1: संबंध एवं फलन", "pdf": "ebooks/class-12/mathematics/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Inverse Trigonometric Functions / अध्याय 2: प्रतिलोम त्रिकोणमितीय फलन", "pdf": "ebooks/class-12/mathematics/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Matrices / अध्याय 3: आव्यूह", "pdf": "ebooks/class-12/mathematics/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Determinants / अध्याय 4: सारणिक", "pdf": "ebooks/class-12/mathematics/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Continuity and Differentiability / अध्याय 5: सांतत्य तथा अवकलनीयता", "pdf": "ebooks/class-12/mathematics/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Applications of Derivatives / अध्याय 6: अवकलज के अनुप्रयोग", "pdf": "ebooks/class-12/mathematics/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Integrals / अध्याय 7: समाकल", "pdf": "ebooks/class-12/mathematics/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Applications of Integrals / अध्याय 8: समाकलनों के अनुप्रयोग", "pdf": "ebooks/class-12/mathematics/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Differential Equations / अध्याय 9: अवकल समीकरण", "pdf": "ebooks/class-12/mathematics/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Vector Algebra / अध्याय 10: सदिश बीजगणित", "pdf": "ebooks/class-12/mathematics/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Three Dimensional Geometry / अध्याय 11: त्रिविमीय ज्यामिति", "pdf": "ebooks/class-12/mathematics/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Linear Programming / अध्याय 12: रैखिक प्रोग्रामन", "pdf": "ebooks/class-12/mathematics/chapter-12.pdf" },
            { "number": 13, "title": "Chapter 13: Probability / अध्याय 13: प्रायिकता", "pdf": "ebooks/class-12/mathematics/chapter-13.pdf" }
        ]
    },

    "Physics": {
        "description": "Class 12 Physics E-Book Library",
        "image": "subject-images/class-12/physics.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Electric Charges and Fields / अध्याय 1: वैद्युत आवेश तथा क्षेत्र", "pdf": "ebooks/class-12/physics/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Electrostatic Potential and Capacitance / अध्याय 2: स्थिरवैद्युत विभव तथा धारिता", "pdf": "ebooks/class-12/physics/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Current Electricity / अध्याय 3: विद्युत धारा", "pdf": "ebooks/class-12/physics/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Moving Charges and Magnetism / अध्याय 4: गतिमान आवेश और चुम्बकत्व", "pdf": "ebooks/class-12/physics/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Magnetism and Matter / अध्याय 5: चुम्बकत्व एवं द्रव्य", "pdf": "ebooks/class-12/physics/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Electromagnetic Induction / अध्याय 6: वैद्युतचुम्बकीय प्रेरण", "pdf": "ebooks/class-12/physics/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Alternating Current / अध्याय 7: प्रत्यावर्ती धारा", "pdf": "ebooks/class-12/physics/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Electromagnetic Waves / अध्याय 8: वैद्युतचुम्बकीय तरंगें", "pdf": "ebooks/class-12/physics/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Ray Optics and Optical Instruments / अध्याय 9: किरण प्रकाशिकी एवं प्रकाशिक यंत्र", "pdf": "ebooks/class-12/physics/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Wave Optics / अध्याय 10: तरंग प्रकाशिकी", "pdf": "ebooks/class-12/physics/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Dual Nature of Radiation and Matter / अध्याय 11: विकिरण तथा द्रव्य की द्वैत प्रकृति", "pdf": "ebooks/class-12/physics/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Atoms / अध्याय 12: परमाणु", "pdf": "ebooks/class-12/physics/chapter-12.pdf" },
            { "number": 13, "title": "Chapter 13: Nuclei / अध्याय 13: नाभिक", "pdf": "ebooks/class-12/physics/chapter-13.pdf" },
            { "number": 14, "title": "Chapter 14: Semiconductor Electronics / अध्याय 14: अर्धचालक इलेक्ट्रॉनिकी", "pdf": "ebooks/class-12/physics/chapter-14.pdf" }
        ]
    },

    "Chemistry": {
        "description": "Class 12 Chemistry E-Book Library",
        "image": "subject-images/class-12/chemistry.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Solutions / अध्याय 1: विलयन", "pdf": "ebooks/class-12/chemistry/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Electrochemistry / अध्याय 2: वैद्युतरसायन", "pdf": "ebooks/class-12/chemistry/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Chemical Kinetics / अध्याय 3: रासायनिक बलगतिकी", "pdf": "ebooks/class-12/chemistry/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: The d- and f-Block Elements / अध्याय 4: d एवं f-ब्लॉक के तत्व", "pdf": "ebooks/class-12/chemistry/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Coordination Compounds / अध्याय 5: उपसहसंयोजन यौगिक", "pdf": "ebooks/class-12/chemistry/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Haloalkanes and Haloarenes / अध्याय 6: हैलोऐल्केन तथा हैलोऐरीन", "pdf": "ebooks/class-12/chemistry/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Alcohols, Phenols and Ethers / अध्याय 7: ऐल्कोहॉल, फीनॉल एवं ईथर", "pdf": "ebooks/class-12/chemistry/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Aldehydes, Ketones and Carboxylic Acids / अध्याय 8: ऐल्डिहाइड, कीटोन एवं कार्बोक्सिलिक अम्ल", "pdf": "ebooks/class-12/chemistry/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Amines / अध्याय 9: ऐमीन", "pdf": "ebooks/class-12/chemistry/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Biomolecules / अध्याय 10: जैव अणु", "pdf": "ebooks/class-12/chemistry/chapter-10.pdf" }
        ]
    },

    "Biology": {
        "description": "Class 12 Biology E-Book Library",
        "image": "subject-images/class-12/biology.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Sexual Reproduction in Flowering Plants / अध्याय 1: पुष्पी पादपों में लैंगिक प्रजनन", "pdf": "ebooks/class-12/biology/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Human Reproduction / अध्याय 2: मानव जनन", "pdf": "ebooks/class-12/biology/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Reproductive Health / अध्याय 3: जनन स्वास्थ्य", "pdf": "ebooks/class-12/biology/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Principles of Inheritance and Variation / अध्याय 4: वंशागति तथा विविधता के सिद्धांत", "pdf": "ebooks/class-12/biology/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Molecular Basis of Inheritance / अध्याय 5: वंशागति का आणविक आधार", "pdf": "ebooks/class-12/biology/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Evolution / अध्याय 6: विकास", "pdf": "ebooks/class-12/biology/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Human Health and Disease / अध्याय 7: मानव स्वास्थ्य तथा रोग", "pdf": "ebooks/class-12/biology/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Microbes in Human Welfare / अध्याय 8: मानव कल्याण में सूक्ष्मजीव", "pdf": "ebooks/class-12/biology/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Biotechnology: Principles and Processes / अध्याय 9: जैव प्रौद्योगिकी: सिद्धांत एवं प्रक्रम", "pdf": "ebooks/class-12/biology/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Biotechnology and its Applications / अध्याय 10: जैव प्रौद्योगिकी एवं उसके अनुप्रयोग", "pdf": "ebooks/class-12/biology/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Organisms and Populations / अध्याय 11: जीव और समष्टियाँ", "pdf": "ebooks/class-12/biology/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Ecosystem / अध्याय 12: पारितंत्र", "pdf": "ebooks/class-12/biology/chapter-12.pdf" },
            { "number": 13, "title": "Chapter 13: Biodiversity and Conservation / अध्याय 13: जैव विविधता एवं संरक्षण", "pdf": "ebooks/class-12/biology/chapter-13.pdf" }
        ]
    },

    "Hindi": {
        "description": "Class 12 Hindi E-Book Library",
        "image": "subject-images/class-12/hindi.png",
        "chapters": [
            { "number": 1, "title": "आरोह (काव्य) 1: आत्मपरिचय", "pdf": "ebooks/class-12/hindi/chapter-01.pdf" },
            { "number": 2, "title": "आरोह (काव्य) 2: एक गीत", "pdf": "ebooks/class-12/hindi/chapter-02.pdf" },
            { "number": 3, "title": "आरोह (काव्य) 3: पतंग", "pdf": "ebooks/class-12/hindi/chapter-03.pdf" },
            { "number": 4, "title": "आरोह (काव्य) 4: कविता के बहाने", "pdf": "ebooks/class-12/hindi/chapter-04.pdf" },
            { "number": 5, "title": "आरोह (काव्य) 5: बात सीधी थी पर", "pdf": "ebooks/class-12/hindi/chapter-05.pdf" },
            { "number": 6, "title": "आरोह (काव्य) 6: कैमरे में बंद अपाहिज", "pdf": "ebooks/class-12/hindi/chapter-06.pdf" },
            { "number": 7, "title": "आरोह (काव्य) 7: सहर्ष स्वीकारा है", "pdf": "ebooks/class-12/hindi/chapter-07.pdf" },
            { "number": 8, "title": "आरोह (काव्य) 8: उषा", "pdf": "ebooks/class-12/hindi/chapter-08.pdf" },
            { "number": 9, "title": "आरोह (काव्य) 9: बादल राग", "pdf": "ebooks/class-12/hindi/chapter-09.pdf" },
            { "number": 10, "title": "आरोह (काव्य) 10: कवितावली (उत्तर कांड से)", "pdf": "ebooks/class-12/hindi/chapter-10.pdf" },
            { "number": 11, "title": "आरोह (काव्य) 11: लक्ष्मण-मूर्छा और राम का विलाप", "pdf": "ebooks/class-12/hindi/chapter-11.pdf" },
            { "number": 12, "title": "आरोह (काव्य) 12: रुबाइयाँ", "pdf": "ebooks/class-12/hindi/chapter-12.pdf" },
            { "number": 13, "title": "आरोह (काव्य) 13: छोटा मेरा खेत", "pdf": "ebooks/class-12/hindi/chapter-13.pdf" },
            { "number": 14, "title": "आरोह (काव्य) 14: बगुलों के पंख", "pdf": "ebooks/class-12/hindi/chapter-14.pdf" },
            { "number": 15, "title": "आरोह (गद्य) 1: भक्तिन", "pdf": "ebooks/class-12/hindi/chapter-15.pdf" },
            { "number": 16, "title": "आरोह (गद्य) 2: बाजार दर्शन", "pdf": "ebooks/class-12/hindi/chapter-16.pdf" },
            { "number": 17, "title": "आरोह (गद्य) 3: काले मेघा पानी दे", "pdf": "ebooks/class-12/hindi/chapter-17.pdf" },
            { "number": 18, "title": "आरोह (गद्य) 4: पहलवान की ढोलक", "pdf": "ebooks/class-12/hindi/chapter-18.pdf" },
            { "number": 19, "title": "आरोह (गद्य) 5: चार्ली चैप्लिन यानी हम सब", "pdf": "ebooks/class-12/hindi/chapter-19.pdf" },
            { "number": 20, "title": "आरोह (गद्य) 6: नमक", "pdf": "ebooks/class-12/hindi/chapter-20.pdf" },
            { "number": 21, "title": "आरोह (गद्य) 7: शिरीष के फूल", "pdf": "ebooks/class-12/hindi/chapter-21.pdf" },
            { "number": 22, "title": "आरोह (गद्य) 8: श्रम-विभाजन और जाति-प्रथा", "pdf": "ebooks/class-12/hindi/chapter-22.pdf" },
            { "number": 23, "title": "आरोह (गद्य) 9: मेरी कल्पना का आदर्श समाज", "pdf": "ebooks/class-12/hindi/chapter-23.pdf" },
            { "number": 24, "title": "वितान 1: सिल्वर वैडिंग", "pdf": "ebooks/class-12/hindi/chapter-24.pdf" },
            { "number": 25, "title": "वितान 2: जूझ", "pdf": "ebooks/class-12/hindi/chapter-25.pdf" },
            { "number": 26, "title": "वितान 3: अतीत में दबे पाँव", "pdf": "ebooks/class-12/hindi/chapter-26.pdf" },
            { "number": 27, "title": "वितान 4: डायरी के पन्ने", "pdf": "ebooks/class-12/hindi/chapter-27.pdf" },
            { "number": 28, "title": "अभिव्यक्ति और माध्यम 1: विभिन्न माध्यमों के लिए लेखन", "pdf": "ebooks/class-12/hindi/chapter-28.pdf" },
            { "number": 29, "title": "अभिव्यक्ति और माध्यम 2: पत्रकारीय लेखन के विभिन्न रूप और लेखन प्रक्रिया", "pdf": "ebooks/class-12/hindi/chapter-29.pdf" },
            { "number": 30, "title": "अभिव्यक्ति और माध्यम 3: विशेष लेखन – स्वरूप और प्रकार", "pdf": "ebooks/class-12/hindi/chapter-30.pdf" },
            { "number": 31, "title": "अभिव्यक्ति और माध्यम 4: कैसे बनता है रेडियो नाटक", "pdf": "ebooks/class-12/hindi/chapter-31.pdf" },
            { "number": 32, "title": "अभिव्यक्ति और माध्यम 5: नए और अप्रत्याशित विषयों पर लेखन", "pdf": "ebooks/class-12/hindi/chapter-32.pdf" }
        ]
    },

    "Accountancy": {
        "description": "Class 12 Accountancy E-Book Library",
        "image": "subject-images/class-12/accountancy.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Accounting for Partnership Firms – Fundamentals / अध्याय 1: साझेदारी फर्म का लेखांकन – मूलभूत अवधारणाएँ", "pdf": "ebooks/class-12/accountancy/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Goodwill: Nature and Valuation / अध्याय 2: ख्याति: प्रकृति तथा मूल्यांकन", "pdf": "ebooks/class-12/accountancy/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Change in Profit-Sharing Ratio Among Existing Partners / अध्याय 3: वर्तमान साझेदारों के बीच लाभ विभाजन अनुपात में परिवर्तन", "pdf": "ebooks/class-12/accountancy/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Admission of a Partner / अध्याय 4: साझेदार का प्रवेश", "pdf": "ebooks/class-12/accountancy/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Retirement and Death of a Partner / अध्याय 5: साझेदार की सेवानिवृत्ति तथा मृत्यु", "pdf": "ebooks/class-12/accountancy/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Dissolution of a Partnership Firm / अध्याय 6: साझेदारी फर्म का विघटन", "pdf": "ebooks/class-12/accountancy/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Accounting for Share Capital / अध्याय 7: अंश पूँजी का लेखांकन", "pdf": "ebooks/class-12/accountancy/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Issue and Redemption of Debentures / अध्याय 8: ऋणपत्रों का निर्गमन तथा मोचन", "pdf": "ebooks/class-12/accountancy/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Financial Statements of a Company / अध्याय 9: कंपनी के वित्तीय विवरण", "pdf": "ebooks/class-12/accountancy/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Analysis of Financial Statements / अध्याय 10: वित्तीय विवरणों का विश्लेषण", "pdf": "ebooks/class-12/accountancy/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Accounting Ratios / अध्याय 11: लेखांकन अनुपात", "pdf": "ebooks/class-12/accountancy/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Cash Flow Statement / अध्याय 12: रोकड़ प्रवाह विवरण", "pdf": "ebooks/class-12/accountancy/chapter-12.pdf" }
        ]
    },

    "Business Studies": {
        "description": "Class 12 Business Studies E-Book Library",
        "image": "subject-images/class-12/businessstudies.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: Nature and Significance of Management / अध्याय 1: प्रबंध की प्रकृति एवं महत्त्व", "pdf": "ebooks/class-12/business-studies/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Principles of Management / अध्याय 2: प्रबंध के सिद्धांत", "pdf": "ebooks/class-12/business-studies/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Business Environment / अध्याय 3: व्यावसायिक पर्यावरण", "pdf": "ebooks/class-12/business-studies/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Planning / अध्याय 4: नियोजन", "pdf": "ebooks/class-12/business-studies/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Organising / अध्याय 5: संगठन", "pdf": "ebooks/class-12/business-studies/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Staffing / अध्याय 6: नियुक्तिकरण", "pdf": "ebooks/class-12/business-studies/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Directing / अध्याय 7: निदेशन", "pdf": "ebooks/class-12/business-studies/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Controlling / अध्याय 8: नियंत्रण", "pdf": "ebooks/class-12/business-studies/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Financial Management / अध्याय 9: वित्तीय प्रबंध", "pdf": "ebooks/class-12/business-studies/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Financial Markets / अध्याय 10: वित्तीय बाज़ार", "pdf": "ebooks/class-12/business-studies/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Marketing Management / अध्याय 11: विपणन प्रबंध", "pdf": "ebooks/class-12/business-studies/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Consumer Protection / अध्याय 12: उपभोक्ता संरक्षण", "pdf": "ebooks/class-12/business-studies/chapter-12.pdf" }
        ]
    },

    "Economics": {
        "description": "Class 12 Economics E-Book Library",
        "image": "subject-images/class-12/economics.png",
        "chapters": [
            { "number": 1, "title": "Chapter 1: National Income and Related Aggregates / अध्याय 1: राष्ट्रीय आय तथा संबंधित समुच्चय", "pdf": "ebooks/class-12/economics/chapter-01.pdf" },
            { "number": 2, "title": "Chapter 2: Money and Banking / अध्याय 2: मुद्रा और बैंकिंग", "pdf": "ebooks/class-12/economics/chapter-02.pdf" },
            { "number": 3, "title": "Chapter 3: Determination of Income and Employment / अध्याय 3: आय और रोज़गार का निर्धारण", "pdf": "ebooks/class-12/economics/chapter-03.pdf" },
            { "number": 4, "title": "Chapter 4: Government Budget and the Economy / अध्याय 4: सरकारी बजट तथा अर्थव्यवस्था", "pdf": "ebooks/class-12/economics/chapter-04.pdf" },
            { "number": 5, "title": "Chapter 5: Balance of Payments / अध्याय 5: भुगतान संतुलन", "pdf": "ebooks/class-12/economics/chapter-05.pdf" },
            { "number": 6, "title": "Chapter 6: Indian Economy on the Eve of Independence / अध्याय 6: स्वतंत्रता की पूर्व संध्या पर भारतीय अर्थव्यवस्था", "pdf": "ebooks/class-12/economics/chapter-06.pdf" },
            { "number": 7, "title": "Chapter 7: Indian Economy (1950–1990) / अध्याय 7: भारतीय अर्थव्यवस्था (1950–1990)", "pdf": "ebooks/class-12/economics/chapter-07.pdf" },
            { "number": 8, "title": "Chapter 8: Liberalisation, Privatisation and Globalisation: An Appraisal / अध्याय 8: उदारीकरण, निजीकरण और वैश्वीकरण: एक समीक्षा", "pdf": "ebooks/class-12/economics/chapter-08.pdf" },
            { "number": 9, "title": "Chapter 9: Human Capital Formation in India / अध्याय 9: भारत में मानव पूँजी निर्माण", "pdf": "ebooks/class-12/economics/chapter-09.pdf" },
            { "number": 10, "title": "Chapter 10: Rural Development / अध्याय 10: ग्रामीण विकास", "pdf": "ebooks/class-12/economics/chapter-10.pdf" },
            { "number": 11, "title": "Chapter 11: Employment: Growth, Informalisation and Other Issues / अध्याय 11: रोज़गार: संवृद्धि, अनौपचारीकरण एवं अन्य मुद्दे", "pdf": "ebooks/class-12/economics/chapter-11.pdf" },
            { "number": 12, "title": "Chapter 12: Environment and Sustainable Development / अध्याय 12: पर्यावरण तथा सतत विकास", "pdf": "ebooks/class-12/economics/chapter-12.pdf" },
            { "number": 13, "title": "Chapter 13: Comparative Development Experiences of India and its Neighbours / अध्याय 13: भारत और उसके पड़ोसी देशों के तुलनात्मक विकास अनुभव", "pdf": "ebooks/class-12/economics/chapter-13.pdf" }
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

    setupSessionEnforcement();

    renderStudentData();
}


/* =========================================================
   SINGLE-DEVICE SESSION ENFORCEMENT
   ========================================================= */

function setupSessionEnforcement() {

    if (!sessionStorage.getItem(SSTC_SESSION_START_MS)) {
        sessionStorage.setItem(SSTC_SESSION_START_MS, String(Date.now()));
    }

    startSessionHeartbeat();
    setupSessionEndOnClose();
    startLogoutReminder();
}

/* Server se har ~45 second me poochta hai: "kya meri session abhi bhi valid hai?" */

function startSessionHeartbeat() {

    if (sstcSessionHeartbeatTimer) {
        clearInterval(sstcSessionHeartbeatTimer);
    }

    sstcSessionHeartbeatTimer = setInterval(function () {

        checkSessionHeartbeat();

    }, SSTC_SESSION_HEARTBEAT_MS);

    /* Page khulte hi (4 second baad) ek baar turant check */

    setTimeout(function () {
        checkSessionHeartbeat();
    }, 4000);
}

/* Chhota device naam - Sessions sheet me dikhta hai */

function getSstcDeviceInfo() {

    const ua = String(navigator.userAgent || "");

    let os = "Unknown OS";

    if (/Android/i.test(ua)) { os = "Android"; }
    else if (/iPhone|iPad|iPod/i.test(ua)) { os = "iOS"; }
    else if (/Windows/i.test(ua)) { os = "Windows"; }
    else if (/Mac OS X|Macintosh/i.test(ua)) { os = "Mac"; }
    else if (/Linux/i.test(ua)) { os = "Linux"; }

    let browser = "Browser";

    if (/Edg\//i.test(ua)) { browser = "Edge"; }
    else if (/OPR\/|Opera/i.test(ua)) { browser = "Opera"; }
    else if (/Firefox/i.test(ua)) { browser = "Firefox"; }
    else if (/Chrome|CriOS/i.test(ua)) { browser = "Chrome"; }
    else if (/Safari/i.test(ua)) { browser = "Safari"; }

    return os + " · " + browser;
}

async function checkSessionHeartbeat() {

    if (!SSTC_STUDENT_API_URL || sstcSessionEnding || sstcLoggingOut || sstcHeartbeatBusy) {
        return;
    }

    sstcHeartbeatBusy = true;

    try {

        const sessionToken = sessionStorage.getItem(SSTC_SESSION_TOKEN) || "";

        await callRentalApi("checksession", { sessionToken: sessionToken });
    }
    catch (error) {

        const message = String(error && error.message || "");

        if (message.indexOf("logged in from another device") > -1) {

            forceSessionLogout(message);
        }
        else if (message.indexOf("Session not found") > -1) {

            /* Row hat chuki hai (jaise refresh par) - chup-chaap dobara bana lo */
            await reestablishSession();
        }
        else {

            /* Network glitch waghera - agli heartbeat me phir try hoga */
            console.warn("SSTC session heartbeat warning:", message);
        }
    }
    finally {

        sstcHeartbeatBusy = false;
    }
}

/*
 * Server par session row nahi mili to Student ID + password se
 * naya session bana leta hai aur naya token save kar leta hai.
 */

async function reestablishSession() {

    try {

        const result = await callRentalApi("studentlogin", { deviceInfo: getSstcDeviceInfo() });

        if (result && result.sessionToken) {
            sessionStorage.setItem(SSTC_SESSION_TOKEN, result.sessionToken);
        }
    }
    catch (error) {

        const message = String(error && error.message || "");

        if (
            message.indexOf("already login") > -1 ||
            message.indexOf("Invalid Student ID") > -1 ||
            message.indexOf("inactive") > -1
        ) {

            forceSessionLogout(message);
        }
        else {

            console.warn("SSTC session re-establish warning:", message);
        }
    }
}

/* Forced logout - alert dikha kar turant access page par bhej deta hai */

function forceSessionLogout(message) {

    if (sstcSessionEnding) {
        return;
    }

    sstcSessionEnding = true;

    if (sstcSessionHeartbeatTimer) {
        clearInterval(sstcSessionHeartbeatTimer);
    }

    stopLogoutReminder();

    clearStudentSession();

    alert(
        "🔒 " +
        (message || "Aapka session khatam ho gaya hai. Kripya dobara login karein.")
    );

    window.location.replace("sstc-access.html");
}

/*
 * Browser/tab band hone par - navigator.sendBeacon() use karte hain.
 */

function setupSessionEndOnClose() {

    const sendEndSessionBeacon = function () {

        if (!SSTC_STUDENT_API_URL || !navigator.sendBeacon) {
            return;
        }

        const studentId = getStudentValue(["studentId", "id"], "");
        const password = getStudentValue(["password"], "");
        const sessionToken = sessionStorage.getItem(SSTC_SESSION_TOKEN) || "";

        if (!studentId) {
            return;
        }

        const url =
            SSTC_STUDENT_API_URL +
            (SSTC_STUDENT_API_URL.indexOf("?") > -1 ? "&" : "?") +
            "action=endsession" +
            "&studentId=" + encodeURIComponent(studentId) +
            "&sessionToken=" + encodeURIComponent(sessionToken) +
            "&password=" + encodeURIComponent(password);

        try {
            navigator.sendBeacon(url);
        }
        catch (error) {
            /* ignore - browser band ho hi raha hai */
        }
    };

    window.addEventListener("pagehide", sendEndSessionBeacon);
    window.addEventListener("beforeunload", sendEndSessionBeacon);
}


/* =========================================================
   30-MINUTE ALARM (avatar + sound + 60 sec auto-close)
   Logout hone tak har 30 min baad baar-baar bajta hai
   ========================================================= */

const SSTC_ALARM_AUTOCLOSE_MS = 60 * 1000;   // 60 second me auto band

let sstcAlarmAutoCloseTimer = null;
let sstcAlarmCountdownTimer = null;
let sstcAlarmBeepTimer = null;
let sstcAudioCtx = null;

const SSTC_ALARM_MESSAGES = [
    { hi: "उठो, जागो! अगर पढ़ नहीं रहे हो तो Logout कर दो! 📚",
      en: "Wake up! If you are not studying, please Logout.",
      say: "उठो, जागो! अगर पढ़ नहीं रहे हो, तो लॉगआउट कर दो।" },
    { hi: "अरे! पढ़ाई हो गई? तो अपना अकाउंट Logout कर दो! 🔒",
      en: "Done studying? Please Logout to keep your account safe.",
      say: "अरे! पढ़ाई हो गई? तो अपना अकाउंट लॉगआउट कर दो!" },
    { hi: "सो गए क्या? पढ़ रहे हो तो पढ़ो, नहीं तो Logout करो! 🌟",
      en: "Fell asleep? Keep reading, or else Logout.",
      say: "सो गए क्या? पढ़ रहे हो तो पढ़ो, नहीं तो लॉगआउट करो!" }
];

const SSTC_ALARM_NEXT_KEY = "sstcNextAlarmAt";

function startLogoutReminder() {
    scheduleNextAlarm(false);
}

function scheduleNextAlarm(fresh) {

    if (sstcLogoutReminderTimer) {
        clearTimeout(sstcLogoutReminderTimer);
    }

    let dueAt = Number(sessionStorage.getItem(SSTC_ALARM_NEXT_KEY)) || 0;

    if (fresh || !dueAt) {
        dueAt = Date.now() + SSTC_LOGOUT_REMINDER_MS;
        sessionStorage.setItem(SSTC_ALARM_NEXT_KEY, String(dueAt));
    }

    sstcLogoutReminderTimer = setTimeout(function () {
        showLogoutReminder();
    }, Math.max(1000, dueAt - Date.now()));
}

/* Logout par: alarm + timers + awaaz sab band, agla alarm schedule NAHI hoga */
function stopLogoutReminder() {

    if (sstcLogoutReminderTimer) {
        clearTimeout(sstcLogoutReminderTimer);
        sstcLogoutReminderTimer = null;
    }

    removeAlarmUI();
}

function removeAlarmUI() {

    if (sstcAlarmAutoCloseTimer) { clearTimeout(sstcAlarmAutoCloseTimer); sstcAlarmAutoCloseTimer = null; }
    if (sstcAlarmCountdownTimer) { clearInterval(sstcAlarmCountdownTimer); sstcAlarmCountdownTimer = null; }
    if (sstcAlarmBeepTimer) { clearInterval(sstcAlarmBeepTimer); sstcAlarmBeepTimer = null; }
      stopAlarmSpeech();
    try {
        if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    } catch (e) { /* ignore */ }

    const old = document.getElementById("sstcAlarmOverlay");
    if (old) { old.remove(); }
}

/* Close (manual ya auto) -> 30 min baad phir alarm */
function closeLogoutAlarm() {

    removeAlarmUI();

    if (!sstcSessionEnding && !sstcLoggingOut) {
        scheduleNextAlarm(true);
    }
}

function alarmLogoutNow() {
    removeAlarmUI();
    studentLogout();
}

function injectAlarmStyles() {

    if (document.getElementById("sstcAlarmStyles")) { return; }

    const style = document.createElement("style");
    style.id = "sstcAlarmStyles";

    style.textContent = `
        #sstcAlarmOverlay {
            position:fixed; inset:0; z-index:100000;
            display:flex; align-items:center; justify-content:center;
            padding:16px; box-sizing:border-box;
            background:rgba(15,23,42,.72);
            animation:sstcFadeIn .3s ease;
            font-family:Arial,sans-serif;
        }
        #sstcAlarmCard {
            position:relative; width:min(380px,100%);
            background:linear-gradient(160deg,#7c3aed,#ec4899);
            color:#fff; text-align:center;
            border-radius:24px; padding:26px 20px 20px;
            box-shadow:0 20px 60px rgba(0,0,0,.5);
            animation:sstcPop .45s cubic-bezier(.2,1.4,.4,1);
            overflow:hidden;
        }
        #sstcAlarmAvatar { position:relative; height:110px; margin-bottom:6px; }
        #sstcAlarmOwl {
            display:inline-block; font-size:78px; line-height:110px;
            animation:sstcBounce .7s ease-in-out infinite;
        }
        #sstcAlarmBell {
            position:absolute; top:0; right:calc(50% - 85px);
            font-size:38px; transform-origin:top center;
            animation:sstcRing .35s ease-in-out infinite alternate;
        }
        .sstc-zzz {
            position:absolute; left:calc(50% - 80px); top:30px;
            font-weight:800; font-size:22px; opacity:0;
            animation:sstcZzz 2s ease-in infinite;
        }
        .sstc-zzz.z2 { animation-delay:.7s; left:calc(50% - 98px); font-size:17px; }
        #sstcAlarmHi { font-size:20px; font-weight:800; line-height:1.4; margin:6px 0; }
        #sstcAlarmEn { font-size:13px; opacity:.92; margin:0 0 14px; }
        #sstcAlarmBtns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        #sstcAlarmBtns button {
            border:0; border-radius:12px; padding:12px 18px;
            font-size:14px; font-weight:700; cursor:pointer;
        }
        #sstcAlarmClose  { background:#ffffff; color:#7c3aed; }
        #sstcAlarmLogout { background:#111827; color:#ffffff; }
        #sstcAlarmTimerText { margin-top:12px; font-size:12px; opacity:.9; }
        #sstcAlarmBar { height:6px; background:rgba(255,255,255,.3); border-radius:6px; margin-top:6px; overflow:hidden; }
        #sstcAlarmBarFill { height:100%; width:100%; background:#fde047; transition:width 1s linear; }

        @keyframes sstcFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sstcPop { from{transform:scale(.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes sstcBounce { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-14px) rotate(5deg)} }
        @keyframes sstcRing { from{transform:rotate(-25deg)} to{transform:rotate(25deg)} }
        @keyframes sstcZzz { 0%{opacity:0;transform:translateY(10px)} 40%{opacity:1} 100%{opacity:0;transform:translateY(-26px)} }
    `;

    document.head.appendChild(style);
}

/* Beep awaaz - sirf shuru ke ~5 second (browser allow kare to) */
function playAlarmBeeps() {

    try {

        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) { return; }

        if (!sstcAudioCtx) { sstcAudioCtx = new Ctx(); }
        if (sstcAudioCtx.state === "suspended") { sstcAudioCtx.resume(); }

        let count = 0;

        const beep = function () {

            const osc = sstcAudioCtx.createOscillator();
            const gain = sstcAudioCtx.createGain();

            osc.type = "sine";
            osc.frequency.value = (count % 2 === 0) ? 880 : 660;
            gain.gain.value = 0.15;

            osc.connect(gain);
            gain.connect(sstcAudioCtx.destination);

            osc.start();
            osc.stop(sstcAudioCtx.currentTime + 0.25);

            count++;

            if (count >= 8 && sstcAlarmBeepTimer) {
                clearInterval(sstcAlarmBeepTimer);
                sstcAlarmBeepTimer = null;
            }
        };

        beep();
        sstcAlarmBeepTimer = setInterval(beep, 600);
    }
    catch (e) { /* awaaz na chale to bhi alarm dikhega */ }
}

/* Hindi me bolkar bhi bataye */
const SSTC_ALARM_SPEAK_MS = 30 * 1000;   // dialog kitni der bolta rahe (30 second)
let sstcAlarmSpeakWatch = null;
let sstcAlarmSpeakStop = null;

function stopAlarmSpeech() {

    if (sstcAlarmSpeakWatch) { clearInterval(sstcAlarmSpeakWatch); sstcAlarmSpeakWatch = null; }
    if (sstcAlarmSpeakStop) { clearTimeout(sstcAlarmSpeakStop); sstcAlarmSpeakStop = null; }

    try {
        if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    } catch (e) { /* ignore */ }
}

function speakAlarmHindi(text) {

    try {

        if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { return; }

        stopAlarmSpeech();

        const synth = window.speechSynthesis;

        const sayOnce = function () {

            const speech = new SpeechSynthesisUtterance(text);
            speech.lang = "hi-IN";
            speech.rate = 0.95;

            synth.speak(speech);
        };

        sayOnce();

        sstcAlarmSpeakWatch = setInterval(function () {

            if (!synth.speaking && !synth.pending) {
                sayOnce();
            }

        }, 1000);

        sstcAlarmSpeakStop = setTimeout(stopAlarmSpeech, SSTC_ALARM_SPEAK_MS);
    }
    catch (e) { /* ignore */ }
}


function showLogoutReminder() {

    if (sstcSessionEnding || sstcLoggingOut) { return; }

    /* Pehle se alarm khula ho to dusra na bane */
    if (document.getElementById("sstcAlarmOverlay")) { return; }

    injectAlarmStyles();

    const msg = SSTC_ALARM_MESSAGES[Math.floor(Math.random() * SSTC_ALARM_MESSAGES.length)];

    const overlay = document.createElement("div");
    overlay.id = "sstcAlarmOverlay";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-live", "assertive");

    overlay.innerHTML =
        '<div id="sstcAlarmCard">' +
            '<div id="sstcAlarmAvatar">' +
                '<span class="sstc-zzz">Z</span><span class="sstc-zzz z2">z</span>' +
                '<span id="sstcAlarmOwl">🦉</span>' +
                '<span id="sstcAlarmBell">🔔</span>' +
            '</div>' +
            '<div id="sstcAlarmHi"></div>' +
            '<p id="sstcAlarmEn"></p>' +
            '<div id="sstcAlarmBtns">' +
                '<button type="button" id="sstcAlarmClose">✅ Close / ठीक है</button>' +
                '<button type="button" id="sstcAlarmLogout">🔒 Logout करो</button>' +
            '</div>' +
            '<div id="sstcAlarmTimerText"></div>' +
            '<div id="sstcAlarmBar"><div id="sstcAlarmBarFill"></div></div>' +
        '</div>';

    document.body.appendChild(overlay);

    document.getElementById("sstcAlarmHi").textContent = msg.hi;
    document.getElementById("sstcAlarmEn").textContent = msg.en;

    document.getElementById("sstcAlarmClose").addEventListener("click", closeLogoutAlarm);
    document.getElementById("sstcAlarmLogout").addEventListener("click", alarmLogoutNow);

    /* 60 second countdown */
    let left = Math.round(SSTC_ALARM_AUTOCLOSE_MS / 1000);
    const total = left;

    const timerText = document.getElementById("sstcAlarmTimerText");
    const barFill = document.getElementById("sstcAlarmBarFill");

    timerText.textContent = "⏳ " + left + " सेकंड में अपने-आप बंद हो जाएगा";

    sstcAlarmCountdownTimer = setInterval(function () {

        left--;

        if (left < 0) { left = 0; }

        timerText.textContent = "⏳ " + left + " सेकंड में अपने-आप बंद हो जाएगा";
        barFill.style.width = ((left / total) * 100) + "%";

    }, 1000);

    /* 60 sec me kuch na dabaye to auto close */
    sstcAlarmAutoCloseTimer = setTimeout(closeLogoutAlarm, SSTC_ALARM_AUTOCLOSE_MS);

    playAlarmBeeps();
       speakAlarmHindi(msg.say || msg.hi);
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
         * Card <div role="button"> hai, kyunki <button> ke andar
         * <button> (Rent This Subject) HTML me valid nahi hota.
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
 * ek "free preview". Baaki chapters rent honi chahiye.
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
        const rental = state.rental;

        const card = document.createElement("button");
        card.type = "button";
        card.className = "rented-chip rented-chip-detailed";
        card.setAttribute("data-rent", state.status);
        card.title = "View rental details";

        card.style.cssText = [
            "display:flex",
            "flex-direction:column",
            "align-items:stretch",
            "text-align:left",
            "gap:6px",
            "padding:10px 14px",
            "min-width:180px"
        ].join(";");

        /* --- Header row: naam + status --- */

        const headerRow = document.createElement("span");
        headerRow.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:8px;";

        const label = document.createElement("strong");
        label.textContent = name;
        label.style.cssText = "font-size:13.5px;";

        const info = document.createElement("span");
        info.style.cssText = "font-size:11px; font-weight:700; white-space:nowrap;";

        if (state.status === "active") {

            const days = getRentalDaysLeft(rental);

            info.textContent = (days !== null && days > 0)
                ? days + (days === 1 ? " day left" : " days left")
                : "Active";
        }
        else if (state.status === "pending") {
            info.textContent = "⏳ Pending";
        }
        else {
            info.textContent = "⌛ Expired";
        }

        headerRow.appendChild(label);
        headerRow.appendChild(info);

        /* --- Dates row: Requested / Start / Expiry --- */

        const datesRow = document.createElement("span");

        datesRow.style.cssText = [
            "display:grid",
            "grid-template-columns:repeat(3, 1fr)",
            "gap:8px",
            "padding-top:6px",
            "border-top:1px dashed rgba(0,0,0,.12)",
            "font-size:10.5px",
            "line-height:1.35"
        ].join(";");

        const dateFields = [
            ["Requested", rental ? formatRentDate(rental.requestedOn) : ""],
            ["Start", rental && rental.startDate ? formatRentDate(rental.startDate) : "—"],
            ["Expiry", rental && rental.expiryDate ? formatRentDate(rental.expiryDate) : "—"]
        ];

        dateFields.forEach(function (pair) {

            const field = document.createElement("span");
            field.style.cssText = "display:flex; flex-direction:column; gap:1px;";

            const fieldLabel = document.createElement("em");
            fieldLabel.textContent = pair[0];
            fieldLabel.style.cssText = "font-style:normal; opacity:.65; font-size:9.5px; text-transform:uppercase; letter-spacing:.4px;";

            const fieldValue = document.createElement("b");
            fieldValue.textContent = pair[1] || "—";
            fieldValue.style.cssText = "font-weight:700;";

            field.appendChild(fieldLabel);
            field.appendChild(fieldValue);

            datesRow.appendChild(field);
        });

        card.appendChild(headerRow);
        card.appendChild(datesRow);

        card.addEventListener("click", function () {
            openRentModal(name);
        });

        box.appendChild(card);
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

function getSstcSingleRentPlan(months) {
    return SSTC_RENT_PLANS.find(function (plan) {
        return Number(plan.months) === Number(months) &&
               !plan.bundle;
    }) || null;
}


function getSstcBundleRentPlan(months) {
    return SSTC_RENT_PLANS.find(function (plan) {
        return Number(plan.months) === Number(months) &&
               plan.bundle &&
               Number(plan.subjects) === 6;
    }) || null;
}


function getSstcSingleNotesPlan(months) {
    return SSTC_RENT_NOTES_PLANS.find(function (plan) {
        return Number(plan.months) === Number(months) &&
               !plan.bundle;
    }) || null;
}


function getSstcBundleNotesPlan(months) {
    return SSTC_RENT_NOTES_PLANS.find(function (plan) {
        return Number(plan.months) === Number(months) &&
               plan.bundle &&
               Number(plan.subjects) === 6;
    }) || null;
}

function applyRentalsResult(result) {

    sstcRentals = Array.isArray(result.rentals) ? result.rentals : [];

    const localSinglePlans = SSTC_RENT_PLANS.filter(function (plan) {
        return !plan.bundle;
    });

    if (Array.isArray(result.plans) && result.plans.length) {

        sstcRentPlans = localSinglePlans.map(function (localPlan) {

            const serverPlan = result.plans.find(function (p) {
                return Number(p.months) === Number(localPlan.months) && !p.bundle;
            });

            return serverPlan ? Object.assign({}, localPlan, serverPlan) : localPlan;
        });
    }
    else {
        sstcRentPlans = localSinglePlans;
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

        console.warn("SSTC: ❌ SSTC_STUDENT_API_URL khaali hai - rentals Google Sheet se load/save NAHI ho sakte.");

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

function ensureBundleOfferNote() {

    const plansBox = getRentEl("rentPlans");

    if (!plansBox) {
        return;
    }

    let note = document.getElementById("sstcBundleOffer");

    if (!note) {

        note = document.createElement("div");
        note.id = "sstcBundleOffer";

        note.style.cssText = [
            "margin-top:10px",
            "padding:10px 12px",
            "border-radius:10px",
            "background:#ecfdf5",
            "border:1.5px dashed #10b981",
            "color:#065f46",
            "font-size:12.5px",
            "line-height:1.5",
            "text-align:left"
        ].join(";");

        plansBox.insertAdjacentElement("afterend", note);
    }

    const b6 = getSstcBundleRentPlan(6);
    const b12 = getSstcBundleRentPlan(12);

    note.innerHTML =
        "🎁 <strong>Any 6 Subjects Offer:</strong><br>" +
        "6 Months · ₹" + b6.price + " <s>₹" + b6.actualPrice + "</s><br>" +
        "12 Months · ₹" + b12.price + " <s>₹" + b12.actualPrice + "</s><br>" +
        "<small>6 subjects ek hi duration (6 ya 12 months) ke chunenge to bundle price apne-aap lagegi.</small>";

    note.hidden = false;
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
   ensureBundleOfferNote();
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

function getBundleProgressText(subjectName, months) {

    const bundle = getSstcBundleRentPlan(months);

    if (!bundle) {
        return "";
    }

    const size = Number(bundle.subjects) || 6;
    const key = normalizeSubjectKey(subjectName);

    const same = getPendingRentalsList().filter(function (rental) {
        return Number(rental.months) === Number(months) &&
               normalizeSubjectKey(rental.subject) !== key;
    }).length + 1;

    if (same >= size) {
        return " 🎁 Any " + size + " Subjects plan lagega: ₹" + bundle.price + " (actual ₹" + bundle.actualPrice + ").";
    }

    return " 🎁 " + same + "/" + size + " subjects selected for " + months + " months — " +
        (size - same) + " aur lene par Any " + size + " Subjects plan ₹" + bundle.price + " me milega.";
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
            : "Your rental starts immediately.") +
        getBundleProgressText(sstcRentModalSubject, months);
}


/* --- Details screen (pending / active / just requested) --- */

function renderRentModalDetails(rental, status, successText) {

    const plansBox = getRentEl("rentPlans");
    const details = getRentEl("rentDetails");
    const success = getRentEl("rentSuccess");
    const confirm = getRentEl("rentConfirmBtn");
    const cancelRequest = getRentEl("rentCancelRequestBtn");

    plansBox.hidden = true;
   const offerNote = document.getElementById("sstcBundleOffer");
if (offerNote) { offerNote.hidden = true; }
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
   ========================================================= */

function getPendingRentalsList() {

    return sstcRentals.filter(function (rental) {
        return String(rental.status || "").toLowerCase() === "pending";
    });
}

/* "Pay Now" button dikhana / chhupana + total dikhana */
function updatePayButton() {

    let button = document.getElementById("payNowBtn");

    /* HTML me button na ho to "My Rented Subjects" ke chips ke neeche bana do */

    if (!button) {

        const chips = document.getElementById("studyChips");

        if (!chips || !chips.parentNode) {
            return;
        }

        button = document.createElement("button");
        button.type = "button";
        button.id = "payNowBtn";
        button.hidden = true;

        button.style.cssText = [
            "margin-top:12px",
            "padding:11px 18px",
            "border:0",
            "border-radius:10px",
            "background:#16a34a",
            "color:#ffffff",
            "font-weight:700",
            "font-size:14px",
            "cursor:pointer",
            "box-shadow:0 4px 12px rgba(22,163,74,.35)"
        ].join(";");

        button.addEventListener("click", openPaymentModal);

        chips.insertAdjacentElement("afterend", button);
    }

    const pending = getPendingRentalsList();

    if (pending.length === 0) {

        button.hidden = true;
        return;
    }

    const total = calculateSstcSubjectRentalTotal(pending);

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

/* Payment ke baad screenshot is WhatsApp number par bhejna hai */
const SSTC_PAYMENT_WHATSAPP = "8953012298";

/*
 * Pay Now window me bold notice (English + Hindi).
 */
function ensurePaymentNotice() {

    if (document.getElementById("sstcPaymentNotice")) {
        return;
    }

    const anchor = getRentEl("paySection");

    if (!anchor) {
        return;
    }

    const box = document.createElement("div");
    box.id = "sstcPaymentNotice";
    box.setAttribute("role", "note");

    box.style.cssText = [
        "margin:12px 0",
        "padding:12px 14px",
        "border-radius:12px",
        "background:#fff7e6",
        "border:1.5px solid #f59e0b",
        "color:#7c2d12",
        "font-size:13px",
        "line-height:1.5",
        "text-align:left"
    ].join(";");

    const waLink =
        '<a href="https://wa.me/91' + SSTC_PAYMENT_WHATSAPP + '" target="_blank" rel="noopener" ' +
        'style="color:#15803d; text-decoration:underline; font-weight:800;">' +
        SSTC_PAYMENT_WHATSAPP + '</a>';

    box.innerHTML =
        '<p style="margin:0 0 8px;"><strong>⚠️ IMPORTANT: After your payment is successful, ' +
        'please share the payment screenshot on WhatsApp at ' + waLink + '.</strong></p>' +
        '<p style="margin:0;"><strong>⚠️ ज़रूरी सूचना: पेमेंट सफल होने के बाद, ' +
        'पेमेंट का स्क्रीनशॉट WhatsApp नंबर ' + waLink + ' पर ज़रूर भेजें।</strong></p>';

    anchor.insertAdjacentElement("afterend", box);
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
    ensurePaymentNotice();
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

/* Pay window me price details: kaun sa plan laga, kitna bacha, hint */

function renderPaymentBreakdown(breakdown) {

    let box = document.getElementById("sstcPaymentBreakdown");

    if (!box) {

        const anchor = getRentEl("paymentList");

        if (!anchor) {
            return;
        }

        box = document.createElement("div");
        box.id = "sstcPaymentBreakdown";

        box.style.cssText = [
            "margin:12px 0",
            "padding:12px 14px",
            "border-radius:12px",
            "background:#f0fdf4",
            "border:1.5px solid #22c55e",
            "color:#14532d",
            "font-size:13px",
            "line-height:1.5",
            "text-align:left"
        ].join(";");

        anchor.insertAdjacentElement("afterend", box);
    }

    if (!breakdown || !breakdown.count) {
        box.hidden = true;
        return;
    }

    box.hidden = false;

    let html = "<strong>🧾 Price Details</strong>" +
        '<ul style="margin:6px 0 0; padding-left:18px;">';

    breakdown.lines.forEach(function (line) {
        html += "<li>" + escapeHtml(line) + "</li>";
    });

    html += "</ul>";

    const saved = breakdown.perSubjectTotal - breakdown.total;

    if (breakdown.bundles > 0 && saved > 0) {
        html += '<p style="margin:8px 0 0; font-weight:700;">🎉 Any 6 Subjects plan lag gaya! ' +
            "Aapne ₹" + saved + " bacha liye.</p>";
    }

    breakdown.hints.forEach(function (hint) {
        html += '<p style="margin:6px 0 0; color:#92400e;">' + escapeHtml(hint) + "</p>";
    });

    box.innerHTML = html;
}

/* Checkbox badalne par total, breakdown, UPI link, QR sab refresh */

function updatePaymentTotal() {

    const chosen = getPendingRentalsList().filter(function (rental) {
        return sstcPaymentSelected.has(rental.rentalId);
    });

    const breakdown = sstcComputeRentalBreakdown(chosen, "subjects");
    const total = breakdown.total;

    getRentEl("paymentTotal").textContent = "₹" + total;

    renderPaymentBreakdown(breakdown);

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
 * Google Sheet me PaymentClaimedOn save karta hai aur admin ko
 * email bhejta hai. Koi automatic payment verify nahi hota.
 */

async function markPaymentSent() {

    const button = getRentEl("payConfirmBtn");

    const chosenIds = Array.from(sstcPaymentSelected);

    if (chosenIds.length === 0) {
        showSstcToast("Please select at least one subject.", "info");
        return;
    }

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
            button.textContent = "✅ I Have Paid";
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

        #pdfViewer.sstc-pseudo-fs {
            position:fixed !important;
            inset:0 !important;
            width:100% !important;
            height:100% !important;
            max-width:none !important;
            margin:0 !important;
            border-radius:0 !important;
            z-index:99998 !important;
            background:#525659;
        }

        body.sstc-pseudo-fs-open {
            overflow:hidden;
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

    sstcAddPdfToolbarExtras(toolbar);

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
            sstcPdfZoomBy(-SSTC_PDF_STEP);
        };
    }

    if (zoomIn) {
        zoomIn.onclick = function () {
            sstcPdfZoomBy(SSTC_PDF_STEP);
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

    setText("zoomLevel", Math.round(sstcPdfScale * 100) + "%");

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
        sstcPdfBaseHeight = baseViewport.height;

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

    const myId = ++sstcPdfRenderId;       // naya render aaya to purana khud ruk jayega
    const doc = sstcPdfDocument;

    /* Zoom se pehle kaunsa page dikh raha tha - zoom ke baad wahi position rahe */

    let keepIndex = 0;
    let keepRatio = 0;

    const oldBoxes = pages.querySelectorAll(".sstc-pdf-page");

    for (let i = 0; i < oldBoxes.length; i++) {

        const b = oldBoxes[i];

        if (b.offsetTop + b.offsetHeight > pages.scrollTop) {
            keepIndex = i;
            keepRatio = Math.max(0, (pages.scrollTop - b.offsetTop) / (b.offsetHeight || 1));
            break;
        }
    }

    pages.innerHTML = "";

    /* Step 1: saare pages ke khaali box (sahi size ke saath) */

    const items = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {

        try {

            const page = await doc.getPage(pageNumber);

            if (myId !== sstcPdfRenderId) { return; }

            const viewport = page.getViewport({ scale: sstcPdfScale });

            const box = document.createElement("div");
            box.className = "sstc-pdf-page";
            box.dataset.page = String(pageNumber);
            box.style.width = viewport.width + "px";
            box.style.height = viewport.height + "px";

            pages.appendChild(box);

            items.push({ page: page, viewport: viewport, box: box });
        }
        catch (error) {
            console.error("SSTC PDF page error:", pageNumber, error);
        }
    }

    if (items[keepIndex]) {
        const keep = items[keepIndex].box;
        pages.scrollTop = keep.offsetTop + keepRatio * keep.offsetHeight;
    }

    /* Step 2: jo page dikh raha hai wahi pehle draw ho, baaki baad me */

    const order = [];

    for (let i = keepIndex; i < items.length; i++) { order.push(i); }
    for (let i = 0; i < keepIndex; i++) { order.push(i); }

    for (let k = 0; k < order.length; k++) {

        if (myId !== sstcPdfRenderId) { return; }

        const item = items[order[k]];

        try {

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(item.viewport.width * deviceScale);
            canvas.height = Math.floor(item.viewport.height * deviceScale);
            canvas.style.width = item.viewport.width + "px";
            canvas.style.height = item.viewport.height + "px";

            context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, item.viewport.width, item.viewport.height);

            item.box.appendChild(canvas);

            await item.page.render({ canvasContext: context, viewport: item.viewport }).promise;
        }
        catch (error) {
            console.error("SSTC PDF page render error:", error);
        }
    }

    if (myId === sstcPdfRenderId) {
        updateSstcPdfToolbar();
    }
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

    sstcPdfScale = Math.max(SSTC_PDF_MIN_SCALE, Math.min(SSTC_PDF_MAX_SCALE, available / sstcPdfBaseWidth));

    renderSstcPdfDocument();
}


/* =========================================================
   PDF TOOLBAR EXTRAS: ZOOM / PRINT / DOWNLOAD / FULLSCREEN
   ========================================================= */

function sstcAddPdfToolbarExtras(toolbar) {

    const add = function (id, label, title, handler) {

        const button = document.createElement("button");
        button.type = "button";
        button.id = id;
        button.title = title;
        button.textContent = label;
        button.onclick = handler;

        toolbar.appendChild(button);
    };

    if (SSTC_ALLOW_PDF_PRINT) {
        add("sstcPdfPrint", "🖨 Print", "Print this chapter", sstcPdfPrint);
    }

    if (SSTC_ALLOW_PDF_DOWNLOAD) {
        add("sstcPdfDownload", "⬇ Download", "Download this chapter (PDF)", sstcPdfDownload);
    }

    add("sstcPdfFull", "⛶ Full", "Full screen", toggleFullscreen);

    sstcUpdateFullscreenButton();
}

/* Zoom (page ke + / - buttons aur toolbar - dono yahi use karte hain) */

function sstcPdfZoomBy(delta) {

    if (!sstcPdfDocument) {
        return false;
    }

    const next = Math.max(
        SSTC_PDF_MIN_SCALE,
        Math.min(SSTC_PDF_MAX_SCALE, Math.round((sstcPdfScale + delta) * 100) / 100)
    );

    if (next !== sstcPdfScale) {
        sstcPdfScale = next;
        updateSstcPdfToolbar();
        renderSstcPdfDocument();
    }

    return true;
}

/* Pura page screen me (width + height dono fit) */

function sstcPdfFitPage() {

    const pages = getSstcPdfPagesContainer();

    if (!pages || !sstcPdfBaseWidth || !sstcPdfBaseHeight) {
        return false;
    }

    const byWidth = Math.max(280, pages.clientWidth - 30) / sstcPdfBaseWidth;
    const byHeight = Math.max(200, pages.clientHeight - 30) / sstcPdfBaseHeight;

    sstcPdfScale = Math.max(
        SSTC_PDF_MIN_SCALE,
        Math.min(SSTC_PDF_MAX_SCALE, Math.min(byWidth, byHeight))
    );

    updateSstcPdfToolbar();
    renderSstcPdfDocument();

    return true;
}

/* ---------- DOWNLOAD ---------- */

function sstcPdfFileName() {

    const clean = function (text) {
        return String(text || "").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "");
    };

    const subject = clean(sessionStorage.getItem(SSTC_CURRENT_BOOK)) || "Chapter";
    const chapter = clean(sessionStorage.getItem(SSTC_CURRENT_CHAPTER));

    return "SSTC-" + subject + (chapter ? "-Chapter-" + chapter : "") + ".pdf";
}

async function sstcPdfDownload() {

    if (!sstcPdfDocument || !sstcPdfUrl) {
        showSstcToast("Pehle koi chapter kholein.", "info");
        return;
    }

    const button = document.getElementById("sstcPdfDownload");
    const oldText = button ? button.textContent : "";

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ ...";
    }

    try {

        const response = await fetch(sstcPdfUrl, { cache: "force-cache" });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = sstcPdfFileName();
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
            URL.revokeObjectURL(blobUrl);
        }, 5000);

        showSstcToast("Download shuru ho gaya.", "success");
    }
    catch (error) {

        console.error("SSTC PDF download error:", error);

        /* Fallback: PDF naye tab me khol do */
        window.open(sstcPdfUrl, "_blank");
    }
    finally {

        if (button) {
            button.disabled = false;
            button.textContent = oldText;
        }
    }
}

/* ---------- PRINT ---------- */

function sstcRestoreViewerVisible() {

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.classList.remove("viewer-hidden");
    }

    try { window.focus(); } catch (e) { /* ignore */ }
}

function sstcCleanupPrintFrame() {

    if (sstcPrintCleanup) {
        sstcPrintCleanup();
    }
}

/*
 * Har page ko image bana kar chhupe hue iframe me daalta hai aur print karta hai.
 * (Mobile + desktop dono par chalta hai, kisi PDF plugin ki zarurat nahi.)
 */

async function sstcPdfPrint() {

    if (!sstcPdfDocument) {
        showSstcToast("Pehle koi chapter kholein.", "info");
        return;
    }

    if (sstcPrintBusy) {
        return;
    }

    sstcPrintBusy = true;
    sstcCleanupPrintFrame();

    const doc = sstcPdfDocument;
    const button = document.getElementById("sstcPdfPrint");
    const oldText = button ? button.textContent : "";
    const urls = [];

    let frame = null;

    try {

        if (button) { button.disabled = true; }

        frame = document.createElement("iframe");
        frame.setAttribute("aria-hidden", "true");
        frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;";

        document.body.appendChild(frame);

        const win = frame.contentWindow;
        const d = win.document;

        d.open();
        d.write(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>SSTC</title>' +
            '<style>@page{margin:0}html,body{margin:0;padding:0;background:#fff}' +
            'img{display:block;width:100%;height:auto;page-break-after:always;break-after:page}' +
            'img:last-child{page-break-after:auto;break-after:auto}</style></head><body></body></html>'
        );
        d.close();

        for (let n = 1; n <= doc.numPages; n++) {

            if (button) { button.textContent = "⏳ " + n + "/" + doc.numPages; }

            const page = await doc.getPage(n);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const blob = await new Promise(function (resolve) {
                canvas.toBlob(resolve, "image/jpeg", 0.92);
            });

            canvas.width = 0;
            canvas.height = 0;

            if (!blob) { continue; }

            const url = URL.createObjectURL(blob);
            urls.push(url);

            const img = d.createElement("img");

            await new Promise(function (resolve) {
                img.onload = resolve;
                img.onerror = resolve;
                img.src = url;
                d.body.appendChild(img);
            });
        }

        const thisFrame = frame;

        sstcPrintCleanup = function () {

            urls.forEach(function (u) { URL.revokeObjectURL(u); });

            if (thisFrame.parentNode) {
                thisFrame.remove();
            }

            sstcPrintCleanup = null;
            sstcRestoreViewerVisible();
        };

        win.addEventListener("afterprint", function () {
            setTimeout(sstcCleanupPrintFrame, 500);
        });

        sstcAllowPrint = true;

        win.focus();
        win.print();

        setTimeout(function () {
            sstcAllowPrint = false;
        }, 3000);

        sstcRestoreViewerVisible();
    }
    catch (error) {

        console.error("SSTC PDF print error:", error);

        showSstcToast("Print nahi ho paya. Dobara try karein.", "info");

        sstcAllowPrint = false;

        if (frame && frame.parentNode) {
            frame.remove();
        }

        urls.forEach(function (u) { URL.revokeObjectURL(u); });
    }
    finally {

        if (button) {
            button.disabled = false;
            button.textContent = oldText;
        }

        sstcPrintBusy = false;
    }
}

/* ---------- FULLSCREEN ---------- */

function sstcIsFullscreen() {

    return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.body.classList.contains("sstc-pseudo-fs-open")
    );
}

function sstcUpdateFullscreenButton() {

    const button = document.getElementById("sstcPdfFull");

    if (button) {
        button.textContent = sstcIsFullscreen() ? "🗗 Exit" : "⛶ Full";
        button.title = sstcIsFullscreen() ? "Exit full screen" : "Full screen";
    }
}

/* iPhone Safari jaise browsers me real fullscreen nahi hota - wahan ye use hota hai */

function sstcSetPseudoFullscreen(on) {

    const viewer = document.getElementById("pdfViewer");

    if (viewer) {
        viewer.classList.toggle("sstc-pseudo-fs", !!on);
    }

    document.body.classList.toggle("sstc-pseudo-fs-open", !!on);

    sstcAfterFullscreenChange();
}

/* Fullscreen me jaane / nikalne ke baad page ko nayi width me fit kar do */

function sstcAfterFullscreenChange() {

    sstcUpdateFullscreenButton();

    if (sstcPdfDocument) {
        setTimeout(fitSstcPdfWidth, 250);
    }
}

document.addEventListener("fullscreenchange", sstcAfterFullscreenChange);
document.addEventListener("webkitfullscreenchange", sstcAfterFullscreenChange);

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape" && document.body.classList.contains("sstc-pseudo-fs-open")) {
        sstcSetPseudoFullscreen(false);
    }
});


/* =========================================================
   CLEAN PDF.JS VIEWER
   ========================================================= */

function destroySstcPdfJsViewer() {

    sstcPdfDocument = null;
    sstcPdfUrl = "";
    sstcPdfPages = 0;
    sstcPdfCurrentPage = 1;
    sstcPdfBaseWidth = 0;
    sstcPdfBaseHeight = 0;
    sstcPdfRenderId++;

    sstcSetPseudoFullscreen(false);

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
        sessionStorage.removeItem(SSTC_SESSION_TOKEN);
        sessionStorage.removeItem(SSTC_SESSION_START_MS);
        sessionStorage.removeItem(SSTC_CURRENT_BOOK);
        sessionStorage.removeItem(SSTC_CURRENT_CHAPTER);
        sessionStorage.removeItem(SSTC_CURRENT_PAGE);
        sessionStorage.removeItem(SSTC_SW_KEY_ACC);     // NEW
        sessionStorage.removeItem(SSTC_SW_KEY_START);   // NEW
        sessionStorage.removeItem(SSTC_ALARM_NEXT_KEY);
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

async function studentLogout(event) {

    if (event) {
        event.preventDefault();
    }

    if (sstcLoggingOut) {
        return false;
    }

    sstcLoggingOut = true;

    const logoutButton = event && event.currentTarget;

    if (logoutButton && logoutButton.textContent !== undefined) {

        try {
            logoutButton.textContent = "Logging out…";
            logoutButton.style.pointerEvents = "none";
        }
        catch (error) {
            /* ignore */
        }
    }

    if (sstcSessionHeartbeatTimer) {
        clearInterval(sstcSessionHeartbeatTimer);
    }

    stopLogoutReminder();
   stopSstcTimeTracker();
    /*
       Server ko bata do ki session khatam ho rahi hai - max ~3 second
       wait karte hain redirect se pehle.
    */

    try {

        const studentId = getStudentValue(["studentId", "id"], "");
        const password = getStudentValue(["password"], "");
        const sessionToken = sessionStorage.getItem(SSTC_SESSION_TOKEN) || "";

        if (SSTC_STUDENT_API_URL && studentId) {

            const url =
                SSTC_STUDENT_API_URL +
                (SSTC_STUDENT_API_URL.indexOf("?") > -1 ? "&" : "?") +
                "action=endsession" +
                "&studentId=" + encodeURIComponent(studentId) +
                "&sessionToken=" + encodeURIComponent(sessionToken) +
                "&password=" + encodeURIComponent(password);

            const endSessionPromise = fetch(url, { method: "GET", cache: "no-store", keepalive: true }).catch(function () {
                /* ignore - network fail ho to bhi aage badhte hain */
            });

            const timeoutPromise = new Promise(function (resolve) {
                setTimeout(resolve, 3000);
            });

            await Promise.race([endSessionPromise, timeoutPromise]);
        }
    }
    catch (error) {
        console.warn("SSTC end-session warning:", error);
    }

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
    if (sstcPdfZoomBy(SSTC_PDF_STEP)) { return; }
    sstcZoom = Math.min(200, sstcZoom + 10);
    applyZoom();
}


/* =========================================================
   ZOOM OUT
   ========================================================= */

function zoomOut() {
    if (sstcPdfZoomBy(-SSTC_PDF_STEP)) { return; }
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

    if (sstcPdfDocument) { fitSstcPdfWidth(); return; }

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

    if (sstcPdfDocument && sstcPdfFitPage()) { return; }

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

    /* Pseudo fullscreen (iPhone etc.) chal rahi ho to band karo */

    if (document.body.classList.contains("sstc-pseudo-fs-open")) {
        sstcSetPseudoFullscreen(false);
        return;
    }

    /* Real fullscreen chal rahi ho to band karo */

    if (document.fullscreenElement || document.webkitFullscreenElement) {

        const exit = document.exitFullscreen || document.webkitExitFullscreen;

        if (exit) {
            exit.call(document);
        }

        return;
    }

    const request = viewer.requestFullscreen || viewer.webkitRequestFullscreen;

    if (!request) {
        sstcSetPseudoFullscreen(true);
        return;
    }

    try {

        const result = request.call(viewer);

        if (result && result.catch) {
            result.catch(function (error) {
                console.warn("Fullscreen unavailable, using fallback:", error);
                sstcSetPseudoFullscreen(true);
            });
        }
    }
    catch (error) {
        sstcSetPseudoFullscreen(true);
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
        if (sstcAllowPrint) { return; }
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
window.openSstcNotes = openSstcNotes;


/* =========================================================
   STUDY TIME TRACKER
   Session timer (login -> logout) + Study stopwatch
   ========================================================= */

// const SSTC_SW_KEY_ACC = "sstcSwAccMs";       // ab tak jama hua stopwatch time
// const SSTC_SW_KEY_START = "sstcSwStartMs";   // chal raha ho to start timestamp

let sstcTrackerTimer = null;

function formatSstcDuration(ms) {

    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return String(h).padStart(2, "0") + ":" +
           String(m).padStart(2, "0") + ":" +
           String(s).padStart(2, "0");
}

function injectSstcTrackerStyles() {

    if (document.getElementById("sstcTrackerStyles")) { return; }

    const style = document.createElement("style");
    style.id = "sstcTrackerStyles";

    style.textContent = `
        #sstcTimeSection {
            display:inline-flex; align-items:center; flex-wrap:wrap;
            gap:10px; box-sizing:border-box;
            padding:5px 12px; border-radius:999px;
            background:linear-gradient(135deg,#fff7ed,#fdf2f8);
            border:1.5px solid #fbcfe8;
            box-shadow:0 3px 10px rgba(236,72,153,.13);
            font-family:Arial,sans-serif;
            transition:box-shadow .3s, border-color .3s;
        }
        #sstcTimeSection.running {
            border-color:#34d399;
            box-shadow:0 0 0 3px rgba(52,211,153,.22), 0 3px 10px rgba(16,185,129,.22);
        }
        .sstc-mini-row { display:flex; align-items:center; gap:7px; }
        .sstc-mini-sep { width:1px; height:24px; background:#f3c4dc; }
        .sstc-mini-ico {
            flex:0 0 auto; width:24px; height:24px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:13px; background:#ffffff;
            box-shadow:0 2px 5px rgba(0,0,0,.08);
        }
        #sstcTimeSection.running .sstc-mini-ico.study { animation:sstcWiggle .8s ease-in-out infinite; }
        .sstc-mini-info { line-height:1.1; }
        .sstc-mini-info small {
            display:block; font-size:8.5px; font-weight:700;
            color:#9d174d; text-transform:uppercase; letter-spacing:.5px;
        }
        .sstc-mini-info b {
            display:block; font-size:14px; font-weight:800; color:#1e293b;
            font-variant-numeric:tabular-nums; letter-spacing:.4px;
        }
        .sstc-live-dot {
            display:inline-block; width:5px; height:5px; border-radius:50%;
            background:#22c55e; margin:0 3px 0 4px; vertical-align:middle;
            animation:sstcLive 1.2s ease-in-out infinite;
        }
        .sstc-mini-btns { display:flex; gap:4px; }
        .sstc-mini-btns button {
            width:22px; height:22px; border:0; border-radius:50%;
            cursor:pointer; font-size:10px; line-height:1; padding:0;
            background:#10b981; color:#fff;
            box-shadow:0 2px 5px rgba(16,185,129,.4);
        }
        .sstc-mini-btns button.reset { background:#f472b6; box-shadow:0 2px 5px rgba(244,114,182,.4); }
        .sstc-mini-btns button:active { transform:scale(.9); }
        @keyframes sstcLive { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes sstcWiggle { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
        @media (max-width:520px) {
            #sstcTimeSection { border-radius:16px; width:100%; justify-content:center; }
            .sstc-mini-sep { display:none; }
        }
    `;

    document.head.appendChild(style);
}


function createSstcTrackerSection() {

    if (document.getElementById("sstcTimeSection")) { return; }

    injectSstcTrackerStyles();

    const section = document.createElement("div");
    section.id = "sstcTimeSection";
    section.title = "Login: " + (sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME) || "-");

    section.innerHTML =
        '<div class="sstc-mini-row">' +
            '<div class="sstc-mini-ico">🦉</div>' +
            '<div class="sstc-mini-info">' +
                '<small>Session<span class="sstc-live-dot"></span><span id="sstcSessionState">Live</span></small>' +
                '<b id="sstcSessionClock">00:00:00</b>' +
            '</div>' +
        '</div>' +
        '<div class="sstc-mini-sep"></div>' +
        '<div class="sstc-mini-row">' +
            '<div class="sstc-mini-ico study">📚</div>' +
            '<div class="sstc-mini-info">' +
                '<small>Study Time</small>' +
                '<b id="sstcSwClock">00:00:00</b>' +
            '</div>' +
            '<div class="sstc-mini-btns">' +
                '<button type="button" id="sstcSwToggle" title="Start / Pause">▶</button>' +
                '<button type="button" id="sstcSwReset" class="reset" title="Reset">↺</button>' +
            '</div>' +
        '</div>';

    /* Student Portal badge ke saath ek line me */
    const slot = document.getElementById("sstcTrackerSlot");

    if (slot) {
        slot.appendChild(section);
    }
    else {
        const anchor = document.getElementById("chapterSection");
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(section, anchor);
        }
        else {
            document.body.appendChild(section);
        }
    }

    document.getElementById("sstcSwToggle").addEventListener("click", toggleSstcStopwatch);
    document.getElementById("sstcSwReset").addEventListener("click", resetSstcStopwatch);
}
/* ---- Stopwatch helpers (timestamp based = accurate, refresh-safe) ---- */

function getSstcSwElapsed() {

    const acc = Number(sessionStorage.getItem(SSTC_SW_KEY_ACC)) || 0;
    const startedAt = Number(sessionStorage.getItem(SSTC_SW_KEY_START)) || 0;

    return startedAt ? acc + (Date.now() - startedAt) : acc;
}

function isSstcSwRunning() {
    return !!Number(sessionStorage.getItem(SSTC_SW_KEY_START));
}

function toggleSstcStopwatch() {

    if (isSstcSwRunning()) {
        /* Pause: abhi tak ka time jama kar do */
        sessionStorage.setItem(SSTC_SW_KEY_ACC, String(getSstcSwElapsed()));
        sessionStorage.removeItem(SSTC_SW_KEY_START);
    }
    else {
        sessionStorage.setItem(SSTC_SW_KEY_START, String(Date.now()));
    }

    updateSstcTracker();
}

function resetSstcStopwatch() {

    sessionStorage.removeItem(SSTC_SW_KEY_ACC);
    sessionStorage.removeItem(SSTC_SW_KEY_START);

    updateSstcTracker();
}

/* ---- Live update (har 250ms) ---- */

function updateSstcTracker() {

    const sessionClock = document.getElementById("sstcSessionClock");
    const swClock = document.getElementById("sstcSwClock");
    const toggle = document.getElementById("sstcSwToggle");

    if (!sessionClock || !swClock) { return; }

    const startMs = Number(sessionStorage.getItem(SSTC_SESSION_START_MS)) || Date.now();

    sessionClock.textContent = formatSstcDuration(Date.now() - startMs);

    swClock.textContent = formatSstcDuration(getSstcSwElapsed());

    if (toggle) {
                toggle.textContent = isSstcSwRunning() ? "⏸" : "▶";

        const box = document.getElementById("sstcTimeSection");
        if (box) { box.classList.toggle("running", isSstcSwRunning()); }
    }
}

function initSstcTimeTracker() {

    /* Login nahi hai to kuch mat banao */
    if (sessionStorage.getItem(SSTC_SESSION_LOGIN) !== "true") { return; }

    createSstcTrackerSection();

    setText("sstcSessionLoginAt", sessionStorage.getItem(SSTC_SESSION_LOGIN_TIME) || "-");

    updateSstcTracker();

    if (sstcTrackerTimer) { clearInterval(sstcTrackerTimer); }

    sstcTrackerTimer = setInterval(updateSstcTracker, 250);
}

function stopSstcTimeTracker() {

    if (sstcTrackerTimer) {
        clearInterval(sstcTrackerTimer);
        sstcTrackerTimer = null;
    }

    const state = document.getElementById("sstcSessionState");

    if (state) { state.textContent = "Ended"; }
}

/* Original DOMContentLoaded ke baad chalega (loadLoggedInStudent pehle ho chuka hoga) */
document.addEventListener("DOMContentLoaded", initSstcTimeTracker);
/* =========================================================
   E-BOOK QB  open / close
   ========================================================= */

function openSstcEbook() {

    if (!checkStudentSession()) { return; }

    const wrap = document.getElementById("sstcEbookWrap");
    if (!wrap) { return; }

    /* Agar notes khule hain to unhe band kar do (optional) */
    if (typeof closeSstcNotes === "function") {
        try { closeSstcNotes(); } catch (e) { /* ignore */ }
    }

    wrap.hidden = false;
       if (typeof closeSstcFree === "function") { closeSstcFree(); }
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSstcEbook() {

    const wrap = document.getElementById("sstcEbookWrap");
    if (wrap) { wrap.hidden = true; }

    /* Reader reset */
    destroySstcPdfJsViewer();

    const empty = document.getElementById("viewerEmpty");
    if (empty) { empty.style.display = "flex"; }
}

window.openSstcEbook = openSstcEbook;
window.closeSstcEbook = closeSstcEbook;


/* =========================================================
   SSTC FREE'S  (free HTML chapters + viewer)
   ========================================================= */

/* Yahan subject aur unke free chapters add / hatao. file = HTML file ka path */
/* Class ke hisaab se free chapters. Key = class number ("10", "12") */
/* Class ke hisaab se free chapters. en = English file, hi = Hindi file */
const SSTC_FREE_CHAPTERS_BY_CLASS = {

    "10": [
        {
            subject: "Maths",
            chapters: [
                { title: "SSTC Mathematics One Page Revision", en: "free/class-10/maths/chapter-01-en.html", hi: "free/class-10/maths/chapter-01-hi.html" }
            ]
        },
        {
            subject: "Science",
            chapters: [
                { title: "SSTC Science One Page Revision", en: "free/class-10/science/chapter-01-en.html", hi: "free/class-10/science/chapter-01-hi.html" }
            ]
        },
       {
            subject: "Social Science",
            chapters: [
                { title: "SSTC Social Science One Page Revision", en: "free/class-10/social-science/chapter-01-en.html", hi: "free/class-10/social-science/chapter-01-hi.html" },
               { title: "SSTC Social Science Map Works", en: "free/class-10/social-science/chapter-02-en.html", hi: "free/class-10/social-science/chapter-02-hi.html" }
            ]
        },
        {
            subject: "English",
            chapters: [
                { title: "SSTC English One Page Revision", en: "free/class-10/english/chapter-01-en.html", hi: "free/class-10/english/chapter-01-hi.html" }
            ]
        },
       {
            subject: "Hindi",
            chapters: [
                { title: "SSTC Hindi One Page Revision", en: "free/class-10/hindi/chapter-01-en.html", hi: "free/class-10/science/chapter-01-hi.html" }
            ]
        },
    ],

    "12": [
        {
            subject: "Maths",
            chapters: [
                { title: "Chapter 1", en: "free/class-12/maths/chapter-01-en.html", hi: "free/class-12/maths/chapter-01-hi.html" }
            ]
        },
        {
            subject: "Science",
            chapters: [
                { title: "Chapter 1", en: "free/class-12/science/chapter-01-en.html", hi: "free/class-12/science/chapter-01-hi.html" }
            ]
        },
        {
            subject: "English",
            chapters: [
                { title: "Chapter 1", en: "free/class-12/english/chapter-01-en.html", hi: "free/class-12/english/chapter-01-hi.html" }
            ]
        }
    ]
};

let sstcFreeMedium = "en";     // "en" ya "hi"
let sstcFreeOpen = null;       // abhi khula chapter { s, c }

function setSstcFreeMedium(medium) {

    sstcFreeMedium = (medium === "hi") ? "hi" : "en";

    document.querySelectorAll(".fr-medium button").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-medium") === sstcFreeMedium);
    });

    /* Chapter khula ho to usi chapter ko nayi language me kholo */
    if (sstcFreeOpen) {
        openSstcFreeChapter(sstcFreeOpen.s, sstcFreeOpen.c);
    }
}

/* Student ki class ke free subjects (class na mile to khaali list) */
function getSstcFreeChapters() {

    const classNumber = normalizeStudentClass(
        getStudentValue(["className", "Class", "class", "studentClass"], "")
    );

    return SSTC_FREE_CHAPTERS_BY_CLASS[classNumber] || [];
}

let sstcFreeZoomValue = 1;

function renderSstcFreeList() {

    const list = document.getElementById("frList");

    if (!list) { return; }

       list.innerHTML = "";

    const freeData = getSstcFreeChapters();

    if (freeData.length === 0) {

        const empty = document.createElement("div");
        empty.className = "chapter-empty";
        empty.innerHTML = "<div>🎁</div><h3>Free chapters abhi available nahi hain</h3><p>Aapki class ke free chapters jaldi add honge.</p>";

        list.appendChild(empty);
        return;
    }

    freeData.forEach(function (sub, sIndex) {

        const box = document.createElement("div");
        box.className = "fr-subject";

        const head = document.createElement("button");
        head.type = "button";
        head.className = "fr-subject-head";
        head.innerHTML =
            '<span class="fr-subject-arrow">▶</span>' +
            '<span class="fr-subject-title"></span>' +
            '<span class="fr-subject-count"></span>';

        head.querySelector(".fr-subject-title").textContent = "📘 " + sub.subject;
        head.querySelector(".fr-subject-count").textContent = sub.chapters.length + " Chapters";

        head.addEventListener("click", function () {
            box.classList.toggle("open");
        });

        const body = document.createElement("div");
        body.className = "fr-subject-body";

        sub.chapters.forEach(function (ch, cIndex) {

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "fr-item";
            btn.setAttribute("data-free", sIndex + "-" + cIndex);

            const no = document.createElement("div");
            no.className = "fr-item-no";
            no.textContent = String(cIndex + 1);

            const info = document.createElement("div");
            info.className = "fr-item-info";

            const h = document.createElement("h3");
            h.textContent = ch.title;

            const p = document.createElement("p");
            p.textContent = sub.subject + " • FREE";

            info.appendChild(h);
            info.appendChild(p);

            const open = document.createElement("span");
            open.className = "fr-item-open";
            open.textContent = "Open →";

            btn.appendChild(no);
            btn.appendChild(info);
            btn.appendChild(open);

            btn.addEventListener("click", function () {
                openSstcFreeChapter(sIndex, cIndex);
            });

            body.appendChild(btn);
        });

        box.appendChild(head);
        box.appendChild(body);
        list.appendChild(box);
    });
}

function openSstcFree() {

    if (!checkStudentSession()) { return; }

    const section = document.getElementById("sstcFreeSection");

    if (!section) { return; }

    /* Notes aur E-Book QB band kar do */
    if (typeof closeSstcNotes === "function") {
        try { closeSstcNotes(); } catch (e) { /* ignore */ }
    }

    const ebook = document.getElementById("sstcEbookWrap");
    if (ebook) { ebook.hidden = true; }

    renderSstcFreeList();
    setSstcFreeMedium(sstcFreeMedium);
    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSstcFree() {

    closeSstcFreeViewer();

    const section = document.getElementById("sstcFreeSection");
    if (section) { section.hidden = true; }
}

function openSstcFreeChapter(sIndex, cIndex) {

    const sub = getSstcFreeChapters()[sIndex];
    const item = sub && sub.chapters[cIndex];

    if (!item) { return; }

    const viewer = document.getElementById("frViewer");
    const frame = document.getElementById("frFrame");

    if (!viewer || !frame) { return; }

    sstcFreeOpen = { s: sIndex, c: cIndex };

    document.getElementById("frViewerTitle").textContent =
        sub.subject + " • " + item.title + " (" + (sstcFreeMedium === "hi" ? "Hindi" : "English") + ")";

    sstcFreeZoomValue = 1;
    applySstcFreeZoom();

    frame.src = sstcFreeMedium === "hi" ? item.hi : item.en;
    viewer.hidden = false;

    document.querySelectorAll(".fr-item").forEach(function (el) {
        el.classList.toggle("active", el.getAttribute("data-free") === sIndex + "-" + cIndex);
    });

    viewer.scrollIntoView({ behavior: "smooth", block: "start" });
}


function closeSstcFreeViewer() {

    const viewer = document.getElementById("frViewer");
    const frame = document.getElementById("frFrame");

    if (frame) { frame.src = "about:blank"; }
    if (viewer) { viewer.hidden = true; }
       sstcFreeOpen = null;
    document.querySelectorAll(".fr-item.active").forEach(function (el) {
        el.classList.remove("active");
    });
}

function applySstcFreeZoom() {

    const frame = document.getElementById("frFrame");
    const label = document.getElementById("frZoomLevel");

    if (frame) {
        frame.style.transform = "scale(" + sstcFreeZoomValue + ")";
        frame.style.transformOrigin = "top left";
        frame.style.width = (100 / sstcFreeZoomValue) + "%";
        frame.style.height = (100 / sstcFreeZoomValue) + "%";
    }

    if (label) { label.textContent = Math.round(sstcFreeZoomValue * 100) + "%"; }
}

/* delta = +0.1 / -0.1, 0 = reset */
function sstcFreeZoom(delta) {

    if (delta === 0) {
        sstcFreeZoomValue = 1;
    }
    else {
        sstcFreeZoomValue = Math.max(0.5, Math.min(2.5, Math.round((sstcFreeZoomValue + delta) * 10) / 10));
    }

    applySstcFreeZoom();
}

function sstcFreeFullscreen() {

    const wrap = document.querySelector("#frViewer .fr-frame-wrap");

    if (!wrap) { return; }

    const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;

    if (req) { req.call(wrap); }
}

window.openSstcFree = openSstcFree;
window.closeSstcFree = closeSstcFree;
window.openSstcFreeChapter = openSstcFreeChapter;
window.closeSstcFreeViewer = closeSstcFreeViewer;
window.sstcFreeFullscreen = sstcFreeFullscreen;
window.sstcFreeZoom = sstcFreeZoom;
window.setSstcFreeMedium = setSstcFreeMedium;
/* =========================================================
   PROFILE CARD: click par minimize / expand
   ========================================================= */

function toggleStudentProfile(forceOpen) {

    const card = document.getElementById("sstcProfileCard");
    const bar = document.getElementById("pf3Toggle");
    const hint = document.getElementById("pf3Hint");

    if (!card) { return; }

    const open = (typeof forceOpen === "boolean")
        ? forceOpen
        : !card.classList.contains("open");

    card.classList.toggle("open", open);

    if (bar) { bar.setAttribute("aria-expanded", open ? "true" : "false"); }
    if (hint) { hint.textContent = open ? "Hide" : "Details"; }
}

window.toggleStudentProfile = toggleStudentProfile;
