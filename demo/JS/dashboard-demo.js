/* ============================================================
   CinemaSync Demo - Dashboard
   Entry point. All 3 modules visible.
   ============================================================ */

$(document).ready(function () {
    $("#hdrGreeting").text("שלום, " + DEMO_USER.fullName);
    $("#hdrBranch").text(DEMO_BRANCH.branchName);

    $("#btnLogout").on("click", doLogout);

    showWelcomePopupOnce();
});

function getNavigationType() {
    if (typeof performance !== "undefined" && performance.getEntriesByType) {
        var entries = performance.getEntriesByType("navigation");
        if (entries.length > 0) {
            return entries[0].type;
        }
    }
    if (typeof performance !== "undefined" && performance.navigation) {
        switch (performance.navigation.type) {
            case 0: return "navigate";
            case 1: return "reload";
            case 2: return "back_forward";
        }
    }
    return "navigate";
}

function showWelcomePopupOnce() {
    var navType = getNavigationType();

    // Always show on hard refresh (Ctrl+R / F5)
    if (navType !== "reload") {
        // Otherwise, only show on the first dashboard load of this browser session
        if (sessionStorage.getItem("demoWelcomeShown") === "1") {
            return;
        }
    }
    sessionStorage.setItem("demoWelcomeShown", "1");

    Swal.fire({
        title: "שלום, משתמש!",
        html:
            "<div style='text-align: right; line-height: 1.7;'>" +
            "<p>הוכנה לנוחיותכם ולהתרשמותכם גרסת הדגמה זו, " +
            "המציגה את מלוא יכולות המערכת:</p>" +
            "<ul style='padding-right: 18px; margin-bottom: 0;'>" +
            "<li style='margin-bottom: 12px;'>🎬 <strong>שיבוץ סרטים חכם</strong> מבוסס Random Forest, עם דאטה בייס אמיתי של 250 אלף רשומות!</li>" +
            "<li style='margin-bottom: 12px;'>📦 <strong>ניהול מלאי</strong> וסנכרון עם מנהלי הסניפים ועובדיהם</li>" +
            "<li>👥 <strong>אופטימיזציית כוח אדם</strong> לפי תנאי המשמרת והעומס הצפוי בשבוע הרלוונטי</li>" +
            "</ul>" +
            "<p class='small mt-3 mb-0'>מוזמנים להתנסות במערכת!</p>" +
            "</div>",
        icon: "info",
        confirmButtonText: "אני מבין, בואו נתחיל",
        confirmButtonColor: "#14b8a6",
        width: "560px",
        didOpen: function (popup) {
            var icon = popup.querySelector(".swal2-icon");
            if (icon) {
                icon.style.marginTop = "3.5em";
                icon.style.marginBottom = "0.5em";
            }
            var title = popup.querySelector(".swal2-title");
            if (title) {
                title.style.marginTop = "0";
                title.style.paddingTop = "0.25em";
            }
        }
    });
}

function doLogout() {
    Swal.fire({
        title: "להתנתק מהמערכת?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "כן, התנתק",
        cancelButtonText: "ביטול",
        confirmButtonColor: "#dc3545"
    }).then(function (result) {
        if (result.isConfirmed) {
            sessionStorage.clear();
            location.reload();
        }
    });
}
