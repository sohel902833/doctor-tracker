/**
 * Runs the seed on its own (the server also runs it on every start):
 *
 *   npm run seed
 */
import { connectDB, disconnectDB } from "../config/db";
import { runSeed } from "../database/seed";

const main = async () => {
  await connectDB();
  try {
    await runSeed();
  } finally {
    await disconnectDB();
  }
};

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
