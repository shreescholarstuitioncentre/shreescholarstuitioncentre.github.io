/* =========================================================
   SSTC SUBJECT NOTES PAGE
   Login guard + student summary + subject cards + chapters
   + English/Hindi toggle + notes viewer + Print / Save PDF
   ---------------------------------------------------------
   NOTE: Is page par student-page.js include NAHI karna.
   (Wahan tab band hone par endsession chalta hai.)
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       SETTINGS
       ===================================================== */

    const API_URL = "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";

    const ACCESS_PAGE = "sstc-access.html";
    const PORTAL_PAGE = "student-page.html";

    /* Notes ka main folder (repo me) */
    const NOTES_BASE = "notes";

    const HEARTBEAT_MS = 45 * 1000;

    const KEY_LOGIN = "sstcStudentLoggedIn";
    const KEY_DATA = "sstcStudentData";
    const KEY_TOKEN = "sstcSessionToken";
    const KEY_LOGIN_TIME = "sstcStudentLoginTime";
    const KEY_MEDIUM = "sstcNotesMedium";


    /* =====================================================
       NOTES LIBRARY
       -----------------------------------------------------
       File ka path automatically ban jata hai:

       notes/class-10/science/chapter-01-en.html   (English)
       notes/class-10/science/chapter-01-hi.html   (Hindi)

       Naya chapter jodna ho to bas titles me ek naam add karein.
       ===================================================== */

    function sub(folder, image, titles) {

        return {
            folder: folder,
            image: image,
            titles: titles
        };
    }

    const NOTES = {

        "10": {

            "Science": sub("science", "subject-images/class-10/science.png", [
                "Chemical Reactions and Equations",
                "Acids, Bases and Salts",
                "Metals and Non-metals",
                "Carbon and Its Compounds",
                "Life Processes",
                "Control and Coordination",
                "How do Organisms Reproduce?",
                "Heredity",
                "Light – Reflection and Refraction",
                "The Human Eye and the Colourful World",
                "Electricity",
                "Magnetic Effects of Electric Current",
                "Our Environment"
            ]),

            "Mathematics": sub("mathematics", "subject-images/class-10/maths.png", [
                "Real Numbers",
                "Polynomials",
                "Pair of Linear Equations in Two Variables",
                "Quadratic Equations",
                "Arithmetic Progressions",
                "Triangles",
                "Coordinate Geometry",
                "Introduction to Trigonometry",
                "Some Applications of Trigonometry",
                "Circles",
                "Areas Related to Circles",
                "Surface Areas and Volumes",
                "Statistics",
                "Probability"
            ]),

            "Hindi": sub("hindi", "subject-images/class-10/Hindi.png", [
                "मित्रता (गद्य)",
                "ममता (गद्य)",
                "क्या लिखूँ? (गद्य)",
                "भारतीय संस्कृति (गद्य)",
                "ईर्ष्या, तू न गई मेरे मन से (गद्य)",
                "अजंता (गद्य)",
                "पानी में चंदा और चाँद पर आदमी (गद्य)",
                "पद – सूरदास (काव्य)",
                "धनुष भंग – तुलसीदास (काव्य)",
                "सवैये – कवित्त – रसखान (काव्य)",
                "भक्ति नीति – बिहारी लाल (काव्य)",
                "स्वदेश प्रेम – रामनरेश त्रिपाठी (काव्य)",
                "भारतमाता का मन्दिर यह – मैथिलीशरण गुप्त (काव्य)",
                "हिमालय से – महादेवी वर्मा (काव्य)",
                "नदी – केदारनाथ सिंह (काव्य)",
                "पुष्प की अभिलाषा – माखनलाल चतुर्वेदी (काव्य)",
                "वाराणसी (संस्कृत)",
                "वीरः वीरेण पूज्यते (संस्कृत)",
                "प्रबुद्धो ग्रामीणः (संस्कृत)",
                "देशभक्तः चन्द्रशेखरः (संस्कृत)",
                "भारतीय संस्कृति (संस्कृत)",
                "जीवन-सूत्राणि (संस्कृत)",
                "हिंदी व्याकरण – रस, अलंकार, छंद",
                "उपसर्ग, प्रत्यय, समास, तत्सम-तद्भव",
                "संस्कृत व्याकरण – संधि, शब्द रूप, धातु रूप",
                "निबंध रचना एवं पत्र लेखन"
            ]),

            "English": sub("english", "subject-images/class-10/english.png", [
                "A Letter to God (Prose)",
                "Dust of Snow (Poem)",
                "Fire and Ice (Poem)",
                "Nelson Mandela: Long Walk to Freedom (Prose)",
                "A Tiger in the Zoo (Poem)",
                "Two Stories About Flying (Prose)",
                "How to Tell Wild Animals (Poem)",
                "The Ball Poem (Poem)",
                "From the Diary of Anne Frank (Prose)",
                "Amanda! (Poem)",
                "Glimpses of India (Prose)",
                "The Trees (Poem)",
                "Mijbil the Otter (Prose)",
                "Fog (Poem)",
                "Madam Rides the Bus (Prose)",
                "The Tale of Custard the Dragon (Poem)",
                "The Sermon at Benares (Prose)",
                "For Anne Gregory (Poem)",
                "The Proposal (Prose)",
                "A Triumph of Surgery (Supplementary)",
                "The Thief's Story (Supplementary)",
                "The Midnight Visitor (Supplementary)",
                "A Question of Trust (Supplementary)",
                "Footprints Without Feet (Supplementary)",
                "The Making of a Scientist (Supplementary)",
                "The Necklace (Supplementary)",
                "Bholi (Supplementary)",
                "The Book That Saved the Earth (Supplementary)",
                "Grammar: Tenses, Articles, Reordering of Sentences",
                "Grammar: Voice, Narration, Punctuation",
                "Composition: Letter, Application & Paragraph Writing",
                "Unseen Passage & Translation (Hindi to English)"
            ]),

            "Social Science": sub("social-science", "subject-images/class-10/socialscience.png", [
                "The Rise of Nationalism in Europe",
                "Nationalism in India",
                "The Making of a Global World",
                "The Age of Industrialization",
                "Print Culture and the Modern World",
                "Resources and Development",
                "Forest and Wildlife Resources",
                "Water Resources",
                "Agriculture",
                "Minerals and Energy Resources",
                "Manufacturing Industries",
                "Lifelines of National Economy",
                "Power Sharing",
                "Federalism",
                "Gender, Religion and Caste",
                "Political Parties",
                "Outcomes of Democracy",
                "Development",
                "Sectors of the Indian Economy",
                "Money and Credit",
                "Globalization and the Indian Economy",
                "Consumer Rights"
            ]),

            "Chitrakala": sub("chitrakala", "subject-images/class-10/chitrakala.png", [
                "Elements of Art & Color Theory",
                "Choice of Core Practical Art",
                "Natural Landscape Drawing",
                "Ornamental Design (Aalekhan)",
                "Technical / Geometric Art (Pravaidhik)",
                "Memory Drawing OR Indian Art",
                "Memory Drawing (Shading Practice)",
                "History of Indian Art (Theory)"
            ]),

            "Home Science": sub("home-science", "subject-images/class-10/homescience.png", [
                "Family Budget",
                "Investment of Savings",
                "Home Cleanliness",
                "Waste Disposal and Cleanliness",
                "Home Decoration",
                "Household Mathematics",
                "Water Sources: Use and Purification",
                "Water-Borne Diseases",
                "Environmental Pollution and its Effect on Human Life",
                "Some Common Diseases, Causes and Prevention",
                "Sewing Kit and Garment Making Art",
                "Washing and Maintenance of Clothes",
                "Kitchen Management, Care and Cleaning",
                "Cooking, Serving Food and Preservation of Nutrients",
                "Human Skeleton and Joints",
                "Fractures and Sprains",
                "Respiratory System: Basic Knowledge",
                "Natural and Artificial Respiration",
                "First Aid and Care of the Sick"
            ]),

            "Computer": sub("computer", "subject-images/class-10/computer.png", [
                "Functions in C",
                "Arrays in C",
                "C - Function or Subroutine: Searching and Sorting",
                "Structures and Union",
                "Pointers and File Handling",
                "Introduction to AI, Types and Applications",
                "Drone / UAV Technology",
                "E-Commerce and E-Governance",
                "Cyber Crimes and Security",
                "Programs Based on C Language"
            ]),

            "Music": sub("music", "subject-images/class-10/music.png", [
                "Definition of Technical Terms (Nada, Shruti, Swara, Saptak)",
                "Raga Architecture: Aroha, Avaroha, Pakad, Vadi, Samvadi",
                "Study of Ragas: Bhairav, Asavari, Kafi, Bhupali",
                "Study of Ragas: Yaman, Bilawal, Khamaj",
                "Concepts of Tala & Laya",
                "Talas: Teental, Dadra, Kaharwa, Jhaptal",
                "Talas: Chartal, Sooltal, Rupak",
                "Indian Notation System (Bhatkhande / Paluskar)",
                "Musical Instruments (Tanpura, Tabla, Harmonium, Sitar)",
                "Biographies of Eminent Musicians"
            ]),

            "Commerce": sub("commerce", "subject-images/class-10/commerce.png", [
                "Final Accounts with Adjustments",
                "Partnership Accounts",
                "Bank Reconciliation Statement",
                "Depreciation",
                "Bills of Exchange, Promissory Notes & Hundi",
                "Filing / System of Filing",
                "Indexing",
                "Means of Communication",
                "Time and Labor-Saving Appliances",
                "Home Trade / Inland Trade",
                "Wholesale Trade",
                "Retail Trade",
                "Invoice and Statement of Account",
                "Export and Import Trade",
                "Banking: Origin and Functions",
                "Central Bank / Reserve Bank of India",
                "Commercial Banks and Co-operative Banks",
                "State Bank of India",
                "Indigenous Bankers",
                "Meaning and Scope of Economics",
                "Factors of Production: Land, Labor, Capital",
                "Organization and Enterprise",
                "Consumer's Surplus"
            ])
        },

        "12": {

            "English": sub("english", "subject-images/class-12/english.png", [
                "The Last Lesson",
                "Lost Spring",
                "Deep Water",
                "The Rattrap",
                "Indigo",
                "Poets and Pancakes",
                "The Interview",
                "Going Places",
                "Poem 1: My Mother at Sixty-Six",
                "Poem 2: An Elementary School Classroom in a Slum",
                "Poem 3: Keeping Quiet",
                "Poem 4: A Thing of Beauty",
                "Poem 5: A Roadside Stand",
                "Poem 6: Aunt Jennifer's Tigers",
                "Supplementary 1: The Third Level",
                "Supplementary 2: The Tiger King",
                "Supplementary 3: Journey to the End of the Earth",
                "Supplementary 4: The Enemy",
                "Supplementary 5: On the Face of It",
                "Supplementary 6: Memories of Childhood",
                "Writing Skills: Notice, Invitation, Letter & Report",
                "Reading Skills: Unseen Passages"
            ]),

            "Mathematics": sub("mathematics", "subject-images/class-12/maths.png", [
                "Relations and Functions",
                "Inverse Trigonometric Functions",
                "Matrices",
                "Determinants",
                "Continuity and Differentiability",
                "Applications of Derivatives",
                "Integrals",
                "Applications of Integrals",
                "Differential Equations",
                "Vector Algebra",
                "Three Dimensional Geometry",
                "Linear Programming",
                "Probability"
            ]),

            "Physics": sub("physics", "subject-images/class-12/physics.png", [
                "Electric Charges and Fields",
                "Electrostatic Potential and Capacitance",
                "Current Electricity",
                "Moving Charges and Magnetism",
                "Magnetism and Matter",
                "Electromagnetic Induction",
                "Alternating Current",
                "Electromagnetic Waves",
                "Ray Optics and Optical Instruments",
                "Wave Optics",
                "Dual Nature of Radiation and Matter",
                "Atoms",
                "Nuclei",
                "Semiconductor Electronics"
            ]),

            "Chemistry": sub("chemistry", "subject-images/class-12/chemistry.png", [
                "Solutions",
                "Electrochemistry",
                "Chemical Kinetics",
                "The d- and f-Block Elements",
                "Coordination Compounds",
                "Haloalkanes and Haloarenes",
                "Alcohols, Phenols and Ethers",
                "Aldehydes, Ketones and Carboxylic Acids",
                "Amines",
                "Biomolecules"
            ]),

            "Biology": sub("biology", "subject-images/class-12/biology.png", [
                "Sexual Reproduction in Flowering Plants",
                "Human Reproduction",
                "Reproductive Health",
                "Principles of Inheritance and Variation",
                "Molecular Basis of Inheritance",
                "Evolution",
                "Human Health and Disease",
                "Microbes in Human Welfare",
                "Biotechnology: Principles and Processes",
                "Biotechnology and its Applications",
                "Organisms and Populations",
                "Ecosystem",
                "Biodiversity and Conservation"
            ])
        }
    };


    /* =====================================================
       STATE
       ===================================================== */

    let studentData = null;
    let classNumber = "";
    let library = null;

    let currentSubject = "";
    let currentChapter = -1;       // 0-based index
    let currentMedium = "en";      // "en" | "hi"
    let currentUrl = "";           // abhi khula hua notes URL
    let loadToken = 0;             // purane load ko ignore karne ke liye

    let heartbeatTimer = null;
    let heartbeatBusy = false;
    let sessionEnding = false;
    let leaving = false;


    /* =====================================================
       SMALL HELPERS
       ===================================================== */

    function el(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {

        const node = el(id);

        if (!node) {
            return;
        }

        const text = String(value === undefined || value === null ? "" : value).trim();

        node.textContent = text === "" ? "-" : text;
    }

    function pad2(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function studentValue(keys, fallback) {

        if (!studentData) {
            return fallback;
        }

        for (let i = 0; i < keys.length; i++) {

            const v = studentData[keys[i]];

            if (v !== undefined && v !== null && String(v).trim() !== "") {
                return String(v).trim();
            }
        }

        return fallback;
    }

    function normalizeClass(value) {

        const match = String(value || "").match(/\d+/);

        return match ? match[0] : "";
    }

    function showToast(message) {

        const old = document.querySelector(".sn-toast");

        if (old) {
            old.remove();
        }

        const box = document.createElement("div");
        box.className = "sn-toast";
        box.setAttribute("role", "status");
        box.textContent = message;

        document.body.appendChild(box);

        requestAnimationFrame(function () {
            box.classList.add("show");
        });

        setTimeout(function () {

            box.classList.remove("show");

            setTimeout(function () {

                if (box.parentNode) {
                    box.remove();
                }

            }, 250);

        }, 2800);
    }

    function clearSession() {

        try {
            sessionStorage.removeItem(KEY_LOGIN);
            sessionStorage.removeItem(KEY_DATA);
            sessionStorage.removeItem(KEY_TOKEN);
            sessionStorage.removeItem(KEY_LOGIN_TIME);
            sessionStorage.removeItem("sstcSessionStartMs");
            sessionStorage.removeItem("sstcCurrentBook");
            sessionStorage.removeItem("sstcCurrentChapter");
            sessionStorage.removeItem("sstcCurrentPage");
        }
        catch (error) {
            /* ignore */
        }

        studentData = null;
    }

    function goToAccess() {

        if (leaving) {
            return;
        }

        leaving = true;

        window.location.replace(ACCESS_PAGE);
    }


    /* =====================================================
       INIT
       ===================================================== */

    document.addEventListener("DOMContentLoaded", init);

    function init() {

        const loggedIn = sessionStorage.getItem(KEY_LOGIN);
        const saved = sessionStorage.getItem(KEY_DATA);

        if (loggedIn !== "true" || !saved) {
            goToAccess();
            return;
        }

        try {
            studentData = JSON.parse(saved);
        }
        catch (error) {
            clearSession();
            goToAccess();
            return;
        }

        if (!studentData || !studentData.studentId) {
            clearSession();
            goToAccess();
            return;
        }

        classNumber = normalizeClass(
            studentValue(["className", "Class", "class", "studentClass"], "")
        );

        library = NOTES[classNumber] || null;

        const savedMedium = sessionStorage.getItem(KEY_MEDIUM);

        if (savedMedium === "en" || savedMedium === "hi") {
            currentMedium = savedMedium;
        }

        renderStudent();
        renderSubjects();
        applyMediumUI();
        bindEvents();
        startHeartbeat();

        setText("snYear", new Date().getFullYear());
    }


    /* =====================================================
       STUDENT SUMMARY
       ===================================================== */

    function renderStudent() {

        const fullName = studentValue(["fullName", "name"], "Student");
        const classValue = studentValue(["className", "Class", "class", "studentClass"], "-");

        setText("snName", fullName);
        setText("snClassLine", classValue);
        setText("snId", studentValue(["studentId", "id"], "-"));
        setText("snBoard", studentValue(["board"], "-"));

        const status = studentValue(["status"], "Active");

        setText("snStatus", status);

        const statusEl = el("snStatus");

        if (statusEl) {
            statusEl.classList.remove("ok", "bad");
            statusEl.classList.add(status.toLowerCase() === "active" ? "ok" : "bad");
        }

        setText("snAvatar", fullName.charAt(0).toUpperCase() || "S");

        document.title = "SSTC | Notes - " + fullName;
    }


    /* =====================================================
       STEP 1 : SUBJECT CARDS
       ===================================================== */

    function renderSubjects() {

        const grid = el("snSubjects");

        if (!grid) {
            return;
        }

        grid.innerHTML = "";

        if (!library) {

            const empty = document.createElement("div");
            empty.className = "sn-empty";
            empty.innerHTML = "<div>📚</div><p>Aapki class ke notes abhi available nahi hain.</p>";

            grid.appendChild(empty);
            return;
        }

        Object.keys(library).forEach(function (subjectName) {

            const subject = library[subjectName];

            const card = document.createElement("button");
            card.type = "button";
            card.className = "sn-subject-card";
            card.setAttribute("data-subject", subjectName);

            const imgBox = document.createElement("div");
            imgBox.className = "sn-subject-img";

            const img = document.createElement("img");
            img.src = subject.image || "Logo.png";
            img.alt = subjectName;
            img.loading = "lazy";
            img.draggable = false;

            img.onerror = function () {
                this.onerror = null;
                this.src = "Logo.png";
            };

            imgBox.appendChild(img);

            const body = document.createElement("div");
            body.className = "sn-subject-body";

            const title = document.createElement("h4");
            title.textContent = subjectName;

            const count = document.createElement("span");
            count.textContent = subject.titles.length + " Chapters";

            body.appendChild(title);
            body.appendChild(count);

            card.appendChild(imgBox);
            card.appendChild(body);

            card.addEventListener("click", function () {
                selectSubject(subjectName);
            });

            grid.appendChild(card);
        });
    }

    function selectSubject(subjectName) {

        if (!library || !library[subjectName]) {
            return;
        }

        currentSubject = subjectName;
        currentChapter = -1;

        document.querySelectorAll(".sn-subject-card").forEach(function (card) {
            card.classList.toggle("active", card.getAttribute("data-subject") === subjectName);
        });

        resetViewer();
        renderChapters();

        const section = el("snChapterSection");

        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }


    /* =====================================================
       STEP 2 : CHAPTERS
       ===================================================== */

    function renderChapters() {

        const grid = el("snChapters");

        if (!grid) {
            return;
        }

        grid.innerHTML = "";

        const subject = library && library[currentSubject];

        if (!subject) {
            return;
        }

        setText("snChapterTitle", currentSubject + " – Choose Chapter");
        setText("snChapterSub", subject.titles.length + " chapters available. Medium upar toggle se badlein.");

        subject.titles.forEach(function (title, index) {

            const item = document.createElement("button");
            item.type = "button";
            item.className = "sn-chapter";
            item.setAttribute("data-index", String(index));

            const number = document.createElement("div");
            number.className = "sn-chapter-no";
            number.textContent = String(index + 1);

            const text = document.createElement("div");
            text.className = "sn-chapter-text";

            const strong = document.createElement("strong");
            strong.textContent = title;

            const small = document.createElement("small");
            small.textContent = "Chapter " + (index + 1) + " • Notes";

            text.appendChild(strong);
            text.appendChild(small);

            item.appendChild(number);
            item.appendChild(text);

            item.addEventListener("click", function () {
                selectChapter(index);
            });

            grid.appendChild(item);
        });
    }

    function selectChapter(index) {

        const subject = library && library[currentSubject];

        if (!subject || !subject.titles[index]) {
            return;
        }

        currentChapter = index;

        document.querySelectorAll(".sn-chapter").forEach(function (item) {
            item.classList.toggle("active", Number(item.getAttribute("data-index")) === index);
        });

        loadNotes(true);
    }


    /* =====================================================
       MEDIUM TOGGLE
       ===================================================== */

    function mediumName(medium) {
        return medium === "hi" ? "Hindi Medium" : "English Medium";
    }

    function applyMediumUI() {

        document.querySelectorAll(".sn-medium-btn").forEach(function (button) {

            const active = button.getAttribute("data-medium") === currentMedium;

            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function setMedium(medium) {

        if (medium !== "en" && medium !== "hi") {
            return;
        }

        if (medium === currentMedium) {
            return;
        }

        currentMedium = medium;

        try {
            sessionStorage.setItem(KEY_MEDIUM, medium);
        }
        catch (error) {
            /* ignore */
        }

        applyMediumUI();

        /* Chapter khula hai to usi chapter ko nayi medium me reload karo */

        if (currentSubject && currentChapter > -1) {
            loadNotes(false);
        }
    }


    /* =====================================================
       STEP 3 : NOTES VIEWER
       ===================================================== */

    function buildNotesUrl(medium) {

        const subject = library[currentSubject];

        return NOTES_BASE + "/class-" + classNumber + "/" + subject.folder +
            "/chapter-" + pad2(currentChapter + 1) + "-" + medium + ".html";
    }

    function showViewerMessage(icon, title, text) {

        const msg = el("snViewerMsg");
        const frame = el("snFrame");

        if (frame) {
            frame.hidden = true;
        }

        if (msg) {

            msg.hidden = false;
            msg.innerHTML = "";

            const iconBox = document.createElement("div");
            iconBox.className = "sn-viewer-icon";
            iconBox.textContent = icon;

            const h4 = document.createElement("h4");
            h4.textContent = title;

            const p = document.createElement("p");
            p.textContent = text;

            msg.appendChild(iconBox);
            msg.appendChild(h4);
            msg.appendChild(p);
        }
    }

    function setViewerButtons(enabled) {

        ["snPrintBtn", "snFullBtn", "snNewTabBtn"].forEach(function (id) {

            const button = el(id);

            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    function resetViewer() {

        loadToken++;
        currentUrl = "";

        const frame = el("snFrame");

        if (frame) {
            frame.src = "about:blank";
        }

        setText("snViewerTitle", "No chapter selected");
        setText("snViewerMeta", "Chapter chuno");

        setViewerButtons(false);

        showViewerMessage("📖", "Select a Chapter", "Chapter chunne par notes yahan khulenge.");
    }

    async function loadNotes(scrollToViewer) {

        const subject = library && library[currentSubject];

        if (!subject || currentChapter < 0) {
            return;
        }

        const myToken = ++loadToken;

        const chapterTitle = subject.titles[currentChapter];
        const url = buildNotesUrl(currentMedium);

        setText("snViewerTitle", "Chapter " + (currentChapter + 1) + ": " + chapterTitle);
        setText("snViewerMeta", currentSubject + " • Class " + classNumber + " • " + mediumName(currentMedium));

        setViewerButtons(false);
        currentUrl = "";

        showViewerMessage("⏳", "Loading notes…", "Please wait.");

        if (scrollToViewer) {

            const section = el("snViewerSection");

            if (section) {
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }

        /* Pehle check karo ki file hai ya nahi (404 par saaf message dikhane ke liye) */

        let exists = false;

        try {

            const response = await fetch(url, { method: "GET", cache: "no-store" });

            exists = response.ok;
        }
        catch (error) {
            exists = false;
        }

        if (myToken !== loadToken) {
            return;   /* user ne beech me kuch aur chun liya */
        }

        if (!exists) {

            showViewerMessage(
                "🛠",
                "Notes coming soon",
                mediumName(currentMedium) + " notes for this chapter abhi available nahi hain. " +
                "Dusra medium try karein ya baad me aayein."
            );

            return;
        }

        const frame = el("snFrame");

        if (!frame) {
            return;
        }

        frame.onload = function () {

            if (myToken !== loadToken) {
                return;
            }

            /* PDF file ka naam achha aaye isliye title set karte hain */

            try {
                frame.contentDocument.title =
                    "SSTC Notes - Class " + classNumber + " - " + currentSubject +
                    " - Chapter " + (currentChapter + 1) + " - " + mediumName(currentMedium);
            }
            catch (error) {
                /* ignore */
            }
        };

        frame.src = url;
        frame.hidden = false;

        const msg = el("snViewerMsg");

        if (msg) {
            msg.hidden = true;
        }

        currentUrl = url;

        setViewerButtons(true);
    }


    /* =====================================================
       PRINT / SAVE AS PDF  +  FULLSCREEN  +  NEW TAB
       ===================================================== */

    function printNotes() {

        const frame = el("snFrame");

        if (!currentUrl || !frame || frame.hidden) {
            showToast("Pehle koi chapter chuno.");
            return;
        }

        try {

            frame.contentWindow.focus();
            frame.contentWindow.print();
        }
        catch (error) {

            /* Agar iframe print block ho jaye to new tab me kholo */

            console.warn("SSTC notes print fallback:", error);

            showToast("Naye tab me khol rahe hain — wahan Ctrl+P dabayein.");

            window.open(currentUrl, "_blank");
        }
    }

    function toggleFullscreen() {

        const viewer = el("snViewer");

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

            viewer.requestFullscreen().catch(function () {
                showToast("Fullscreen is device par available nahi hai.");
            });
        }
    }

    function openInNewTab() {

        if (!currentUrl) {
            return;
        }

        window.open(currentUrl, "_blank");
    }


    /* =====================================================
       EVENTS
       ===================================================== */

    function bindEvents() {

        document.querySelectorAll(".sn-medium-btn").forEach(function (button) {

            button.addEventListener("click", function () {
                setMedium(button.getAttribute("data-medium"));
            });
        });

        const printBtn = el("snPrintBtn");
        const fullBtn = el("snFullBtn");
        const newTabBtn = el("snNewTabBtn");
        const backBtn = el("snBackBtn");
        const logoutBtn = el("snLogoutBtn");

        if (printBtn) {
            printBtn.addEventListener("click", printNotes);
        }

        if (fullBtn) {
            fullBtn.addEventListener("click", toggleFullscreen);
        }

        if (newTabBtn) {
            newTabBtn.addEventListener("click", openInNewTab);
        }

        if (backBtn) {
            backBtn.addEventListener("click", backToPortal);
        }

        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
        }
    }

    /*
     * Ye page student-page se NEW TAB me khulta hai, isliye
     * "Student Portal" button is tab ko band kar deta hai
     * (portal wala original tab pehle se khula hai).
     */
    function backToPortal() {

        if (window.opener && !window.opener.closed) {

            window.close();

            /* Agar browser ne close nahi kiya to portal par bhej do */

            setTimeout(function () {
                window.location.href = PORTAL_PAGE;
            }, 300);

            return;
        }

        window.location.href = PORTAL_PAGE;
    }


    /* =====================================================
       SESSION HEARTBEAT (single-device login enforce)
       -----------------------------------------------------
       Dusre device se login hua to ye page bhi band ho jayega.
       Yahan endsession NAHI bhejte (tab band hone par main
       session khatam na ho).
       ===================================================== */

    function buildApiUrl(action) {

        const studentId = studentValue(["studentId", "id"], "");
        const password = studentValue(["password"], "");
        const token = sessionStorage.getItem(KEY_TOKEN) || "";

        return API_URL +
            (API_URL.indexOf("?") > -1 ? "&" : "?") +
            "action=" + encodeURIComponent(action) +
            "&studentId=" + encodeURIComponent(studentId) +
            "&password=" + encodeURIComponent(password) +
            "&sessionToken=" + encodeURIComponent(token);
    }

    function startHeartbeat() {

        if (!API_URL) {
            return;
        }

        heartbeatTimer = setInterval(checkHeartbeat, HEARTBEAT_MS);

        setTimeout(checkHeartbeat, 4000);
    }

    async function checkHeartbeat() {

        if (sessionEnding || heartbeatBusy || !studentData) {
            return;
        }

        heartbeatBusy = true;

        try {

            const response = await fetch(buildApiUrl("checksession"), { cache: "no-store" });
            const text = await response.text();

            let result = null;

            try {
                result = JSON.parse(text);
            }
            catch (parseError) {
                result = null;
            }

            if (result && result.success === false) {

                const message = String(result.message || "");

                if (message.indexOf("logged in from another device") > -1) {
                    forceLogout(message);
                }
            }
        }
        catch (error) {
            /* network glitch - agli baar phir check hoga */
            console.warn("SSTC notes heartbeat warning:", error);
        }
        finally {
            heartbeatBusy = false;
        }
    }

    function forceLogout(message) {

        if (sessionEnding) {
            return;
        }

        sessionEnding = true;

        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }

        clearSession();

        alert("🔒 " + (message || "Aapka session khatam ho gaya hai. Kripya dobara login karein."));

        goToAccess();
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        if (sessionEnding) {
            return;
        }

        sessionEnding = true;

        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }

        const button = el("snLogoutBtn");

        if (button) {
            button.textContent = "Logging out…";
            button.style.pointerEvents = "none";
        }

        try {

            if (API_URL && studentData) {

                const request = fetch(buildApiUrl("endsession"), {
                    method: "GET",
                    cache: "no-store",
                    keepalive: true
                }).catch(function () { /* ignore */ });

                const timeout = new Promise(function (resolve) {
                    setTimeout(resolve, 3000);
                });

                await Promise.race([request, timeout]);
            }
        }
        catch (error) {
            console.warn("SSTC notes logout warning:", error);
        }

        clearSession();

        goToAccess();
    }

})();
