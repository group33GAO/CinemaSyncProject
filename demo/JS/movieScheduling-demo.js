/* ============================================================
   CinemaSync Demo - Movie Scheduling
   Same UI logic as the real system, but all AJAX calls are
   replaced with synchronous reads of mock data.
   ============================================================ */

let allMovies = [];
let selectedMovieEdi = null;

$(document).ready(function () {
    const currentUser = DEMO_USER;

    loadHeader(currentUser);

    $("#btnLogout").on("click", doLogout);
    $("#btnCancelSetup").on("click", doCancel);
    $("#btnCloseModal").on("click", doCancel);
    $("#btnStartScheduling").on("click", doStartScheduling);
    $("#btnChangeContext").on("click", doChangeContext);
    $("#btnGenerateHeatmap").on("click", doGenerateHeatmap);
    $("#btnBack").on("click", function (e) { e.preventDefault(); window.location.href = "index.html"; });

    const existingContext = sessionStorage.getItem("scheduleContext");
    if (existingContext) {
        showMainScreen();
    } else {
        openSetupModal(currentUser);
    }
});

function loadHeader(user) {
    $("#hdrGreeting").text("שלום, " + user.fullName);
    $("#hdrBranch").text(DEMO_BRANCH.branchName);
}

function openSetupModal(user) {
    hideError();
    populateWeekDropdown();
    resetVenueDropdown();

    onVenuesLoaded(DEMO_VENUES);

    const modalElement = document.getElementById("scheduleSetupModal");
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function findSundayOfWeek(date) {
    const d = new Date(date.getTime());
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function formatDayDotMonth(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return day + "." + month;
}

function populateWeekDropdown() {
    const select = $("#inputWeekStart");
    select.empty();

    const today = new Date();
    const currentSunday = findSundayOfWeek(today);

    var i;
    for (i = 0; i < 13; i++) {
        const sunday = new Date(currentSunday.getTime());
        sunday.setDate(sunday.getDate() + i * 7);
        const saturday = new Date(sunday.getTime());
        saturday.setDate(saturday.getDate() + 6);

        const value = formatDateAsString(sunday);
        const rangeText = formatDayDotMonth(sunday) + "-" + formatDayDotMonth(saturday) + "." + saturday.getFullYear();

        var label;
        if (i === 0) label = "השבוע הנוכחי — " + rangeText;
        else if (i === 1) label = "השבוע הבא — " + rangeText;
        else if (i === 2) label = "בעוד שבועיים — " + rangeText;
        else label = "בעוד " + i + " שבועות — " + rangeText;

        select.append('<option value="' + value + '">' + label + '</option>');
    }
}

function resetVenueDropdown() {
    const venueSelect = $("#selectVenue");
    venueSelect.empty();
    venueSelect.append('<option value="">-- בחר אולם --</option>');
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
        showError("לא נמצאו אולמות לסניף שלך");
        return;
    }

    const sortedVenues = venues.slice().sort(function (a, b) {
        return venueSortKey(a) - venueSortKey(b);
    });

    const venueSelect = $("#selectVenue");
    let i;
    for (i = 0; i < sortedVenues.length; i++) {
        const venue = sortedVenues[i];
        const optionText = venue.venueName + " (" + venue.capacity + " מקומות, " + venue.venueType + ")";
        const optionElement = $("<option></option>").val(venue.venueId).text(optionText);
        venueSelect.append(optionElement);
    }
}

function venueSortKey(venue) {
    const name = venue.venueName || "";
    const match = name.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return venue.venueId || 0;
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
        showError("בחר שבוע");
        return;
    }

    if (!selectedVenueId) {
        showError("בחר אולם");
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
    window.location.href = "index.html";
}

function showMainScreen() {
    closeSetupModal();

    const rawContext = sessionStorage.getItem("scheduleContext");
    if (!rawContext) {
        return;
    }
    const context = JSON.parse(rawContext);

    $("#ctxWeekDisplay").text(formatWeekRangeForDisplay(context.weekStartDate));
    $("#ctxVenueDisplay").text(context.venueDisplay);
    $("#schedulingMain").removeClass("d-none");

    resetPredictionUi();
    loadMovieLibrary();
}

function resetPredictionUi() {
    $("#heatmapSection").addClass("d-none");
    $("#predictionResult").addClass("d-none");
    hidePredictionError();
}

function padTwo(num) {
    return num < 10 ? "0" + num : String(num);
}

function formatWeekRangeForDisplay(sundayIso) {
    const sunday = new Date(sundayIso + "T00:00:00");
    if (isNaN(sunday.getTime())) return sundayIso;
    const saturday = new Date(sunday.getTime());
    saturday.setDate(saturday.getDate() + 6);
    return formatDayDotMonth(sunday) + " - " + formatDayDotMonth(saturday) + "." + saturday.getFullYear();
}

function doChangeContext() {
    sessionStorage.removeItem("scheduleContext");
    $("#schedulingMain").addClass("d-none");
    openSetupModal(DEMO_USER);
}

function doLogout() {
    Swal.fire({
        title: "להתנתק מהמערכת?",
        showCancelButton: true,
        confirmButtonText: "כן, התנתק",
        cancelButtonText: "ביטול"
    }).then(function (result) {
        if (result.isConfirmed) {
            sessionStorage.clear();
            window.location.href = "index.html";
        }
    });
}

function loadMovieLibrary() {
    showMovieLoading();
    // Simulate brief load
    setTimeout(function () { onMoviesLoaded(DEMO_MOVIES); }, 250);
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
        container.html('<div class="movie-error">לא נמצאו סרטים התואמים את החיפוש</div>');
        $("#movieCount").text("");
        return;
    }

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i];
        const cardHtml = buildMovieCardHtml(movie);
        container.append(cardHtml);
    }

    $("#movieCount").text(movies.length + " סרטים");
    bindMovieCardClicks();
}

function buildMovieCardHtml(movie) {
    const lengthText = movie.length > 0 ? movie.length + " דק׳" : "";
    const genreText = translateGenresToHebrew(movie.genre);
    const metaParts = [];
    if (lengthText) metaParts.push(lengthText);
    metaParts.push(genreText);
    const meta = metaParts.join(" · ");

    return '<div class="movie-card" data-edi="' + escapeHtml(movie.edi) + '">' +
                '<div class="movie-card-title">' + escapeHtml(movie.title) + '</div>' +
                '<div class="movie-card-meta">' + escapeHtml(meta) + '</div>' +
            '</div>';
}

function translateGenresToHebrew(genreStr) {
    if (!genreStr) return "אחר";
    var parts = genreStr.split(",").map(function (g) { return g.trim(); });
    var translated = parts.map(function (g) {
        return (typeof HEBREW_GENRES !== "undefined" && HEBREW_GENRES[g]) ? HEBREW_GENRES[g] : g;
    });
    return translated.join(", ");
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

function doGenerateHeatmap() {
    hidePredictionError();
    $("#heatmapSection").addClass("d-none");
    $("#predictionResult").addClass("d-none");

    if (!selectedMovieEdi) {
        showPredictionError("בחר תחילה סרט מהספרייה.");
        return;
    }

    var rawContext = sessionStorage.getItem("scheduleContext");
    if (!rawContext) {
        showPredictionError("הקשר השיבוץ חסר. נא לפתוח את הדף מחדש.");
        return;
    }
    var context = JSON.parse(rawContext);

    $("#btnGenerateHeatmap").prop("disabled", true).html('<i class="fa-solid fa-spinner fa-spin me-2"></i>יוצר מפת שיבוץ...');

    // Simulate network latency
    setTimeout(function () {
        const result = buildMockHeatmap(selectedMovieEdi, context.venueId, context.weekStartDate);
        onHeatmapSuccess(result);
    }, 500);
}

function buildMockHeatmap(movieEdi, venueId, weekStartIso) {
    const movie = findMovieByEdi(movieEdi);
    const venue = DEMO_VENUES.find(function (v) { return v.venueId === venueId; });
    if (!movie || !venue) {
        return { movieTitle: "(לא ידוע)", capacity: 0, minTickets: 0, maxTickets: 0, cells: [] };
    }

    const weekSunday = new Date(weekStartIso + "T00:00:00");
    const hours = [10, 12, 14, 16, 18, 20, 22];

    const cells = [];
    let minT = Infinity;
    let maxT = -Infinity;

    for (let d = 0; d < 7; d++) {
        const day = d + 1; // 1=Sun ... 7=Sat (Israeli)
        const dayDate = new Date(weekSunday.getTime());
        dayDate.setDate(dayDate.getDate() + d);

        for (let h = 0; h < hours.length; h++) {
            const hour = hours[h];
            const tickets = mockPredictTickets(movie, day, hour, venue.capacity);
            const occupancy = Math.min(1, tickets / venue.capacity);

            cells.push({
                dayIndex: d,
                dateIso: formatDateAsString(dayDate),
                hour: hour,
                tickets: tickets,
                occupancy: occupancy
            });

            if (tickets < minT) minT = tickets;
            if (tickets > maxT) maxT = tickets;
        }
    }

    return {
        movieTitle: movie.title,
        capacity: venue.capacity,
        minTickets: minT === Infinity ? 0 : minT,
        maxTickets: maxT === -Infinity ? 0 : maxT,
        cells: cells
    };
}

function onHeatmapSuccess(result) {
    resetHeatmapButton();

    if (!result || !result.cells || result.cells.length === 0) {
        showPredictionError("מפת השיבוץ לא החזירה נתונים.");
        return;
    }

    $("#heatmapMovieName").text(result.movieTitle || "(לא ידוע)");
    $("#heatmapCapacity").text(result.capacity);
    $("#heatmapRange").text(result.minTickets + " – " + result.maxTickets + " כרטיסים");

    renderHeatmapGrid(result);
    $("#heatmapSection").removeClass("d-none");
}

function resetHeatmapButton() {
    $("#btnGenerateHeatmap").prop("disabled", false).html('<i class="fa-solid fa-table-cells me-2"></i>צור מפת שיבוץ שבועית');
}

function renderHeatmapGrid(result) {
    var dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    var hours = [10, 12, 14, 16, 18, 20, 22];

    var grid = $("#heatmapGrid");
    grid.empty();

    grid.append('<div class="heatmap-corner"></div>');
    for (var d = 0; d < 7; d++) {
        grid.append('<div class="heatmap-day-header">' + dayNames[d] + '</div>');
    }

    var cellsByKey = {};
    for (var i = 0; i < result.cells.length; i++) {
        var c = result.cells[i];
        cellsByKey[c.dayIndex + "_" + c.hour] = c;
    }

    var sortedByTickets = result.cells.slice().sort(function (a, b) {
        return b.tickets - a.tickets;
    });
    var rankByKey = {};
    for (var r = 0; r < Math.min(3, sortedByTickets.length); r++) {
        var topCell = sortedByTickets[r];
        rankByKey[topCell.dayIndex + "_" + topCell.hour] = r + 1;
    }

    var minT = result.minTickets;
    var maxT = result.maxTickets;

    for (var h = 0; h < hours.length; h++) {
        var hr = hours[h];
        var hrLabel = padTwo(hr) + ":00";
        grid.append('<div class="heatmap-hour-label">' + hrLabel + '</div>');

        for (var dd = 0; dd < 7; dd++) {
            var key = dd + "_" + hr;
            var cell = cellsByKey[key];
            if (!cell) {
                grid.append('<div class="heatmap-cell" style="background:#374151;">-</div>');
                continue;
            }
            var bg = colorForValue(cell.tickets, minT, maxT);
            var occPct = Math.round(cell.occupancy * 100);
            var rank = rankByKey[key];
            var rankBadge = "";
            if (rank === 1) rankBadge = '<span class="cell-rank rank-gold">★</span>';
            else if (rank === 2) rankBadge = '<span class="cell-rank rank-silver">★</span>';
            else if (rank === 3) rankBadge = '<span class="cell-rank rank-bronze">★</span>';
            var cellHtml = '<div class="heatmap-cell" ' +
                              'data-date="' + cell.dateIso + '" ' +
                              'data-hour="' + cell.hour + '" ' +
                              'style="background:' + bg + ';">' +
                              rankBadge +
                              cell.tickets +
                              '<span class="cell-sub">' + occPct + '%</span>' +
                          '</div>';
            grid.append(cellHtml);
        }
    }

    $(".heatmap-cell[data-date]").off("click").on("click", onHeatmapCellClick);
}

function colorForValue(tickets, minT, maxT) {
    if (maxT === minT) return "hsl(150, 55%, 42%)";
    var t = (tickets - minT) / (maxT - minT);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var hue = 200 - t * 80;
    var sat = 12 + t * 68;
    var light = 22 + t * 35;
    return "hsl(" + hue + ", " + sat + "%, " + light + "%)";
}

function onHeatmapCellClick() {
    var $this = $(this);
    $(".heatmap-cell").removeClass("active");
    $this.addClass("active");

    var dateValue = $this.attr("data-date");
    var hourValue = parseInt($this.attr("data-hour"), 10);
    var rawContext = sessionStorage.getItem("scheduleContext");
    if (!rawContext) return;
    var context = JSON.parse(rawContext);

    $("#predictionResult").addClass("d-none");
    hidePredictionError();

    // Simulate brief SHAP computation latency
    setTimeout(function () {
        const result = buildMockSlotPrediction(selectedMovieEdi, context.venueId, dateValue, hourValue);
        onPredictionSuccess(result);
    }, 300);
}

function buildMockSlotPrediction(movieEdi, venueId, dateIso, hour) {
    const movie = findMovieByEdi(movieEdi);
    const venue = DEMO_VENUES.find(function (v) { return v.venueId === venueId; });
    if (!movie || !venue) {
        return { occupancy: 0, estimatedAttendees: 0, capacity: 0, baseTickets: 0, topContributions: [] };
    }

    const date = new Date(dateIso + "T00:00:00");
    const day = date.getDay() + 1; // 1=Sun ... 7=Sat
    const tickets = mockPredictTickets(movie, day, hour, venue.capacity);
    const factors = mockShapFactors(movie, day, hour, venue.capacity);

    return {
        occupancy: Math.min(1, tickets / venue.capacity),
        estimatedAttendees: tickets,
        capacity: venue.capacity,
        baseTickets: MOCK_BASE_TICKETS,
        topContributions: factors
    };
}

function onPredictionSuccess(result) {
    if (!result || typeof result.occupancy !== "number") {
        showPredictionError("תגובה לא צפויה מהשרת.");
        return;
    }

    var percentValue = Math.round(result.occupancy * 100);
    $("#predictPercent").text(percentValue + "%");
    $("#predictAttendees").text(result.estimatedAttendees);
    $("#predictCapacity").text(result.capacity);
    $("#predictProgress").css("width", percentValue + "%").attr("aria-valuenow", percentValue);

    var selectedMovie = findMovieByEdi(selectedMovieEdi);
    var movieName = selectedMovie ? selectedMovie.title : "(לא ידוע)";
    $("#predictMovieName").text(movieName);

    renderPredictionFactors(result);

    $("#predictionResult").removeClass("d-none");
}

function renderPredictionFactors(result) {
    var baseTickets = typeof result.baseTickets === "number" ? result.baseTickets : 0;
    $("#predictBaseTickets").text(baseTickets.toFixed(1));

    var list = $("#predictFactors");
    list.empty();

    var contributions = result.topContributions || [];
    if (contributions.length === 0) {
        list.append('<li class="factor-empty text-muted small">לא הוחזרו גורמים.</li>');
        return;
    }

    for (var i = 0; i < contributions.length; i++) {
        var item = contributions[i];
        var label = item.label || item.feature;
        var shap = item.shapValue;
        var signClass = shap >= 0 ? "factor-positive" : "factor-negative";
        var signSymbol = shap >= 0 ? "+" : "−";
        var valText = signSymbol + Math.abs(shap).toFixed(2) + " כרטיסים";

        var explanationText = item.explanation || "";
        var explanationHtml = explanationText
            ? '<div class="factor-explanation">' + escapeHtml(explanationText) + '</div>'
            : '';
        var row = '<li class="factor-row">' +
                    '<div class="factor-main">' +
                      '<span class="factor-label">' + escapeHtml(label) + '</span>' +
                      '<span class="factor-value ' + signClass + '">' + valText + '</span>' +
                    '</div>' +
                    explanationHtml +
                  '</li>';
        list.append(row);
    }
}

function findMovieByEdi(edi) {
    for (var i = 0; i < allMovies.length; i++) {
        if (allMovies[i].edi === edi) return allMovies[i];
    }
    // Fall back to DEMO_MOVIES if not yet loaded into allMovies
    for (var j = 0; j < DEMO_MOVIES.length; j++) {
        if (DEMO_MOVIES[j].edi === edi) return DEMO_MOVIES[j];
    }
    return null;
}

function showPredictionError(message) {
    $("#predictionError").removeClass("d-none").text(message);
}

function hidePredictionError() {
    $("#predictionError").addClass("d-none").text("");
}
