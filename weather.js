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
    const forecast = Array.isArray(data.forecast) ? data.forecast : [];

    flag.src = `https://flagsapi.com/${data.countryCode}/flat/64.png`;
    flag.style.display = "inline";

    logo.style.display = "none";
    box.style.display = "none";
    cityName.style.display = "flex";

    p2.innerText = `${data.city}, ${data.country}`;
    report.style.display = "flex";
    weather.innerText = data.current?.description || "N/A";
    temp.innerText = data.current?.temperature || "N/A";
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

    t1.innerText = day1.temperature || "N/A";
    t2.innerText = day2.temperature || "N/A";
    t3.innerText = day3.temperature || "N/A";
}

refreshBtn.addEventListener("click", () => {
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
            body: JSON.stringify({ country, city })
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





