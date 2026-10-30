/* =========================================================
   SSTC ADMIN ACCESS
   Static hosting compatibility mode.
   Admin authentication is disabled until a secure backend
   or protected environment is configured.
   ========================================================= */

const SSTC_ADMIN_ACCESS_DISABLED = true;

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

function adminLoginSubmit(event) {
    event.preventDefault();

    const adminIdElement = document.getElementById("adminId");
    const adminPasswordElement = document.getElementById("adminPassword");
    const message = document.getElementById("adminMessage");

    const adminId = adminIdElement ? adminIdElement.value.trim() : "";
    const adminPassword = adminPasswordElement ? adminPasswordElement.value : "";

    if (message) {
        message.textContent = "";
        message.className = "login-message";
    }

    if (!adminId || !adminPassword) {
        showAdminMessage("Please enter Admin ID and Password.", "error");
        return;
    }

    if (SSTC_ADMIN_ACCESS_DISABLED) {
        showAdminMessage(
            "Admin access is disabled on this static host. Please configure a secure backend before enabling admin login.",
            "error"
        );
        return;
    }

    showAdminMessage("Invalid Admin ID or Password.", "error");
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
