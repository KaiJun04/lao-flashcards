export function isAdminEmail(email?: string | null) {
  if (!email) return false;

  const e = email.trim().toLowerCase();

  const ADMIN_EMAILS = [
    "chiamkaijun@gmail.com",
    // add more here
  ].map((x) => x.trim().toLowerCase());

  return ADMIN_EMAILS.includes(e);
}
