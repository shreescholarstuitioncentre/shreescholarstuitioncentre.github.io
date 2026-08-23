/* =====================================================
   SSTC STUDENT DATABASE API
===================================================== */


/*
   अगर यह Apps Script सीधे Google Sheet से
   बनाया गया है तो getActiveSpreadsheet()
   आपकी उसी Google Sheet को access करेगा.
*/

function getStudentSheet() {

    const spreadsheet =
        SpreadsheetApp.getActiveSpreadsheet();


    if (!spreadsheet) {

        throw new Error(
            "Google Spreadsheet नहीं मिला."
        );

    }


    /*
       पहली sheet use होगी.
       Screenshot में आपका student database
       इसी spreadsheet में है.
    */

    return spreadsheet.getSheets()[0];

}


/* =====================================================
   GET
===================================================== */

function doGet(e) {

    try {

        const action =
            e &&
            e.parameter &&
            e.parameter.action
                ? e.parameter.action
                : "";


        /* ---------------------------------------------
           GET STUDENTS
        --------------------------------------------- */

        if (
            action === "getStudents"
        ) {

            return jsonResponse(
                getStudents()
            );

        }


        /* ---------------------------------------------
           UPDATE STATUS
        --------------------------------------------- */

        if (
            action === "updateStatus"
        ) {

            const studentId =
                e.parameter.studentId;


            const status =
                e.parameter.status;


            return jsonResponse(
                updateStudentStatus(
                    studentId,
                    status
                )
            );

        }


        /* ---------------------------------------------
           DELETE
        --------------------------------------------- */

        if (
            action === "deleteStudent"
        ) {

            const studentId =
                e.parameter.studentId;


            return jsonResponse(
                deleteStudent(
                    studentId
                )
            );

        }


        return jsonResponse({

            success: true,

            message:
                "SSTC Student API is working.",

            actions: [
                "getStudents",
                "updateStatus",
                "deleteStudent"
            ]

        });

    }


    catch (error) {

        return jsonResponse({

            success: false,

            message:
                error.message

        });

    }

}


/* =====================================================
   GET ALL STUDENTS
===================================================== */

function getStudents() {

    const sheet =
        getStudentSheet();


    const lastRow =
        sheet.getLastRow();


    const lastColumn =
        sheet.getLastColumn();


    if (
        lastRow < 2 ||
        lastColumn < 1
    ) {

        return {

            success: true,

            students: []

        };

    }


    /*
       A:L data
    */

    const data =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                Math.min(
                    lastColumn,
                    12
                )
            )
            .getDisplayValues();


    const students =
        data
            .filter(
                function (row) {

                    return String(
                        row[0] || ""
                    ).trim() !== "";

                }
            )
            .map(
                function (row) {

                    return {

                        studentId:
                            row[0] || "",

                        password:
                            row[1] || "",

                        fullName:
                            row[2] || "",

                        mobileNumber:
                            row[3] || "",

                        gender:
                            row[4] || "",

                        emailId:
                            row[5] || "",

                        className:
                            row[6] || "",

                        board:
                            row[7] || "",

                        schoolName:
                            row[8] || "",

                        schoolPlace:
                            row[9] || "",

                        registrationDate:
                            row[10] || "",

                        status:
                            row[11] ||
                            "Active"

                    };

                }
            );


    return {

        success: true,

        students: students

    };

}


/* =====================================================
   UPDATE STUDENT STATUS
===================================================== */

function updateStudentStatus(
    studentId,
    newStatus
) {

    if (!studentId) {

        return {

            success: false,

            message:
                "Student ID missing."

        };

    }


    if (
        newStatus !== "Active" &&
        newStatus !== "Inactive"
    ) {

        return {

            success: false,

            message:
                "Invalid status."

        };

    }


    const sheet =
        getStudentSheet();


    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {

        return {

            success: false,

            message:
                "No student records found."

        };

    }


    /*
       Student IDs are in Column A
    */

    const ids =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                1
            )
            .getDisplayValues();


    for (
        let i = 0;
        i < ids.length;
        i++
    ) {

        const currentId =
            String(
                ids[i][0] || ""
            ).trim();


        if (
            currentId ===
            String(studentId).trim()
        ) {

            const rowNumber =
                i + 2;


            /*
               Status = Column L
            */

            sheet
                .getRange(
                    rowNumber,
                    12
                )
                .setValue(
                    newStatus
                );


            SpreadsheetApp
                .flush();


            return {

                success: true,

                message:
                    "Student status updated.",

                studentId:
                    studentId,

                status:
                    newStatus

            };

        }

    }


    return {

        success: false,

        message:
            "Student ID not found: " +
            studentId

    };

}


/* =====================================================
   DELETE STUDENT
===================================================== */

function deleteStudent(
    studentId
) {

    if (!studentId) {

        return {

            success: false,

            message:
                "Student ID missing."

        };

    }


    const sheet =
        getStudentSheet();


    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {

        return {

            success: false,

            message:
                "No student records found."

        };

    }


    /*
       Student ID = Column A
    */

    const ids =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                1
            )
            .getDisplayValues();


    /*
       नीचे से ऊपर search करें.
       इससे delete करते समय row indexing
       की समस्या नहीं होगी.
    */

    for (
        let i = ids.length - 1;
        i >= 0;
        i--
    ) {

        const currentId =
            String(
                ids[i][0] || ""
            ).trim();


        if (
            currentId ===
            String(studentId).trim()
        ) {

            const rowNumber =
                i + 2;


            sheet.deleteRow(
                rowNumber
            );


            SpreadsheetApp
                .flush();


            return {

                success: true,

                message:
                    "Student deleted successfully.",

                studentId:
                    studentId

            };

        }

    }


    return {

        success: false,

        message:
            "Student ID not found: " +
            studentId

    };

}


/* =====================================================
   JSON RESPONSE
===================================================== */

function jsonResponse(
    data
) {

    return ContentService

        .createTextOutput(
            JSON.stringify(data)
        )

        .setMimeType(
            ContentService.MimeType.JSON
        );

}
