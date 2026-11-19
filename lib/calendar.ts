export const timestamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
function fold(line: string) {
  const parts = [""];
  let bytes = 0;
  for (const character of line) {
    const length = Buffer.byteLength(character);
    if (bytes + length > 75) {
      parts.push(" ");
      bytes = 1;
    }
    parts[parts.length - 1] += character;
    bytes += length;
  }
  return parts.join("\r\n");
}

export function calendarBody(events: string[]) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EVENTMGdev//Calendar//RU", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].map(fold).join("\r\n");
}
