export const ADMIN_EMAIL = "admin@bananabreakout.demo";
export const ADMIN_PASSWORD = "banana-admin-demo";
const ACCOUNTS_KEY = "banana-breakout-demo-accounts";
const GUESTS_KEY = "banana-breakout-demo-guests";
const SESSION_KEY = "banana-breakout-demo-session";

export function getAccounts() {
  const storedAccounts = localStorage.getItem(ACCOUNTS_KEY);
  if (!storedAccounts) return [];

  const accounts = JSON.parse(storedAccounts);
  if (
    !Array.isArray(accounts)
    || accounts.some((account) => (
      !account
      || typeof account.name !== "string"
      || typeof account.email !== "string"
      || typeof account.passwordHash !== "string"
      || account.email === ADMIN_EMAIL
    ))
  ) {
    throw new Error("Saved demo accounts are invalid. Clear this site's browser data and try again.");
  }
  return accounts;
}

export function deleteAccount(email) {
  const accounts = getAccounts();
  const updatedAccounts = accounts.filter((account) => account.email !== email);
  if (updatedAccounts.length === accounts.length) {
    throw new Error("That user account could not be found.");
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
}

export function getGuests() {
  const storedGuests = localStorage.getItem(GUESTS_KEY);
  if (!storedGuests) return [];

  const guests = JSON.parse(storedGuests);
  if (
    !Array.isArray(guests)
    || guests.some((guest) => (
      !guest
      || typeof guest.id !== "string"
      || typeof guest.name !== "string"
      || !Number.isInteger(guest.score)
      || guest.score < 0
    ))
  ) {
    throw new Error("Saved guest players are invalid. Clear this site's browser data and try again.");
  }
  return guests;
}

export function createGuest(name) {
  const guests = getGuests();
  const guest = {
    id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    score: 0,
  };
  guests.push(guest);
  localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
  return { role: "guest", guestId: guest.id, email: null, name: guest.name };
}

export function deleteGuest(guestId) {
  const guests = getGuests();
  const remainingGuests = guests.filter((guest) => guest.id !== guestId);
  if (remainingGuests.length === guests.length) {
    throw new Error("That guest player could not be found.");
  }
  localStorage.setItem(GUESTS_KEY, JSON.stringify(remainingGuests));
}

export function updateGuestBestScore(guestId, score) {
  const guests = getGuests();
  const guest = guests.find((savedGuest) => savedGuest.id === guestId);
  if (!guest) {
    throw new Error("This guest player is no longer registered in this browser.");
  }
  guest.score = Math.max(guest.score, score);
  localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
}

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Password hashing is unavailable in this browser. Open the game through localhost or HTTPS.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authenticate(email, password) {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return { role: "admin", email: null, name: "Admin" };
  }

  const passwordHash = await hashPassword(password);
  const account = getAccounts().find((savedAccount) => savedAccount.email === email);
  if (!account || account.passwordHash !== passwordHash) {
    throw new Error("That email and password combination was not found.");
  }
  return { role: "user", email: account.email, name: account.name };
}

export async function registerAccount(name, email, password) {
  if (email === ADMIN_EMAIL) {
    throw new Error("That email is reserved for the demo admin account.");
  }

  const accounts = getAccounts();
  if (accounts.some((account) => account.email === email)) {
    throw new Error("An account with that email already exists. Log in instead.");
  }

  const account = { name, email, passwordHash: await hashPassword(password) };
  accounts.push(account);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return { role: "user", email: account.email, name: account.name };
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function restoreSession() {
  const storedSession = sessionStorage.getItem(SESSION_KEY);
  if (!storedSession) return null;

  const session = JSON.parse(storedSession);
  if (session?.role === "guest" && typeof session.guestId === "string") {
    const guest = getGuests().find((savedGuest) => savedGuest.id === session.guestId);
    if (guest) {
      return { role: "guest", guestId: guest.id, email: null, name: guest.name };
    }
  }
  if (session?.role === "admin") {
    return { role: "admin", email: null, name: "Admin" };
  }
  if (session?.role === "user" && typeof session.email === "string") {
    const account = getAccounts().find((savedAccount) => savedAccount.email === session.email);
    if (account) {
      return { role: "user", email: account.email, name: account.name };
    }
  }

  clearSession();
  return null;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
