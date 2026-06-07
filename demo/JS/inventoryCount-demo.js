/* ============================================================
   CinemaSync Demo - Inventory Count
   Same logic as the real system but uses DEMO_INVENTORY and
   stores stock updates in-memory (no server PUT).
   ============================================================ */

var currentInventory = [];
var currentCategory = "all";

$(document).ready(function () {
    $("#navBranchDisplay").text(DEMO_BRANCH.branchName);

    currentInventory = DEMO_INVENTORY.slice();
    applyFilters();

    $("#btnSync").on("click", onSyncClick);
    $("#inventorySearch").on("input", onSearchInput);
    $("#btnClearSearch").on("click", onClearSearch);
    $(".category-pill").on("click", onCategoryClick);
    $(".btn-logout").on("click", onLogoutClick);
});

function onLogoutClick(e) {
    e.preventDefault();
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
            window.location.href = "index.html";
        }
    });
}

function onCategoryClick() {
    $(".category-pill").removeClass("active");
    $(this).addClass("active");
    currentCategory = $(this).data("category");
    applyFilters();
}

function getProductCategory(item) {
    var name = item.productName || "";
    var supplier = item.supplier || "";

    // Equipment / operational returns / misc — must run BEFORE other checks
    if (name.indexOf("בלוני גז") !== -1 ||
        name.indexOf("משטחים") !== -1 ||
        name.indexOf("חומר ניקוי") !== -1) return "other";

    if (supplier.indexOf("נגה") !== -1) return "icecream";
    if (supplier.indexOf("ביזיטופ") !== -1 || supplier.indexOf("קפיטל מדיה") !== -1) return "merch";
    if (supplier.indexOf("פריטים נוספים") !== -1) return "other";
    if (supplier.indexOf("דונה איטליה") !== -1) return "other";

    if (name.indexOf("כוס") !== -1 || name.indexOf("מכסה") !== -1 ||
        name.indexOf("קש ") !== -1 || name.indexOf("מפיון") !== -1 ||
        name.indexOf("מפיות") !== -1 || name.indexOf("נייר טרמי") !== -1 ||
        name.indexOf("דפי A4") !== -1) return "disposables";

    if (supplier.indexOf("נסלי") !== -1) return "drinks";
    if (name.indexOf("פריגת") !== -1 || name.indexOf("פיוז") !== -1 ||
        name.indexOf("מים") !== -1 || name.indexOf("נביעות") !== -1 ||
        name.indexOf("מונסטר") !== -1 || name.indexOf("קינלי") !== -1 ||
        name.indexOf("קרלסברג") !== -1 || name.indexOf("טובורג") !== -1 ||
        name.indexOf("קרמול") !== -1 || name.indexOf("תרכיז") !== -1) return "drinks";

    if (supplier.indexOf("פופלי") !== -1 || supplier.indexOf("פאן פוד") !== -1 ||
        supplier.indexOf("אוסם") !== -1) return "snacks";
    if (name.indexOf("במבה") !== -1 || name.indexOf("פופקורן") !== -1 ||
        name.indexOf("נאצ") !== -1 || name.indexOf("סוכר") !== -1 ||
        name.indexOf("חמאה") !== -1 || name.indexOf("מלח") === 0 ||
        name === "מלח" || name.indexOf("שמן") === 0) return "snacks";

    return "sweets";
}

function onSearchInput() {
    var query = $(this).val();
    if (query.length > 0) {
        $("#btnClearSearch").css("display", "flex");
    } else {
        $("#btnClearSearch").css("display", "none");
    }
    applyFilters();
}

function onClearSearch() {
    $("#inventorySearch").val("").trigger("input").focus();
}

function applyFilters() {
    var q = ($("#inventorySearch").val() || "").trim().toLowerCase();
    var filtered = [];
    var i;
    for (i = 0; i < currentInventory.length; i++) {
        var item = currentInventory[i];
        if (currentCategory !== "all" && getProductCategory(item) !== currentCategory) {
            continue;
        }
        if (q !== "") {
            var name = (item.productName || "").toLowerCase();
            var supplier = (item.supplier || "").toLowerCase();
            var barcode = (item.barcode || "").toLowerCase();
            if (name.indexOf(q) === -1 && supplier.indexOf(q) === -1 && barcode.indexOf(q) === -1) {
                continue;
            }
        }
        filtered.push(item);
    }
    if (filtered.length === 0) {
        $("#inventoryContainer").html(
            "<div class='text-muted text-center p-4'>לא נמצאו מוצרים תואמים</div>"
        );
    } else {
        renderInventory(filtered);
    }
}

function renderInventory(items) {
    var container = $("#inventoryContainer");
    container.empty();

    if (items.length === 0) {
        container.html("<div class='text-muted text-center p-4'>אין מוצרים זמינים.</div>");
        return;
    }

    var lastSupplier = null;
    var currentRow = null;
    var i;
    for (i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.supplier !== lastSupplier) {
            container.append(buildSupplierHeader(item.supplier));
            currentRow = $("<div class='row g-3' dir='rtl'></div>");
            container.append(currentRow);
            lastSupplier = item.supplier;
        }
        currentRow.append(buildCard(item));
    }

    container.find(".stock-input").on("change", onStockChange);
}

function buildSupplierHeader(supplier) {
    return "<h6 class='category-header'>" + escapeHtml(supplier) + "</h6>";
}

function getStockStatusClass(item) {
    var required = item.requiredStock === null || item.requiredStock === undefined ? 0 : item.requiredStock;
    if (item.currentStock === null || item.currentStock === undefined || item.currentStock === 0) {
        return "stock-empty";
    }
    if (item.currentStock < required) {
        return "stock-below";
    }
    return "stock-ok";
}

function buildCard(item) {
    var required = item.requiredStock === null || item.requiredStock === undefined ? 0 : item.requiredStock;
    var missing = required - item.currentStock;
    var missingHtml = "";
    if (missing > 0) {
        missingHtml = "<span class='text-danger fw-bold'>חסר: " + missing + "</span>";
    } else {
        missingHtml = "<span class='text-success'>מלא</span>";
    }

    var notesHtml = "";
    if (item.notes) {
        notesHtml = "<div class='product-note'>" + escapeHtml(item.notes) + "</div>";
    } else {
        notesHtml = "<div class='product-note product-note--empty'>&nbsp;</div>";
    }

    var barcodeHtml = "";
    if (item.barcode) {
        barcodeHtml = ""
            + "<div class='barcode-display mt-2'>"
            +   "<i class='fa-solid fa-barcode'></i>"
            +   "<span class='barcode-label'>ברקוד:</span>"
            +   "<span class='barcode-value'>" + escapeHtml(item.barcode) + "</span>"
            + "</div>";
    }

    var statusClass = getStockStatusClass(item);

    var html = ""
        + "<div class='col-12 col-md-6 col-xl-4'>"
        +   "<div class='card inventory-card " + statusClass + " p-3 h-100' data-product-id='" + item.productId + "'>"
        +     "<div class='d-flex justify-content-between align-items-start mb-2' dir='rtl'>"
        +       "<div class='fw-bold fs-5 product-name'>" + escapeHtml(item.productName) + "</div>"
        +       "<span class='supplier-badge px-2 py-1 small'>" + escapeHtml(item.supplier) + "</span>"
        +     "</div>"
        +     "<div class='row g-2 align-items-center stock-row'>"
        +       "<div class='col-4'>"
        +         "<div class='label-standard'>נוכחי</div>"
        +         "<input type='number' min='0' class='form-control form-control-lg bg-dark text-light stock-input' value='" + item.currentStock + "' />"
        +       "</div>"
        +       "<div class='col-4'>"
        +         "<div class='label-standard'>נדרש</div>"
        +         "<div class='value-standard'>" + required + "</div>"
        +       "</div>"
        +       "<div class='col-4 text-start'>"
        +         missingHtml
        +       "</div>"
        +     "</div>"
        +     notesHtml
        +     barcodeHtml
        +   "</div>"
        + "</div>";
    return html;
}

function onStockChange() {
    var input = $(this);
    var card = input.closest(".card");
    var productId = parseInt(card.data("product-id"), 10);
    var newStock = parseInt(input.val(), 10);

    if (isNaN(newStock) || newStock < 0) {
        Swal.fire({ title: "ערך לא תקין", text: "המלאי חייב להיות 0 ומעלה.", icon: "error" });
        for (var i = 0; i < currentInventory.length; i++) {
            if (currentInventory[i].productId === productId) {
                input.val(currentInventory[i].currentStock);
                return;
            }
        }
        return;
    }

    // Update in-memory inventory (no server)
    var updated = null;
    for (var j = 0; j < currentInventory.length; j++) {
        if (currentInventory[j].productId === productId) {
            currentInventory[j].currentStock = newStock;
            updated = currentInventory[j];
            break;
        }
    }
    if (updated) {
        updateMissingDisplay(card, updated);
    }
}

function updateMissingDisplay(card, item) {
    var required = item.requiredStock === null || item.requiredStock === undefined ? 0 : item.requiredStock;
    var missing = required - item.currentStock;
    var target = card.find(".stock-row .text-start");
    if (missing > 0) {
        target.html("<span class='text-danger fw-bold'>חסר: " + missing + "</span>");
    } else {
        target.html("<span class='text-success'>מלא</span>");
    }
    card.removeClass("stock-empty stock-below stock-ok");
    card.addClass(getStockStatusClass(item));
}

function onSyncClick() {
    var toastEl = document.getElementById("liveToast");
    if (toastEl && typeof bootstrap !== "undefined") {
        var toast = new bootstrap.Toast(toastEl, { delay: 2500 });
        toast.show();
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return "";
    }
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
