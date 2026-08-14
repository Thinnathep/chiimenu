<script setup lang="ts">
import { ref } from 'vue'
import { 
  BookOpen, 
  Sparkles, 
  UtensilsCrossed, 
  QrCode, 
  MessageCircle, 
  Receipt, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Layers,
  Sliders,
  Store,
  HelpCircle,
  PlayCircle,
  Smartphone,
  Printer,
  BellRing
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const activeTab = ref<'menu' | 'line' | 'qr' | 'order' | 'billing'>('menu')
</script>

<template>
  <div class="space-y-6 pb-20 max-w-5xl mx-auto">
    
    <!-- Hero Header -->
    <div class="bg-gradient-to-r from-primary/10 via-card to-primary/5 border p-6 sm:p-8 rounded-3xl shadow-xs space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/20 shrink-0">
            <BookOpen class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-foreground">คู่มือการใช้งานระบบ ChiiMenu (User Manual)</h1>
            <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">
              คำแนะนำแบบจับมือทำ (Step-by-Step Guide) เพื่อให้ร้านค้าของคุณพร้อมรับนักท่องเที่ยวได้อย่างมืออาชีพ
            </p>
          </div>
        </div>

        <a 
          href="https://line.me/R/ti/p/@819wgrsj" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <MessageCircle class="w-4 h-4" />
          <span>สอบถามทีมงาน LINE Support</span>
        </a>
      </div>

      <!-- Quick Progress Stepper Navigation -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-border/60">
        <button 
          type="button" 
          @click="activeTab = 'menu'"
          class="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2"
          :class="activeTab === 'menu' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
        >
          <span>1. จัดการเมนู</span>
        </button>

        <button 
          type="button" 
          @click="activeTab = 'line'"
          class="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2"
          :class="activeTab === 'line' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
        >
          <span>2. เชื่อมต่อ LINE</span>
        </button>

        <button 
          type="button" 
          @click="activeTab = 'qr'"
          class="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2"
          :class="activeTab === 'qr' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
        >
          <span>3. พิมพ์ QR Code</span>
        </button>

        <button 
          type="button" 
          @click="activeTab = 'order'"
          class="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2"
          :class="activeTab === 'order' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
        >
          <span>4. รับออเดอร์</span>
        </button>

        <button 
          type="button" 
          @click="activeTab = 'billing'"
          class="p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 col-span-2 sm:col-span-1"
          :class="activeTab === 'billing' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
        >
          <span>5. แพ็กเกจ & บิล</span>
        </button>
      </div>
    </div>

    <!-- Step 1: Menu Management Guide -->
    <div v-if="activeTab === 'menu'" class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <UtensilsCrossed class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">ขั้นตอนที่ 1: การสร้างหมวดหมู่และเพิ่มเมนูอาหาร</h2>
            <p class="text-xs text-muted-foreground">เริ่มต้นจัดระเบียบอาหารและเครื่องดื่มในร้าน พร้อมระบบแปลภาษา AI อัตโนมัติ</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/menu" 
          class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1 shrink-0"
        >
          <span>ไปที่หน้าจัดการเมนู</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <span class="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
          <h3 class="font-bold text-sm text-foreground">สร้างหมวดหมู่อาหาร</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            กดปุ่ม <strong>"+ สร้างหมวดหมู่ใหม่"</strong> เพื่อจัดกลุ่มอาหาร เช่น อาหารจานเดียว, ต้ม/แกง, เครื่องดื่ม แล้วกดปุ่ม <strong>"✨ แปลภาษา AI"</strong> เพื่อให้ระบบสร้างชื่อภาษาอังกฤษและจีนให้อัตโนมัติ
          </p>
        </div>

        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <span class="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
          <h3 class="font-bold text-sm text-foreground">เพิ่มรายการอาหาร</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            กดปุ่ม <strong>"+ เพิ่มเมนูอาหาร"</strong> กรอกชื่ออาหารไทย ราคา อัปโหลดรูปภาพสวยๆ และกดแปลภาษา AI เพื่อสร้างคำอธิบายเมนูให้นักท่องเที่ยวเข้าใจง่าย
          </p>
        </div>

        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <span class="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
          <h3 class="font-bold text-sm text-foreground">ข้อมูลผู้แพ้อาหาร & ตัวเลือกพิเศษ</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            ติ๊กเลือกแจ้งเตือนสำหรับลูกค้าที่แพ้อาหาร เช่น มีถั่วลิสง 🥜, อาหารทะเล 🦐, นม 🥛 และเลือกระดับความเผ็ด 🌶️ รวมถึงตัวเลือกพิเศษ เช่น ไข่ดาว (+฿10), พิเศษ (+฿15)
          </p>
        </div>
      </div>
    </div>

    <!-- Step 2: LINE Integration Guide -->
    <div v-if="activeTab === 'line'" class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <MessageCircle class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">ขั้นตอนที่ 2: เชื่อมต่อ LINE Official Account แจ้งเตือนออเดอร์</h2>
            <p class="text-xs text-muted-foreground">เมื่อลูกค้าสแกนสั่งอาหาร รายการจะเด้งเข้ามือถือของคุณทันที</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/store/settings" 
          class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1 shrink-0"
        >
          <span>ไปที่หน้าตั้งค่าร้าน</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Method 1: Auto Link via Chat Command -->
        <div class="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 p-5 rounded-2xl space-y-3">
          <h3 class="font-bold text-sm text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-emerald-600" />
            <span>วิธีที่ 1: พิมพ์คำสั่งในแชท LINE (เร็วสุด 5 วินาที)</span>
          </h3>
          <ol class="list-decimal pl-5 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <li>แอดเพื่อนกับ LINE OA บอทแจ้งเตือน: <strong>@946vhuev</strong> (ChiiMenu Alerts)</li>
            <li>เปิดแชทแล้วพิมพ์คำสั่ง: <code class="font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded font-bold">link &lt;ชื่อลิงก์ร้าน&gt;</code> (เช่น <code class="font-mono text-emerald-700">link Paa Tao</code>)</li>
            <li>บอทจะตอบกลับยืนยันการผูกร้านค้าทันที และพร้อมรับออเดอร์ทันที 24 ชม. 🔔</li>
          </ol>
        </div>

        <!-- Method 2: Manual Setup via Settings Page -->
        <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
          <h3 class="font-bold text-sm text-foreground flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4 text-primary" />
            <span>วิธีที่ 2: กรอกรหัสในหน้าตั้งค่าร้านค้า</span>
          </h3>
          <ol class="list-decimal pl-5 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <li>ทักหาบอท <strong>@946vhuev</strong> ในแชท บอทจะตอบกลับ <strong>รหัส LINE User ID (ขึ้นต้นด้วย U...)</strong></li>
            <li>ไปที่หน้า <strong>"ตั้งค่าร้านค้า"</strong> (`/merchant/store/settings`)</li>
            <li>เลื่อนลงไปที่การ์ด <strong>"การแจ้งเตือนออเดอร์ผ่าน LINE OA"</strong></li>
            <li>นำรหัส <code class="font-mono text-primary font-bold">U...</code> มากดปุ่ม <strong>"🟢 บันทึกเชื่อมต่อ"</strong></li>
          </ol>
        </div>
      </div>

      <!-- What is included in Order Notification -->
      <div class="bg-muted/20 p-5 rounded-2xl border space-y-3">
        <h3 class="font-bold text-sm text-foreground flex items-center gap-2">
          <BellRing class="w-4 h-4 text-primary" />
          <span>การแจ้งเตือนออเดอร์ในแชท LINE มีข้อมูลอะไรบ้าง?</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
          <div class="p-3 bg-card rounded-xl border">
            <span class="font-bold text-foreground block mb-1">📍 หมายเลขโต๊ะ</span>
            เช่น โต๊ะ 1, โต๊ะ VIP, โต๊ะ 5
          </div>
          <div class="p-3 bg-card rounded-xl border">
            <span class="font-bold text-foreground block mb-1">🍲 รายการ & จำนวน</span>
            เช่น 2x ข้าวกะเพราหมูกรอบ
          </div>
          <div class="p-3 bg-card rounded-xl border">
            <span class="font-bold text-foreground block mb-1">🌶️ ตัวเลือกเสริม & โน้ต</span>
            เช่น เผ็ดน้อย, ไข่ดาวไม่สุก
          </div>
          <div class="p-3 bg-card rounded-xl border">
            <span class="font-bold text-foreground block mb-1">💵 ยอดรวม & เวลา</span>
            คำนวณยอดเงินรวมและเวลาที่สั่งทันที
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: QR Code & Printing Guide -->
    <div v-if="activeTab === 'qr'" class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <QrCode class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">ขั้นตอนที่ 3: การสร้างและพิมพ์ QR Code ประจำโต๊ะ</h2>
            <p class="text-xs text-muted-foreground">พิมพ์ใบ QR Code ไปวางบนโต๊ะอาหาร เพื่อให้นักท่องเที่ยวสแกนดูเมนูได้ทันที</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/qr" 
          class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1 shrink-0"
        >
          <span>ไปที่หน้า QR Code</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <Printer class="w-6 h-6 text-indigo-600 mb-1" />
          <h3 class="font-bold text-sm text-foreground">พิมพ์ QR Code รายโต๊ะ</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            ระบบสร้าง QR Code แยกตามเบอร์โต๊ะให้อัตโนมัติ กดปุ่ม <strong>"พิมพ์ QR Code"</strong> เพื่อพิมพ์หรือบันทึกเป็นรูปภาพนำไปทำป้ายตั้งโต๊ะ
          </p>
        </div>

        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <Smartphone class="w-6 h-6 text-indigo-600 mb-1" />
          <h3 class="font-bold text-sm text-foreground">นักท่องเที่ยวสแกนได้ทันที</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            ลูกค้าไม่ต้องโหลดแอปพลิเคชัน เพียงเปิดกล้องมือถือสแกน จะเข้าสู่หน้ารายการอาหาร 3 ภาษาพร้อมรูปภาพชัดเจนทันที
          </p>
        </div>

        <div class="bg-muted/30 p-5 rounded-2xl border space-y-2">
          <ExternalLink class="w-6 h-6 text-indigo-600 mb-1" />
          <h3 class="font-bold text-sm text-foreground">ลิงก์เมนูออนไลน์</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            สามารถคัดลอกลิงก์ร้านค้า (Slug URL) ไปแชร์ลงบน Google Maps, Facebook หรือ TikTok ของร้านเพื่อโปรโมทเมนูได้ตลอด 24 ชม.
          </p>
        </div>
      </div>
    </div>

    <!-- Step 4: Order Flow Guide -->
    <div v-if="activeTab === 'order'" class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Smartphone class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">ขั้นตอนที่ 4: การรับออเดอร์และการดูประวัติการขาย</h2>
            <p class="text-xs text-muted-foreground">ระบบส่งออเดอร์อัตโนมัติจากโต๊ะอาหารตรงเข้า LINE ของร้านค้า</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/orders" 
          class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1 shrink-0"
        >
          <span>ไปที่หน้าประวัติออเดอร์</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div class="bg-muted/30 p-6 rounded-2xl border space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong>ขั้นตอนการรับออเดอร์อัตโนมัติ (Automated Order Flow):</strong>
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div class="p-4 bg-background rounded-xl border">
            <span class="text-2xl mb-1 block">📱</span>
            <strong class="text-foreground block text-xs mb-1">1. สแกน QR ที่โต๊ะ</strong>
            <span class="text-[11px]">ลูกค้าเปิดกล้องสแกนดูเมนู 3 ภาษา</span>
          </div>

          <div class="p-4 bg-background rounded-xl border">
            <span class="text-2xl mb-1 block">🛒</span>
            <strong class="text-foreground block text-xs mb-1">2. กดส่งออเดอร์</strong>
            <span class="text-[11px]">เลือกเมนูและกดส่งออเดอร์ตรงจากโต๊ะ</span>
          </div>

          <div class="p-4 bg-background rounded-xl border">
            <span class="text-2xl mb-1 block">💬</span>
            <strong class="text-foreground block text-xs mb-1">3. เด้งเข้า LINE ร้าน</strong>
            <span class="text-[11px]">แจ้งเตือนเข้าแชท LINE พร้อมเบอร์โต๊ะทันที</span>
          </div>

          <div class="p-4 bg-background rounded-xl border">
            <span class="text-2xl mb-1 block">📊</span>
            <strong class="text-foreground block text-xs mb-1">4. บันทึกประวัติ</strong>
            <span class="text-[11px]">ตรวจสอบรายการในหน้าประวัติออเดอร์ Realtime</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: Billing & Tax Guide -->
    <div v-if="activeTab === 'billing'" class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <Receipt class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground">ขั้นตอนที่ 5: แพ็กเกจการใช้งาน การต่ออายุ และใบเสร็จรับเงิน</h2>
            <p class="text-xs text-muted-foreground">รายละเอียดแพ็กเกจราคา และการขอใบกำกับภาษีอย่างถูกต้อง</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/billing" 
          class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1 shrink-0"
        >
          <span>ไปที่หน้าแพ็กเกจ</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
          <h3 class="font-bold text-sm text-foreground">แพ็กเกจทดลองใช้ & ต่ออายุ</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            ร้านค้าใหม่ได้รับสิทธิ์ทดลองใช้งานฟรี 7 วันเต็ม เมื่อหมดอายุสามารถเลือกต่ออายุแพ็กเกจรายเดือนหรือรายปี พร้อมรับโปรโมชั่นส่วนลดพิเศษ 50% สำหรับการต่ออายุครั้งแรก
          </p>
        </div>

        <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
          <h3 class="font-bold text-sm text-foreground">การออกใบกำกับภาษีและใบเสร็จ</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            ร้านค้าสามารถกรอกชื่อบริษัท ที่อยู่ และเลขประจำตัวผู้เสียภาษี 13 หลัก ในหน้าแพ็กเกจ เพื่อรับใบเสร็จรับเงินและใบกำกับภาษีอิเล็กทรอนิกส์ได้ทันที
          </p>
        </div>
      </div>
    </div>

  </div>
</template>
