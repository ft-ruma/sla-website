/**
 * "ru******23@gmail.com": the first and last two characters of the name
 * (one each for short names) and the whole domain, so the member can
 * recognise their address. Always six stars, so the length stays hidden.
 */
export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1) return "******";
  const name = email.slice(0, at);
  const keep = name.length >= 6 ? 2 : name.length >= 3 ? 1 : 0;
  const start = keep ? name.slice(0, keep) : name.slice(0, 1);
  return `${start}******${keep ? name.slice(-keep) : ""}${email.slice(at)}`;
}
