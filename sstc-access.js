/* =========================================================
   SSTC STUDENT PORTAL
========================================================= */


/* =========================================================
   STUDENT E-BOOK DATABASE
   ---------------------------------------------------------
   IMPORTANT:
   YAHAN APNE ACTUAL PDF LINKS LAGAO.

   Example:

   pdf:
   "https://yourwebsite.com/pdfs/math-chapter-1.pdf"

   Abhi demo structure diya gaya hai.
========================================================= */

const SSTC_EBOOKS = [

    {
        id: "math",

        subject: "Mathematics",

        icon: "📐",

        description:
            "Class Mathematics e-books and chapters.",

        books: [

            {
                id: "math-book-1",

                title:
                    "Class Mathematics Complete Guide",

                type:
                    "Rent",

                price:
                    "₹299 / 6 Months",

                purchasePrice:
                    "₹499",

                chapters: [

                    {
                        number: 1,

                        title:
                            "Real Numbers",

                        description:
                            "Introduction and important concepts.",

                        pdf:
                            "pdfs/mathematics/chapter-1.pdf"
                    },

                    {
                        number: 2,

                        title:
                            "Polynomials",

                        description:
                            "Polynomials and their applications.",

                        pdf:
                            "pdfs/mathematics/chapter-2.pdf"
                    },

                    {
                        number: 3,

                        title:
                            "Pair of Linear Equations",

                        description:
                            "Linear equations and solutions.",

                        pdf:
                            "pdfs/mathematics/chapter-3.pdf"
                    },

                    {
                        number: 4,

                        title:
                            "Quadratic Equations",

                        description:
                            "Quadratic equations and methods.",

                        pdf:
                            "pdfs/mathematics/chapter-4.pdf"
                    }

                ]

            }

        ]

    },


    /* =====================================================
       SCIENCE
    ===================================================== */

    {

        id: "science",

        subject: "Science",

        icon: "🔬",

        description:
            "Science books and chapter-wise reading.",

        books: [

            {

                id: "science-book-1",

                title:
                    "Class Science Complete Guide",

                type:
                    "Buy",

                price:
                    "₹399",

                purchasePrice:
                    "₹399",

                chapters: [

                    {

                        number: 1,

                        title:
                            "Matter Around Us",

                        description:
                            "Basic concepts of matter.",

                        pdf:
                            "pdfs/science/chapter-1.pdf"

                    },

                    {

                        number: 2,

                        title:
                            "Atoms and Molecules",

                        description:
                            "Atoms, molecules and formulas.",

                        pdf:
                            "pdfs/science/chapter-2.pdf"

                    },

                    {

                        number: 3,

                        title:
                            "Motion",

                        description:
                            "Motion and measurement.",

                        pdf:
                            "pdfs/science/chapter-3.pdf"

                    }

                ]

            }

        ]

    },


    /* =====================================================
       SOCIAL SCIENCE
    ===================================================== */

    {

        id: "social-science",

        subject: "Social Science",

        icon: "🌍",

        description:
            "History, Geography, Civics and Economics.",

        books: [

            {

                id:
                    "social-science-book-1",

                title:
                    "Social Science Complete Notes",

                type:
                    "Rent",

                price:
                    "₹199 / 3 Months",

                purchasePrice:
                    "₹349",

                chapters: [

                    {

                        number: 1,

                        title:
                            "Resources and Development",

                        description:
                            "Resources and development.",

                        pdf:
                            "pdfs/social-science/chapter-1.pdf"

                    },

                    {

                        number: 2,

                        title:
                            "Forest and Wildlife",

                        description:
                            "Forest resources and wildlife.",

                        pdf:
                            "pdfs/social-science/chapter-2.pdf"

                    },

                    {

                        number: 3,

                        title:
                            "Power Sharing",

                        description:
                            "Democracy and power sharing.",

                        pdf:
                            "pdfs/social-science/chapter-3.pdf"

                    }

                ]

            }

        ]

    },


    /* =====================================================
       ENGLISH
    ===================================================== */

    {

        id:
            "english",

        subject:
            "English",

        icon:
            "📘",

        description:
            "English literature and language.",

        books: [

            {

                id:
                    "english-book-1",

                title:
                    "English Complete Guide",

                type:
                    "Buy",

                price:
                    "₹299",

                purchasePrice:
                    "₹299",

                chapters: [

                    {

                        number:
                            1,

                        title:
                            "Reading Skills",

                        description:
                            "Reading comprehension.",

                        pdf:
                            "pdfs/english/chapter-1.pdf"

                    },

                    {

                        number:
                            2,

                        title:
                            "Writing Skills",

                        description:
                            "Writing and composition.",

                        pdf:
                            "pdfs/english/chapter-2.pdf"

                    }

                ]

            }

        ]

    }

];



/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let selectedSubject = null;

let selectedBook = null;

let selectedChapterIndex = 0;

let currentZoom = 100;



/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        protectStudentPage();

        loadStudentProfile();

        renderSubjects();

        updateLibrarySummary();

        setCurrentYear();

        setupSecurityControls();

    }
);



/* =========================================================
   PROTECT STUDENT PAGE
========================================================= */

function protectStudentPage() {

    const loggedIn =
        sessionStorage.getItem(
            "sstcStudentLoggedIn"
        );

    const studentData =
        sessionStorage.getItem(
            "sstcStudentData"
        );


    if (
        loggedIn !== "true" ||
        !studentData
    ) {

        window.location.href =
            "sstc-access.html";

        return;

    }

}



/* =========================================================
   LOAD STUDENT PROFILE
========================================================= */

function loadStudentProfile() {

    const storedData =
        sessionStorage.getItem(
            "sstcStudentData"
        );


    if (!storedData) {

        return;

    }


    let student;


    try {

        student =
            JSON.parse(
                storedData
            );

    }

    catch (error) {

        console.error(
            "Student data error:",
            error
        );

        return;

    }


    const fullName =
        student.fullName ||
        "Student";


    const studentId =
        student.studentId ||
        "--";


    const mobile =
        student.mobile ||
        student.mobileNumber ||
        "--";


    const gender =
        student.gender ||
        "--";


    const email =
        student.email ||
        student.emailId ||
        "--";


    const className =
        student.className ||
        "--";


    const board =
        student.board ||
        "--";


    const schoolName =
        student.schoolName ||
        "--";


    const schoolPlace =
        student.schoolPlace ||
        "--";


    const registrationDate =
        student.registrationDate ||
        "--";


    const status =
        student.status ||
        "Active";


    /* =====================================================
       NAME
    ===================================================== */

    setText(
        "studentName",
        fullName
    );


    /* =====================================================
       AVATAR
    ===================================================== */

    const avatar =
        document.getElementById(
            "studentAvatar"
        );


    if (avatar) {

        avatar.innerText =
            fullName
                .trim()
                .charAt(0)
                .toUpperCase() || "S";

    }


    /* =====================================================
       CLASS
    ===================================================== */

    setText(
        "studentClass",
        "Class " + className
    );


    setText(
        "studentClassDetail",
        className
    );


    /* =====================================================
       STUDENT DETAILS
    ===================================================== */

    setText(
        "studentId",
        studentId
    );


    setText(
        "studentMobile",
        mobile
    );


    setText(
        "studentGender",
        gender
    );


    setText(
        "studentEmail",
        email
    );


    setText(
        "studentBoard",
        board
    );


    setText(
        "studentSchool",
        schoolName
    );


    setText(
        "studentSchoolPlace",
        schoolPlace
    );


    setText(
        "registrationDate",
        registrationDate
    );


    /* =====================================================
       STATUS
    ===================================================== */

    const statusElement =
        document.getElementById(
            "studentStatus"
        );


    if (statusElement) {

        if (
            String(status)
                .toLowerCase() ===
            "active"
        ) {

            statusElement.innerText =
                "● Active";

            statusElement.style.color =
                "#079447";

        }

        else {

            statusElement.innerText =
                "● Inactive";

            statusElement.style.color =
                "#dc2626";

        }

    }


    /* =====================================================
       LOGIN TIME
    ===================================================== */

    let loginTime =
        sessionStorage.getItem(
            "sstcStudentLoginTime"
        );


    if (!loginTime) {

        loginTime =
            formatCurrentDateTime();

        sessionStorage.setItem(
            "sstcStudentLoginTime",
            loginTime
        );

    }


    setText(
        "loginTime",
        loginTime
    );

}



/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.innerText =
            value || "--";

    }

}



/* =========================================================
   FORMAT CURRENT TIME
========================================================= */

function formatCurrentDateTime() {

    const now =
        new Date();


    return now.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

}



/* =========================================================
   SUBJECT CAROUSEL
========================================================= */

function renderSubjects() {

    const container =
        document.getElementById(
            "subjectCarousel"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    SSTC_EBOOKS.forEach(
        function(subject, index) {

            const totalChapters =
                subject.books.reduce(
                    function(total, book) {

                        return (
                            total +
                            book.chapters.length
                        );

                    },
                    0
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "subject-card";


            card.dataset.subjectId =
                subject.id;


            card.innerHTML = `

                <div class="subject-icon">
                    ${subject.icon}
                </div>

                <h3>
                    ${escapeHtml(subject.subject)}
                </h3>

                <p>
                    ${escapeHtml(subject.description)}
                </p>

                <div class="subject-meta">

                    <span>
                        ${subject.books.length} Book
                    </span>

                    <span>
                        ${totalChapters} Chapters
                    </span>

                </div>

            `;


            card.addEventListener(
                "click",
                function() {

                    selectSubject(
                        subject.id
                    );

                }
            );


            container.appendChild(
                card
            );


            if (index === 0) {

                setTimeout(
                    function() {

                        selectSubject(
                            subject.id
                        );

                    },
                    100
                );

            }

        }
    );

}



/* =========================================================
   SELECT SUBJECT
========================================================= */

function selectSubject(
    subjectId
) {

    selectedSubject =
        SSTC_EBOOKS.find(
            function(subject) {

                return (
                    subject.id ===
                    subjectId
                );

            }
        );


    if (!selectedSubject) {

        return;

    }


    /* ACTIVE SUBJECT */

    document
        .querySelectorAll(
            ".subject-card"
        )
        .forEach(
            function(card) {

                card.classList.toggle(
                    "active",
                    card.dataset.subjectId ===
                    subjectId
                );

            }
        );


    selectedBook =
        selectedSubject.books[0];


    selectedChapterIndex =
        0;


    setText(
        "selectedSubjectTitle",
        selectedSubject.subject
    );


    setText(
        "selectedSubjectDescription",
        selectedSubject.description
    );


    renderChapters();

}



/* =========================================================
   RENDER CHAPTERS
========================================================= */

function renderChapters() {

    const container =
        document.getElementById(
            "chapterGrid"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !selectedSubject ||
        !selectedSubject.books.length
    ) {

        container.innerHTML = `

            <div class="chapter-empty">

                <div>
                    📚
                </div>

                <h3>
                    No E-Book Available
                </h3>

                <p>
                    Please contact SSTC administration.
                </p>

            </div>

        `;

        return;

    }


    selectedBook =
        selectedSubject.books[0];


    selectedBook.chapters.forEach(
        function(chapter, index) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "chapter-card";


            card.innerHTML = `

                <div class="chapter-number">
                    ${chapter.number}
                </div>

                <h3>
                    ${escapeHtml(chapter.title)}
                </h3>

                <p>
                    ${escapeHtml(chapter.description)}
                </p>

                <div class="chapter-actions">

                    <button
                        type="button"
                        class="read-btn"
                        onclick="openChapter(${index})">

                        📖 Read

                    </button>

                    <button
                        type="button"
                        class="rent-btn"
                        onclick="rentBook('${selectedBook.id}')">

                        🔄 Rent

                    </button>

                    <button
                        type="button"
                        class="buy-btn"
                        onclick="buyBook('${selectedBook.id}')">

                        🛒 Buy

                    </button>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}



/* =========================================================
   OPEN CHAPTER
========================================================= */

function openChapter(
    chapterIndex
) {

    if (
        !selectedBook
    ) {

        return;

    }


    const chapter =
        selectedBook.chapters[
            chapterIndex
        ];


    if (!chapter) {

        return;

    }


    selectedChapterIndex =
        chapterIndex;


    setText(
        "currentBookTitle",
        chapter.title
    );


    setText(
        "currentBookStatus",
        selectedSubject.subject +
        " • " +
        selectedBook.title
    );


    setText(
        "currentChapterNumber",
        chapter.number
    );


    const viewerEmpty =
        document.getElementById(
            "viewerEmpty"
        );


    const pdfFrame =
        document.getElementById(
            "pdfFrame"
        );


    if (!pdfFrame) {

        return;

    }


    if (
        !chapter.pdf ||
        chapter.pdf.includes(
            "chapter-"
        )
    ) {

        /*
           Agar demo PDF path laga hua hai
           to message show hoga.
        */

    }


    currentZoom =
        100;


    updateZoom();


    if (viewerEmpty) {

        viewerEmpty.style.display =
            "none";

    }


    pdfFrame.style.display =
        "block";


    /*
       Cache busting se browser
       purani PDF ko unnecessarily
       reuse na kare.
    */

    const separator =
        chapter.pdf.includes("?")
            ? "&"
            : "?";


    pdfFrame.src =
        chapter.pdf +
        separator +
        "sstc=" +
        Date.now();


    const reader =
        document.getElementById(
            "readerSection"
        );


    if (reader) {

        reader.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}



/* =========================================================
   PDF LOADED
========================================================= */

function pdfLoaded() {

    const pdfFrame =
        document.getElementById(
            "pdfFrame"
        );


    if (
        !pdfFrame ||
        !pdfFrame.src
    ) {

        return;

    }

}



/* =========================================================
   NEXT CHAPTER
========================================================= */

function nextPage() {

    if (
        !selectedBook
    ) {

        return;

    }


    if (
        selectedChapterIndex <
        selectedBook.chapters.length - 1
    ) {

        selectedChapterIndex++;

        openChapter(
            selectedChapterIndex
        );

    }

}



/* =========================================================
   PREVIOUS CHAPTER
========================================================= */

function previousPage() {

    if (
        !selectedBook
    ) {

        return;

    }


    if (
        selectedChapterIndex > 0
    ) {

        selectedChapterIndex--;

        openChapter(
            selectedChapterIndex
        );

    }

}



/* =========================================================
   ZOOM IN
========================================================= */

function zoomIn() {

    if (
        currentZoom < 200
    ) {

        currentZoom += 10;

        updateZoom();

    }

}



/* =========================================================
   ZOOM OUT
========================================================= */

function zoomOut() {

    if (
        currentZoom > 50
    ) {

        currentZoom -= 10;

        updateZoom();

    }

}



/* =========================================================
   UPDATE ZOOM
========================================================= */

function updateZoom() {

    setText(
        "zoomLevel",
        currentZoom + "%"
    );


    const pdfFrame =
        document.getElementById(
            "pdfFrame"
        );


    if (!pdfFrame) {

        return;

    }


    /*
       Browser PDF iframe ka internal
       zoom cross-origin hone par
       control nahi kiya ja sakta.

       CSS transform se iframe ko
       scale karna possible hai,
       lekin usability kharab hoti hai.

       Isliye zoom indicator rakha gaya hai.
    */

}



/* =========================================================
   FIT WIDTH
========================================================= */

function fitWidth() {

    currentZoom =
        100;

    updateZoom();

}



/* =========================================================
   FIT PAGE
========================================================= */

function fitPage() {

    currentZoom =
        90;

    updateZoom();

}



/* =========================================================
   FULLSCREEN
========================================================= */

function toggleFullscreen() {

    const viewer =
        document.getElementById(
            "pdfViewer"
        );


    if (!viewer) {

        return;

    }


    if (
        !document.fullscreenElement
    ) {

        if (
            viewer.requestFullscreen
        ) {

            viewer.requestFullscreen();

        }

    }

    else {

        if (
            document.exitFullscreen
        ) {

            document.exitFullscreen();

        }

    }

}



/* =========================================================
   SUBJECT CAROUSEL SCROLL
========================================================= */

function scrollSubjects(
    direction
) {

    const carousel =
        document.getElementById(
            "subjectCarousel"
        );


    if (!carousel) {

        return;

    }


    carousel.scrollBy({

        left:
            direction * 300,

        behavior:
            "smooth"

    });

}



/* =========================================================
   RENT BOOK
========================================================= */

function rentBook(
    bookId
) {

    const book =
        findBookById(
            bookId
        );


    if (!book) {

        return;

    }


    alert(

        "🔄 Rent E-Book\n\n" +

        book.title +

        "\n\n" +

        "Rental Price: " +
        book.price +

        "\n\n" +

        "Please contact SSTC administration to complete the rental."

    );

}



/* =========================================================
   BUY BOOK
========================================================= */

function buyBook(
    bookId
) {

    const book =
        findBookById(
            bookId
        );


    if (!book) {

        return;

    }


    alert(

        "🛒 Buy E-Book\n\n" +

        book.title +

        "\n\n" +

        "Purchase Price: " +
        book.purchasePrice +

        "\n\n" +

        "Please contact SSTC administration to complete the purchase."

    );

}



/* =========================================================
   FIND BOOK
========================================================= */

function findBookById(
    bookId
) {

    for (
        let i = 0;
        i < SSTC_EBOOKS.length;
        i++
    ) {

        const subject =
            SSTC_EBOOKS[i];


        for (
            let j = 0;
            j < subject.books.length;
            j++
        ) {

            if (
                subject.books[j].id ===
                bookId
            ) {

                return subject.books[j];

            }

        }

    }


    return null;

}



/* =========================================================
   LIBRARY SUMMARY
========================================================= */

function updateLibrarySummary() {

    let totalBooks =
        0;

    let rentedBooks =
        0;

    let purchasedBooks =
        0;

    let totalSubjects =
        SSTC_EBOOKS.length;


    SSTC_EBOOKS.forEach(
        function(subject) {

            subject.books.forEach(
                function(book) {

                    totalBooks++;


                    if (
                        String(book.type)
                            .toLowerCase()
                            ===
                        "rent"
                    ) {

                        rentedBooks++;

                    }


                    if (
                        String(book.type)
                            .toLowerCase()
                            ===
                        "buy"
                    ) {

                        purchasedBooks++;

                    }

                }
            );

        }
    );


    setText(
        "ebookCount",
        totalBooks
    );


    setText(
        "totalBooks",
        totalBooks
    );


    setText(
        "rentedBooks",
        rentedBooks
    );


    setText(
        "purchasedBooks",
        purchasedBooks
    );


    setText(
        "totalSubjects",
        totalSubjects
    );

}



/* =========================================================
   LOGOUT
========================================================= */

function studentLogout() {

    const confirmLogout =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmLogout) {

        return;

    }


    sessionStorage.removeItem(
        "sstcStudentLoggedIn"
    );


    sessionStorage.removeItem(
        "sstcStudentData"
    );


    sessionStorage.removeItem(
        "sstcStudentLoginTime"
    );


    window.location.href =
        "sstc-access.html";

}



/* =========================================================
   YEAR
========================================================= */

function setCurrentYear() {

    const year =
        document.getElementById(
            "currentYear"
        );


    if (year) {

        year.innerText =
            new Date()
                .getFullYear();

    }

}



/* =========================================================
   SECURITY CONTROLS
   ---------------------------------------------------------
   NOTE:
   Browser/OS screenshot or recording ko
   website 100% block nahi kar sakti.
========================================================= */

function setupSecurityControls() {


    /* BLOCK COMMON SHORTCUTS */

    document.addEventListener(
        "keydown",
        function(event) {


            /*
               Ctrl + P
               Print
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.key.toLowerCase() === "p"
            ) {

                event.preventDefault();

                alert(
                    "Printing is disabled for SSTC protected e-books."
                );

                return;

            }


            /*
               Ctrl + S
               Save
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.key.toLowerCase() === "s"
            ) {

                event.preventDefault();

                alert(
                    "Saving/downloading is disabled for SSTC protected e-books."
                );

                return;

            }


            /*
               Ctrl + U
               View Source
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.key.toLowerCase() === "u"
            ) {

                event.preventDefault();

                return;

            }


            /*
               F12
            */

            if (
                event.key === "F12"
            ) {

                event.preventDefault();

                return;

            }


            /*
               Ctrl + Shift + I
               DevTools
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.shiftKey &&
                event.key.toLowerCase() === "i"
            ) {

                event.preventDefault();

                return;

            }


            /*
               Ctrl + Shift + J
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.shiftKey &&
                event.key.toLowerCase() === "j"
            ) {

                event.preventDefault();

                return;

            }


            /*
               Ctrl + Shift + C
            */

            if (
                (event.ctrlKey ||
                 event.metaKey) &&
                event.shiftKey &&
                event.key.toLowerCase() === "c"
            ) {

                event.preventDefault();

                return;

            }

        },
        true
    );



    /* BLOCK PRINT EVENT */

    window.addEventListener(
        "beforeprint",
        function() {

            document.body.style.display =
                "none";

        }
    );


    window.addEventListener(
        "afterprint",
        function() {

            document.body.style.display =
                "";

        }
    );



    /* BLOCK DRAGGING */

    document.addEventListener(
        "dragstart",
        function(event) {

            event.preventDefault();

        },
        true
    );

}



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value || ""
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
