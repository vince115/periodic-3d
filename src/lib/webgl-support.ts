/** Disposable probe: creates no scene or renderer and releases the context. */
export function supportsWebGL2(): boolean {
  if (typeof window === "undefined" || !window.WebGL2RenderingContext) return false;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
