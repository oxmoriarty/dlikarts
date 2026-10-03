// Tests use the exact same Three.js version as the browser import map.
// Set DLICOM_THREE_MODULE to a locally downloaded three.module.js URL.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three' && process.env.DLICOM_THREE_MODULE) return { url: process.env.DLICOM_THREE_MODULE, shortCircuit: true };
  return nextResolve(specifier, context);
}
