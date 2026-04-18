$(document).ready(function () {
    if (!requireLogin()) {
        return;
    }

    var user = getCurrentUser();

    $("#hdrGreeting").text("שלום, " + user.fullName);

    if (user.branchCode === null || user.branchCode === undefined) {
        $("#hdrBranch").text("All Branches");
    } else {
        ajaxCall("GET", "/branches/" + user.branchCode, null, onBranchLoaded, onBranchError);
    }

    applyModuleVisibility(user.role);

    $("#btnLogout").on("click", doLogout);
});

function onBranchLoaded(branch) {
    if (!branch) {
        $("#hdrBranch").text("");
        return;
    }
    $("#hdrBranch").text(branch.branchName);
}

function onBranchError() {
    $("#hdrBranch").text("Branch info unavailable");
}

function applyModuleVisibility(role) {
    if (canAccessModule(role, "inventory")) {
        $("#moduleInventory").removeClass("d-none");
    }
    if (canAccessModule(role, "scheduling")) {
        $("#moduleScheduling").removeClass("d-none");
    }
    if (canAccessModule(role, "manpower")) {
        $("#moduleManpower").removeClass("d-none");
    }
}

function doLogout() {
    Swal.fire({
        title: "Are you sure you want to log out?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, log out",
        confirmButtonColor: "#dc3545"
    }).then(function (result) {
        if (result.isConfirmed) {
            clearCurrentUser();
            window.location.href = "Login.html";
        }
    });
}
