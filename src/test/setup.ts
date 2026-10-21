import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Les contrôles automatiques n'écrivent jamais dans la vraie base : le suivi du test est simulé partout.
vi.mock("@/lib/suivi-test", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/suivi-test")>();
  return {
    ...actual,
    recordVisit: vi.fn(() => Promise.resolve()),
    submitResult: vi.fn(() => Promise.resolve("resultat-test")),
    chooseRoot: vi.fn(() => Promise.resolve()),
  };
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
