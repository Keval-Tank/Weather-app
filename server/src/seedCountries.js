import dotenv from "dotenv";
import { connectToDatabase, closeDatabase } from "./db.js";
import { seedCountriesIfEmpty } from "./countryService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "weather_app";

try {
  const db = await connectToDatabase({ mongoUri: MONGO_URI, dbName: DB_NAME });
  const result = await seedCountriesIfEmpty(db);
  console.log("Seed result:", result);
  await closeDatabase();
  process.exit(0);
} catch (error) {
  console.error("Failed to seed countries:", error);
  await closeDatabase();
  process.exit(1);
}
