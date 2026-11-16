import { buildGroupClassOccurrences } from './group-class-schedule';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

describe('buildGroupClassOccurrences', () => {
  it('creates the fixed weekly timetable with 90-minute classes in Bangkok time', () => {
    const occurrences = buildGroupClassOccurrences(
      new Date('2026-11-15T17:00:00.000Z'),
      new Date('2026-11-22T17:00:00.000Z'),
      new Date('2026-11-15T12:00:00.000Z'),
    );

    expect(occurrences).toHaveLength(47);
    for (const occurrence of occurrences) {
      expect(occurrence.title).toBe('MuayThai Group Class');
      expect(occurrence.capacity).toBe(12);
      expect(occurrence.endAt!.getTime() - occurrence.startAt!.getTime()).toBe(90 * 60 * 1000);
    }

    const weekdaySlots = occurrences
      .filter((occurrence) => {
        const localStart = new Date(occurrence.startAt!.getTime() + BANGKOK_OFFSET_MS);
        const day = localStart.getUTCDay();
        return day >= 1 && day <= 5;
      })
      .map((occurrence) => new Date(occurrence.startAt!.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(11, 16));
    const weekendSlots = occurrences
      .filter((occurrence) => {
        const day = new Date(occurrence.startAt!.getTime() + BANGKOK_OFFSET_MS).getUTCDay();
        return day === 0 || day === 6;
      })
      .map((occurrence) => new Date(occurrence.startAt!.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(11, 16));

    expect(weekdaySlots).toEqual(Array(5).fill(['09:00', '10:30', '13:30', '15:00', '16:30', '18:00', '19:30']).flat());
    expect(weekendSlots).toEqual(Array(2).fill(['09:00', '10:30', '13:30', '15:00', '16:30', '18:00']).flat());
  });

  it('respects the requested range and excludes classes that already started', () => {
    const occurrences = buildGroupClassOccurrences(
      new Date('2026-11-16T02:00:00.000Z'),
      new Date('2026-11-16T03:30:00.000Z'),
      new Date('2026-11-16T02:00:00.000Z'),
    );

    expect(occurrences).toHaveLength(0);
  });
});
