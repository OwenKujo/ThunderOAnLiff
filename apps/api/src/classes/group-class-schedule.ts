import type { Prisma } from '@prisma/client';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const GROUP_CLASS_DURATION_MS = 90 * 60 * 1000;
const WEEKDAY_GROUP_CLASS_SLOTS = [[9, 0], [10, 30], [13, 30], [15, 0], [16, 30], [18, 0], [19, 30]] as const;
const WEEKEND_GROUP_CLASS_SLOTS = [[9, 0], [10, 30], [13, 30], [15, 0], [16, 30], [18, 0]] as const;

export function buildGroupClassOccurrences(fromDate: Date, toDate: Date, now = new Date()): Prisma.ClassScheduleCreateManyInput[] {
  const firstBangkokDay = new Date(fromDate.getTime() + BANGKOK_OFFSET_MS);
  const lastBangkokDay = new Date(toDate.getTime() + BANGKOK_OFFSET_MS);
  const day = new Date(Date.UTC(firstBangkokDay.getUTCFullYear(), firstBangkokDay.getUTCMonth(), firstBangkokDay.getUTCDate()));
  const lastDay = Date.UTC(lastBangkokDay.getUTCFullYear(), lastBangkokDay.getUTCMonth(), lastBangkokDay.getUTCDate());
  const occurrences: Prisma.ClassScheduleCreateManyInput[] = [];

  while (day.getTime() <= lastDay) {
    const weekday = day.getUTCDay();
    const slots = weekday === 0 || weekday === 6 ? WEEKEND_GROUP_CLASS_SLOTS : WEEKDAY_GROUP_CLASS_SLOTS;
    const dateKey = day.toISOString().slice(0, 10);
    for (const [hour, minute] of slots) {
      const startAt = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute) - BANGKOK_OFFSET_MS);
      if (startAt < fromDate || startAt >= toDate || startAt <= now) continue;
      const timeKey = `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
      occurrences.push({
        scheduleKey: `group:${dateKey}:${timeKey}`,
        title: 'MuayThai Group Class',
        startAt,
        endAt: new Date(startAt.getTime() + GROUP_CLASS_DURATION_MS),
        capacity: 12,
      });
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return occurrences;
}
