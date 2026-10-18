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
  hourly: { hour: number; visits: number }[];
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
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, visits: 0 }));
  if (!startDate || !endDate || startDate > endDate) return { ...total, daily, hourly };

  const current = new Date(`${startDate}T12:00:00`);
  const finish = new Date(`${endDate}T12:00:00`);
  for (let count = 0; current <= finish && count < 3660; count += 1) {
    const date = current.toLocaleDateString('en-CA');
    const qrScans = 18 + (hash(`${restaurantId}:${date}:qr`) % 43);
    const linkVisits = 7 + (hash(`${restaurantId}:${date}:link`) % 27);
    const shareVisits = 3 + (hash(`${restaurantId}:${date}:share`) % 19);
    const row = { date, qrScans, linkVisits, shareVisits, totalVisits: qrScans + linkVisits + shareVisits };
    daily.push(row);
    const weights = hourly.map(({ hour }) => 1 + (hour >= 11 && hour <= 14 ? 5 : 0) + (hour >= 18 && hour <= 22 ? 7 : 0) + (hash(`${restaurantId}:${date}:${hour}:peak`) % 5));
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    let distributed = 0;
    weights.forEach((weight, hour) => {
      const visits = Math.floor((row.totalVisits * weight) / weightSum);
      hourly[hour].visits += visits;
      distributed += visits;
    });
    for (let remainder = row.totalVisits - distributed, hour = 0; remainder > 0; remainder -= 1, hour = (hour + 1) % 24) hourly[hour].visits += 1;
    total.qrScans += qrScans;
    total.linkVisits += linkVisits;
    total.shareVisits += shareVisits;
    total.totalVisits += row.totalVisits;
    current.setDate(current.getDate() + 1);
  }
  return { ...total, daily, hourly };
}
