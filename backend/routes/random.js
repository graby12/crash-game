// random.js
require("dotenv").config();

function generateCrashMultiplier() {
  let r = Math.random();

  // Avoid division by zero
  if (r === 0) r = 0.000001;

  // Pareto-style heavy-tail distribution
  let crashPoint = 1 / r;

  // Read max multiplier from env or fallback to 200
  const MAX_MULTIPLIER = process.env.MAX_MULTIPLIER
    ? parseFloat(process.env.MAX_MULTIPLIER)
    : 200;

  if (crashPoint > MAX_MULTIPLIER) {
    crashPoint = MAX_MULTIPLIER;
  }

  // Round to 2 decimal places
  return parseFloat(crashPoint.toFixed(2));
}

module.exports = generateCrashMultiplier;
