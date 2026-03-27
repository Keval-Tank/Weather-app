import { describeWeatherCode } from "./weatherCodes.js";

function roundNumber(value) {
  if (typeof value !== "number") {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function celsiusText(value) {
  return value === null ? "N/A" : `${value} C`;
}

function kmhText(value) {
  return value === null ? "N/A" : `${value} km/h`;
}

async function geocodeCity(city, countryCode) {
  const query = new URLSearchParams({
    name: city,
    count: "10",
    language: "en",
    format: "json"
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Geocoding API failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  const code = String(countryCode || "").toUpperCase();
  const preferred = results.find((entry) => String(entry.country_code || "").toUpperCase() === code);

  return preferred || results[0] || null;
}

async function getWeatherByCoordinates(latitude, longitude) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,wind_speed_10m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code",
    forecast_days: "4",
    timezone: "auto"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Weather API failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchCityWeather({ country, countryCode, city, state }) {
  const location = await geocodeCity(city, countryCode);
  if (!location) {
    throw new Error(`Unable to geocode city '${city}'`);
  }

  const resolvedState = location.admin1 || location.state || state || null;

  const weatherData = await getWeatherByCoordinates(location.latitude, location.longitude);
  const current = weatherData.current || {};
  const daily = weatherData.daily || {};

  const currentTemperature = roundNumber(current.temperature_2m);
  const currentWind = roundNumber(current.wind_speed_10m);
  const currentCode = typeof current.weather_code === "number" ? current.weather_code : null;

  const days = Array.isArray(daily.time) ? daily.time : [];
  const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const winds = Array.isArray(daily.wind_speed_10m_max) ? daily.wind_speed_10m_max : [];
  const codes = Array.isArray(daily.weather_code) ? daily.weather_code : [];

  const forecast = days.slice(1, 4).map((day, index) => {
    const dataIndex = index + 1;
    const max = roundNumber(maxTemps[dataIndex]);
    const min = roundNumber(minTemps[dataIndex]);
    const wind = roundNumber(winds[dataIndex]);
    const weatherCode = typeof codes[dataIndex] === "number" ? codes[dataIndex] : null;

    return {
      day,
      minTemperatureValue: min,
      maxTemperatureValue: max,
      windValue: wind,
      temperature: min === null && max === null ? "N/A" : `${celsiusText(min)} to ${celsiusText(max)}`,
      wind: kmhText(wind),
      description: describeWeatherCode(weatherCode)
    };
  });

  return {
    country,
    countryCode,
    city,
    state: resolvedState,
    location: {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      state: resolvedState,
      country: location.country || country,
      timezone: weatherData.timezone || null
    },
    current: {
      temperatureValue: currentTemperature,
      windValue: currentWind,
      temperature: celsiusText(currentTemperature),
      wind: kmhText(currentWind),
      description: describeWeatherCode(currentCode)
    },
    forecast,
    raw: {
      current,
      daily
    }
  };
}
