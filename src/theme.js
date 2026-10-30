// System/Light/Dark preference. The inline script in index.html applies the
// same precedence before first paint; keep THEME_KEY and the rules in sync.
export const THEME_KEY = "nc-trout-theme";
export const THEME_CHOICES = ["system", "light", "dark"];
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Storage can be missing or throw on access (blocked cookies, private modes).
export function safeStorage(win = globalThis) {
  try {
    return win.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readChoice(storage) {
  try {
    const value = storage?.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

// System is the default, so choosing it clears the saved override.
export function saveChoice(storage, choice) {
  try {
    if (choice === "light" || choice === "dark") storage.setItem(THEME_KEY, choice);
    else storage.removeItem(THEME_KEY);
    return true;
  } catch {
    return false;
  }
}

export function resolveTheme(choice, systemDark) {
  if (choice === "light" || choice === "dark") return choice;
  return systemDark ? "dark" : "light";
}

// Wires the radio group to the document theme. Explicit choices survive reloads
// where storage works and otherwise last for the page; System tracks OS changes.
export function initTheme({ root = document.documentElement, form, onChange = () => {} }) {
  const storage = safeStorage();
  const system = matchMedia(DARK_QUERY);
  const meta = document.querySelector('meta[name="theme-color"]');
  let choice = readChoice(storage);

  function apply() {
    const theme = resolveTheme(choice, system.matches);
    const changed = root.dataset.theme !== theme;
    root.dataset.theme = theme;
    meta?.setAttribute("content", theme === "dark" ? "#121c1a" : "#193f38");
    for (const input of form.elements.theme) input.checked = input.value === choice;
    if (changed) onChange(theme);
  }

  form.addEventListener("change", (event) => {
    if (event.target.name !== "theme") return;
    choice = event.target.value;
    saveChoice(storage, choice);
    apply();
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  system.addEventListener("change", apply);
  // Keep other open tabs in step with a choice made here.
  addEventListener("storage", (event) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    choice = readChoice(storage);
    apply();
  });
  apply();
}
