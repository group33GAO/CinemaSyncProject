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

    loadMovieLibrary();
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
        const clickedEdi = $(this).data("edi");
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
