let allMovies = [];
let selectedMovieEdi = null;

$(document).ready(function () {
    if (!requireLogin()) {
        return;
    }

    const currentUser = getCurrentUser();

    if (currentUser.branchCode === null || currentUser.branchCode === undefined) {
        Swal.fire({
            title: "Branch required",
            text: "Movie Scheduling requires a specific branch. Regional managers please contact admin.",
            icon: "warning",
            confirmButtonText: "OK"
        }).then(function () {
            window.location.href = "Dashboard.html";
        });
        return;
    }

    loadHeader(currentUser);

    $("#btnLogout").on("click", doLogout);
    $("#btnCancelSetup").on("click", doCancel);
    $("#btnCloseModal").on("click", doCancel);
    $("#btnStartScheduling").on("click", doStartScheduling);
    $("#btnChangeContext").on("click", doChangeContext);
    $("#btnPredict").on("click", doPredict);

    const existingContext = sessionStorage.getItem("scheduleContext");
    if (existingContext) {
        showMainScreen();
    } else {
        openSetupModal(currentUser);
    }
});

function loadHeader(user) {
    $("#hdrGreeting").text("Hello, " + user.fullName);

    if (user.branchCode === null || user.branchCode === undefined) {
        $("#hdrBranch").text("All Branches");
        return;
    }

    ajaxCall("GET", "/branches/" + user.branchCode, null, onBranchHeaderLoaded, onBranchHeaderError);
}

function onBranchHeaderLoaded(branch) {
    if (!branch) {
        $("#hdrBranch").text("");
        return;
    }
    $("#hdrBranch").text(branch.branchName);
}

function onBranchHeaderError() {
    $("#hdrBranch").text("Branch info unavailable");
}

function openSetupModal(user) {
    hideError();
    $("#inputWeekStart").val(getNextSunday());
    resetVenueDropdown();

    ajaxCall("GET", "/venues/by-branch/" + user.branchCode, null, onVenuesLoaded, onVenuesError);

    const modalElement = document.getElementById("scheduleSetupModal");
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function resetVenueDropdown() {
    const venueSelect = $("#selectVenue");
    venueSelect.empty();
    venueSelect.append('<option value="">-- Choose a venue --</option>');
}

function getNextSunday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    today.setDate(today.getDate() + daysUntilSunday);
    return formatDateAsString(today);
}

function formatDateAsString(dateObject) {
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, "0");
    const day = String(dateObject.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function onVenuesLoaded(venues) {
    resetVenueDropdown();

    if (!venues || venues.length === 0) {
        showError("No venues found for your branch");
        return;
    }

    const venueSelect = $("#selectVenue");
    let i;
    for (i = 0; i < venues.length; i++) {
        const venue = venues[i];
        const optionText = venue.venueName + " (" + venue.capacity + " seats, " + venue.venueType + ")";
        const optionElement = $("<option></option>").val(venue.venueId).text(optionText);
        venueSelect.append(optionElement);
    }
}

function onVenuesError() {
    showError("Could not load venues. Please refresh the page.");
}

function showError(message) {
    $("#modalError").removeClass("d-none").text(message);
}

function hideError() {
    $("#modalError").addClass("d-none").text("");
}

function doStartScheduling() {
    hideError();

    const selectedDate = $("#inputWeekStart").val();
    const selectedVenueId = $("#selectVenue").val();
    const selectedVenueText = $("#selectVenue option:selected").text();

    if (!selectedDate) {
        showError("Please select a date");
        return;
    }

    if (!selectedVenueId) {
        showError("Please select a venue");
        return;
    }

    const dateObject = new Date(selectedDate + "T00:00:00");
    if (dateObject.getDay() !== 0) {
        showError("Please select a Sunday");
        return;
    }

    const context = {
        weekStartDate: selectedDate,
        venueId: parseInt(selectedVenueId),
        venueDisplay: selectedVenueText
    };
    sessionStorage.setItem("scheduleContext", JSON.stringify(context));

    document.activeElement.blur();
    closeSetupModal();
    showMainScreen();
}

function closeSetupModal() {
    const modalElement = document.getElementById("scheduleSetupModal");
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
}

function doCancel() {
    document.activeElement.blur();
    closeSetupModal();
    window.location.href = "Dashboard.html";
}

function showMainScreen() {
    closeSetupModal();

    const rawContext = sessionStorage.getItem("scheduleContext");
    if (!rawContext) {
        return;
    }
    const context = JSON.parse(rawContext);

    $("#ctxWeekDisplay").text(formatDateForDisplay(context.weekStartDate));
    $("#ctxVenueDisplay").text(context.venueDisplay);
    $("#schedulingMain").removeClass("d-none");

    initPredictDefaults(context.weekStartDate);
    loadMovieLibrary();
}

function initPredictDefaults(weekStartDate) {
    buildDayPicker(weekStartDate);
    buildTimePresets();
    $("#predictTime").val("19:00");
    $("#predictionResult").addClass("d-none");
    hidePredictionError();
}

function buildTimePresets() {
    var menu = $(".predict-time-menu");
    menu.empty();

    var h;
    var m;
    for (h = 10; h <= 23; h++) {
        for (m = 0; m < 60; m += 5) {
            var value = padTwo(h) + ":" + padTwo(m);
            menu.append('<li><button class="dropdown-item" type="button" data-time="' + value + '">' + value + '</button></li>');
        }
    }

    $(".predict-time-menu").off("click", ".dropdown-item");
    $(".predict-time-menu").on("click", ".dropdown-item", onTimePresetClick);
}

function padTwo(num) {
    return num < 10 ? "0" + num : String(num);
}

function onTimePresetClick() {
    var selectedTime = $(this).attr("data-time");
    if (selectedTime) {
        $("#predictTime").val(selectedTime);
    }
}

function buildDayPicker(weekStartDate) {
    var container = $("#predictDayPicker");
    container.empty();
    if (!weekStartDate) return;

    var startDate = new Date(weekStartDate + "T00:00:00");
    var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var i;
    for (i = 0; i < 7; i++) {
        var dt = new Date(startDate);
        dt.setDate(startDate.getDate() + i);

        var iso = formatDateAsString(dt);
        var dayLabel = dayNames[dt.getDay()];
        var monthLabel = monthNames[dt.getMonth()];
        var dayNum = dt.getDate();

        var cardHtml = '<button type="button" class="predict-day-card" data-date="' + iso + '">' +
                         '<span class="predict-day-name">' + dayLabel + '</span>' +
                         '<span class="predict-day-num">' + dayNum + '</span>' +
                         '<span class="predict-day-month">' + monthLabel + '</span>' +
                       '</button>';
        container.append(cardHtml);
    }

    $(".predict-day-card").first().addClass("selected");

    $("#predictDayPicker").off("click", ".predict-day-card");
    $("#predictDayPicker").on("click", ".predict-day-card", function () {
        $(".predict-day-card").removeClass("selected");
        $(this).addClass("selected");
    });
}

function formatDateForDisplay(yyyymmdd) {
    const dateObject = new Date(yyyymmdd + "T00:00:00");
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[dateObject.getMonth()];
    const day = dateObject.getDate();
    const year = dateObject.getFullYear();
    return monthName + " " + day + ", " + year;
}

function doChangeContext() {
    sessionStorage.removeItem("scheduleContext");
    $("#schedulingMain").addClass("d-none");
    const currentUser = getCurrentUser();
    openSetupModal(currentUser);
}

function doLogout() {
    Swal.fire({
        title: "Are you sure you want to log out?",
        showCancelButton: true,
        confirmButtonText: "Yes, log out",
        cancelButtonText: "Cancel"
    }).then(function (result) {
        if (result.isConfirmed) {
            clearCurrentUser();
            window.location.href = "Login.html";
        }
    });
}

function loadMovieLibrary() {
    showMovieLoading();
    ajaxCall("GET", "/movies/from-mapi", null, onMoviesLoaded, onMoviesError);
}

function showMovieLoading() {
    $("#movieLoadingState").removeClass("d-none");
    $("#movieErrorState").addClass("d-none");
    $("#movieList").empty();
    $("#movieCount").text("");
}

function onMoviesLoaded(movies) {
    $("#movieLoadingState").addClass("d-none");

    const sortedMovies = sortMoviesByReleaseDate(movies);
    allMovies = sortedMovies;

    renderMovieList(allMovies);
    bindSearchHandler();
}

function sortMoviesByReleaseDate(movies) {
    const moviesCopy = movies.slice();
    moviesCopy.sort(function (a, b) {
        const dateA = a.releaseDate || "";
        const dateB = b.releaseDate || "";
        if (dateA === "" && dateB === "") return 0;
        if (dateA === "") return 1;
        if (dateB === "") return -1;
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        return 0;
    });
    return moviesCopy;
}

function renderMovieList(movies) {
    const container = $("#movieList");
    container.empty();

    if (movies.length === 0) {
        container.html('<div class="movie-error">No movies match your search</div>');
        $("#movieCount").text("");
        return;
    }

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const cardHtml = buildMovieCardHtml(movie);
        container.append(cardHtml);
    }

    $("#movieCount").text(movies.length + " movies");
    bindMovieCardClicks();
}

function buildMovieCardHtml(movie) {
    const lengthText = movie.length > 0 ? movie.length + " min" : "";
    const genreText = movie.genre || "Other";
    const metaParts = [];
    if (lengthText) metaParts.push(lengthText);
    metaParts.push(genreText);
    const meta = metaParts.join(" · ");

    return '<div class="movie-card" data-edi="' + escapeHtml(movie.edi) + '">' +
                '<div class="movie-card-title">' + escapeHtml(movie.title) + '</div>' +
                '<div class="movie-card-meta">' + escapeHtml(meta) + '</div>' +
            '</div>';
}

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function bindMovieCardClicks() {
    $("#movieList").off("click", ".movie-card");
    $("#movieList").on("click", ".movie-card", function () {
        var clickedEdi = $(this).attr("data-edi");
        selectMovie(clickedEdi);
    });
}

function selectMovie(edi) {
    $(".movie-card").removeClass("selected");
    $('.movie-card[data-edi="' + edi + '"]').addClass("selected");
    selectedMovieEdi = edi;
}

function bindSearchHandler() {
    $("#inputMovieSearch").off("input");
    $("#inputMovieSearch").on("input", function () {
        const searchTerm = $(this).val().toLowerCase().trim();
        const filtered = filterMoviesBySearch(allMovies, searchTerm);
        renderMovieList(filtered);
    });
}

function filterMoviesBySearch(movies, searchTerm) {
    if (searchTerm === "") return movies;

    const filtered = [];
    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const titleMatch = movie.title && movie.title.toLowerCase().indexOf(searchTerm) !== -1;
        const originalMatch = movie.originalName && movie.originalName.toLowerCase().indexOf(searchTerm) !== -1;
        if (titleMatch || originalMatch) {
            filtered.push(movie);
        }
    }
    return filtered;
}

function onMoviesError() {
    $("#movieLoadingState").addClass("d-none");
    $("#movieErrorState").removeClass("d-none").text("Could not load movies. Please refresh the page.");
}

function doPredict() {
    hidePredictionError();
    $("#predictionResult").addClass("d-none");

    if (!selectedMovieEdi) {
        showPredictionError("Please select a movie from the library first.");
        return;
    }

    var selectedCard = $(".predict-day-card.selected");
    if (selectedCard.length === 0) {
        showPredictionError("Please choose a day.");
        return;
    }
    var dateValue = selectedCard.attr("data-date");
    var timeValue = $("#predictTime").val();

    if (!timeValue) {
        showPredictionError("Please choose a time.");
        return;
    }

    var rawContext = sessionStorage.getItem("scheduleContext");
    if (!rawContext) {
        showPredictionError("Schedule context is missing. Please re-open the page.");
        return;
    }
    var context = JSON.parse(rawContext);

    var slotIso = dateValue + "T" + timeValue + ":00";

    var requestBody = {
        movieEdi: String(selectedMovieEdi),
        venueId: context.venueId,
        slotDateTime: slotIso
    };

    $("#btnPredict").prop("disabled", true).html('<i class="fa-solid fa-spinner fa-spin me-2"></i>Predicting...');

    ajaxCall("POST", "/Prediction/predict-slot", requestBody, onPredictionSuccess, onPredictionError);
}

function onPredictionSuccess(result) {
    resetPredictButton();

    if (!result || typeof result.occupancy !== "number") {
        showPredictionError("Unexpected response from the server.");
        return;
    }

    var percentValue = Math.round(result.occupancy * 100);
    $("#predictPercent").text(percentValue + "%");
    $("#predictAttendees").text(result.estimatedAttendees);
    $("#predictCapacity").text(result.capacity);
    $("#predictProgress").css("width", percentValue + "%").attr("aria-valuenow", percentValue);

    var selectedMovie = findMovieByEdi(selectedMovieEdi);
    var movieName = selectedMovie ? selectedMovie.title : "(unknown)";
    $("#predictMovieName").text(movieName);

    renderPredictionFactors(result);
    renderPredictionSuggestions(result);

    $("#predictionResult").removeClass("d-none");
}

function renderPredictionSuggestions(result) {
    var list = $("#predictSuggestions");
    var wrap = $("#predictSuggestionsWrap");
    list.empty();

    var suggestions = result.suggestions || [];
    if (suggestions.length === 0) {
        wrap.addClass("d-none");
        return;
    }

    for (var i = 0; i < suggestions.length; i++) {
        var s = suggestions[i];
        var iconClass = iconForSuggestionType(s.type);
        var deltaPct = (s.delta * 100).toFixed(1);
        var newPct = Math.round(s.newOccupancy * 100);
        var row = '<li class="suggestion-row">' +
                    '<span class="suggestion-icon"><i class="' + iconClass + '"></i></span>' +
                    '<span class="suggestion-text">' + escapeHtml(s.description) + '</span>' +
                    '<span class="suggestion-delta">+' + deltaPct + ' pts <span class="suggestion-target">→ ' + newPct + '%</span></span>' +
                  '</li>';
        list.append(row);
    }
    wrap.removeClass("d-none");
}

function iconForSuggestionType(type) {
    if (type === "venue") return "fa-solid fa-couch";
    if (type === "time") return "fa-regular fa-clock";
    if (type === "day") return "fa-regular fa-calendar";
    return "fa-solid fa-lightbulb";
}

function renderPredictionFactors(result) {
    var baseRate = typeof result.baseRate === "number" ? result.baseRate : 0;
    $("#predictBaseRate").text(Math.round(baseRate * 100) + "%");

    var list = $("#predictFactors");
    list.empty();

    var contributions = result.topContributions || [];
    if (contributions.length === 0) {
        list.append('<li class="factor-empty text-muted small">No individual feature stood out for this prediction.</li>');
        return;
    }

    for (var i = 0; i < contributions.length; i++) {
        var item = contributions[i];
        var label = item.label || item.featureName;
        var pct = item.contribution * 100;
        var signClass = pct >= 0 ? "factor-positive" : "factor-negative";
        var signSymbol = pct >= 0 ? "+" : "−";
        var pctText = signSymbol + Math.abs(pct).toFixed(1) + " pts";

        var row = '<li class="factor-row">' +
                    '<span class="factor-label">' + escapeHtml(label) + '</span>' +
                    '<span class="factor-value ' + signClass + '">' + pctText + '</span>' +
                  '</li>';
        list.append(row);
    }
}

function onPredictionError(xhr) {
    resetPredictButton();
    console.error("Prediction request failed", xhr);

    var status = xhr ? xhr.status : 0;
    var statusText = xhr ? xhr.statusText : "";
    var body = xhr ? xhr.responseText : "";

    var detail = "";
    if (body) {
        try {
            var parsed = JSON.parse(body);
            if (parsed) {
                var pieces = [];
                if (parsed.title) pieces.push(parsed.title);
                if (parsed.message) pieces.push(parsed.message);
                if (parsed.detail) pieces.push(parsed.detail);
                if (parsed.errors) {
                    for (var key in parsed.errors) {
                        if (parsed.errors.hasOwnProperty(key)) {
                            var errVal = parsed.errors[key];
                            var errText = Array.isArray(errVal) ? errVal.join(", ") : String(errVal);
                            pieces.push(key + ": " + errText);
                        }
                    }
                }
                detail = pieces.length > 0 ? pieces.join(" | ") : JSON.stringify(parsed).substring(0, 300);
            }
        } catch (e) {
            var stripped = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            detail = stripped.substring(0, 300);
        }
    }

    var fullMessage = "Prediction failed (HTTP " + status;
    if (statusText) fullMessage += " " + statusText;
    fullMessage += ")";
    if (detail) fullMessage += ": " + detail;

    showPredictionError(fullMessage);
}

function resetPredictButton() {
    $("#btnPredict").prop("disabled", false).html('<i class="fa-solid fa-chart-line me-2"></i>Predict Occupancy');
}

function findMovieByEdi(edi) {
    for (var i = 0; i < allMovies.length; i++) {
        if (allMovies[i].edi === edi) return allMovies[i];
    }
    return null;
}

function showPredictionError(message) {
    $("#predictionError").removeClass("d-none").text(message);
}

function hidePredictionError() {
    $("#predictionError").addClass("d-none").text("");
}
