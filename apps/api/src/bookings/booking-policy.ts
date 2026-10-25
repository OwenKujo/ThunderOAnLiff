import { BookingStatus } from '@prisma/client';

/** A booking in one of these states consumes a seat and blocks overlapping bookings. */
export const SEAT_OCCUPYING_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.BOOKED,
  BookingStatus.CHECKED_IN,
  BookingStatus.ATTENDED,
  BookingStatus.COMPLETED,
];

export const CANCELLATION_CUTOFF_MINUTES = 60;
export const CHECK_IN_EARLY_MINUTES = 30;
export const CHECK_IN_LATE_MINUTES = 15;

/** Cancellation is permitted at the exact cutoff (class start minus 60 minutes). */
export function isCancellationAllowed(classStartsAt: Date, now: Date = new Date()): boolean {
  return now.getTime() <= classStartsAt.getTime() - CANCELLATION_CUTOFF_MINUTES * 60_000;
}

/** Check-in is permitted inclusively from 30 minutes before to 15 minutes after start. */
export function isWithinCheckInWindow(classStartsAt: Date, now: Date = new Date()): boolean {
  const deltaMs = now.getTime() - classStartsAt.getTime();
  return deltaMs >= -CHECK_IN_EARLY_MINUTES * 60_000 && deltaMs <= CHECK_IN_LATE_MINUTES * 60_000;
}
