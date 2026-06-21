var currentBranchCode = null;
var activeView = "list";
var detailCategory = "all";
var newCountCategory = "all";
var currentCountId = null;
var currentCountIsPrimary = false;
var currentCountItems = [];
var currentInventory = [];

$(document).ready(function () {
    if (!requireLogin()) {
        return;
    }

    var user = getCurrentUser();

    if (!canAccessModule(user.role, "inventory")) {
        window.location.href = "Pages/Dashboard.html";
        return;
    }

    if (user.branchCode === null || user.branchCode === undefined) {
        Swal.fire({
            title: "No branch assigned",
            text: "You are not assigned to a branch — inventory cannot be loaded.",
            icon: "warning"
        });
        return;
    }

    currentBranchCode = user.branchCode;

    ajaxCall("GET", "/branches/" + currentBranchCode, null, onBranchLoaded, onBranchError);
    loadCountsList();

    $("#btnNavBack").on("click", onNavBack);
    $("#btnNewCount").on("click", onNewCountClick);
    $("#btnSetPrimary").on("click", onSetPrimaryClick);
    $("#btnSaveCount").on("click", onSaveCountClick);
    $("#detailSearch").on("input", onDetailSearchInput);
    $("#btnClearDetailSearch").on("click", onClearDetailSearch);
    $("#detailFilters").on("click", ".category-pill", onDetailCategoryClick);
    $("#newCountSearch").on("input", onNewCountSearchInput);
    $("#btnClearNewSearch").on("click", onClearNewSearch);
    $("#newCountFilters").on("click", ".category-pill", onNewCountCategoryClick);
});

function onBranchLoaded(branch) {
    if (!branch) return;
    $("#navBranchDisplay").text(branch.branchName);
}

function onBranchError() {
    $("#navBranchDisplay").text("Branch info unavailable");
}

// ── Navigation ────────────────────────────────────────────────────────────

function showView(viewName) {
    activeView = viewName;
    $("#viewCountsList").toggle(viewName === "list");
    $("#viewCountDetail").toggle(viewName === "detail");
    $("#viewNewCount").toggle(viewName === "new");
}

function onNavBack() {
    if (activeView === "list") {
        window.location.href = "Pages/Dashboard.html";
    } else {
        showView("list");
        loadCountsList();
    }
}

// ── Counts List ───────────────────────────────────────────────────────────

function loadCountsList() {
    $("#countsListContainer").html("<div class='text-muted text-center p-4'><i class='fa-solid fa-spinner fa-spin me-2'></i>טוען ספירות...</div>");
    ajaxCall("GET", "/inventorycounts/" + currentBranchCode, null, onCountsLoaded, onCountsError);
}

function onCountsLoaded(counts) {
    renderCountsList(counts || []);
}

function onCountsError() {
    $("#countsListContainer").html("<div class='text-danger text-center p-4'>לא ניתן לטעון את הספירות.</div>");
}

function renderCountsList(counts) {
    var container = $("#countsListContainer");
    container.empty();

    if (counts.length === 0) {
        container.html(
            "<div class='text-center p-5'>"
            + "<i class='fa-solid fa-clipboard-list fa-3x text-muted mb-3 d-block'></i>"
            + "<p class='text-muted'>אין ספירות שמורות עדיין.<br>לחץ על <strong>ספירה חדשה</strong> כדי להתחיל.</p>"
            + "</div>"
        );
        return;
    }

    var html = "";
    var i;
    for (i = 0; i < counts.length; i++) {
        var c = counts[i];
        var primaryBadge = c.isPrimary
            ? "<span class='badge bg-teal ms-2'><i class='fa-solid fa-star me-1'></i>עיקרי</span>"
            : "";
        html += "<div class='count-session-card p-3 mb-3'"
            + " data-count-id='" + c.countId + "'"
            + " data-is-primary='" + (c.isPrimary ? "1" : "0") + "'"
            + " data-count-name='" + escapeAttr(c.countName) + "'"
            + " data-count-date='" + escapeAttr(c.createdAt) + "'>"
            + "<div class='d-flex justify-content-between align-items-center' dir='rtl'>"
            + "<div>"
            + "<div class='fw-bold'>" + escapeHtml(c.countName) + primaryBadge + "</div>"
            + "<small class='text-muted'>" + formatDate(c.createdAt) + "</small>"
            + "</div>"
            + "<button class='btn btn-outline-teal btn-sm btn-open-count px-3'>פתח</button>"
            + "</div>"
            + "</div>";
    }

    container.html(html);
    container.find(".btn-open-count").on("click", function () {
        var card = $(this).closest(".count-session-card");
        var countId = parseInt(card.data("count-id"), 10);
        var isPrimary = card.data("is-primary") === 1 || card.data("is-primary") === "1";
        var countName = card.data("count-name");
        var countDate = card.data("count-date");
        openCount(countId, isPrimary, countName, countDate);
    });
}

function openCount(countId, isPrimary, countName, countDate) {
    currentCountId = countId;
    currentCountIsPrimary = isPrimary;
    detailCategory = "all";
    $("#detailFilters .category-pill").removeClass("active");
    $("#detailFilters .category-pill[data-category='all']").addClass("active");
    $("#detailSearch").val("");
    $("#btnClearDetailSearch").css("display", "none");
    $("#countDetailTitle").text(countName);
    $("#countDetailDate").text(formatDate(countDate));
    updateSetPrimaryButton(isPrimary);
    showView("detail");
    $("#countDetailContainer").html("<div class='text-muted text-center p-4'><i class='fa-solid fa-spinner fa-spin me-2'></i>טוען פריטים...</div>");
    ajaxCall("GET", "/inventorycounts/" + countId + "/items", null, onCountItemsLoaded, onCountItemsError);
}

function updateSetPrimaryButton(isPrimary) {
    if (isPrimary) {
        $("#btnSetPrimary").prop("disabled", true).text("ספירה עיקרית");
    } else {
        $("#btnSetPrimary").prop("disabled", false).html("<i class='fa-solid fa-star me-1'></i> הגדר כעיקרי");
    }
}

function onCountItemsLoaded(items) {
    currentCountItems = items || [];
    applyDetailFilters();
}

function onCountItemsError() {
    $("#countDetailContainer").html("<div class='text-danger text-center p-4'>לא ניתן לטעון את פריטי הספירה.</div>");
}

function applyDetailFilters() {
    var q = ($("#detailSearch").val() || "").trim().toLowerCase();
    var filtered = [];
    var i;
    for (i = 0; i < currentCountItems.length; i++) {
        var item = currentCountItems[i];
        if (detailCategory !== "all" && getProductCategory(item) !== detailCategory) continue;
        if (q !== "") {
            var name = (item.productName || "").toLowerCase();
            var supplier = (item.supplier || "").toLowerCase();
            var barcode = (item.barcode || "").toLowerCase();
            if (name.indexOf(q) === -1 && supplier.indexOf(q) === -1 && barcode.indexOf(q) === -1) continue;
        }
        filtered.push(item);
    }
    renderInventoryGrid(filtered, true, "#countDetailContainer");
}

function onDetailCategoryClick() {
    $("#detailFilters .category-pill").removeClass("active");
    $(this).addClass("active");
    detailCategory = $(this).data("category");
    applyDetailFilters();
}

function onDetailSearchInput() {
    var val = $(this).val();
    $("#btnClearDetailSearch").css("display", val.length > 0 ? "flex" : "none");
    applyDetailFilters();
}

function onClearDetailSearch() {
    $("#detailSearch").val("").trigger("input").focus();
}

function onSetPrimaryClick() {
    ajaxCall(
        "PUT",
        "/inventorycounts/" + currentCountId + "/primary?branchCode=" + currentBranchCode,
        null,
        onSetPrimaryDone,
        onSetPrimaryError
    );
}

function onSetPrimaryDone() {
    currentCountIsPrimary = true;
    updateSetPrimaryButton(true);
    Swal.fire({ title: "עודכן!", text: "הספירה הוגדרה כספירה העיקרית.", icon: "success", timer: 1500, showConfirmButton: false });
}

function onSetPrimaryError() {
    Swal.fire({ title: "שגיאה", text: "לא ניתן לעדכן את הספירה העיקרית.", icon: "error" });
}

// ── New Count ─────────────────────────────────────────────────────────────

function onNewCountClick() {
    newCountCategory = "all";
    $("#newCountFilters .category-pill").removeClass("active");
    $("#newCountFilters .category-pill[data-category='all']").addClass("active");
    $("#newCountSearch").val("");
    $("#btnClearNewSearch").css("display", "none");
    showView("new");
    $("#newCountContainer").html("<div class='text-muted text-center p-4'><i class='fa-solid fa-spinner fa-spin me-2'></i>טוען מלאי...</div>");
    ajaxCall("GET", "/inventory/" + currentBranchCode, null, onInventoryForNewCountLoaded, onInventoryForNewCountError);
}

function onInventoryForNewCountLoaded(items) {
    currentInventory = items || [];
    applyNewCountFilters();
}

function onInventoryForNewCountError() {
    $("#newCountContainer").html("<div class='text-danger text-center p-4'>לא ניתן לטעון את המלאי.</div>");
}

function applyNewCountFilters() {
    var q = ($("#newCountSearch").val() || "").trim().toLowerCase();
    var filtered = [];
    var i;
    for (i = 0; i < currentInventory.length; i++) {
        var item = currentInventory[i];
        if (newCountCategory !== "all" && getProductCategory(item) !== newCountCategory) continue;
        if (q !== "") {
            var name = (item.productName || "").toLowerCase();
            var supplier = (item.supplier || "").toLowerCase();
            var barcode = (item.barcode || "").toLowerCase();
            if (name.indexOf(q) === -1 && supplier.indexOf(q) === -1 && barcode.indexOf(q) === -1) continue;
        }
        filtered.push(item);
    }
    renderInventoryGrid(filtered, false, "#newCountContainer");
}

function onNewCountCategoryClick() {
    $("#newCountFilters .category-pill").removeClass("active");
    $(this).addClass("active");
    newCountCategory = $(this).data("category");
    applyNewCountFilters();
}

function onNewCountSearchInput() {
    var val = $(this).val();
    $("#btnClearNewSearch").css("display", val.length > 0 ? "flex" : "none");
    applyNewCountFilters();
}

function onClearNewSearch() {
    $("#newCountSearch").val("").trigger("input").focus();
}

function onSaveCountClick() {
    Swal.fire({
        title: "שמירת ספירה",
        html: "<input id='swalCountName' class='swal2-input' placeholder='שם הספירה...' dir='rtl' />"
            + "<div class='d-flex align-items-center gap-2 mt-3' dir='rtl' style='padding:0 1.5rem;'>"
            + "<input type='checkbox' id='swalIsPrimary' style='width:18px;height:18px;cursor:pointer;accent-color:#00CED1;flex-shrink:0;' />"
            + "<label for='swalIsPrimary' style='cursor:pointer;margin-right:8px;'>ספירה הושלמה — הגדר כספירה העיקרית</label>"
            + "</div>",
        confirmButtonText: "שמור",
        cancelButtonText: "ביטול",
        showCancelButton: true,
        focusConfirm: false,
        preConfirm: function () {
            var name = (document.getElementById("swalCountName").value || "").trim();
            if (!name) {
                Swal.showValidationMessage("יש להזין שם לספירה");
                return false;
            }
            return {
                name: name,
                isPrimary: document.getElementById("swalIsPrimary").checked
            };
        }
    }).then(function (result) {
        if (!result.isConfirmed) return;
        var payload = {
            branchCode: currentBranchCode,
            countName: result.value.name,
            isPrimary: result.value.isPrimary,
            items: collectNewCountItems()
        };
        ajaxCall("POST", "/inventorycounts", payload, onCountSaved, onCountSaveError);
    });
}

function collectNewCountItems() {
    var items = [];
    var i;
    for (i = 0; i < currentInventory.length; i++) {
        items.push({
            productId: currentInventory[i].productId,
            stockAtCount: currentInventory[i].currentStock
        });
    }
    return items;
}

function onCountSaved() {
    Swal.fire({ title: "נשמר!", text: "הספירה נשמרה בהצלחה.", icon: "success", timer: 1500, showConfirmButton: false });
    showView("list");
    loadCountsList();
}

function onCountSaveError() {
    Swal.fire({ title: "שגיאה", text: "לא ניתן לשמור את הספירה.", icon: "error" });
}

// ── Shared Grid Rendering ─────────────────────────────────────────────────

function renderInventoryGrid(items, readOnly, containerSelector) {
    var container = $(containerSelector);
    container.empty();

    if (items.length === 0) {
        container.html("<div class='text-muted text-center p-4'>לא נמצאו מוצרים תואמים</div>");
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
        currentRow.append(buildCard(item, readOnly));
    }

    if (!readOnly) {
        container.find(".stock-input").on("change", onNewCountStockChange);
    }
}

function buildSupplierHeader(supplier) {
    return "<h6 class='category-header'>" + escapeHtml(supplier) + "</h6>";
}

function buildCard(item, readOnly) {
    var stock = readOnly ? item.stockAtCount : item.currentStock;
    var required = item.requiredStock === null || item.requiredStock === undefined ? 0 : item.requiredStock;
    var missing = required - stock;
    var missingHtml = missing > 0
        ? "<span class='text-danger fw-bold'>חסר: " + missing + "</span>"
        : "<span class='text-success'>מלא</span>";

    var notesHtml = item.notes
        ? "<div class='product-note'>" + escapeHtml(item.notes) + "</div>"
        : "<div class='product-note product-note--empty'>&nbsp;</div>";

    var barcodeHtml = "";
    if (item.barcode) {
        barcodeHtml = "<div class='barcode-display mt-2'>"
            + "<i class='fa-solid fa-barcode'></i>"
            + "<span class='barcode-label'>ברקוד:</span>"
            + "<span class='barcode-value'>" + escapeHtml(item.barcode) + "</span>"
            + "</div>";
    }

    var statusClass = getStockStatusClass(stock, required);
    var stockDisplay = readOnly
        ? "<div class='value-standard'>" + stock + "</div>"
        : "<input type='number' min='0' class='form-control form-control-lg bg-dark text-light stock-input' value='" + stock + "' />";

    return "<div class='col-12 col-md-6 col-xl-4'>"
        + "<div class='card inventory-card " + statusClass + " p-3 h-100' data-product-id='" + item.productId + "'>"
        + "<div class='d-flex justify-content-between align-items-start mb-2' dir='rtl'>"
        + "<div class='fw-bold fs-5 product-name'>" + escapeHtml(item.productName) + "</div>"
        + "<span class='supplier-badge px-2 py-1 small'>" + escapeHtml(item.supplier) + "</span>"
        + "</div>"
        + "<div class='row g-2 align-items-center stock-row'>"
        + "<div class='col-4'>"
        + "<div class='label-standard'>נוכחי</div>"
        + stockDisplay
        + "</div>"
        + "<div class='col-4'>"
        + "<div class='label-standard'>נדרש</div>"
        + "<div class='value-standard'>" + required + "</div>"
        + "</div>"
        + "<div class='col-4 text-start'>"
        + missingHtml
        + "</div>"
        + "</div>"
        + notesHtml
        + barcodeHtml
        + "</div>"
        + "</div>";
}

function getStockStatusClass(stock, required) {
    if (stock === null || stock === undefined || stock === 0) return "stock-empty";
    if (stock < required) return "stock-below";
    return "stock-ok";
}

function onNewCountStockChange() {
    var input = $(this);
    var card = input.closest(".card");
    var productId = parseInt(card.data("product-id"), 10);
    var newStock = parseInt(input.val(), 10);
    var i;
    var required = 0;

    if (isNaN(newStock) || newStock < 0) {
        Swal.fire({ title: "ערך שגוי", text: "הכמות חייבת להיות 0 או יותר.", icon: "error" });
        for (i = 0; i < currentInventory.length; i++) {
            if (currentInventory[i].productId === productId) {
                input.val(currentInventory[i].currentStock);
                break;
            }
        }
        return;
    }

    for (i = 0; i < currentInventory.length; i++) {
        if (currentInventory[i].productId === productId) {
            currentInventory[i].currentStock = newStock;
            required = currentInventory[i].requiredStock || 0;
            break;
        }
    }

    var missing = required - newStock;
    card.find(".stock-row .text-start").html(missing > 0
        ? "<span class='text-danger fw-bold'>חסר: " + missing + "</span>"
        : "<span class='text-success'>מלא</span>"
    );
    card.removeClass("stock-empty stock-below stock-ok");
    card.addClass(getStockStatusClass(newStock, required));
}

// ── Category Logic ────────────────────────────────────────────────────────

function getProductCategory(item) {
    var name = item.productName || "";
    var supplier = item.supplier || "";

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

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var day = ("0" + d.getDate()).slice(-2);
    var month = ("0" + (d.getMonth() + 1)).slice(-2);
    var year = d.getFullYear();
    return day + "/" + month + "/" + year;
}

function escapeAttr(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
