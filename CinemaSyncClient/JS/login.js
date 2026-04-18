$(document).ready(function () {
    if (getCurrentUser()) {
        window.location.href = "Dashboard.html";
        return;
    }

    $("#emailInput").focus();

    $("#btnLogin").on("click", doLogin);

    $("#passwordInput").on("keypress", function (e) {
        if (e.which === 13) {
            doLogin();
        }
    });

    $("#emailInput").on("keypress", function (e) {
        if (e.which === 13) {
            $("#passwordInput").focus();
        }
    });
});

function doLogin() {
    var email = ($("#emailInput").val() || "").trim();
    var password = ($("#passwordInput").val() || "").trim();

    $("#loginError").addClass("d-none").text("");

    if (!email || !password) {
        showLoginError("Please enter both email and password.");
        return;
    }

    setLoginLoading(true);

    var payload = { email: email, password: password };
    ajaxCall("POST", "/users/login", payload, onLoginSuccess, onLoginError);
}

function onLoginSuccess(user) {
    if (!user) {
        setLoginLoading(false);
        showLoginError("Invalid email or password.");
        return;
    }
    setCurrentUser(user);
    window.location.href = "Dashboard.html";
}

function onLoginError(xhr) {
    setLoginLoading(false);
    showLoginError(extractServerMessage(xhr, "Login failed."));
}

function showLoginError(msg) {
    $("#loginError").removeClass("d-none").text(msg);
}

function setLoginLoading(isLoading) {
    var btn = $("#btnLogin");
    if (isLoading) {
        btn.prop("disabled", true).data("original", btn.html()).html('<span class="spinner-border spinner-border-sm"></span> Loading...');
        $("#emailInput").prop("disabled", true);
        $("#passwordInput").prop("disabled", true);
    } else {
        var original = btn.data("original");
        if (original) {
            btn.html(original);
        }
        btn.prop("disabled", false);
        $("#emailInput").prop("disabled", false);
        $("#passwordInput").prop("disabled", false);
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
