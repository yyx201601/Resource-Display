import postgres from "postgres";
import { AssessmentError } from "./errors";

type DatabaseClient = ReturnType<typeof postgres>;

const databaseGlobal = globalThis as typeof globalThis & {
  assessmentDatabase?: DatabaseClient;
};

export function getDatabase() {
  if (databaseGlobal.assessmentDatabase) {
    return databaseGlobal.assessmentDatabase;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new AssessmentError(
      "database_not_configured",
      "DATABASE_URL is not configured.",
      503,
    );
  }

  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

  databaseGlobal.assessmentDatabase = client;
  return client;
}
