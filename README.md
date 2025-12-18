# Lucky Seemsee - แอปพลิเคชันเสี่ยงเซียมซีและถ่ายภาพมงคล

แอปพลิเคชัน React สำหรับเสี่ยงเซียมซีและถ่ายภาพมงคลพร้อม 3D Model

## 📁 โครงสร้างโปรเจกต์

```
src/
├── App.jsx                 # Main App Component - จัดการ routing และ state
├── App.css                 # Global Styles - จัดระเบียบเป็นหมวดหมู่
├── main.jsx                # Entry point
├── index.css               # Base styles
│
├── components/             # React Components
│   ├── CameraStage.jsx     # Camera wrapper component
│   ├── HomeScreen.jsx      # หน้าหลัก
│   ├── ShakeScreen.jsx     # หน้าเขย่าเซียมซี
│   ├── FortuneScreen.jsx   # หน้าแสดงผลเซียมซี
│   ├── HorseScreen.jsx     # หน้าถ่ายภาพมงคล (3D Model)
│   ├── WallpaperScreen.jsx # หน้าสร้างวอลเปเปอร์
│   └── GLBModel.jsx        # 3D Model component
│
└── assets/                 # Static Assets
    ├── buttons/            # ปุ่มต่างๆ
    ├── head_text/          # หัวข้อ
    ├── horse_fire/         # ภาพมงคล (wish images)
    ├── images/             # ภาพทั่วไป
    ├── models/             # 3D Models (.glb)
    ├── stick/              # ภาพเซียมซี (sequence)
    ├── svg/                # SVG icons
    └── text/               # ข้อความเซียมซี
```

## 🎨 CSS Structure

CSS ถูกจัดระเบียบเป็นหมวดหมู่ชัดเจนใน `App.css`:

1. **Reset & Base Styles** - Reset และ base styles
2. **Layout - Camera Stage** - Layout สำหรับ camera stage
3. **Buttons** - ปุ่มต่างๆ (CTA, Image, Back Icon, Capture Circle, Mode Switch, Manual Shake)
4. **Screens** - Styles สำหรับแต่ละหน้า (Home, Shake, Horse, Fortune, Wallpaper)
5. **Modals & Overlays** - Modal และ overlay components
6. **Animations** - Keyframe animations
7. **Utilities** - Utility classes (Errors, etc.)
8. **Media Queries** - Responsive styles

## 🚀 Features

- **เสี่ยงเซียมซี**: เขย่าเครื่องเพื่อเสี่ยงเซียมซี
- **ถ่ายภาพมงคล**: ถ่ายภาพ/วิดีโอกับ 3D Model
- **สร้างวอลเปเปอร์**: เลือกเสริมดวงและปีนักษัตร
- **Camera Integration**: ใช้กล้องหน้าของอุปกรณ์
- **3D Model**: แสดง 3D Model ด้วย React Three Fiber

## 🛠️ Technologies

- React 18
- Vite
- React Three Fiber (@react-three/fiber)
- @react-three/drei
- MediaRecorder API
- DeviceMotion API

## 📝 State Management

State หลักอยู่ใน `App.jsx`:
- `view`: หน้าปัจจุบัน ('home' | 'shake' | 'horse' | 'fortune' | 'wallpaper')
- `captureMode`: โหมดถ่ายภาพ ('photo' | 'video')
- `isRecording`: สถานะการบันทึกวิดีโอ
- `shakeTrigger`: Trigger สำหรับเขย่าเซียมซี
- `fortuneIndex`: Index ของเซียมซีที่ได้
- `selectedTopic`, `selectedZodiac`: ตัวเลือกสำหรับวอลเปเปอร์

## 🎯 Component Responsibilities

- **App.jsx**: จัดการ routing, state, และ camera logic
- **CameraStage**: Wrapper สำหรับ camera feed
- **HomeScreen**: หน้าหลักพร้อมเมนู
- **ShakeScreen**: หน้าเขย่าเซียมซีพร้อม animation sequence
- **FortuneScreen**: แสดงผลเซียมซีที่ได้
- **HorseScreen**: หน้าถ่ายภาพ/วิดีโอกับ 3D Model
- **WallpaperScreen**: หน้าสร้างวอลเปเปอร์พร้อม modal selection
- **GLBModel**: Component สำหรับแสดง 3D Model

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## LINE LIFF (Optional)

ถ้าต้องการรันใน LINE LIFF ให้สร้างไฟล์ `.env` แล้วใส่:

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
```

ถ้าไม่ตั้งค่า `VITE_LIFF_ID` แอปจะรันแบบ browser ปกติ (LIFF จะถูกข้ามไป)

## Cloudinary (LIFF wallpaper only)

สำหรับ flow เฉพาะใน LINE LIFF (อัปโหลดรูปขึ้น Cloudinary แล้วเปิดลิงก์ด้วย external browser):

```bash
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload
# optional (default: ml_default)
VITE_CLOUDINARY_UPLOAD_PRESET=YOUR_UNSIGNED_UPLOAD_PRESET
# optional (default: lucky-seemsee)
VITE_CLOUDINARY_FOLDER=lucky-seemsee
```

หมายเหตุ: โปรเจกต์นี้ใช้ **unsigned upload preset** (ห้ามใส่ api secret ในฝั่ง client)

## OpenAI Image Generation (Wallpaper)

โปรเจกต์นี้เรียก **OpenAI Images API** จากฝั่ง client โดยตรงเพื่อสร้างวอลเปเปอร์ (เหมือนแนวทางใน `random-wallpaper`):

```bash
VITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY
# optional
VITE_IMAGE_MODEL=dall-e-3
VITE_IMAGE_SIZE=1024x1792
VITE_IMAGE_QUALITY=standard
VITE_IMAGE_STYLE=natural
```

หมายเหตุด้านความปลอดภัย: การใส่ API key ใน client ไม่ปลอดภัยสำหรับ production — ใช้เฉพาะกรณีที่คุณยอมรับความเสี่ยง/หรือมีการจำกัด key แล้ว

## 📱 Mobile Considerations

- ใช้ `env(safe-area-inset-bottom)` สำหรับ safe area บน iOS
- ปิด tap highlight (`-webkit-tap-highlight-color: transparent`)
- ปิด outline เมื่อ focus/active
- Responsive design สำหรับหน้าจอขนาดต่างๆ

## 🎨 Styling Guidelines

- ใช้ CSS Variables สำหรับ colors (ถ้าต้องการในอนาคต)
- จัดกลุ่ม styles ตาม component/feature
- ใช้ comments เพื่อแยกหมวดหมู่
- Mobile-first approach

## 📚 Notes

- 3D Models ใช้ GLB format
- Camera ใช้ front-facing camera
- Video recording จำกัด 30 วินาที
- Shake detection ใช้ DeviceMotion API
