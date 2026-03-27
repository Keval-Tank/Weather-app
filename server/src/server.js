import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import { connectToDatabase, getDb } from "./db.js";
import { fetchCitiesForCountryState, fetchStatesForCountry, seedCountriesIfEmpty } from "./countryService.js";
import { fetchCityWeather } from "./weatherService.js";
import { toDateKey } from "./dateUtils.js";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "weather_app";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/countries", async (_req, res) => {
  try {
    const db = getDb();
    const countries = await db
      .collection("countries")
      .find({ citiesCount: { $gt: 0 } }, { projection: { _id: 0, country: 1, iso2: 1, citiesCount: 1 } })
      .sort({ country: 1 })
      .toArray();

    res.json({ countries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cities", async (req, res) => {
  try {
    const country = String(req.query.country || "").trim();
    const state = String(req.query.state || "").trim();
    if (!country) {
      return res.status(400).json({ error: "country query parameter is required" });
    }

    const db = getDb();
    const record = await db.collection("countries").findOne(
      { country: { $regex: `^${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { projection: { _id: 0, country: 1, iso2: 1, cities: 1 } }
    );

    if (!record) {
      return res.status(404).json({ error: `Country '${country}' not found` });
    }

    let cities = Array.isArray(record.cities) ? record.cities : [];

    if (state) {
      try {
        cities = await fetchCitiesForCountryState(record.country, state);
      } catch {
        cities = [];
      }
    }

    res.json({ country: record.country, iso2: record.iso2, state: state || null, cities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/states", async (req, res) => {
  try {
    const country = String(req.query.country || "").trim();
    if (!country) {
      return res.status(400).json({ error: "country query parameter is required" });
    }

    const db = getDb();
    const record = await db.collection("countries").findOne(
      { country: { $regex: `^${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { projection: { _id: 0, country: 1, iso2: 1 } }
    );

    if (!record) {
      return res.status(404).json({ error: `Country '${country}' not found` });
    }

    let states = [];
    try {
      states = await fetchStatesForCountry(record.country);
    } catch {
      states = [];
    }

    res.json({ country: record.country, iso2: record.iso2, states });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/weather/fetch-and-save", async (req, res) => {
  try {
    const countryInput = String(req.body.country || "").trim();
    const cityInput = String(req.body.city || "").trim();
    const stateInput = String(req.body.state || "").trim();

    if (!countryInput || !cityInput) {
      return res.status(400).json({ error: "country and city are required" });
    }

    const db = getDb();
    const countryRecord = await db.collection("countries").findOne(
      { country: { $regex: `^${countryInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      { projection: { _id: 0, country: 1, iso2: 1, cities: 1 } }
    );

    if (!countryRecord) {
      return res.status(404).json({ error: `Country '${countryInput}' not found` });
    }

    const matchedCity = (countryRecord.cities || []).find(
      (city) => city.toLowerCase() === cityInput.toLowerCase()
    );

    if (!matchedCity) {
      return res.status(400).json({ error: `City '${cityInput}' is not available for ${countryRecord.country}` });
    }

    let weather;
    try {
      weather = await fetchCityWeather({
        country: countryRecord.country,
        countryCode: countryRecord.iso2,
        city: matchedCity,
        state: stateInput || null
      });
    } catch (error) {
      const message = String(error?.message || "Failed to fetch weather");

      // If geocoding fails for this city, remove it from selectable list.
      if (message.startsWith("Unable to geocode city")) {
        await db.collection("countries").updateOne(
          { country: countryRecord.country },
          { $pull: { cities: matchedCity }, $set: { updatedAt: new Date() } }
        );

        await db.collection("countries").updateOne(
          { country: countryRecord.country },
          [{ $set: { citiesCount: { $size: "$cities" }, updatedAt: new Date() } }]
        );

        const updatedRecord = await db.collection("countries").findOne(
          { country: countryRecord.country },
          { projection: { _id: 0, country: 1, citiesCount: 1 } }
        );

        const hasCities = Number(updatedRecord?.citiesCount || 0) > 0;
        if (!hasCities) {
          await db.collection("countries").deleteOne({ country: countryRecord.country });
        }

        return res.status(422).json({
          error: `Removed invalid city '${matchedCity}' from ${countryRecord.country}. Please choose another location.`,
          removed: {
            city: matchedCity,
            country: countryRecord.country,
            countryRemoved: !hasCities
          }
        });
      }

      throw error;
    }

    const now = new Date();
    const dateKey = toDateKey(now);

    const snapshot = {
      country: weather.country,
      countryCode: weather.countryCode,
      city: weather.city,
      state: weather.state || null,
      dateKey,
      fetchedAt: now,
      location: weather.location,
      current: weather.current,
      forecast: weather.forecast,
      raw: weather.raw,
      updatedAt: now
    };

    await db.collection("weather_snapshots").updateOne(
      { country: weather.country, city: weather.city, dateKey },
      {
        $set: snapshot,
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    return res.json({
      country: weather.country,
      countryCode: weather.countryCode,
      city: weather.city,
      state: weather.state || null,
      current: weather.current,
      forecast: weather.forecast
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.use(express.static(projectRoot));

app.get("*", (_req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

async function start() {
  const db = await connectToDatabase({ mongoUri: MONGO_URI, dbName: DB_NAME });
  await seedCountriesIfEmpty(db);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
