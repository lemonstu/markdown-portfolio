// Vitest global setup: stub Node-side modules that depend on the Next.js runtime.
import { vi } from "vitest";

// `server-only` throws on import in a non-Next runtime. Tests don't care.
vi.mock("server-only", () => ({}));
