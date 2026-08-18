/* =========================================================
   SSTC ADMIN LOGIN
   Use this file in your existing access/login page.
   
   IMPORTANT:
   This is suitable for a static/demo website only.
   For a production website, authentication should happen
   on a secure backend/server.
   ========================================================= */

const SSTC_ADMIN_ID = "SSTCGKP";

const SSTC_ADMIN_PASSWORD =
  "Maa@adarsh2023";


function handleAdminLogin(event) {

  event.preventDefault();

  const adminId =
    document
      .querySelector("#adminId")
      ?.value
      .trim();

  const adminPassword =
    document
      .querySelector("#adminPassword")
      ?.value;


  if (
    adminId === SSTC_ADMIN_ID &&
    adminPassword === SSTC_ADMIN_PASSWORD
  ) {

    sessionStorage.setItem(
      "sstcAdminAuthenticated",
      "true"
    );

    window.location.href =
      "admin-page.html";

    return;
  }


  alert(
    "Invalid Admin ID or Password."
  );
}
