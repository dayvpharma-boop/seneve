import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

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

// Copie de l'espace (30/10/2026) : elle s'affiche au retour, sans rechargement pendant 30 minutes.
// Chaque essai part donc sans copie laissée par l'essai précédent.
beforeEach(() => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("seneve:espace:")) localStorage.removeItem(k);
    }
  } catch { /* pas de stockage dans cet environnement */ }
});
