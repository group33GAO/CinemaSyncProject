/* ============================================================
   CinemaSync Demo - Manpower Optimization
   Local formula that computes staff count + role breakdown
   based on the 7 inputs in the form.
   ============================================================ */

$(document).ready(function () {
    $("#navBranchDisplay").text(DEMO_BRANCH.branchName);

    $("#btnCalcManpower").on("click", doCalcManpower);
    $("#btnResetManpower").on("click", doResetManpower);
    $("#optPreSales").on("input", onSliderInput);
    $(".btn-logout").on("click", onLogoutClick);
});

function onLogoutClick(e) {
    e.preventDefault();
    Swal.fire({
        title: "להתנתק מהמערכת?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "כן, התנתק",
        cancelButtonText: "ביטול",
        confirmButtonColor: "#dc3545"
    }).then(function (result) {
        if (result.isConfirmed) {
            sessionStorage.clear();
            window.location.href = "index.html";
        }
    });
}

function onSliderInput() {
    var val = parseInt($(this).val(), 10);
    $("#sliderValue").text(val + "%");
}

function doCalcManpower() {
    var inputs = {
        dayType: $("#optDayType").val(),
        shift: $("#optShift").val(),
        weather: $("#optWeather").val(),
        events: $("#optEvents").val(),
        holiday: $("#optHoliday").is(":checked"),
        premiere: $("#optPremiere").is(":checked"),
        preSales: parseInt($("#optPreSales").val(), 10)
    };

    var total = computeStaffCount(inputs);
    var breakdown = computeRoleBreakdown(total);

    $("#resultStaffCount").text(total);
    $("#resSnacks").text(breakdown.snacks);
    $("#resCleaners").text(breakdown.cleaners);
    $("#resCashiers").text(breakdown.cashiers);
    $("#resScreening").text(breakdown.screening);

    $("#manpowerFormCard").addClass("d-none");
    $("#manpowerResults").removeClass("d-none");
}

function doResetManpower() {
    $("#manpowerResults").addClass("d-none");
    $("#manpowerFormCard").removeClass("d-none");
}

/* ============================================================
   Formula: combine the 7 inputs into a base staff count
   ============================================================ */
function computeStaffCount(inputs) {
    var base = 8; // baseline staff

    // Day type
    if (inputs.dayType === "weekend") base += 4;

    // Shift
    if (inputs.shift === "afternoon") base += 2;
    else if (inputs.shift === "night") base += 1;

    // Weather
    if (inputs.weather === "cloudy") base += 1;
    else if (inputs.weather === "rainy") base -= 2;

    // Events
    if (inputs.events === "minor") base += 2;
    else if (inputs.events === "major") base += 5;

    // Holiday
    if (inputs.holiday) base += 3;

    // Premiere
    if (inputs.premiere) base += 3;

    // Pre-sales — 0-100% maps to 0-6 extra staff
    base += Math.round((inputs.preSales / 100) * 6);

    // Reasonable bounds
    if (base < 4) base = 4;
    if (base > 28) base = 28;

    return base;
}

/* ============================================================
   Role split: distribute the total across 4 roles
   ============================================================ */
function computeRoleBreakdown(total) {
    // Percentages (sum 100)
    var pctSnacks = 0.30;
    var pctCashiers = 0.25;
    var pctScreening = 0.25;
    var pctCleaners = 0.20;

    var snacks = Math.round(total * pctSnacks);
    var cashiers = Math.round(total * pctCashiers);
    var screening = Math.round(total * pctScreening);
    var cleaners = total - snacks - cashiers - screening; // remainder

    // Guarantee minimum of 1 per role
    if (snacks < 1) snacks = 1;
    if (cashiers < 1) cashiers = 1;
    if (screening < 1) screening = 1;
    if (cleaners < 1) cleaners = 1;

    return {
        snacks: snacks,
        cashiers: cashiers,
        screening: screening,
        cleaners: cleaners
    };
}
