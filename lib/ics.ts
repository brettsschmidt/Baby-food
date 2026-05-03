/** Tiny ICS (RFC 5545) generator — no external deps. */

interface Event {
  uid: string;
  start: Date; // all-day if you only set date — we use full-day
  summary: string;
  description?: string;
  location?: string;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escape(s: string) {
  return s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function buildICS(events: Event[], calendarName = "Baby Food Preps"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baby Food//EN",
    `X-WR-CALNAME:${escape(calendarName)}`,
    "CALSCALE:GREGORIAN",
  ];
  const stamp = `${fmtDate(new Date())}T${pad(new Date().getUTCHours())}${pad(new Date().getUTCMinutes())}00Z`;

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(e.start)}`);
    lines.push(`SUMMARY:${escape(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escape(e.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
