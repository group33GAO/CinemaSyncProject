$(document).ready(function () {
    ajaxCall("GET", "/branches", null, onBranchesLoaded, onBranchesError);

    $("#btnRegister").on("click", doRegister);
    $("#regRole").on("change", onRoleChanged);
    $("#regFullName").focus();
});

function onBranchesLoaded(branches) {
    var list = (branches || []).slice().sort(function (a, b) {
        if (a.branchName < b.branchName) return -1;
        if (a.branchName > b.branchName) return 1;
        return 0;
    });

    var html = '<option value="">-- Select Branch --</option>';
    var i;
    for (i = 0; i < list.length; i++) {
        html += '<option value="' + list[i].branchCode + '">' + list[i].branchName + '</option>';
    }
    $("#registerBranch").html(html);
}

function onBranchesError(xhr) {
    $("#registerBranch").html('<option value="">-- Failed to load --</option>');
    showRegisterError("Could not load branches. Please refresh.");
}

function onRoleChanged() {
    var role = $("#regRole").val();
    if (role === "Regional") {
        $("#registerBranch").val("").prop("disabled", true);
    } else {
        $("#registerBranch").prop("disabled", false);
    }
}

function doRegister() {
    $("#registerError").addClass("d-none").text("");

    var fullName = ($("#regFullName").val() || "").trim();
    var email = ($("#regEmail").val() || "").trim();
    var password = $("#regPassword").val() || "";
    var passwordConfirm = $("#regPasswordConfirm").val() || "";
    var role = $("#regRole").val();
    var branchVal = $("#registerBranch").val();

    if (!fullName) {
        showRegisterError("Full name is required.");
        return;
    }
    if (!email || email.indexOf("@") === -1) {
        showRegisterError("A valid email is required.");
        return;
    }
    if (password.length < 6) {
        showRegisterError("Password must be at least 6 characters.");
        return;
    }
    if (password !== passwordConfirm) {
        showRegisterError("Passwords do not match.");
        return;
    }
    if (!role) {
        showRegisterError("Please select a role.");
        return;
    }

    var branchCode = null;
    if (role !== "Regional") {
        if (!branchVal) {
            showRegisterError("Please select a branch.");
            return;
        }
        branchCode = parseInt(branchVal, 10);
    }

    setRegisterLoading(true);

    var payload = {
        email: email,
        fullName: fullName,
        role: role,
        branchCode: branchCode,
        password: password
    };

    ajaxCall("POST", "/users/register", payload, onRegisterSuccess, onRegisterError);
}

function onRegisterSuccess(newUserId) {
    setRegisterLoading(false);
    Swal.fire({
        icon: "success",
        title: "Account created!",
        text: "Redirecting to login...",
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: "#20c997"
    }).then(function () {
        window.location.href = "Login.html";
    });
}

function onRegisterError(xhr) {
    setRegisterLoading(false);
    showRegisterError(extractServerMessage(xhr, "Registration failed."));
}

function showRegisterError(msg) {
    $("#registerError").removeClass("d-none").text(msg);
}

function setRegisterLoading(isLoading) {
    var btn = $("#btnRegister");
    if (isLoading) {
        btn.prop("disabled", true).data("original", btn.html()).html('<span class="spinner-border spinner-border-sm"></span> Registering...');
    } else {
        var original = btn.data("original");
        if (original) {
            btn.html(original);
        }
        btn.prop("disabled", false);
    }
}

function extractServerMessage(xhr, fallback) {
    if (!xhr) {
        return fallback;
    }
    if (xhr.responseJSON) {
        if (typeof xhr.responseJSON === "string") {
            return xhr.responseJSON;
        }
        if (xhr.responseJSON.detail) {
            return xhr.responseJSON.detail;
        }
        if (xhr.responseJSON.message) {
            return xhr.responseJSON.message;
        }
        if (xhr.responseJSON.title) {
            return xhr.responseJSON.title;
        }
    }
    if (xhr.responseText) {
        return xhr.responseText;
    }
    return fallback;
}
