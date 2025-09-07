// random.js

// Function to generate the crash multiplier based on the given logic
function generateCrashMultiplier() {
  const randomChance = Math.random(); // Get a random number between 0 and 1

  // 70% chance of crashing early (Below 2x)
  if (randomChance <= 0.7) {
    return (Math.random() * 1.5) + 1; // Random multiplier between 1x and 2x
  }

  // 10% chance of crashing randomly between 7x and 15x
  if (randomChance <= 0.8) {
    return (Math.random() * 8) + 7; // Random multiplier between 7x and 15x
  }

  // 20% chance of crashing randomly between 2x and 4x
  return (Math.random() * 2) + 2; // Random multiplier between 2x and 4x
}

module.exports = generateCrashMultiplier;
