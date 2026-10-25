import { BookingStatus } from '@prisma/client';
import {
  CANCELLATION_CUTOFF_MINUTES,
  CHECK_IN_EARLY_MINUTES,
  CHECK_IN_LATE_MINUTES,
  isCancellationAllowed,
  isWithinCheckInWindow,
  SEAT_OCCUPYING_BOOKING_STATUSES,
} from './booking-policy';

describe('booking policy', () => {
  const classStartsAt = new Date('2026-11-01T12:00:00.000Z');

  describe('cancellation cutoff', () => {
    it('allows cancellation at exactly the 60-minute cutoff', () => {
      const atCutoff = new Date(classStartsAt.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000);
      expect(isCancellationAllowed(classStartsAt, atCutoff)).toBe(true);
    });

    it('rejects cancellation one millisecond after the cutoff', () => {
      const tooLate = new Date(classStartsAt.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000 + 1);
      expect(isCancellationAllowed(classStartsAt, tooLate)).toBe(false);
    });
  });

  describe('check-in window', () => {
    it('includes both the early and late boundary', () => {
      expect(isWithinCheckInWindow(classStartsAt, new Date(classStartsAt.getTime() - CHECK_IN_EARLY_MINUTES * 60_000))).toBe(true);
      expect(isWithinCheckInWindow(classStartsAt, new Date(classStartsAt.getTime() + CHECK_IN_LATE_MINUTES * 60_000))).toBe(true);
    });

    it('rejects attempts immediately outside either boundary', () => {
      expect(isWithinCheckInWindow(classStartsAt, new Date(classStartsAt.getTime() - CHECK_IN_EARLY_MINUTES * 60_000 - 1))).toBe(false);
      expect(isWithinCheckInWindow(classStartsAt, new Date(classStartsAt.getTime() + CHECK_IN_LATE_MINUTES * 60_000 + 1))).toBe(false);
    });
  });

  it('uses one canonical definition of bookings that occupy a seat', () => {
    expect(SEAT_OCCUPYING_BOOKING_STATUSES).toEqual([
      BookingStatus.BOOKED,
      BookingStatus.CHECKED_IN,
      BookingStatus.ATTENDED,
      BookingStatus.COMPLETED,
    ]);
    expect(SEAT_OCCUPYING_BOOKING_STATUSES).not.toContain(BookingStatus.CANCELLED);
    expect(SEAT_OCCUPYING_BOOKING_STATUSES).not.toContain(BookingStatus.NO_SHOW);
  });
});
