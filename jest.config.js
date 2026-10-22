/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  testMatch: ["<rootDir>/src/tests/**/*.test.ts"],
  // Axios 1.x exposes an ESM entry point; map Jest 27 to its CommonJS build.
  moduleNameMapper: {
    "^axios$": "<rootDir>/node_modules/axios/dist/node/axios.cjs",
  },

  globals: {
    "ts-jest": { tsconfig: "<rootDir>/tsconfig.json" },
  },
};
