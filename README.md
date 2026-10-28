# Doctor Assist Prototype — HTML

ต้นแบบ UI ระบบ Doctor Assist (ออกแบบสำหรับผู้สูงอายุ) ครบ 5 บทบาท แยกจากไฟล์ bundle เดิม (5.4 MB) ออกมาเป็นไฟล์ที่อ่านและแก้ไขได้ ทำงานแบบออฟไลน์ ไม่ต้องต่ออินเทอร์เน็ต

## โครงสร้างไฟล์

```
doctor-assist/
├── index.html          หน้ารวม มีแถบสลับบทบาท + ปุ่มเต็มจอ (เปิดไฟล์นี้)
├── patient.html        ผู้ป่วย
├── nurse.html          พยาบาล
├── doctor.html         แพทย์
├── pharmacist.html     เภสัช
├── admin.html          Admin
├── vercel.json         ตั้งค่า Vercel (cache, security headers)
└── assets/
    ├── js/
    │   ├── dc-runtime.js     ตัว render หน้าจอ (template <x-dc> → React)
    │   ├── voice-assist.js   ปุ่มไมค์พูดแทนพิมพ์ในช่องกรอก
    │   └── fullscreen.js     ปุ่มเต็มจอ
    ├── vendor/               React 18.3.1 (ไฟล์ในเครื่อง)
    └── fonts/                IBM Plex Sans Thai, IBM Plex Mono, Material Symbols Rounded
```

## วิธีเปิดใช้งาน

แนะนำให้เปิดผ่าน web server (เพื่อให้ข้อมูลส่งข้ามบทบาทได้ เช่น ผู้ป่วยจองนัด → พยาบาลยืนยัน)

```bash
cd doctor-assist
python3 -m http.server 8000
# แล้วเปิด http://localhost:8000
```

หรือวางทั้งโฟลเดอร์บน web server ใดก็ได้ (Nginx, Apache, IIS, GitHub Pages ฯลฯ) ไม่ต้อง build

เปิดไฟล์ `xxx.html` เดี่ยวๆ ได้เช่นกัน จะมีแถบบนให้สลับบทบาทเอง

## Deploy ขึ้น GitHub + Vercel

เป็น static site ไม่มีขั้นตอน build — Vercel เสิร์ฟไฟล์จากโฟลเดอร์รากได้ทันที (ตั้งค่า header/cache ไว้แล้วใน `vercel.json`)

### 1) ขึ้น GitHub

**แบบใช้ git (Terminal)**

```bash
cd doctor-assist
git init
git add .
git commit -m "Doctor Assist prototype"
git branch -M main
git remote add origin https://github.com/<ชื่อบัญชี>/doctor-assist.git
git push -u origin main
```

(สร้าง repo เปล่าชื่อ `doctor-assist` บน github.com ก่อน โดยไม่ต้องติ๊ก Add README)

**แบบไม่ใช้ Terminal** — สร้าง repo ใหม่บน github.com → กด *uploading an existing file* → ลากไฟล์ทั้งหมดในโฟลเดอร์ `doctor-assist` (รวมโฟลเดอร์ `assets`) ไปวาง → Commit

### 2) Deploy บน Vercel

1. เข้า vercel.com → **Add New… → Project**
2. เลือก repo `doctor-assist` → **Import**
3. Framework Preset: **Other** · Build Command: เว้นว่าง · Output Directory: เว้นว่าง
4. กด **Deploy** — ได้ลิงก์ `https://doctor-assist-xxx.vercel.app`

หลังจากนั้นทุกครั้งที่ push ขึ้น branch `main` Vercel จะ deploy ให้อัตโนมัติ และทุก Pull Request จะได้ลิงก์ Preview แยกไว้รีวิว

> ถ้าต้องการจำกัดคนเข้าชม (ต้นแบบยังไม่ควรเปิดสาธารณะ) ตั้งได้ที่ Vercel → Project → Settings → Deployment Protection
>
> ปุ่มไมค์ (พูดแทนพิมพ์) ใช้ได้เฉพาะบน HTTPS — ลิงก์ของ Vercel เป็น HTTPS อยู่แล้ว

## จุดแก้ไขในแต่ละไฟล์บทบาท

แต่ละไฟล์ (`patient.html` ฯลฯ) มี 2 ส่วนหลัก

1. **หน้าตา (template)** — อยู่ใน `<x-dc> … </x-dc>` เป็น HTML + inline style
   - `{{ ค่า }}` = แสดงค่าจาก logic
   - `<sc-if value="{{ ... }}">` = แสดงเมื่อเงื่อนไขเป็นจริง
   - `<sc-for list="{{ ... }}" as="x">` = วนแสดงรายการ
   - `sc-camel-on-click="{{ ฟังก์ชัน }}"` = event ตอนกด
2. **การทำงาน (logic)** — อยู่ใน `<script type="text/x-dc">` ท้ายไฟล์
   - `class Component extends DCLogic` คล้าย React class component
   - `state` = สถานะหน้าจอ (หน้าปัจจุบัน `s`, ข้อมูลฟอร์ม ฯลฯ)
   - `renderVals()` = คืนค่าทั้งหมดที่ template ใช้ (ข้อความ สี รายการ)
   - สีหลักและโหมดตัวอักษรคมชัด (high contrast) กำหนดในตัวแปร `c` ต้น `renderVals()`

ข้อมูลในต้นแบบเป็นข้อมูลจำลองทั้งหมด ยังไม่ได้เชื่อมต่อ API จริง (HealthID / ProviderID / FDH ฯลฯ)
