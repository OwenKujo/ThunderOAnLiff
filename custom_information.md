# Phase 1 — LINE OA + LIFF ระบบจองคลาสและจัดการลูกเทรน

## 1. เป้าหมาย

พัฒนาระบบบริหารลูกเทรนและการจองคลาส โดยแบ่งการใช้งานเป็น 3 ส่วน

- **LINE Official Account (OA):** แจ้งเตือน ส่งข้อความยืนยัน และเช็คอินผ่านปุ่มข้อความ
- **LIFF (Trainee):** ดูแพ็กเกจและสิทธิ์ จอง/ยกเลิกคลาส ดูประวัติการจองและการเข้าเรียน
- **Admin Web:** จัดการสมาชิก การชำระเงิน แพ็กเกจ ตารางคลาส การจอง และ Attendance

ใช้ Backend API และ Database เป็นแหล่งข้อมูลหลัก เพื่อให้สิทธิ์ จำนวนที่นั่ง และสถานะต่าง ๆ ถูกต้องตรงกันทุกช่องทาง

## 2. Workflow หลัก

### 2.1 สมัครสมาชิกและเปิดใช้งานแพ็กเกจ

1. Admin เพิ่มข้อมูลลูกเทรนหรือค้นหาสมาชิกเดิม
2. ผูกบัญชี LINE กับโปรไฟล์สมาชิกอย่างปลอดภัย
3. Admin บันทึกข้อมูลการชำระเงิน เช่น ยอด วันที่ วิธีชำระ และสถานะ
4. Admin เลือกแพ็กเกจและกำหนดวันเริ่มต้น วันหมดอายุ จำนวนครั้ง และเงื่อนไข
5. เมื่อผ่านเงื่อนไขแล้ว ให้เปิดสถานะสมาชิกเป็น `Active`
6. ระบบแจ้งสมาชิกผ่าน LINE OA และแสดงสิทธิ์ใน LIFF

### 2.2 จองคลาส

1. สมาชิกเปิด LIFF
2. ระบบตรวจสอบสถานะสมาชิกและแพ็กเกจที่ยังใช้งานได้
3. สมาชิกดูตารางคลาสที่เปิดรับจอง
4. เลือกวัน เวลา คลาส และเทรนเนอร์ (ถ้ามี)
5. ระบบตรวจสอบที่นั่งว่าง สิทธิ์คงเหลือ และเวลาที่จองซ้ำหรือเหลื่อมกัน
6. เมื่อจองสำเร็จ ให้บันทึกรายการจอง อัปเดตสิทธิ์/ที่นั่ง และส่งข้อความยืนยันผ่าน LINE OA

### 2.3 ยกเลิกการจอง

1. สมาชิกเข้าเมนู **การจองของฉัน**
2. เลือกรายการจองที่ยังยกเลิกได้
3. ระบบแสดงเวลาเส้นตายและผลต่อสิทธิ์ก่อนยืนยัน
4. สมาชิกกดยืนยันยกเลิก
5. ระบบเปลี่ยนสถานะ คืนสิทธิ์ตามนโยบาย และคืนที่นั่ง
6. ส่งข้อความยืนยันการยกเลิกผ่าน LINE OA

**กติกาแนะนำ:** ยกเลิกได้เมื่อเวลาปัจจุบันไม่เกินเวลาเริ่มคลาสลบ 60 นาที เช่น คลาสเริ่ม 19:00 น. ยกเลิกได้ถึง 18:00 น. รวมเวลาพอดี

### 2.4 เช็คชื่อและลงเวลา

1. ระบบตรวจสอบรายการจองของสมาชิกและช่วงเวลาที่อนุญาตให้เช็คอิน
2. สมาชิกกดปุ่ม **ยืนยันว่ามาถึงแล้ว** ในข้อความ LINE OA
3. Backend ตรวจสอบ LINE identity รายการจอง และสิทธิ์เช็คอิน
4. บันทึกเวลาเช็คอินจริงและสถานะ Attendance โดยไม่สร้างรายการซ้ำ
5. OA ตอบกลับผลสำเร็จ และ Admin เห็นสถานะกับเวลาในหน้ารายชื่อคลาส

**แยกความหมาย:**
- `Attendance`: สถานะการมาเรียน เช่น `Checked-in`, `Attended`, `No-show`
- `Time record`: เวลาที่เช็คอินจริง ซึ่งระบบบันทึกอัตโนมัติ

## 3. ประเภทแพ็กเกจและกติกาสิทธิ์

| ประเภท | รูปแบบสิทธิ์ | เงื่อนไขสำคัญ |
|---|---|---|
| Personal Training | จองคลาสส่วนตัว | ตรวจสอบเวลาว่างของเทรนเนอร์และทรัพยากรที่เกี่ยวข้อง |
| Monthly Unlimited | จองได้ตามเงื่อนไขแพ็กเกจรายเดือน | ตรวจสอบช่วงวันใช้งานและข้อจำกัด เช่น จำนวนการจองล่วงหน้า/ต่อวัน |
| 10 Sessions | จองตามจำนวนครั้ง | มีเครดิตคงเหลือและกำหนดวิธีคืนเครดิตเมื่อยกเลิก |
| Custom Package | กำหนดสิทธิ์เอง | Admin ตั้งจำนวนครั้ง อายุแพ็กเกจ และข้อจำกัดได้ |

### กติกาเครดิตที่แนะนำ

- **จองสำเร็จ:** กันเครดิตไว้สำหรับรายการจอง
- **ยกเลิกทันเวลา:** คืนเครดิตที่กันไว้
- **เข้าเรียนสำเร็จ:** เปลี่ยนเครดิตที่กันไว้เป็นใช้แล้ว
- **No-show/ยกเลิกล่าช้า:** ใช้เครดิตตามนโยบายที่ประกาศไว้
- **Admin ยกเลิกคลาส:** คืนเครดิตหรือสิทธิ์ให้สมาชิก
- ประวัติการใช้เครดิตต้องตรวจสอบย้อนหลังได้

ไม่ควรผูกตรรกะระบบไว้กับชื่อแพ็กเกจโดยตรง ควรทำให้คุณสมบัติของแพ็กเกจตั้งค่าได้จาก Admin

## 4. เมนู Admin Web

1. **Dashboard:** คลาสวันนี้ จำนวนผู้จอง ผู้เช็คอิน รายการชำระเงินที่รอตรวจสอบ และแพ็กเกจใกล้หมดอายุ
2. **Trainees:** เพิ่ม/แก้ไข/ค้นหาสมาชิก ดูประวัติ จัดการแพ็กเกจ บันทึกชำระเงิน และระงับสมาชิก
3. **Packages:** ตั้งค่าประเภทแพ็กเกจ ราคา จำนวนครั้ง วันเริ่มต้น/หมดอายุ และเงื่อนไข
4. **Class Schedule:** สร้าง/แก้ไข/ยกเลิกคลาส กำหนดวันเวลา เทรนเนอร์ สถานที่ ความจุ และสถานะเปิดรับจอง
5. **Attendance:** ดูรายชื่อผู้จอง สถานะ เวลาเช็คอิน ปรับสถานะการมาเรียน และแก้ไขกรณีผิดพลาด

### สถานะสมาชิก

- `Pending`: ยังไม่พร้อมใช้งานหรือยังไม่ผ่านเงื่อนไขเปิดใช้งาน — จองไม่ได้
- `Active`: ใช้งานได้เมื่อมีแพ็กเกจที่มีสิทธิ์ — จองได้ตามกติกา
- `Suspended`: Admin ระงับการใช้งาน — จองใหม่ไม่ได้
- `Expired`: ไม่มีแพ็กเกจที่ยังใช้งานได้ — จองไม่ได้จนกว่าจะมีสิทธิ์ใหม่

การระงับสมาชิกต้องไม่ลบประวัติเดิม และควรแจ้ง Admin หากมีรายการจองในอนาคตที่ได้รับผลกระทบ

## 5. เมนู LIFF สำหรับลูกเทรน

1. **จองคลาส:** ดูตาราง เลือกคลาส ตรวจสอบสิทธิ์ และจอง
2. **การจองของฉัน:** ดูคลาสที่กำลังจะถึง ยกเลิกเมื่อยังอยู่ในกำหนด และดูประวัติ
3. **แพ็กเกจของฉัน:** ดูแพ็กเกจ จำนวนครั้งคงเหลือ และวันหมดอายุ
4. **โปรไฟล์และช่วยเหลือ:** ดูข้อมูลสมาชิกและติดต่อ Admin

หน้าแรกควรเน้น **คลาสถัดไปของฉัน**, ปุ่มเช็คอินเมื่อถึงเวลา และจำนวนครั้งคงเหลือ ไม่ควรให้สมาชิกกรอกข้อมูลซ้ำระหว่าง OA กับ LIFF

## 6. Functional Requirements (FR)

| ID | Requirement | Acceptance Criteria โดยสรุป |
|---|---|---|
| FR-01 | จัดการสมาชิก | Admin เพิ่ม แก้ไข ค้นหา และระงับสมาชิกได้ โดยไม่ลบประวัติ |
| FR-02 | บันทึกการชำระเงิน | Admin บันทึกยอด วันที่ วิธีชำระ และสถานะได้; สมาชิกไม่ Active ก่อนผ่านเงื่อนไข |
| FR-03 | จัดการแพ็กเกจ | ตั้งค่าราคา จำนวนครั้ง อายุ และข้อจำกัดได้ |
| FR-04 | จัดตารางคลาส | สร้าง แก้ไข ยกเลิกคลาส และกำหนดความจุได้ |
| FR-05 | จองคลาส | เฉพาะสมาชิกที่มีสิทธิ์จองได้; ป้องกันการจองเกินความจุและการจองซ้ำที่ไม่อนุญาต |
| FR-06 | ยกเลิกคลาส | ยกเลิกได้ก่อนเริ่มคลาสอย่างน้อย 60 นาที; ปรับที่นั่งและเครดิตถูกต้อง |
| FR-07 | LINE OA Notification | แจ้งยืนยันการจอง/ยกเลิกตามเหตุการณ์ และป้องกันการส่งซ้ำจากการประมวลผลซ้ำ |
| FR-08 | Check-in | กดเช็คอินจาก OA ได้เมื่อมีสิทธิ์; บันทึกเวลาและไม่สร้างรายการซ้ำ |
| FR-09 | Attendance Management | Admin ดูรายชื่อ สถานะ และเวลาเช็คอิน พร้อมแก้ไขกรณีจำเป็นได้ |
| FR-10 | ประวัติการใช้สิทธิ์ | สมาชิกและ Admin ตรวจสอบประวัติการจอง ใช้เครดิต และการเปลี่ยนแปลงสำคัญได้ |

### Acceptance Criteria ตัวอย่าง: ยกเลิกการจอง

- สมมติคลาสเริ่ม 19:00 น.
- เวลา 18:00 น. สมาชิกยังยกเลิกได้
- หลัง 18:00 น. ระบบไม่อนุญาตให้ยกเลิกผ่าน LIFF
- ระบบใช้เวลาไทย (Asia/Bangkok) และใช้กติกาเดียวกันทั้ง Frontend และ Backend

### Acceptance Criteria ตัวอย่าง: Check-in

- ตรวจสอบ LINE identity และรายการจองก่อนบันทึก
- เช็คอินได้เฉพาะในช่วงเวลาที่อนุญาต
- การกดซ้ำต้องไม่สร้าง Attendance ซ้ำ
- หากไม่มีรายการจองหรืออยู่นอกช่วงเวลา ให้แสดงเหตุผลที่ชัดเจน

## 7. Business Rules ที่ควรกำหนด

- **ช่วงเวลาเช็คอิน:** ข้อเสนอเริ่มต้นคือ 30 นาทีก่อนคลาส ถึง 15 นาทีหลังเวลาเริ่ม
- **Late cancellation:** กำหนดให้ชัดว่าจะเสียเครดิตหรือมีค่าปรับอย่างไร และแจ้งก่อนยืนยันการจอง
- **No-show:** อาจตั้งเป็นรอตรวจสอบก่อน Admin ยืนยันสถานะ
- **Monthly Unlimited:** ระบุจำนวนการจองล่วงหน้า/ต่อวันตามนโยบายจริง
- **การจองซ้อนเวลา:** ป้องกันสมาชิกจองคลาสที่เวลาทับซ้อนกัน
- **คลาสเต็ม:** ปิดการจองเมื่อเต็ม; Waitlist เป็นงานในอนาคตได้
- **Admin ยกเลิกคลาส:** แจ้งผู้จอง คืนสิทธิ์ และบันทึกเหตุผล
- **ปิดใช้งานสมาชิก:** ห้ามจองใหม่ แต่ต้องกำหนดวิธีจัดการรายการจองในอนาคต
- **ผูก LINE account:** ป้องกันการผูกบัญชีคนอื่นเข้ากับสมาชิกโดยไม่ได้รับอนุญาต

ทุกการตรวจสอบสิทธิ์ต้องทำที่ Backend ด้วย ไม่ใช่แค่ซ่อนปุ่มใน LIFF

## 8. Scope ของ Phase 1

### Must-have

- ระบบสมาชิกและการผูกบัญชี LINE
- Admin บันทึกการชำระเงินและเปิดใช้งานแพ็กเกจ
- จัดการแพ็กเกจและสิทธิ์
- จัดการตารางและความจุคลาส
- จองและยกเลิกคลาส
- จัดการเครดิต/สิทธิ์คงเหลือ
- เช็คอินผ่านปุ่มใน LINE OA
- บันทึกเวลาและสถานะ Attendance
- แจ้งเตือนการจองและยกเลิก
- Admin จัดการสมาชิกและ Attendance

### Should-have หากมีเวลาและทรัพยากร

- ประวัติการใช้เครดิตอย่างละเอียด
- ตัวกรองและรายงาน Attendance
- การจัดการคลาสประจำสัปดาห์
- แจ้งเตือนก่อนคลาสเริ่ม

### Later Phase

- Payment Gateway และชำระเงินอัตโนมัติ
- Waitlist
- ระบบสะสมแต้ม
- Analytics ประสิทธิภาพเทรนเนอร์
- ขายแพ็กเกจอัตโนมัติ
- เช็คอินด้วย GPS หรือ QR

## 9. ลำดับการพัฒนา

1. **Foundation:** สมาชิก, LINE account linking, แพ็กเกจ, การชำระเงิน, สถานะและสิทธิ์
2. **Scheduling:** ตารางคลาส, ความจุ, การจอง, การยกเลิก และเครดิต
3. **Attendance & Messaging:** เช็คอินผ่าน OA, บันทึกเวลา, Attendance และการแจ้งเตือน
4. **Admin UX & QA:** Dashboard, รายงาน, สิทธิ์ Admin, กรณีผิดพลาด และทดสอบ workflow end-to-end

## 10. กรณีสำคัญที่ต้องทดสอบ

- มีผู้ใช้หลายคนจองที่นั่งสุดท้ายพร้อมกัน ต้องไม่จองเกินความจุ
- ยกเลิกแล้วคืนเครดิตถูกต้องเพียงครั้งเดียว
- เช็คอินซ้ำต้องไม่สร้างรายการซ้ำ
- บัญชี LINE ที่ไม่ใช่เจ้าของรายการจองต้องเช็คอินไม่ได้
- สมาชิกถูกระงับหรือแพ็กเกจหมดอายุต้องจองใหม่ไม่ได้
- Admin ยกเลิกคลาสแล้วแจ้งผู้จองและคืนสิทธิ์ถูกต้อง
- สถานะและเวลาแสดงตรงกันใน LIFF, OA และ Admin Web

## สรุปแนวทาง UX

หัวใจของระบบคือการเชื่อมโยง **สมาชิก → แพ็กเกจ → สิทธิ์ → รายการจอง → Attendance** ให้ข้อมูลและสถานะถูกต้อง ตรวจสอบย้อนหลังได้ และลดขั้นตอนของผู้ใช้งาน

- ใช้ LINE OA สำหรับการแจ้งเตือนและเช็คอินที่ทำได้รวดเร็ว
- ใช้ LIFF สำหรับการจองและดูข้อมูลที่ต้องมีหน้าจอให้เลือก
- ใช้ Admin Web สำหรับการจัดการข้อมูลและข้อยกเว้น
- ใช้ Backend เป็นแหล่งข้อมูลหลักสำหรับสิทธิ์ จำนวนที่นั่ง และสถานะทุกประเภท

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

## 6. Project Status Update — Oct 25, 2026

### 6.1 โครงสร้างที่ใช้งานจริง

ระบบใน repo นี้ได้ถูกปรับให้แยกการใช้งานเป็น 2 Frontend หลักที่ชัดเจน:

- `apps/liff`: หน้า trainee / LIFF สำหรับลูกเทรน
- `apps/admin`: หน้า admin / management สำหรับเจ้าหน้าที่
- `apps/api`: Backend API เป็นแหล่งข้อมูลหลักสำหรับสิทธิ์และสถานะ

แนวทางนี้สอดคล้องกับ requirement ว่า:

- LIFF และ Admin ต้องแยก UI, workflow และสิทธิ์
- Business logic ทั้งหมดต้องทำที่ Backend ไม่ใช่แค่ซ่อนปุ่มใน Frontend
- สมาชิก/แพ็กเกจ/การจอง/Attendance ต้องอ้างอิงข้อมูลเดียวกัน

### 6.2 Endpoint contract ที่ใช้อยู่

API contract ที่ได้กำหนดและใช้งานแล้ว:

- `GET /api/health`
- `GET /api/liff/dashboard`
- `GET /api/liff/classes`
- `GET /api/admin/dashboard`
- `GET /api/admin/schedule`

สิ่งนี้ช่วยให้ Frontend ทั้งสองฝั่งเรียกใช้ backend อย่างถูกต้องและแยกตามหน้าที่ของแต่ละแอปได้ชัดเจน

### 6.3 UI style ที่ใช้

- สีหลัก: ดำ / แดง / ขาว
- branding: Thunder Muaythai
- ห้ามใช้ emoji ใน UI
- โฟกัสที่ dark premium look และความชัดเจนของข้อมูล

### 6.4 Verified repo status

ได้ทำการ verify build แบบ full monorepo ด้วยคำสั่งต่อไปนี้:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -Command "& 'C:/Program Files/Git/bin/bash.exe' -lc 'cd /c/Users/MSI/Desktop/ThunderOAnLiff && npx --yes pnpm@9.15.0 -r build'"
```

ผลลัพธ์ที่ตรวจสอบแล้ว:

- `apps/admin`: build สำเร็จ
- `apps/api`: build สำเร็จ
- `apps/web`: build สำเร็จ
- `apps/liff`: build สำเร็จ
- `packages/shared`: build สำเร็จ

### 6.5 การทำงานที่ระบุให้คงไว้ใน repo นี้เสมอ

กฎสำคัญ: ทุกครั้งที่มีการปรับโครงสร้าง/ฟีเจอร์/contract/UX ต้องเพิ่มสรุปไว้ใน `custom_information.md` เพื่อประวัติของโปรเจคและให้คนที่เข้ามาทำงานต่อเห็นสถานะล่าสุดได้ทันที

### 6.6 Next phase recommendation

ลำดับงานที่เหมาะสมต่อจากนี้คือ:

1. Prisma + PostgreSQL schema สำหรับ Trainee, LineAccount, Package, Booking, Attendance, CreditLedger
2. Real backend logic สำหรับ booking, cancellation, credit, attendance
3. Admin screens เพิ่มเติม เช่น schedule management, member management, payment tracking
4. Deployment planning: Vercel + API hosting + LINE webhook + environment variables

> หมายเหตุ: การทำงานของ repo นี้ต้องยึดหลักว่า Backend เป็น source of truth และ Frontend เป็นคอนซูเมอร์ข้อมูลเท่านั้น
