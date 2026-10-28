export function dateKeyInTimezone(value = new Date(), timeZone = "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")}`;
}

export function monthKeyInTimezone(value = new Date(), timeZone = "Asia/Jakarta") {
  return dateKeyInTimezone(value, timeZone).slice(0, 7);
}
