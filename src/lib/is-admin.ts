export function isAdminEmail(email?: string | null) {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}
