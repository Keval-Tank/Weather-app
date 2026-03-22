const COUNTRIES_NOW_URL = "https://countriesnow.space/api/v0.1/countries";
const COUNTRIES_NOW_STATES_URL = "https://countriesnow.space/api/v0.1/countries/states";
const COUNTRIES_NOW_STATE_CITIES_URL = "https://countriesnow.space/api/v0.1/countries/state/cities";

async function postCountriesNow(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Countries API failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.msg || "Countries API returned error");
  }

  return payload;
}

export async function fetchCountriesNow() {
  const response = await fetch(COUNTRIES_NOW_URL);
  if (!response.ok) {
    throw new Error(`Countries API failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.msg || "Countries API returned error");
  }

  return payload.data;
}

export async function fetchStatesForCountry(country) {
  const payload = await postCountriesNow(COUNTRIES_NOW_STATES_URL, { country });
  const states = payload?.data?.states;

  if (!Array.isArray(states)) {
    return [];
  }

  return states
    .map((item) => {
      if (typeof item === "string") {
        return { name: item, stateCode: null };
      }

      return {
        name: item?.name || "",
        stateCode: item?.state_code || null
      };
    })
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCitiesForCountryState(country, state) {
  const payload = await postCountriesNow(COUNTRIES_NOW_STATE_CITIES_URL, {
    country,
    state
  });

  const cities = Array.isArray(payload?.data) ? payload.data : [];
  return cities.filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function seedCountriesIfEmpty(db) {
  const count = await db.collection("countries").countDocuments();
  if (count > 0) {
    return { inserted: 0, skipped: count };
  }

  const countries = await fetchCountriesNow();
  const docs = countries
    .filter((item) => item.country && item.iso2)
    .map((item) => {
      const cities = Array.isArray(item.cities) ? item.cities.filter(Boolean) : [];
      return {
        country: item.country,
        iso2: item.iso2,
        iso3: item.iso3 || null,
        cities,
        citiesCount: cities.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

  if (docs.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  await db.collection("countries").insertMany(docs, { ordered: false });
  return { inserted: docs.length, skipped: 0 };
}
