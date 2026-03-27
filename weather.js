const form = document.getElementById("form");
const countrySelect = document.getElementById("countrySelect");
const stateSelect = document.getElementById("stateSelect");
const citySelect = document.getElementById("citySelect");
const formStatus = document.getElementById("formStatus");

const report = document.getElementById("report");
const weather = document.getElementById("weather");
const temp = document.getElementById("temp");
const wind = document.getElementById("wind");
const logo = document.getElementById("logo1");
const box = document.getElementById("box1");
const p2 = document.getElementById("cName");
const t1 = document.getElementById("t1");
const wi1 = document.getElementById("wi1");
const cityName = document.getElementById("cN1");
const t2 = document.getElementById("t2");
const wi2 = document.getElementById("wi2");
const t3 = document.getElementById("t3");
const wi3 = document.getElementById("wi3");
const fp = document.getElementById("fn");
const rp = document.getElementById("f1");
const flag = document.getElementById("flag");
const refreshWrap = document.getElementById("refreshWrap");
const refreshBtn = document.getElementById("refreshBtn");
const chartWrap = document.getElementById("chartWrap");
const weatherChartCanvas = document.getElementById("weatherChart");
const chartTitle = document.getElementById("chartTitle");
const metricToggle = document.getElementById("metricToggle");
const unitToggle = document.getElementById("unitToggle");

let weatherChart = null;
let latestWeatherData = null;
let activeMetric = "temperature";
let activeUnit = "C";
const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function roundToTwo(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }

    return Math.round(value * 100) / 100;
}

function parseNumericValue(value) {
    if (typeof value === "number" && !Number.isNaN(value)) {
        return roundToTwo(value);
    }

    if (typeof value !== "string") {
        return null;
    }

    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) {
        return null;
    }

    return roundToTwo(Number(match[0]));
}

function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "N/A";
    }

    return numberFormatter.format(roundToTwo(value));
}

function toFahrenheit(celsius) {
    return roundToTwo((celsius * 9) / 5 + 32);
}

function convertTemperature(value, unit) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return null;
    }

    return unit === "F" ? toFahrenheit(value) : roundToTwo(value);
}

function temperatureUnitLabel(unit) {
    return unit === "F" ? "F" : "C";
}

function formatTemperatureValue(value, unit) {
    const converted = convertTemperature(value, unit);
    if (converted === null) {
        return "N/A";
    }

    return `${formatNumber(converted)} ${temperatureUnitLabel(unit)}`;
}

function formatTemperatureRange(minValue, maxValue, unit) {
    const min = convertTemperature(minValue, unit);
    const max = convertTemperature(maxValue, unit);

    if (min === null && max === null) {
        return "N/A";
    }

    if (min === null) {
        return formatTemperatureValue(maxValue, unit);
    }

    if (max === null) {
        return formatTemperatureValue(minValue, unit);
    }

    return `${formatNumber(min)} ${temperatureUnitLabel(unit)} to ${formatNumber(max)} ${temperatureUnitLabel(unit)}`;
}

function getCurrentTempValue(data) {
    const numeric = parseNumericValue(data.current?.temperatureValue);
    if (numeric !== null) {
        return numeric;
    }

    return parseNumericValue(data.current?.temperature);
}

function getCurrentWindValue(data) {
    const numeric = parseNumericValue(data.current?.windValue);
    if (numeric !== null) {
        return numeric;
    }

    return parseNumericValue(data.current?.wind);
}

function getForecastMinTempValue(day) {
    const numeric = parseNumericValue(day?.minTemperatureValue);
    if (numeric !== null) {
        return numeric;
    }

    return null;
}

function getForecastMaxTempValue(day) {
    const numeric = parseNumericValue(day?.maxTemperatureValue);
    if (numeric !== null) {
        return numeric;
    }

    return null;
}

function getForecastWindValue(day) {
    const numeric = parseNumericValue(day?.windValue);
    if (numeric !== null) {
        return numeric;
    }

    return parseNumericValue(day?.wind);
}

function buildChartModel(data) {
    const forecast = Array.isArray(data.forecast) ? data.forecast : [];
    const labels = ["Now", "Day 1", "Day 2", "Day 3"];

    if (activeMetric === "wind") {
        const series = [
            getCurrentWindValue(data),
            getForecastWindValue(forecast[0]),
            getForecastWindValue(forecast[1]),
            getForecastWindValue(forecast[2])
        ];

        return {
            title: "Wind Trend",
            yUnit: "km/h",
            datasets: [
                {
                    label: "Wind (km/h)",
                    data: series,
                    borderColor: "#006e8a",
                    backgroundColor: "rgba(0, 110, 138, 0.18)",
                    borderWidth: 3,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    spanGaps: true,
                    fill: true
                }
            ],
            labels
        };
    }

    const currentTemp = getCurrentTempValue(data);
    const minSeries = [
        convertTemperature(currentTemp, activeUnit),
        convertTemperature(getForecastMinTempValue(forecast[0]), activeUnit),
        convertTemperature(getForecastMinTempValue(forecast[1]), activeUnit),
        convertTemperature(getForecastMinTempValue(forecast[2]), activeUnit)
    ];
    const maxSeries = [
        convertTemperature(currentTemp, activeUnit),
        convertTemperature(getForecastMaxTempValue(forecast[0]), activeUnit),
        convertTemperature(getForecastMaxTempValue(forecast[1]), activeUnit),
        convertTemperature(getForecastMaxTempValue(forecast[2]), activeUnit)
    ];
    const unitLabel = temperatureUnitLabel(activeUnit);

    return {
        title: `Temperature Trend (${unitLabel})`,
        yUnit: unitLabel,
        datasets: [
            {
                label: `Min Temp (${unitLabel})`,
                data: minSeries,
                borderColor: "#1f6fff",
                backgroundColor: "rgba(31, 111, 255, 0.16)",
                borderWidth: 3,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true,
                fill: false
            },
            {
                label: `Max Temp (${unitLabel})`,
                data: maxSeries,
                borderColor: "#ff6f1f",
                backgroundColor: "rgba(255, 111, 31, 0.12)",
                borderWidth: 3,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true,
                fill: true
            }
        ],
        labels
    };
}

function renderWeatherChart(data) {
    if (typeof Chart === "undefined" || !weatherChartCanvas || !chartWrap) {
        if (chartWrap) {
            chartWrap.style.display = "none";
        }
        return;
    }

    const chartModel = buildChartModel(data);
    const hasAnyValue = chartModel.datasets.some((dataset) =>
        Array.isArray(dataset.data) && dataset.data.some((value) => typeof value === "number")
    );

    if (!hasAnyValue) {
        chartWrap.style.display = "none";
        if (weatherChart) {
            weatherChart.destroy();
            weatherChart = null;
        }
        return;
    }

    chartWrap.style.display = "block";
    if (chartTitle) {
        chartTitle.innerText = chartModel.title;
    }

    if (weatherChart) {
        weatherChart.destroy();
    }

    weatherChart = new Chart(weatherChartCanvas, {
        type: "line",
        data: {
            labels: chartModel.labels,
            datasets: chartModel.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const value = context.parsed?.y;
                            if (typeof value !== "number") {
                                return `${context.dataset.label}: N/A`;
                            }
                            return `${context.dataset.label}: ${formatNumber(value)} ${chartModel.yUnit}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback(value) {
                            return `${formatNumber(Number(value))} ${chartModel.yUnit}`;
                        }
                    }
                }
            }
        }
    });
}

function updateTemperatureTextValues(data) {
    const forecast = Array.isArray(data.forecast) ? data.forecast : [];

    temp.innerText = formatTemperatureValue(getCurrentTempValue(data), activeUnit);

    const day1 = forecast[0] || {};
    const day2 = forecast[1] || {};
    const day3 = forecast[2] || {};

    t1.innerText = formatTemperatureRange(getForecastMinTempValue(day1), getForecastMaxTempValue(day1), activeUnit);
    t2.innerText = formatTemperatureRange(getForecastMinTempValue(day2), getForecastMaxTempValue(day2), activeUnit);
    t3.innerText = formatTemperatureRange(getForecastMinTempValue(day3), getForecastMaxTempValue(day3), activeUnit);
}

function setStatus(message, isError = false) {
    formStatus.innerText = message;
    formStatus.style.color = isError ? "#ff4d4f" : "#ffffff";
}

function populateCountryOptions(countries) {
    countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country.country;
        option.innerText = country.country;
        option.dataset.iso2 = country.iso2;
        countrySelect.appendChild(option);
    });
}

function resetCityOptions() {
    citySelect.innerHTML = "<option value=\"\">Select city</option>";
}

function resetStateOptions() {
    stateSelect.innerHTML = "<option value=\"\">All states</option>";
}

function removeSelectOption(selectElement, value) {
    const options = Array.from(selectElement.options);
    const target = options.find((option) => option.value === value);
    if (target) {
        target.remove();
    }
}

async function loadCountries() {
    setStatus("Loading countries...");

    const response = await fetch("/api/countries");
    if (!response.ok) {
        throw new Error("Unable to load countries");
    }

    const payload = await response.json();
    const countries = Array.isArray(payload.countries) ? payload.countries : [];

    populateCountryOptions(countries);
    setStatus("Select a country and city, then click Get Details.");
}

async function loadCities(country) {
    resetCityOptions();
    setStatus("Loading cities...");

    const selectedState = stateSelect.value;
    const query = new URLSearchParams({ country });
    if (selectedState) {
        query.set("state", selectedState);
    }

    const response = await fetch(`/api/cities?${query.toString()}`);

    if (!response.ok) {
        throw new Error("Unable to load cities");
    }

    const payload = await response.json();
    const cities = Array.isArray(payload.cities) ? payload.cities : [];

    cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.innerText = city;
        citySelect.appendChild(option);
    });

    if (selectedState) {
        if (cities.length === 0) {
            removeSelectOption(stateSelect, selectedState);
            stateSelect.value = "";
        }
        setStatus(`Loaded ${cities.length} cities for ${selectedState}, ${payload.country}.`);
    } else {
        setStatus(`Loaded ${cities.length} cities for ${payload.country}.`);
    }
}

async function loadStates(country) {
    resetStateOptions();
    setStatus("Loading states...");

    const query = new URLSearchParams({ country });
    const response = await fetch(`/api/states?${query.toString()}`);

    if (!response.ok) {
        throw new Error("Unable to load states");
    }

    const payload = await response.json();
    const states = Array.isArray(payload.states) ? payload.states : [];

    states.forEach((stateItem) => {
        const stateName = typeof stateItem === "string" ? stateItem : stateItem?.name;
        if (!stateName) {
            return;
        }

        const option = document.createElement("option");
        option.value = stateName;
        option.innerText = stateName;
        stateSelect.appendChild(option);
    });
}

function renderWeatherReport(data) {
    latestWeatherData = data;
    const forecast = Array.isArray(data.forecast) ? data.forecast : [];
    const resolvedState = (data.state || "").trim();

    flag.src = `https://flagsapi.com/${data.countryCode}/flat/64.png`;
    flag.style.display = "inline";

    logo.style.display = "none";
    box.style.display = "none";
    cityName.style.display = "flex";

    p2.innerText = resolvedState ? `${data.city}, ${resolvedState}` : data.city;
    report.style.display = "flex";
    weather.innerText = data.current?.description || "N/A";
    wind.innerText = data.current?.wind || "N/A";

    fp.style.display = "inline";
    rp.style.display = "block";
    refreshWrap.style.display = "flex";

    const day1 = forecast[0] || {};
    const day2 = forecast[1] || {};
    const day3 = forecast[2] || {};

    wi1.innerText = day1.wind || "N/A";
    wi2.innerText = day2.wind || "N/A";
    wi3.innerText = day3.wind || "N/A";

    updateTemperatureTextValues(data);

    renderWeatherChart(data);
}

if (metricToggle) {
    metricToggle.addEventListener("change", () => {
        activeMetric = metricToggle.value === "wind" ? "wind" : "temperature";
        if (latestWeatherData) {
            renderWeatherChart(latestWeatherData);
        }
    });
}

if (unitToggle) {
    unitToggle.addEventListener("change", () => {
        activeUnit = unitToggle.value === "F" ? "F" : "C";
        if (latestWeatherData) {
            updateTemperatureTextValues(latestWeatherData);
            renderWeatherChart(latestWeatherData);
        }
    });
}

refreshBtn.addEventListener("click", () => {
    if (weatherChart) {
        weatherChart.destroy();
        weatherChart = null;
    }
    window.location.reload();
});

countrySelect.addEventListener("change", async () => {
    const selectedCountry = countrySelect.value;
    resetStateOptions();
    if (!selectedCountry) {
        resetCityOptions();
        return;
    }

    try {
        await loadStates(selectedCountry);
        await loadCities(selectedCountry);
    } catch (error) {
        setStatus(error.message, true);
    }
});

stateSelect.addEventListener("change", async () => {
    const selectedCountry = countrySelect.value;
    if (!selectedCountry) {
        return;
    }

    try {
        await loadCities(selectedCountry);
    } catch (error) {
        setStatus(error.message, true);
    }
});

form.addEventListener("submit", async (evt) => {
    evt.preventDefault();

    const country = countrySelect.value;
    const state = stateSelect.value;
    const city = citySelect.value;

    if (!country || !city) {
        setStatus("Please select both country and city.", true);
        return;
    }

    try {
        setStatus("Fetching and saving weather...");

        const response = await fetch("/api/weather/fetch-and-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, state, city })
        });

        const payload = await response.json();

        if (!response.ok) {
            if (payload?.removed?.city) {
                removeSelectOption(citySelect, payload.removed.city);
            }

            if (payload?.removed?.countryRemoved && payload?.removed?.country) {
                removeSelectOption(countrySelect, payload.removed.country);
                countrySelect.value = "";
                resetStateOptions();
                resetCityOptions();
            }

            throw new Error(payload.error || "Failed to fetch weather");
        }

        renderWeatherReport(payload);
        setStatus("Weather fetched and saved successfully.");
    } catch (error) {
        setStatus(error.message, true);
    }
});

loadCountries().catch((error) => {
    setStatus(error.message, true);
});





