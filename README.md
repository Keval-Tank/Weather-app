# Weather App (Country + City + MongoDB)

This app now works with:

- Country select
- City select (first 100 cities per selected country)
- City weather fetch using Open-Meteo APIs
- MongoDB persistence (one record per country-city-day)

## APIs Used

- Country and city source (seed): `https://countriesnow.space/api/v0.1/countries`
- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Weather: `https://api.open-meteo.com/v1/forecast`
- Flag image: `https://flagsapi.com/{ISO2}/flat/64.png`

## Project Structure

- `index.html`, `weather.css`, `weather.js` -> frontend
- `server/` -> Express + MongoDB backend
- `docker-compose.yml` -> MongoDB container

## Run Locally

1. Start MongoDB:

  `docker compose up -d`

2. Install backend dependencies:

  `cd server && npm install`

3. Start backend server:

  `npm run dev`

4. Open app:

  `http://localhost:3000`

## CORS Configuration

Backend CORS is configured via `server/.env`:

- `CORS_ORIGIN=http://localhost:3000`

This ensures browser requests are accepted only from your frontend origin.
