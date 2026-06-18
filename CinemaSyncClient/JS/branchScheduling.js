var currentBranchCode = null;
var currentBranchName = "";

$(document).ready(function () {
    if (!requireLogin()) {
        return;
    }

    var currentUser = getCurrentUser();

    if (currentUser.branchCode === null || currentUser.branchCode === undefined) {
        Swal.fire({
            title: "נדרש סניף",
            text: "שיבוץ חכם לסניף דורש סניף ספציפי. מנהלים אזוריים, אנא פנו למנהל המערכת.",
            icon: "warning",
            confirmButtonText: "אישור"
        }).then(function () {
            window.location.href = "Dashboard.html";
        });
        return;
    }

    currentBranchCode = currentUser.branchCode;
    loadHeader(currentUser);

    $("#btnLogout").on("click", doLogout);
    $("#btnCancelSetup").on("click", doCancel);
    $("#btnCloseModal").on("click", doCancel);
    $("#btnStartScheduling").on("click", doStartScheduling);
    $("#btnChangeContext").on("click", doChangeContext);
    $("#btnRunSchedule").on("click", doRunSchedule);
    $("#venueTabs").on("click", ".venue-pill", function () {
        this.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });

    var existingContext = sessionStorage.getItem("branchScheduleContext");
    if (existingContext) {
        showMainScreen(JSON.parse(existingContext));
    } else {
        openSetupModal();
    }
});

function loadHeader(user) {
    $("#hdrGreeting").text("שלום, " + user.fullName);
    ajaxCall("GET", "/branches/" + user.branchCode, null, onBranchLoaded, onBranchError);
}

function onBranchLoaded(branch) {
    if (!branch) return;
    currentBranchName = branch.branchName || "";
    $("#hdrBranch").text(currentBranchName);
    $("#ctxBranchDisplay").text(currentBranchName);
}

function onBranchError() {
    $("#hdrBranch").text("סניף");
}

function openSetupModal() {
    hideModalError();
    populateWeekDropdown();
    var modalElement = document.getElementById("scheduleSetupModal");
    var modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function populateWeekDropdown() {
    var select = $("#inputWeekStart");
    select.empty();

    var today = new Date();
    var currentSunday = findSundayOfWeek(today);

    var i;
    for (i = 0; i < 13; i++) {
        var sunday = new Date(currentSunday.getTime());
        sunday.setDate(sunday.getDate() + i * 7);
        var saturday = new Date(sunday.getTime());
        saturday.setDate(saturday.getDate() + 6);

        var value = formatDateAsString(sunday);
        var rangeText = formatDayDotMonth(sunday) + "-" + formatDayDotMonth(saturday) + "." + saturday.getFullYear();

        var label;
        if (i === 0) label = "השבוע הנוכחי — " + rangeText;
        else if (i === 1) label = "השבוע הבא — " + rangeText;
        else if (i === 2) label = "בעוד שבועיים — " + rangeText;
        else label = "בעוד " + i + " שבועות — " + rangeText;

        select.append('<option value="' + value + '">' + label + '</option>');
    }
}

function findSundayOfWeek(date) {
    var d = new Date(date.getTime());
    var day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function formatDayDotMonth(date) {
    var day = String(date.getDate()).padStart(2, "0");
    var month = String(date.getMonth() + 1).padStart(2, "0");
    return day + "." + month;
}

function formatDateAsString(dateObject) {
    var year = dateObject.getFullYear();
    var month = String(dateObject.getMonth() + 1).padStart(2, "0");
    var day = String(dateObject.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function formatWeekRangeForDisplay(sundayIso) {
    var sunday = new Date(sundayIso + "T00:00:00");
    if (isNaN(sunday.getTime())) return sundayIso;
    var saturday = new Date(sunday.getTime());
    saturday.setDate(saturday.getDate() + 6);
    return formatDayDotMonth(sunday) + " - " + formatDayDotMonth(saturday) + "." + saturday.getFullYear();
}

function doStartScheduling() {
    hideModalError();

    var selectedDate = $("#inputWeekStart").val();
    if (!selectedDate) {
        showModalError("בחר שבוע");
        return;
    }

    var context = { weekStartDate: selectedDate, branchCode: currentBranchCode };
    sessionStorage.setItem("branchScheduleContext", JSON.stringify(context));

    closeSetupModal();
    showMainScreen(context);
    doRunSchedule();
}

function closeSetupModal() {
    var modalElement = document.getElementById("scheduleSetupModal");
    var modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}

function doCancel() {
    closeSetupModal();
    window.location.href = "Dashboard.html";
}

function showMainScreen(context) {
    $("#ctxWeekDisplay").text(formatWeekRangeForDisplay(context.weekStartDate));
    if (currentBranchName) {
        $("#ctxBranchDisplay").text(currentBranchName);
    }
    $("#schedulingMain").removeClass("d-none");
}

function doChangeContext() {
    sessionStorage.removeItem("branchScheduleContext");
    openSetupModal();
}

function doLogout() {
    Swal.fire({
        title: "להתנתק מהמערכת?",
        showCancelButton: true,
        confirmButtonText: "כן, התנתק",
        cancelButtonText: "ביטול"
    }).then(function (result) {
        if (result.isConfirmed) {
            clearCurrentUser();
            window.location.href = "Login.html";
        }
    });
}

function doRunSchedule() {
    var rawContext = sessionStorage.getItem("branchScheduleContext");
    if (!rawContext) {
        openSetupModal();
        return;
    }
    var context = JSON.parse(rawContext);

    hideScheduleError();
    showLoading();

    var requestBody = {
        branchCode: context.branchCode,
        weekStartDate: context.weekStartDate + "T00:00:00"
    };

    ajaxCall("POST", "/Scheduling/rank-and-schedule", requestBody, onScheduleSuccess, onScheduleError);
}

function showLoading() {
    $("#schedulePlaceholder").addClass("d-none");
    $("#scheduleResults").addClass("d-none");
    $("#loadingOverlay").removeClass("d-none");
}

function hideLoading() {
    $("#loadingOverlay").addClass("d-none");
}

function onScheduleSuccess(result) {
    hideLoading();

    if (!result || !result.schedule || !result.rankedMovies) {
        showScheduleError("התגובה מהשרת אינה תקינה.");
        return;
    }

    renderRankedMovies(result.rankedMovies);
    renderVenueTabs(result.schedule);

    $("#schedulePlaceholder").addClass("d-none");
    $("#scheduleResults").removeClass("d-none");
}

function onScheduleError(xhr) {
    hideLoading();
    $("#schedulePlaceholder").removeClass("d-none");
    showScheduleError(extractBranchErrorMessage(xhr));
}

function extractBranchErrorMessage(xhr) {
    var fallback = "השיבוץ החכם נכשל";
    var status = xhr ? xhr.status : 0;
    var detail = "";
    if (xhr && xhr.responseText) {
        try {
            var parsed = JSON.parse(xhr.responseText);
            if (parsed && (parsed.title || parsed.detail || parsed.message)) {
                detail = parsed.title || parsed.detail || parsed.message;
            }
        } catch (e) {
            detail = xhr.responseText.substring(0, 200);
        }
    }
    return fallback + " (HTTP " + status + ")" + (detail ? ": " + detail : "");
}

function showScheduleError(message) {
    $("#scheduleError").removeClass("d-none").text(message);
}

function hideScheduleError() {
    $("#scheduleError").addClass("d-none").text("");
}

function renderRankedMovies(rankedMovies) {
    var container = $("#rankedList");
    container.empty();

    if (!rankedMovies || rankedMovies.length === 0) {
        container.html('<div class="text-muted text-center small pt-4">אין נתונים</div>');
        return;
    }

    var i;
    for (i = 0; i < rankedMovies.length; i++) {
        var movie = rankedMovies[i];
        var badgeClass = "rank-badge";
        if (movie.rank === 1) badgeClass += " rank-1";
        else if (movie.rank === 2) badgeClass += " rank-2";
        else if (movie.rank === 3) badgeClass += " rank-3";

        var badge3d = movie.is3D ? ' <span class="badge bg-info text-dark" style="font-size:9px;">3D</span>' : "";
        var avgText = movie.averageTickets ? Math.round(movie.averageTickets) + " כר׳" : "";
        var genreText = movie.genre ? movie.genre.split(",")[0].trim() : "";

        var html = '<div class="ranked-movie-item">' +
            '<span class="' + badgeClass + '">S' + movie.rank + '</span>' +
            '<div class="ranked-movie-info">' +
                '<div class="ranked-movie-title" title="' + escapeHtmlAttr(movie.title) + '">' +
                    escapeHtmlText(movie.title) + badge3d +
                '</div>' +
                '<div class="ranked-movie-meta">' + escapeHtmlText(genreText) + '</div>' +
            '</div>' +
            '<span class="ranked-avg-tickets">' + avgText + '</span>' +
        '</div>';

        container.append(html);
    }
}

function extractTrailingNumber(name) {
    var match = name ? name.match(/(\d+)\s*$/) : null;
    return match ? parseInt(match[1], 10) : null;
}

function sortVenuesAscending(venues) {
    venues.sort(function (a, b) {
        var numA = extractTrailingNumber(a.venueName);
        var numB = extractTrailingNumber(b.venueName);
        if (numA !== null && numB !== null) {
            return numA - numB;
        }
        return (a.venueName || "").localeCompare(b.venueName || "");
    });
}

function renderVenueTabs(schedule) {
    var venues = extractVenues(schedule);
    sortVenuesAscending(venues);
    var tabsContainer = $("#venueTabs");
    var contentContainer = $("#venueTabContent");
    tabsContainer.empty();
    contentContainer.empty();

    if (venues.length === 0) {
        contentContainer.html('<div class="text-muted text-center pt-4">לא נוצר שיבוץ לאף אולם.</div>');
        return;
    }

    var i;
    for (i = 0; i < venues.length; i++) {
        var venue = venues[i];
        var isFirst = (i === 0);
        var tabId = "venue-tab-" + venue.venueId;
        var paneId = "venue-pane-" + venue.venueId;

        var slotCount = getSlotsForVenue(schedule, venue.venueId).length;

        var btnHtml = '<button class="venue-pill' + (isFirst ? " active" : "") + '" ' +
            'id="' + tabId + '" ' +
            'data-bs-toggle="tab" ' +
            'data-bs-target="#' + paneId + '" ' +
            'type="button" role="tab" ' +
            'aria-selected="' + (isFirst ? "true" : "false") + '">' +
            '<i class="fa-solid fa-clapperboard venue-pill-icon"></i>' +
            '<span class="venue-pill-name">' + escapeHtmlText(venue.venueName) + '</span>' +
            '<span class="venue-pill-count">' + slotCount + ' מופעים</span>' +
        '</button>';
        tabsContainer.append(btnHtml);

        var venueSlots = getSlotsForVenue(schedule, venue.venueId);
        var gridHtml = buildVenueGrid(venueSlots);

        var paneHtml = '<div class="tab-pane fade' + (isFirst ? " show active" : "") + '" ' +
            'id="' + paneId + '" role="tabpanel">' +
            gridHtml +
        '</div>';
        contentContainer.append(paneHtml);
    }
}

function extractVenues(schedule) {
    var seen = {};
    var venues = [];
    var i;
    for (i = 0; i < schedule.length; i++) {
        var slot = schedule[i];
        if (!seen[slot.venueId]) {
            seen[slot.venueId] = true;
            venues.push({ venueId: slot.venueId, venueName: slot.venueName });
        }
    }
    return venues;
}

function getSlotsForVenue(schedule, venueId) {
    var result = [];
    var i;
    for (i = 0; i < schedule.length; i++) {
        if (schedule[i].venueId === venueId) {
            result.push(schedule[i]);
        }
    }
    return result;
}

function buildVenueGrid(venueSlots) {
    var dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    var hours = [10, 12, 14, 16, 18, 20, 22, 23];

    var slotsByKey = {};
    var i;
    for (i = 0; i < venueSlots.length; i++) {
        var s = venueSlots[i];
        slotsByKey[s.dayIndex + "_" + s.hour] = s;
    }

    var minOcc = 1, maxOcc = 0;
    for (i = 0; i < venueSlots.length; i++) {
        if (venueSlots[i].occupancy < minOcc) minOcc = venueSlots[i].occupancy;
        if (venueSlots[i].occupancy > maxOcc) maxOcc = venueSlots[i].occupancy;
    }

    var html = '<div class="branch-schedule-grid">';

    html += '<div class="branch-sch-corner"></div>';
    var d;
    for (d = 0; d < 7; d++) {
        html += '<div class="branch-sch-day-header">' + dayNames[d] + '</div>';
    }

    var h;
    for (h = 0; h < hours.length; h++) {
        var hr = hours[h];
        var hrLabel = padTwoDigits(hr) + ":00";
        html += '<div class="branch-sch-hour-label">' + hrLabel + '</div>';

        for (d = 0; d < 7; d++) {
            var key = d + "_" + hr;
            var slot = slotsByKey[key];
            html += buildScheduleCell(slot, minOcc, maxOcc);
        }
    }

    html += '</div>';
    return html;
}

function buildScheduleCell(slot, minOcc, maxOcc) {
    if (!slot) {
        return '<div class="branch-sch-cell empty">—</div>';
    }

    var bg = colorForOccupancy(slot.occupancy, minOcc, maxOcc);
    var occPct = Math.round(slot.occupancy * 100);
    var shortTitle = truncateTitle(slot.movieTitle, 14);

    return '<div class="branch-sch-cell" style="background:' + bg + ';" title="' +
        escapeHtmlAttr(slot.movieTitle) + ' · ' + slot.predictedTickets + ' כרטיסים · ' + occPct + '% תפוסה">' +
        '<div class="branch-sch-cell-title">' + escapeHtmlText(shortTitle) + '</div>' +
        '<div class="branch-sch-cell-occ">' + occPct + '%</div>' +
    '</div>';
}

function colorForOccupancy(occ, minOcc, maxOcc) {
    if (maxOcc === minOcc) return "hsl(150, 55%, 32%)";
    var t = (occ - minOcc) / (maxOcc - minOcc);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var hue = 200 - t * 80;
    var sat = 12 + t * 68;
    var light = 22 + t * 35;
    return "hsl(" + hue + ", " + sat + "%, " + light + "%)";
}

function truncateTitle(title, maxLen) {
    if (!title) return "";
    if (title.length <= maxLen) return title;
    return title.substring(0, maxLen) + "…";
}

function padTwoDigits(num) {
    return num < 10 ? "0" + num : String(num);
}

function escapeHtmlText(text) {
    if (text === null || text === undefined) return "";
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function escapeHtmlAttr(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function showModalError(message) {
    $("#modalError").removeClass("d-none").text(message);
}

function hideModalError() {
    $("#modalError").addClass("d-none").text("");
}
