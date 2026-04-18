var API_BASE = "https://localhost:7216/api";

var MODULE_ACCESS = {
    "Manager":     { inventory: true,  scheduling: true,  manpower: true  },
    "Regional":    { inventory: true,  scheduling: true,  manpower: true  },
    "Procurement": { inventory: true,  scheduling: false, manpower: false },
    "Content":     { inventory: false, scheduling: true,  manpower: false },
    "Staff":       { inventory: false, scheduling: false, manpower: false }
};

function ajaxCall(method, api, data, successCB, errorCB) {
    var options = {
        url: API_BASE + api,
        type: method,
        contentType: "application/json",
        dataType: "json",
        success: successCB,
        error: errorCB
    };
    if (data !== null && data !== undefined) {
        options.data = JSON.stringify(data);
    }
    $.ajax(options);
}

function getCurrentUser() {
    var raw = localStorage.getItem("currentUser");
    if (!raw) {
        return null;
    }
    return JSON.parse(raw);
}

function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem("currentUser");
}

function requireLogin() {
    var user = getCurrentUser();
    if (user) {
        return true;
    }
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf("/pages/") !== -1) {
        window.location.href = "Login.html";
    } else {
        window.location.href = "Pages/Login.html";
    }
    return false;
}

function canAccessModule(role, moduleName) {
    if (!role) {
        return false;
    }
    var perms = MODULE_ACCESS[role];
    if (!perms) {
        return false;
    }
    return perms[moduleName] === true;
}
