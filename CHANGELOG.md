# Refactor Notes

## Pilot modernization — Phase 1

### Architecture
- Split the monolithic prototype responsibilities into NestJS feature modules: authentication, trainees, packages, payments, trainers, classes, bookings, attendance, dashboard, LINE integration, health, Prisma, and shared security.
- Keep the LIFF trainee experience and Admin Web as separate Vite apps while sharing explicit contracts through `packages/shared`.
- Separate controllers, DTO validation, business services, and persistence rather than putting workflow logic in UI components.

### Security and identity
- Add validated environment configuration, global request validation, Helmet, constrained CORS, and development-only Swagger documentation.
- Add admin login and protected admin endpoints; active admin records are checked for each authenticated request.
- Verify LINE ID tokens on the server and exchange them for short-lived application sessions.
- Add expiring one-time member-link codes with only hashes stored and transactional consumption.
- Verify LINE webhook signatures over the raw request body before handling postback events.

### Booking and attendance integrity
- Use serializable transactions for booking/cancellation and entitlement reservation/refund paths.
- Validate member status, class state/time, duplicate and overlapping bookings, capacity, and package entitlement before creating bookings.
- Keep credit-ledger entries idempotent and add audit records for important admin operations.
- Share cancellation, check-in-window, and seat-occupancy policy helpers.
- Add admin enrollment into open classes through the same booking service and validation rules as trainee bookings.
- Add a booking confirmation Flex Message containing a real LINE check-in postback action.

### Frontend
- Split LIFF and Admin screens into feature folders and shared layout/API/query utilities.
- Use React Query for API state and explicit loading/error states rather than replacing failed API requests with fake sample metrics.
- Add member account linking, package/credit visibility, class booking/cancellation, admin scheduling, package management, payment confirmation, trainee management, and attendance views.

### Data and tests
- Extend the Prisma model for class status, account-link codes, entitlement credit balance, idempotency keys, notification errors, audit/history, and query indexes.
- Add versioned baseline and upgrade migration SQL plus an admin seed script.
- Add unit tests for cancellation cutoffs, check-in boundaries, and seat-occupying booking statuses.

### Validation status
- Admin and LIFF source type-checks passed during refactoring using temporary type declarations for packages unavailable in the offline validation environment. Those temporary declarations were not retained.
- A full NestJS build, Prisma client generation/validation, migration rehearsal, database integration tests, and end-to-end LINE tests were not completed in this environment because dependencies/network and a matching generated Prisma client were unavailable.
- Reinstall dependencies and run the commands in `README.md` before treating the project as deployment-ready. Test migrations against a restored copy of any existing pilot database first.
