var currentInventory = [];
var currentBranchCode = null;

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
    loadInventory();

    $("#btnSync").on("click", onSyncClick);
    $("#inventorySearch").on("input", onSearchInput);
    $("#btnClearSearch").on("click", onClearSearch);
});

function onSearchInput() {
    var query = $(this).val();
    filterInventory(query);
    if (query.length > 0) {
        $("#btnClearSearch").css("display", "flex");
    } else {
        $("#btnClearSearch").css("display", "none");
    }
}

function onClearSearch() {
    $("#inventorySearch").val("").trigger("input").focus();
}

function filterInventory(query) {
    var q = (query || "").trim().toLowerCase();
    if (q === "") {
        renderInventory(currentInventory);
        return;
    }
    var filtered = [];
    var i;
    for (i = 0; i < currentInventory.length; i++) {
        var item = currentInventory[i];
        var name = (item.productName || "").toLowerCase();
        var supplier = (item.supplier || "").toLowerCase();
        var barcode = (item.barcode || "").toLowerCase();
        if (name.indexOf(q) !== -1 || supplier.indexOf(q) !== -1 || barcode.indexOf(q) !== -1) {
            filtered.push(item);
        }
    }
    if (filtered.length === 0) {
        $("#inventoryContainer").html(
            "<div class='text-muted text-center p-4'>לא נמצאו מוצרים תואמים</div>"
        );
    } else {
        renderInventory(filtered);
    }
}

function onBranchLoaded(branch) {
    if (!branch) {
        return;
    }
    $("#navBranchDisplay").text(branch.branchName);
}

function onBranchError() {
    $("#navBranchDisplay").text("Branch info unavailable");
}

function loadInventory() {
    ajaxCall("GET", "/inventory/" + currentBranchCode, null, onInventoryLoaded, onInventoryError);
}

function onInventoryLoaded(items) {
    currentInventory = items || [];
    renderInventory(currentInventory);
}

function onInventoryError() {
    $("#inventoryContainer").html(
        "<div class='text-danger text-center p-4'>Failed to load inventory.</div>"
    );
}

function renderInventory(items) {
    var container = $("#inventoryContainer");
    container.empty();

    if (items.length === 0) {
        container.html("<div class='text-muted text-center p-4'>No products available.</div>");
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
        Swal.fire({ title: "Invalid value", text: "Stock must be 0 or greater.", icon: "error" });
        var i;
        for (i = 0; i < currentInventory.length; i++) {
            if (currentInventory[i].productId === productId) {
                input.val(currentInventory[i].currentStock);
                break;
            }
        }
        return;
    }

    var payload = {
        branchCode: currentBranchCode,
        productId: productId,
        currentStock: newStock
    };

    ajaxCall("PUT", "/inventory", payload,
        function () { onStockSaved(productId, newStock, card); },
        onStockSaveError
    );
}

function onStockSaved(productId, newStock, card) {
    var i;
    for (i = 0; i < currentInventory.length; i++) {
        if (currentInventory[i].productId === productId) {
            currentInventory[i].currentStock = newStock;
            break;
        }
    }
    updateMissingDisplay(card, currentInventory[i]);
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

function onStockSaveError() {
    Swal.fire({ title: "Save failed", text: "Could not save stock update. Please retry.", icon: "error" });
}

function onSyncClick() {
    var toastEl = document.getElementById("liveToast");
    if (toastEl && typeof bootstrap !== "undefined") {
        var toast = new bootstrap.Toast(toastEl);
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
