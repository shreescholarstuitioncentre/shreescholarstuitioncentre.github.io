/* =========================================================
   SSTC STUDENT PORTAL
   LIVE STUDENT DATA
   SESSION + PROFILE + E-BOOK LIBRARY + PDF READER
   + RENT SUBJECTS (3 / 6 / 12 months -> saved in Google Sheet)
   + PAY NOW (UPI payment + payment claim + admin email)
   + SINGLE-DEVICE LOGIN ENFORCEMENT (heartbeat check,
     auto-logout on another-device login, auto-logout on
     browser/tab close - NO 2-hour time-based auto-logout)
   + 45-MINUTE "PLEASE LOGOUT AFTER READING" REMINDER TOAST
   ========================================================= */


/* =========================================================
   GLOBAL STUDENT DATA
   ========================================================= */

let studentData = null;
let sstcRedirecting = false;
let sstcLoggingOut = false;
let sstcZoom = 0;

/* --- session enforcement state --- */
const SSTC_SESSION_HEARTBEAT_MS = 45 * 1000;               // har 45 second me server check
let sstcSessionHeartbeatTimer = null;
let sstcSessionEnding = false;   // duplicate "forced logout" na ho isliye guard
let sstcHeartbeatBusy = false;   // heartbeat overlap na ho

/* --- 45-minute "please logout" reminder state --- */
const SSTC_LOGOUT_REMINDER_MS = 15 * 1000; //45 * 60 * 1000;   // 45 minute
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
                 { "number": 15, "title": "Chapter 15: Swadesh Prem / Nadi - Kedarnath Singh (Kavya) / अध्याय 15: स्वदेश प्रेम / नदी - केदारनाथ सिंह (काव्य)", "pdf": "ebooks/class-10/hindi/chapter-15.pdf" },
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
                 { "number": 26, "title": "Chapter 26: Nibandh Aur Patra Lekhan / अध्याय 26: निबंध रचना एवं पत्र लेखन", "pdf": "ebooks/class-10/hindi/chapter-26.pdf" }
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
                { number: 8, title: "Chapter 8: E-Commerce and E-Governance", pdf: "ebooks/class-10/computer/chapter-08.pdf" },
               { number: 9, title: "Chapter 9: Cyber Crimes and Security", pdf: "ebooks/class-10/computer/chapter-09.pdf" },
               { number: 10, title: "Chapter 10: Programs Based on C Language", pdf: "ebooks/class-10/computer/chapter-10.pdf" }
            ]
        },

       "Music": {
          "description": "Class 10 Music E-Book Library",
          "image": "subject-images/class-10/music.png",
          "chapters": [
              { "number": 1, "title": "Chapter 1: Definition of Technical Terms (Nada, Shruti, Swara, Saptak) / अध्याय 1: पारिभाषिक शब्दों की व्याख्या (नाद, श्रुति, स्वर, सप्तक)", "pdf": "ebooks/class-10/music/chapter-01.pdf" },
              { "number": 2, "title": "Chapter 2: Raga Architecture: Aroha, Avaroha, Pakad, Vadi, Samvadi / अध्याय 2: राग लक्षण: आरोह, अवरोह, पकड़, वादी, संवादी स्वर", "pdf": "ebooks/class-10/music/chapter-02.pdf" },
              { "number": 3, "title": "Chapter 3: Study of Ragas: Bhairav, Asavari, Kafi, Bhupali / अध्याय 3: निर्धारित रागों का विस्तृत अध्ययन: भैरव, आसावरी, काफी, भूपाली", "pdf": "ebooks/class-10/music/chapter-03.pdf" },
              { "number": 4, "title": "Chapter 4: Study of Ragas: Yaman, Bilawal, Khamaj / अध्याय 4: रागों का अध्ययन: यमन, बिलावल, खमाज", "pdf": "ebooks/class-10/music/chapter-04.pdf" },
              { "number": 5, "title": "Chapter 5: Concepts of Tala & Laya (Vilambit, Madhya, Drut) / अध्याय 5: ताल एवं लय की अवधारणा (विलम्बित, मध्य, द्रुत)", "pdf": "ebooks/class-10/music/chapter-05.pdf" },
              { "number": 6, "title": "Chapter 6: Study of Talas: Teental, Dadra, Kaharwa, Jhaptal / अध्याय 6: निर्धारित तालों का परिचय: तीनताल, दादरा, कहरवा, झपताल", "pdf": "ebooks/class-10/music/chapter-06.pdf" },
              { "number": 7, "title": "Chapter 7: Study of Talas: Chartal, Sooltal, Rupak / अध्याय 7: तालों का परिचय: चारताल, शूलताल, रूपक", "pdf": "ebooks/class-10/music/chapter-07.pdf" },
              { "number": 8, "title": "Chapter 8: Introduction to Indian Notation System (Bhatkhande / Paluskar) / अध्याय 8: भारतीय स्वरलिपि पद्धति का परिचय (भातखण्डे / पलुस्कर)", "pdf": "ebooks/class-10/music/chapter-08.pdf" },
              { "number": 9, "title": "Chapter 9: Description of Musical Instruments (Tanpura, Tabla, Harmonium, Sitar) / अध्याय 9: प्रमुख वाद्यों का विवरण (तानपुरा, तबला, हारमोनियम, सितार)", "pdf": "ebooks/class-10/music/chapter-09.pdf" },
              { "number": 10, "title": "Chapter 10: Biographies of Eminent Musicians / Contributors / अध्याय 10: प्रसिद्ध संगीतज्ञों का जीवन परिचय एवं योगदान", "pdf": "ebooks/class-10/music/chapter-10.pdf" }
          ]
      },

       "Commerce": {
             "description": "Class 10 Commerce E-Book Library",
             "image": "subject-images/class-10/commerce.png",
             "chapters": [
                 { "number": 1, "title": "Chapter 1: Final Accounts with Adjustments (Accountancy) / अध्याय 1: अंतिम खाते (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-01.pdf" },
                 { "number": 2, "title": "Chapter 2: Partnership Accounts (Accountancy) / अध्याय 2: साझेदारी खाते (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-02.pdf" },
                 { "number": 3, "title": "Chapter 3: Bank Reconciliation Statement (Accountancy) / अध्याय 3: बैंक समाधान विवरण (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-03.pdf" },
                 { "number": 4, "title": "Chapter 4: Depreciation (Accountancy) / अध्याय 4: ह्रास (बहीखाता)", "pdf": "ebooks/class-10/commerce/chapter-04.pdf" },
                 { "number": 5, "title": "Chapter 5: Bills of Exchange, Promissory Notes & Hundi / अध्याय 5: विनिमय-विपत्र, प्रतिज्ञा-पत्र व हुण्डी", "pdf": "ebooks/class-10/commerce/chapter-05.pdf" },
                 { "number": 6, "title": "Chapter 6: Filing / System of Filing (Business Methods) / अध्याय 6: नस्तीकरण या फाइलिंग (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-06.pdf" },
                 { "number": 7, "title": "Chapter 7: Indexing (Business Methods) / अध्याय 7: अनुक्रमणिका या श्रेणीबद्ध सूची (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-07.pdf" },
                 { "number": 8, "title": "Chapter 8: Means of Communication (Business Methods) / अध्याय 8: संदेशवाहन प्रणालियाँ (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-08.pdf" },
                 { "number": 9, "title": "Chapter 9: Time and Labor-Saving Appliances / अध्याय 9: समय व श्रम बचाने वाले यंत्र (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-09.pdf" },
                 { "number": 10, "title": "Chapter 10: Home Trade / Inland Trade (Business Methods) / अध्याय 10: देशी व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-10.pdf" },
                 { "number": 11, "title": "Chapter 11: Wholesale Trade (Business Methods) / अध्याय 11: थोक व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-11.pdf" },
                 { "number": 12, "title": "Chapter 12: Retail Trade (Business Methods) / अध्याय 12: फुटकर व्यापार (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-12.pdf" },
                 { "number": 13, "title": "Chapter 13: Invoice and Statement of Account / अध्याय 13: बीजक एवं व्यवहार विवरण (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-13.pdf" },
                 { "number": 14, "title": "Chapter 14: Export and Import Trade (Business Methods) / अध्याय 14: विदेशी व्यापार - आयात और निर्यात (व्यावसायिक पद्धति)", "pdf": "ebooks/class-10/commerce/chapter-14.pdf" },
                 { "number": 15, "title": "Chapter 15: Banking: Origin and Functions (Banking) / अध्याय 15: बैंक: उत्पत्ति एवं कार्य (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-15.pdf" },
                 { "number": 16, "title": "Chapter 16: Central Bank / Reserve Bank of India (Banking) / अध्याय 16: केन्द्रीय बैंक / भारतीय रिजर्व बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-16.pdf" },
                 { "number": 17, "title": "Chapter 17: Commercial Banks and Co-operative Banks / अध्याय 17: व्यापारिक बैंक एवं सहकारी बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-17.pdf" },
                 { "number": 18, "title": "Chapter 18: State Bank of India (Banking) / अध्याय 18: भारतीय स्टेट बैंक (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-18.pdf" },
                 { "number": 19, "title": "Chapter 19: Indigenous Bankers / अध्याय 19: देशी बैंकर या साहूकार (अधिकोषण तत्त्व)", "pdf": "ebooks/class-10/commerce/chapter-19.pdf" },
                 { "number": 20, "title": "Chapter 20: Meaning and Scope of Economics (Economics) / अध्याय 20: अर्थशास्त्र का अर्थ एवं क्षेत्र (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-20.pdf" },
                 { "number": 21, "title": "Chapter 21: Factors of Production: Land, Labor, Capital / अध्याय 21: उत्पादन के साधन: भूमि, श्रम, पूँजी (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-21.pdf" },
                 { "number": 22, "title": "Chapter 22: Organization and Enterprise (Economics) / अध्याय 22: संगठन एवं साहस (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-22.pdf" },
                 { "number": 23, "title": "Chapter 23: Consumer's Surplus (Economics) / अध्याय 23: उपभोक्ता की बचत (अर्थशास्त्र)", "pdf": "ebooks/class-10/commerce/chapter-23.pdf" }
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
   45-MINUTE ALARM (avatar + sound + 60 sec auto-close)
   Logout hone tak har 45 min baad baar-baar bajta hai
   ========================================================= */

const SSTC_ALARM_AUTOCLOSE_MS = 10 * 1000; //60 * 1000;   // 60 second me auto band

let sstcAlarmAutoCloseTimer = null;
let sstcAlarmCountdownTimer = null;
let sstcAlarmBeepTimer = null;
let sstcAudioCtx = null;

const SSTC_ALARM_MESSAGES = [
    { hi: "उठो, जागो! अगर पढ़ नहीं रहे हो तो Logout कर दो! 📚",
      en: "Wake up! If you are not studying, please Logout." },
    { hi: "अरे! पढ़ाई हो गई? तो अपना अकाउंट Logout कर दो! 🔒",
      en: "Done studying? Please Logout to keep your account safe." },
    { hi: "सो गए क्या? पढ़ रहे हो तो पढ़ो, नहीं तो Logout करो! 🌟",
      en: "Fell asleep? Keep reading, or else Logout." }
];

function startLogoutReminder() {
    scheduleNextAlarm();
}

/* Agla alarm 45 minute baad */
function scheduleNextAlarm() {

    if (sstcLogoutReminderTimer) {
        clearTimeout(sstcLogoutReminderTimer);
    }

    sstcLogoutReminderTimer = setTimeout(function () {
        showLogoutReminder();
    }, SSTC_LOGOUT_REMINDER_MS);
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

    try {
        if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    } catch (e) { /* ignore */ }

    const old = document.getElementById("sstcAlarmOverlay");
    if (old) { old.remove(); }
}

/* Close (manual ya auto) -> 45 min baad phir alarm */
function closeLogoutAlarm() {

    removeAlarmUI();

    if (!sstcSessionEnding && !sstcLoggingOut) {
        scheduleNextAlarm();
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
function speakAlarmHindi(text) {

    try {

        if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { return; }

        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "hi-IN";
        speech.rate = 0.95;

        window.speechSynthesis.speak(speech);
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
    speakAlarmHindi("उठो, जागो! अगर पढ़ नहीं रहे हो, तो लॉगआउट कर दो।");
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
        sessionStorage.removeItem(SSTC_SESSION_TOKEN);
        sessionStorage.removeItem(SSTC_SESSION_START_MS);
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
window.openSstcNotes = openSstcNotes;
