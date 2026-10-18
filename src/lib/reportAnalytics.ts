export type DailyReportStat = {
  date: string;
  qrScans: number;
  linkVisits: number;
  shareVisits: number;
  totalVisits: number;
};

export type ReportAnalytics = {
  qrScans: number;
  linkVisits: number;
  shareVisits: number;
  totalVisits: number;
  daily: DailyReportStat[];
};

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Stable pre-launch sample analytics. Real tracking can replace this source later. */
export function buildReportAnalytics(restaurantId: string, startDate: string, endDate: string): ReportAnalytics {
  const total = { qrScans: 0, linkVisits: 0, shareVisits: 0, totalVisits: 0 };
  const daily: DailyReportStat[] = [];
  if (!startDate || !endDate || startDate > endDate) return { ...total, daily };

  const current = new Date(`${startDate}T12:00:00`);
  const finish = new Date(`${endDate}T12:00:00`);
  for (let count = 0; current <= finish && count < 3660; count += 1) {
    const date = current.toLocaleDateString('en-CA');
    const qrScans = 18 + (hash(`${restaurantId}:${date}:qr`) % 43);
    const linkVisits = 7 + (hash(`${restaurantId}:${date}:link`) % 27);
    const shareVisits = 3 + (hash(`${restaurantId}:${date}:share`) % 19);
    const row = { date, qrScans, linkVisits, shareVisits, totalVisits: qrScans + linkVisits + shareVisits };
    daily.push(row);
    total.qrScans += qrScans;
    total.linkVisits += linkVisits;
    total.shareVisits += shareVisits;
    total.totalVisits += row.totalVisits;
    current.setDate(current.getDate() + 1);
  }
  return { ...total, daily };
}
