/* =========================================================
   SSTC STUDENT PORTAL
   ========================================================= */


/* =========================================================
   STUDENT DATA
   =========================================================

   IMPORTANT:
   Demo data is used here.

   Later you can connect this with your
   Google Sheets / backend / database.
   ========================================================= */

const studentData = {

    id: "SSTC-STU-001",

    name: "Student Name",

    className: "Class 10",

    loginTime:
        new Date().toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        ),

    ebooks: [

        {
            id: "ebook001",

            title:
                "Class 10 Mathematics Complete Guide",

            subject:
                "Mathematics",

            type:
                "rent",

            duration:
                "6 Months",

            startDate:
                "20 Aug 2026",

            expiryDate:
                "20 Feb 2027",

            status:
                "active",

            pdf:
                "ebooks/class10-maths.pdf"
        },


        {
            id: "ebook002",

            title:
                "Class 10 Science Complete Guide",

            subject:
                "Science",

            type:
                "buy",

            duration:
                "Lifetime",

            startDate:
                "20 Aug 2026",

            expiryDate:
                "Lifetime",

            status:
                "active",

            pdf:
                "ebooks/class10-science.pdf"
        },


        {
            id: "ebook003",

            title:
                "Class 10 Social Science Notes",

            subject:
                "Social Science",

            type:
                "rent",

            duration:
                "3 Months",

            startDate:
                "20 Aug 2026",

            expiryDate:
                "20 Nov 2026",

            status:
                "active",

            pdf:
                "ebooks/class10-social-science.pdf"
        }

    ]

};


/* =========================================================
   CURRENT STATE
   ========================================================= */

let currentBook = null;

let currentZoom = 100;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadStudentProfile();

        loadEbooks();

        setupProtection();

        setupKeyboardProtection();

        document.getElementById(
            "currentYear"
        ).textContent =
            new Date().getFullYear();

    }
);


/* =========================================================
   PROFILE
   ========================================================= */

function loadStudentProfile() {

    const name =
        document.getElementById(
            "studentName"
        );

    const studentId =
        document.getElementById(
            "studentId"
        );

    const studentClass =
        document.getElementById(
            "studentClass"
        );

    const loginTime =
        document.getElementById(
            "loginTime"
        );

    const avatar =
        document.getElementById(
            "studentAvatar"
        );


    if (name) {

        name.textContent =
            studentData.name;

    }


    if (studentId) {

        studentId.textContent =
            studentData.id;

    }


    if (studentClass) {

        studentClass.textContent =
            studentData.className;

    }


    if (loginTime) {

        loginTime.textContent =
            studentData.loginTime;

    }


    if (
        avatar &&
        studentData.name
    ) {

        avatar.textContent =
            studentData.name
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   LOAD EBOOKS
   ========================================================= */

function loadEbooks() {

    const list =
        document.getElementById(
            "ebookList"
        );

    if (!list) return;


    list.innerHTML = "";


    studentData.ebooks.forEach(
        (book, index) => {

            const item =
                document.createElement(
                    "button"
                );

            item.type = "button";

            item.className =
                "ebook-item";


            if (index === 0) {

                item.classList.add(
                    "selected"
                );

            }


            const planClass =
                book.type === "buy"
                    ? "plan-buy"
                    : "plan-rent";


            const planText =
                book.type === "buy"
                    ? "Lifetime Buy"
                    : "Rent " +
                      book.duration;


            item.innerHTML = `

                <span class="ebook-title">
                    📘 ${escapeHTML(book.title)}
                </span>

                <span class="ebook-meta">

                    <span>
                        ${escapeHTML(book.subject)}
                    </span>

                    <span
                        class="plan-badge ${planClass}">
                        ${escapeHTML(planText)}
                    </span>

                </span>

                <span
                    class="ebook-meta"
                    style="margin-top:6px">

                    <span>
                        ${escapeHTML(book.expiryDate)}
                    </span>

                    <span class="book-active">
                        ● ${escapeHTML(book.status)}
                    </span>

                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".ebook-item"
                        )
                        .forEach(
                            button => {

                                button.classList
                                    .remove(
                                        "selected"
                                    );

                            }
                        );


                    item.classList.add(
                        "selected"
                    );


                    openEbook(book);

                }
            );


            list.appendChild(item);

        }
    );


    updateSummary();


    if (
        studentData.ebooks.length
    ) {

        openEbook(
            studentData.ebooks[0]
        );

    }

}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

    const total =
        studentData.ebooks.length;

    const rented =
        studentData.ebooks.filter(
            book =>
                book.type === "rent"
        ).length;

    const purchased =
        studentData.ebooks.filter(
            book =>
                book.type === "buy"
        ).length;


    setText(
        "ebookCount",
        total
    );

    setText(
        "totalBooks",
        total
    );

    setText(
        "rentedBooks",
        rented
    );

    setText(
        "purchasedBooks",
        purchased
    );

}


/* =========================================================
   OPEN EBOOK
   ========================================================= */

function openEbook(book) {

    if (!book) return;

    currentBook = book;


    const title =
        document.getElementById(
            "currentBookTitle"
        );

    const status =
        document.getElementById(
            "currentBookStatus"
        );

    const frame =
        document.getElementById(
            "pdfFrame"
        );

    const empty =
        document.getElementById(
            "viewerEmpty"
        );


    if (title) {

        title.textContent =
            book.title;

    }


    if (status) {

        status.textContent =
            getPlanText(book) +
            " • " +
            book.status;

    }


    if (!frame) return;


    /*
      PDF URL

      #toolbar=0 hides the standard
      PDF toolbar in browsers that
      respect the PDF fragment.

      This is NOT a complete security
      mechanism.
    */

    frame.src =
        book.pdf +
        "#toolbar=0" +
        "&navpanes=0" +
        "&scrollbar=1" +
        "&statusbar=0" +
        "&view=FitH";


    frame.classList.remove(
        "loaded"
    );


    if (empty) {

        empty.style.display =
            "none";

    }


    currentZoom = 100;

    updateZoomLabel();

}


/* =========================================================
   PDF LOADED
   ========================================================= */

function pdfLoaded() {

    const frame =
        document.getElementById(
            "pdfFrame"
        );

    if (!frame) return;


    frame.classList.add(
        "loaded"
    );

}


/* =========================================================
   PLAN TEXT
   ========================================================= */

function getPlanText(book) {

    if (book.type === "buy") {

        return "Lifetime Purchase";

    }

    return "Rent • " +
        book.duration;

}


/* =========================================================
   ZOOM
   ========================================================= */

function zoomIn() {

    currentZoom += 10;

    if (currentZoom > 200) {

        currentZoom = 200;

    }

    updateZoomLabel();

}


function zoomOut() {

    currentZoom -= 10;

    if (currentZoom < 50) {

        currentZoom = 50;

    }

    updateZoomLabel();

}


function updateZoomLabel() {

    const label =
        document.getElementById(
            "zoomLevel"
        );

    if (label) {

        label.textContent =
            currentZoom + "%";

    }

}


/* =========================================================
   FIT WIDTH
   ========================================================= */

function fitWidth() {

    currentZoom = 100;

    updateZoomLabel();

    reloadPDF(
        "#toolbar=0" +
        "&navpanes=0" +
        "&view=FitH"
    );

}


/* =========================================================
   FIT PAGE
   ========================================================= */

function fitPage() {

    currentZoom = 100;

    updateZoomLabel();

    reloadPDF(
        "#toolbar=0" +
        "&navpanes=0" +
        "&view=Fit"
    );

}


/* =========================================================
   RELOAD PDF VIEW
   ========================================================= */

function reloadPDF(fragment) {

    if (!currentBook) return;

    const frame =
        document.getElementById(
            "pdfFrame"
        );

    if (!frame) return;


    frame.src =
        currentBook.pdf +
        fragment;

}


/* =========================================================
   FULLSCREEN
   ========================================================= */

function toggleFullscreen() {

    const reader =
        document.querySelector(
            ".reader-section"
        );

    if (!reader) return;


    if (
        document.fullscreenElement
    ) {

        document.exitFullscreen();

        reader.classList.remove(
            "fullscreen-reader"
        );

        return;

    }


    if (
        reader.requestFullscreen
    ) {

        reader
            .requestFullscreen()
            .then(
                () => {

                    reader.classList.add(
                        "fullscreen-reader"
                    );

                }
            )
            .catch(
                () => {

                    reader.classList.add(
                        "fullscreen-reader"
                    );

                }
            );

    } else {

        reader.classList.add(
            "fullscreen-reader"
        );

    }

}


/* =========================================================
   PAGE NAVIGATION
   =========================================================

   Direct iframe PDF page navigation
   is browser-dependent.

   These buttons reload the document
   to the beginning/end where supported.
   ========================================================= */

function previousPage() {

    showReaderNotice(
        "Use the PDF viewer scroll/navigation to move to the previous page."
    );

}


function nextPage() {

    showReaderNotice(
        "Use the PDF viewer scroll/navigation to move to the next page."
    );

}


/* =========================================================
   READER NOTICE
   ========================================================= */

function showReaderNotice(message) {

    const status =
        document.getElementById(
            "currentBookStatus"
        );

    if (!status) return;


    const oldText =
        status.textContent;


    status.textContent =
        message;


    setTimeout(
        () => {

            status.textContent =
                oldText;

        },
        2200
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function studentLogout() {

    /*
      Remove student session.
    */

    sessionStorage.removeItem(
        "sstcStudentLoggedIn"
    );

    sessionStorage.removeItem(
        "sstcStudentId"
    );


    /*
      Go back to sign-in page.
    */

    window.location.href =
        "student-login.html";

}


/* =========================================================
   SECURITY / DETERRENTS
   ========================================================= */

function setupProtection() {


    /*
      Disable right click
    */

    document.addEventListener(
        "contextmenu",
        event => {

            event.preventDefault();

        }
    );


    /*
      Disable text selection
    */

    document.addEventListener(
        "selectstart",
        event => {

            event.preventDefault();

        }
    );


    /*
      Disable drag
    */

    document.addEventListener(
        "dragstart",
        event => {

            event.preventDefault();

        }
    );


    /*
      Block print event
    */

    window.addEventListener(
        "beforeprint",
        event => {

            event.preventDefault();

        }
    );


    /*
      Try to prevent common print
      shortcuts.
    */

    window.addEventListener(
        "keydown",
        event => {

            const key =
                event.key.toLowerCase();


            /*
              Ctrl + P
            */

            if (
                event.ctrlKey &&
                key === "p"
            ) {

                event.preventDefault();

                showReaderNotice(
                    "Printing is disabled for this e-book."
                );

            }


            /*
              Ctrl + S
            */

            if (
                event.ctrlKey &&
                key === "s"
            ) {

                event.preventDefault();

                showReaderNotice(
                    "Saving this e-book is disabled."
                );

            }


            /*
              Ctrl + U
            */

            if (
                event.ctrlKey &&
                key === "u"
            ) {

                event.preventDefault();

            }


            /*
              Ctrl + Shift + I
            */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                key === "i"
            ) {

                event.preventDefault();

            }


            /*
              F12
            */

            if (
                event.key === "F12"
            ) {

                event.preventDefault();

            }

        }
    );

}


/* =========================================================
   KEYBOARD PROTECTION
   ========================================================= */

function setupKeyboardProtection() {

    document.addEventListener(
        "keydown",
        event => {

            /*
              PrintScreen cannot be
              reliably blocked by a
              webpage.

              We can only react to the
              key event where the browser
              exposes it.
            */

            if (
                event.key === "PrintScreen"
            ) {

                /*
                  Clear selection.
                */

                window
                    .getSelection()
                    ?.removeAllRanges();

                showReaderNotice(
                    "Screen capture is restricted on this portal."
                );

            }


            /*
              Ctrl + C
            */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "c"
            ) {

                event.preventDefault();

            }


            /*
              Ctrl + X
            */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "x"
            ) {

                event.preventDefault();

            }


            /*
              Ctrl + A
            */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "a"
            ) {

                event.preventDefault();

            }

        }
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)
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

        element.textContent =
            value;

    }

}


/* =========================================================
   SECURITY CLEANUP
   ========================================================= */

window.addEventListener(
    "load",
    () => {

        /*
          Prevent browser drag of
          iframe/container.
        */

        document
            .querySelectorAll(
                "iframe"
            )
            .forEach(
                frame => {

                    frame.setAttribute(
                        "draggable",
                        "false"
                    );

                }
            );

    }
);
