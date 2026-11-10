/** Deterministic stub for expo-crypto used by unit tests. */
let counter = 0
export const randomUUID = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
export default { randomUUID }
