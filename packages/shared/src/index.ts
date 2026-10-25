export type MemberStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type PackageType = 'PERSONAL_TRAINING' | 'MONTHLY_UNLIMITED' | 'TEN_SESSIONS' | 'CUSTOM';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type ClassStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'CHECKED_IN' | 'ATTENDED' | 'NO_SHOW' | 'COMPLETED';
export type AttendanceStatus = 'CHECKED_IN' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';
export type AdminRole = 'ADMIN' | 'MANAGER';

export interface AdminSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  admin: { id: string; email: string; role: AdminRole };
}

export interface Trainer { id: string; name: string; specialty?: string | null; isActive?: boolean }
export interface PackageRecord {
  id: string; name: string; type: PackageType; priceCents: number; sessionCount: number | null;
  durationDays: number | null; description: string | null; isActive: boolean;
  _count?: { entitlements: number; payments: number };
}
export interface PackageEntitlement {
  id: string; packageId?: string; name?: string; startDate: string; endDate: string | null;
  remainingSessions: number | null; isActive?: boolean; package?: { id: string; name: string; type: PackageType; sessionCount?: number | null };
}
export interface TraineeRecord {
  id: string; firstName: string; lastName: string; phone: string | null; email: string | null;
  memberStatus: MemberStatus; createdAt: string; lineAccounts?: Array<{ id: string; displayName: string | null; pictureUrl: string | null; status: string }>;
  packageEntitlements?: Array<PackageEntitlement>;
}
export interface ClassRecord {
  id: string; title: string; trainerId: string; startAt: string; endAt: string; location: string | null;
  capacity: number; status: ClassStatus; notes: string | null;
  trainer: Trainer; bookedCount: number; spotsRemaining: number;
}
export interface AttendanceRecord {
  id: string; status: AttendanceStatus; checkedInAt: string | null; attendedAt: string | null; notes: string | null;
}
export interface BookingRecord {
  id: string; traineeId: string; classScheduleId: string; status: BookingStatus; bookedAt: string;
  classSchedule: ClassRecord; attendance: AttendanceRecord | null;
  trainee?: { id: string; firstName: string; lastName: string; phone?: string | null };
  entitlement?: { package: { name: string; type: PackageType } } | null;
}
export interface PaymentRecord {
  id: string; traineeId: string; packageId: string | null; amountCents: number; paymentMethod: string;
  paymentReference: string | null; status: PaymentStatus; paidAt: string | null; notes: string | null;
  createdAt: string; trainee: Pick<TraineeRecord, 'id' | 'firstName' | 'lastName' | 'phone'>;
  package: Pick<PackageRecord, 'id' | 'name' | 'type'> | null;
}
export interface AdminDashboard {
  activeMembers: number; todayClasses: number; bookedSeats: number; pendingPayments: number;
  packagesNearExpiry: number; todayCheckIns: number;
  todayBookings: Array<{ bookingId: string; traineeName: string; className: string; trainer: string; startAt: string; status: BookingStatus; checkedInAt: string | null }>;
}
export interface TraineeDashboard {
  linked: boolean;
  trainee?: { id: string; name: string; memberStatus: MemberStatus };
  package?: { id: string; name: string; type: PackageType; remainingSessions: number | null; startDate: string; endDate: string | null } | null;
  upcomingBookings?: Array<{ id: string; classScheduleId: string; className: string; startAt: string; endAt: string; trainer: string; location: string | null; status: BookingStatus; checkedInAt: string | null }>;
  attendanceRate?: number | null;
}
export interface HealthResponse { ok: boolean; service?: string; database?: string; timestamp: string }
