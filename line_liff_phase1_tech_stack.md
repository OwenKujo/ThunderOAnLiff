# LINE LIFF ระบบจองคลาสและจัดการลูกเทรน — Tech Stack

## 1. Overview

ระบบ Phase 1 แบ่งเป็น 3 ส่วนหลัก

- **LINE OA:** แจ้งเตือน ส่งข้อความยืนยัน และเช็คอินผ่านปุ่มข้อความ
- **LIFF Trainee App:** ดูแพ็กเกจและสิทธิ์ จอง/ยกเลิกคลาส ดูประวัติการจองและการเข้าเรียน
- **Admin Web:** จัดการสมาชิก การชำระเงิน แพ็กเกจ ตารางคลาส การจอง และ Attendance

ใช้ Backend API และ Database เป็นแหล่งข้อมูลหลักสำหรับสมาชิก แพ็กเกจ เครดิต จำนวนที่นั่ง การจอง และสถานะ Attendance

## 2. Recommended Tech Stack

### Frontend

| Area | Technology | Purpose |
|---|---|---|
| Framework | React | พัฒนา LIFF App และ Admin Web |
| Language | TypeScript | เพิ่ม type safety และลดข้อผิดพลาด |
| Build Tool | Vite | พัฒนาและ build Frontend |
| Styling | Tailwind CSS | จัดการ styling และ responsive UI |
| UI Components | shadcn/ui | ใช้ component พื้นฐานสำหรับ Admin และ Trainee UI |
| LINE Integration | LIFF SDK | เชื่อมต่อ LIFF กับ LINE client และข้อมูลผู้ใช้ |
| Server State | TanStack Query | จัดการ API requests, caching และ loading/error states |
| Forms | React Hook Form | จัดการฟอร์ม |
| Validation | Zod | ตรวจสอบข้อมูลจากฟอร์ม |
| Routing | React Router | แยกหน้า LIFF และ Admin |

แนวทาง: ใช้ Frontend codebase เดียวได้ โดยแยก route และ layout ของลูกเทรนกับ Admin ให้ชัดเจน เช่น `/app/*` และ `/admin/*` แต่ต้องตรวจสอบสิทธิ์ Admin ที่ Backend ด้วย ไม่ใช่เพียงซ่อนเมนูใน Frontend

### Backend

| Area | Technology | Purpose |
|---|---|---|
| Framework | NestJS | พัฒนา REST API และจัดการ business logic |
| Language | TypeScript | ใช้ภาษาเดียวกับ Frontend |
| ORM | Prisma | จัดการ schema, migrations และ query ฐานข้อมูล |
| API Style | REST API | เชื่อมต่อ Frontend กับ Backend |
| API Documentation | Swagger / OpenAPI | จัดทำ API documentation และทดสอบ endpoint |
| LINE Integration | LINE Messaging API | ส่งข้อความยืนยันการจอง/ยกเลิกและแจ้งเตือน |
| Webhook | NestJS Webhook endpoint | รับ LINE events และ Postback สำหรับ check-in |
| Authentication | LINE Login / LIFF token verification | ตรวจสอบตัวตนผู้ใช้จากฝั่ง Backend |
| Validation | DTO + class-validator / class-transformer | ตรวจสอบข้อมูล request |
| Testing | Jest + Supertest | ทดสอบ service และ API |
| Logging | NestJS Logger | บันทึกเหตุการณ์และข้อผิดพลาด |

### Database

| Area | Technology / Approach | Purpose |
|---|---|---|
| Relational Database | PostgreSQL | เก็บข้อมูลหลักของระบบ |
| ORM | Prisma | เชื่อมต่อและจัดการข้อมูล |
| Transactions | PostgreSQL Transactions + Prisma | ป้องกันข้อมูลไม่ตรงกันระหว่างจองที่นั่งและกันเครดิต |
| Constraints | Foreign Keys, Unique Constraints, Check Constraints | รักษาความถูกต้องของข้อมูล |
| Schema Migration | Prisma Migrate | จัดการการเปลี่ยนแปลง schema |
| Audit Trail | Audit Logs / History tables | ตรวจสอบการเปลี่ยนแปลงสำคัญย้อนหลัง |
| Credit History | Credit Ledger | บันทึกการกัน ใช้ คืน และปรับเครดิต |

ตาราง/โมเดลหลักที่ควรพิจารณา:

- `Trainee`
- `LineAccount`
- `AdminUser` / `AdminRole`
- `Package`
- `TraineePackage` หรือ `PackageEntitlement`
- `PaymentRecord`
- `Trainer`
- `ClassSchedule`
- `Booking`
- `CreditLedger`
- `Attendance`
- `NotificationLog`
- `AuditLog`

### LINE Platform

| Component | Technology | Purpose |
|---|---|---|
| Official Account | LINE OA | ช่องทางสื่อสารกับลูกเทรน |
| Web App in LINE | LIFF | เปิด Trainee App ภายใน LINE |
| User Authentication | LINE Login / LIFF SDK | ระบุตัวตนและผูกบัญชีกับโปรไฟล์สมาชิก |
| Messaging | Messaging API | ส่งข้อความและ Flex Message |
| Quick Actions | Rich Menu / Flex Message buttons | เปิด LIFF หรือเริ่ม workflow |
| Check-in | Postback action + Webhook | รับคำขอยืนยันการเข้าเรียนและตรวจสอบสิทธิ์ฝั่ง Backend |

หมายเหตุ: LIFF และ Messaging API ใช้ร่วมกันได้ โดย LIFF app ต้องตั้งค่าผ่าน Channel ที่รองรับ และควรจัดการ Channel ภายใต้ Provider เดียวกันตามแนวทางของ LINE

### Development Tools

| Area | Tool | Purpose |
|---|---|---|
| IDE | Visual Studio Code | พัฒนาโค้ด |
| Runtime | Node.js LTS | Runtime สำหรับ Frontend tooling และ Backend |
| Package Manager | pnpm | จัดการ dependencies และ monorepo workspace |
| Version Control | Git + GitHub | จัดการ source code และ collaboration |
| Local Database | PostgreSQL ผ่าน Docker Compose | จำลองฐานข้อมูลสำหรับ development |
| API Testing | Postman หรือ Bruno | ทดสอบ REST API และ Webhook |
| Code Quality | ESLint + Prettier | ตรวจและจัดรูปแบบโค้ด |
| Unit / Integration Tests | Jest + Supertest; Vitest ตามส่วนที่ใช้ | ทดสอบ logic และ API |
| Documentation | Markdown + Swagger | เก็บเอกสารโครงการและ API |

## 3. Repository Structure

แนะนำ Monorepo เพื่อให้ Frontend และ Backend ใช้ TypeScript ร่วมกันและแชร์ type/schema ที่เหมาะสมได้ โดยยังแยกการทำงานเป็นแอปคนละส่วน

```text
line-training-system/
├── apps/
│   ├── web/                     # LIFF Trainee App + Admin Web
│   │   ├── src/
│   │   │   ├── app/             # routing and app setup
│   │   │   ├── features/
│   │   │   │   ├── trainee/
│   │   │   │   ├── admin/
│   │   │   │   ├── packages/
│   │   │   │   ├── booking/
│   │   │   │   └── attendance/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   │       └── liff.ts
│   │   └── package.json
│   │
│   └── api/                     # NestJS Backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── trainees/
│       │   │   ├── packages/
│       │   │   ├── payments/
│       │   │   ├── trainers/
│       │   │   ├── classes/
│       │   │   ├── bookings/
│       │   │   ├── attendance/
│       │   │   └── line-webhook/
│       │   └── main.ts
│       ├── prisma/
│       └── package.json
│
├── packages/
│   └── shared/                  # Shared types / schemas (optional)
├── docker-compose.yml           # Local PostgreSQL
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 4. Core Engineering Considerations

1. **Identity and account linking:** ตรวจสอบ LINE ID Token / Access Token ที่ Backend ตามวิธีที่ LINE รองรับ ห้ามเชื่อ `userId` ที่ Frontend ส่งมาเพียงอย่างเดียว
2. **Authorization:** ตรวจสอบสิทธิ์ Admin และสิทธิ์ของลูกเทรนทุก endpoint ที่เกี่ยวข้อง
3. **Booking consistency:** ใช้ transaction และ constraints เพื่อป้องกันการจองเกินความจุและการจองซ้ำ
4. **Credit ledger:** เก็บประวัติการกัน ใช้ คืน และปรับเครดิต โดยไม่แก้ยอดแบบไร้ประวัติ
5. **Idempotency:** การยกเลิก การคืนเครดิต และ Check-in ต้องไม่สร้างผลซ้ำเมื่อ request หรือ webhook ถูกส่งซ้ำ
6. **Notification reliability:** บันทึกสถานะการส่งข้อความและออกแบบ retry ให้เหมาะสม เพื่อจัดการกรณี API ส่งข้อความล้มเหลว
7. **Time handling:** ใช้เวลา `Asia/Bangkok` ใน business rules และทดสอบเส้นตายการยกเลิกก่อนเริ่มคลาส 60 นาที
8. **Testing:** ทดสอบกรณีหลายคนจองที่นั่งสุดท้ายพร้อมกัน, เครดิตคืนซ้ำ, check-in ซ้ำ, บัญชี LINE ไม่ตรงกับ booking และสมาชิกถูกระงับ

## 5. Scope Note

เอกสารนี้ครอบคลุมเฉพาะ **Development Tech Stack และโครงสร้างซอฟต์แวร์** ยังไม่รวมการเลือก Hosting, Cloud Services, Deployment Architecture, Domain, CI/CD หรือ Production Infrastructure ซึ่งจะกำหนดแยกในขั้นตอนถัดไป
