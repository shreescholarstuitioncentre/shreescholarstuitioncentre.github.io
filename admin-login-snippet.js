/* =========================================================
   SSTC ADMIN ACCESS
   Login Google Apps Script (Admin sheet) se verify hota hai.
   ========================================================= */

// ====== YAHAN APNA APPS SCRIPT WEB APP URL DAALO ======
const SSTC_ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbzSPSlkswNdmRtJkZ0Uq3Et5hAPIBorvbgVoQvZD4e0Ed36TwPzk7bh-xSAWmdFpmqynw/exec";
// ======================================================

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input || !button) return;

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "🙈";
        button.setAttribute("aria-label", "Hide password");
        button.setAttribute("title", "Hide password");
    } else {
        input.type = "password";
        button.textContent = "👁️";
        button.setAttribute("aria-label", "Show password");
        button.setAttribute("title", "Show password");
    }
}

async function adminLoginSubmit(event) {
    event.preventDefault();

    const adminIdElement = document.getElementById("adminId");
    const adminPasswordElement = document.getElementById("adminPassword");
    const submitButton = event.target.querySelector(".admin-login-button");

    const adminId = adminIdElement ? adminIdElement.value.trim() : "";
    const adminPassword = adminPasswordElement ? adminPasswordElement.value : "";

    if (!adminId || !adminPassword) {
        showAdminMessage("Please enter Admin ID and Password.", "error");
        return;
    }

    if (submitButton) submitButton.disabled = true;
    showAdminMessage("Signing in...", "success");

    try {
        const response = await fetch(SSTC_ADMIN_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ username: adminId, password: adminPassword })
        });

        const data = await response.json();

        if (!data.success) {
            showAdminMessage(data.message || "Invalid Admin ID or Password.", "error");
            if (submitButton) submitButton.disabled = false;
            return;
        }

        sessionStorage.setItem("sstcAdmin", "true");
        showAdminMessage("Login successful. Redirecting...", "success");
        window.location.href = "admin-page.html";
    } catch (error) {
        showAdminMessage("Unable to connect to server. Check the Apps Script URL and deployment.", "error");
        if (submitButton) submitButton.disabled = false;
    }
}

function showAdminMessage(text, type) {
    const message = document.getElementById("adminMessage");
    if (!message) return;
    message.textContent = text;
    message.className = "login-message " + type;
}

document.addEventListener("DOMContentLoaded", function () {
    const adminInput = document.getElementById("adminId");
    const rememberCheckbox = document.getElementById("rememberAdmin");

    if (adminInput) adminInput.value = "";
    if (rememberCheckbox) rememberCheckbox.checked = false;
});
