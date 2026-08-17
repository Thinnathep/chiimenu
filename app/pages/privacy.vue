<script setup lang="ts">
import { 
  ArrowLeft, 
  ShieldCheck, 
  Database, 
  FileText, 
  Share2, 
  UserCheck, 
  AlertCircle, 
  MessageSquare,
  Lock,
  Server,
  Scale,
  CheckCircle2,
  FileCheck,
  Globe,
  Cookie,
  AlertTriangle
} from 'lucide-vue-next'

useHead({
  title: 'นโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งาน (Privacy Policy) - ChiiMenu',
  meta: [
    { name: 'description', content: 'นโยบายความเป็นส่วนตัวของ ChiiMenu ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และ พ.ร.บ. คอมพิวเตอร์ฯ' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/20 text-slate-800 dark:text-slate-300">
    <!-- Navbar -->
    <nav class="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs sm:text-sm font-semibold">
          <ArrowLeft class="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </NuxtLink>
        <div class="flex items-center gap-2 font-bold text-foreground text-xs sm:text-sm">
          <img src="/logo-icon.png" alt="ChiiMenu" class="w-6 h-6 rounded-md object-contain shadow-xs">
          <span>ChiiMenu Legal & Compliance</span>
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      
      <!-- Page Header -->
      <header class="mb-12 space-y-4">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
          <FileCheck class="w-3.5 h-3.5" />
          <span>สอดคล้องตาม พ.ร.บ. PDPA พ.ศ. 2562 & พ.ร.บ. คอมพิวเตอร์ฯ พ.ศ. 2560</span>
        </div>

        <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
          นโยบายความเป็นส่วนตัว<br class="hidden sm:inline"/>
          <span class="text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground">(Privacy Policy & Legal Terms)</span>
        </h1>

        <p class="text-xs sm:text-sm text-muted-foreground font-medium">
          ปรับปรุงล่าสุดเมื่อ: {{ new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) }} | มีผลบังคับใช้ทันที
        </p>
      </header>

      <!-- Preamble / Introduction Box -->
      <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 mb-8">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
            <Scale class="w-5 h-5" />
          </div>
          <div class="space-y-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <p>
              แพลตฟอร์ม <strong>ChiiMenu</strong> ("เรา", "พวกเรา", หรือ "แพลตฟอร์ม") ตระหนักและให้ความสำคัญอย่างยิ่งยวดต่อการคุ้มครองข้อมูลส่วนบุคคลและความมั่นคงปลอดภัยทางไซเบอร์ของผู้ใช้งานทุกท่าน เอกสารฉบับนี้จัดทำขึ้นเพื่อชี้แจงสิทธิ หน้าที่ วัตถุประสงค์ มาตรการจัดเก็บ และการคุ้มครองข้อมูลอย่างโปร่งใส ถูกต้องตาม <strong>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong> และ <strong>พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2550 (รวมถึงฉบับแก้ไขเพิ่มเติม พ.ศ. 2560)</strong>
            </p>
            <p>
              กรุณาอ่านนโยบายฉบับนี้อย่างละเอียด การลงทะเบียนสมัครสมาชิก การสร้างร้านค้า หรือการใช้งานเมนูดิจิทัลผ่านระบบ ถือว่าท่านได้รับทราบและยินยอมตามข้อตกลงและนโยบายนี้ทุกประการ
            </p>
          </div>
        </div>
      </section>

      <!-- Main Policy Articles -->
      <div class="space-y-6">

        <!-- 1. บทบาทและหน้าที่ตามกฎหมาย (Data Roles) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3.5 border-b pb-4">
            <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Scale class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">1. สถานะและบทบาทในการประมวลผลข้อมูล (Data Roles)</h2>
              <p class="text-xs text-muted-foreground">การระบุขอบเขตความรับผิดชอบระหว่างแพลตฟอร์มและร้านค้า</p>
            </div>
          </div>

          <div class="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <div>
              <h3 class="font-bold text-foreground mb-1">1.1 สำหรับข้อมูลบัญชีร้านค้า (Merchant Account Data)</h3>
              <p>ChiiMenu ทำหน้าที่เป็น <strong>"ผู้ควบคุมข้อมูลส่วนบุคคล" (Data Controller)</strong> สำหรับข้อมูลที่ผู้ประกอบการร้านอาหารใช้ในการลงทะเบียน สมัครสมาชิก จัดการร้านค้า และการทำธุรกรรมชำระค่าบริการ</p>
            </div>

            <div>
              <h3 class="font-bold text-foreground mb-1">1.2 สำหรับข้อมูลคำสั่งซื้อและรายการอาหาร (Store & Order Data)</h3>
              <p>ผู้ประกอบการร้านค้า (Merchant) มีสถานะเป็น <strong>"ผู้ควบคุมข้อมูลส่วนบุคคล" (Data Controller)</strong> ของร้านตนเอง โดย ChiiMenu ทำหน้าที่เป็น <strong>"ผู้ประมวลผลข้อมูลส่วนบุคคล" (Data Processor)</strong> เพื่อให้บริการส่งข้อมูลคำสั่งซื้อ จัดแสดงเมนู และแจ้งเตือนผ่านช่องทาง LINE OA ตามคำสั่งของร้านค้าเท่านั้น</p>
            </div>
          </div>
        </section>

        <!-- 2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม (Data We Collect) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3.5 border-b pb-4">
            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Database class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม (Data We Collect)</h2>
              <p class="text-xs text-muted-foreground">จัดเก็บเฉพาะข้อมูลที่จำเป็นตามวัตถุประสงค์การให้บริการอย่างโปร่งใส</p>
            </div>
          </div>

          <div class="space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <!-- 2.1 Merchant Profile & Store Data -->
            <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
              <h3 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span>👤</span>
                <span>ก. ข้อมูลสำหรับผู้ประกอบการร้านอาหาร (Merchants):</span>
              </h3>
              <ul class="list-disc pl-5 space-y-2">
                <li>
                  <strong class="text-foreground">หมายเลขโทรศัพท์ติดต่อ:</strong> จัดเก็บทั้ง <strong>เบอร์โทรศัพท์ส่วนบุคคลของเจ้าของบัญชี</strong> สำหรับการยืนยันตัวตนและการกู้คืนรหัสผ่าน และ <strong>เบอร์โทรศัพท์ติดต่อหน้าร้านค้า</strong> สำหรับแสดงให้ลูกค้าติดต่อและทีมงานประสานงาน
                </li>
                <li>
                  <strong class="text-foreground">ข้อมูลบัญชีและการยืนยันตัวตน:</strong> ชื่อ-นามสกุลจริง, ที่อยู่อีเมล, รหัสผ่าน และรหัส PIN ความปลอดภัย (ซึ่งได้รับการเข้ารหัสมาตรฐานความปลอดภัยสูงเพื่อป้องกันการเข้าถึง)
                </li>
                <li>
                  <strong class="text-foreground">ข้อมูลร้านค้าและการให้บริการ:</strong> ชื่อร้านค้า (ภาษาไทย/อังกฤษ/จีน), ลิงก์ร้านค้า, ประเภทของร้าน, ที่อยู่ตั้งของร้าน, ภาพโลโก้ และภาพถ่ายหน้าร้าน
                </li>
                <li>
                  <strong class="text-foreground">ข้อมูลการรับแจ้งเตือน:</strong> รหัสบัญชี LINE (LINE User ID) สำหรับใช้เชื่อมต่อระบบแจ้งเตือนออเดอร์เข้าสู่แอปพลิเคชัน LINE ของร้านค้าโดยตรง
                </li>
              </ul>
            </div>

            <!-- 2.2 Financial & Tax Data -->
            <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
              <h3 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span>🧾</span>
                <span>ข. ข้อมูลการเงินและการออกเอกสารทางภาษี (Billing & Invoicing):</span>
              </h3>
              <ul class="list-disc pl-5 space-y-1.5">
                <li>
                  <strong class="text-foreground">ข้อมูลใบเสร็จและใบกำกับภาษี:</strong> ชื่อบริษัทหรือนิติบุคคล, ที่อยู่จดทะเบียนภาษี, เลขประจำตัวผู้เสียภาษีอากร 13 หลัก, และหลักฐานการชำระเงิน
                </li>
                <li>
                  <strong class="text-foreground">ประวัติธุรกรรม:</strong> วันที่ชำระเงิน, เลขที่ใบเสร็จรับเงิน, ยอดรวมค่าบริการ และภาษีมูลค่าเพิ่ม (เราไม่มีการจัดเก็บข้อมูลบัตรเครดิตหรือข้อมูลความลับทางการเงินของท่านโดยตรง)
                </li>
              </ul>
            </div>

            <!-- 2.3 Menu & Order Data -->
            <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
              <h3 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span>🍽️</span>
                <span>ค. ข้อมูลเมนูอาหารและคำสั่งซื้อ (Menu & Orders):</span>
              </h3>
              <ul class="list-disc pl-5 space-y-1.5">
                <li>
                  <strong class="text-foreground">ข้อมูลเมนูของร้าน:</strong> ชื่ออาหาร, รายละเอียดส่วนผสม, ราคา, ระดับความเผ็ด, ตัวเลือกพิเศษ และข้อมูลสารก่อภูมิแพ้
                </li>
                <li>
                  <strong class="text-foreground">บันทึกคำสั่งซื้อ:</strong> หมายเลขโต๊ะ, รายการอาหารที่ลูกค้าเลือก, เวลาที่ทำรายการ, และสถานะการจัดส่งออเดอร์ เพื่อใช้ในการบริหารงานและสรุปยอดขายของร้าน
                </li>
              </ul>
            </div>

            <!-- 2.4 Customer Privacy -->
            <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
              <h3 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span>🛡️</span>
                <span>ง. สำหรับลูกค้าผู้สแกนดูเมนู (Customers / Tourists):</span>
              </h3>
              <ul class="list-disc pl-5 space-y-1.5">
                <li>
                  <strong class="text-foreground">นโยบายไม่เก็บข้อมูลส่วนบุคคล:</strong> การสแกนดูเมนูและการเลือกอาหารที่โต๊ะ <u>ไม่มีการจัดเก็บชื่อ เบอร์โทรศัพท์ หรือข้อมูลระบุตัวตนของลูกค้า</u> เพื่อคุ้มครองความเป็นส่วนตัวสูงสุดของผู้บริโภค
                </li>
              </ul>
            </div>

            <!-- 2.5 Computer Traffic Logs -->
            <div class="bg-muted/30 p-5 rounded-2xl border space-y-3">
              <h3 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span>🖥️</span>
                <span>จ. ข้อมูลจราจรทางคอมพิวเตอร์และความปลอดภัย (Technical Logs):</span>
              </h3>
              <ul class="list-disc pl-5 space-y-1.5">
                <li>
                  <strong class="text-foreground">ข้อมูลความปลอดภัย:</strong> หมายเลข IP Address, ชนิดของเบราว์เซอร์, เวลาการเข้าใช้งาน, และประวัติการทำรายการตามที่กฎหมายกำหนด
                </li>
              </ul>
            </div>

          </div>
        </section>

        <!-- 3. การปฏิบัติตาม พ.ร.บ. คอมพิวเตอร์ฯ (Computer Crimes Act Compliance & Log Retention) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 border-amber-500/30 bg-amber-500/5">
          <div class="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Server class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">3. การจัดเก็บข้อมูลจราจรทางคอมพิวเตอร์ (Log Retention under Computer Crime Act)</h2>
              <p class="text-xs text-muted-foreground">ข้อกำหนดตามมาตรา 26 แห่ง พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ. 2560</p>
            </div>
          </div>

          <div class="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>
              ตามที่กฎหมายกำหนดไว้ แพลตฟอร์ม ChiiMenu มีหน้าที่ต้องจัดเก็บบันทึกข้อมูลการจราจรทางคอมพิวเตอร์ (Computer Traffic Data) เพื่อความมั่นคงปลอดภัยของระบบ และเพื่อใช้เป็นหลักฐานยืนยันความถูกต้องในกรณีเกิดเหตุอาชญากรรมทางไซเบอร์:
            </p>
            <ul class="list-disc pl-5 space-y-1.5">
              <li><strong>ข้อมูลจราจรคอมพิวเตอร์ที่บันทึก:</strong> หมายเลข IP Address, วันและเวลาที่เข้าใช้งาน (Timestamp), ประวัติการล็อกอิน/ล็อกเอาต์, และประเภทของ Web Browser / User-Agent</li>
              <li><strong>ระยะเวลาการจัดเก็บบันทึก (Log Retention):</strong> บันทึกข้อมูลจราจรจะถูกจัดเก็บไว้อย่างปลอดภัยเป็นระยะเวลา <strong>ไม่น้อยกว่า 90 วัน</strong> (และอาจขยายเป็น 2 ปี ในกรณีที่มีคำสั่งจากพนักงานเจ้าหน้าที่ตามกฎหมาย)</li>
              <li><strong>การรักษาความลับของ Log:</strong> ข้อมูล Log ทั้งหมดถูกจัดเก็บในระบบคลาวด์ที่มีการจำกัดสิทธิ์การเข้าถึงอย่างเคร่งครัด และจะเปิดเผยต่อเจ้าหน้าที่รัฐที่มีอำนาจตามหมายศาลหรือคำสั่งที่ชอบด้วยกฎหมายเท่านั้น</li>
            </ul>
          </div>
        </section>

        <!-- 4. ข้อห้ามและการปฏิบัติตามกฎหมายของผู้ใช้ (User Conduct & Prohibited Content) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 border-rose-500/30 bg-rose-500/5">
          <div class="flex items-center gap-3.5 border-b border-rose-500/20 pb-4">
            <div class="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">4. ข้อห้ามและการไม่นำเข้าข้อมูลที่ผิดกฎหมาย (Strict Prohibited Actions)</h2>
              <p class="text-xs text-muted-foreground">ข้อกำหนดเพื่อป้องกันความรับผิดตาม พ.ร.บ. คอมพิวเตอร์ฯ มาตรา 14 และ 15</p>
            </div>
          </div>

          <div class="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>ผู้ใช้งานและร้านค้าตกลงว่าจะ <strong>ไม่กระทำการใดๆ</strong> ดังต่อไปนี้บนระบบของ ChiiMenu:</p>
            <ul class="list-disc pl-5 space-y-1.5">
              <li><strong>ห้ามนำเข้าข้อมูลเท็จหรือหลอกลวง:</strong> ห้ามลงรายการเมนู ราคา หรือโฆษณาอันเป็นเท็จที่ก่อให้เกิดความเสียหายแก่ผู้บริโภคหรือประชาชน</li>
              <li><strong>ห้ามละเมิดทรัพย์สินทางปัญญา:</strong> ห้ามใช้รูปภาพ เครื่องหมายการค้า หรือโลโก้ของผู้อื่นโดยไม่ได้รับอนุญาตตามกฎหมายลิขสิทธิ์</li>
              <li><strong>ห้ามนำเข้าภาพลามกอนาจารหรือขัดต่อศีลธรรม:</strong> ห้ามอัปโหลดรูปภาพหรือข้อความที่มีลักษณะลามก อนาจาร รุนแรง หรือกระทบต่อความมั่นคง</li>
              <li><strong>ห้ามเจาะระบบหรือโจมตีทางไซเบอร์:</strong> ห้ามทำการ Reverse Engineer, Injection, DDoS หรือการโจมตีใดๆ ที่ทำให้ระบบทำงานผิดปกติ</li>
            </ul>
            <div class="bg-rose-100/80 dark:bg-rose-950/60 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 font-bold text-xs mt-2">
              ⚠️ หากพบการฝ่าฝืน ChiiMenu ขอสงวนสิทธิ์ในการระงับการให้บริการ ปิดร้านค้าทันที และส่งมอบข้อมูลหลักฐานให้แก่เจ้าพนักงานตำรวจเพื่อดำเนินคดีตามกฎหมายอย่างเด็ดขาด
            </div>
          </div>
        </section>

        <!-- 5. การจำกัดความรับผิดสำหรับร้านอาหาร (Restaurant Ops & Allergy Disclaimer) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3.5 border-b pb-4">
            <div class="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">5. การจำกัดความรับผิดและข้อสงวนสิทธิ์ (Limitation of Liability & Allergen Disclaimer)</h2>
              <p class="text-xs text-muted-foreground">ข้อกำหนดความรับผิดชอบเกี่ยวกับการประกอบอาหารและข้อมูลโภชนาการ</p>
            </div>
          </div>

          <div class="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <ul class="list-disc pl-5 space-y-2">
              <li><strong>แพลตฟอร์มเป็นเพียงสื่อกลางดิจิทัล:</strong> ChiiMenu เป็นผู้ให้บริการซอฟต์แวร์ระบบแสดงเมนูอาหารและส่งข้อมูลคำสั่งซื้อเท่านั้น เราไม่มีส่วนเกี่ยวข้องกับการจัดเตรียม ปรุง จัดการวัตถุดิบ หรือการส่งมอบอาหารของร้านค้า</li>
              <li><strong>ข้อมูลสารก่อภูมิแพ้ (Allergens) และส่วนผสม:</strong> ร้านค้ามีหน้าที่ตรวจสอบความถูกต้องของข้อมูลส่วนผสมและสารก่อภูมิแพ้ (เช่น ถั่วลิสง, อาหารทะเล, นม, แป้งสาลี) ผู้บริโภคที่มีประวัติแพ้อาหารรุนแรงควรสอบถามพนักงานประจำร้านก่อนรับประทานอาหารทุกครั้ง</li>
              <li><strong>การแปลภาษาด้วยระบบ AI:</strong> ฟังก์ชันแปลภาษาอัตโนมัติ (AI Translation) เป็นเครื่องมืออำนวยความสะดวกเบื้องต้น ร้านค้ามีหน้าที่ตรวจทานความถูกต้องของชื่อเมนูและคำอธิบายอาหารก่อนเผยแพร่</li>
            </ul>
          </div>
        </section>

        <!-- 6. สิทธิของเจ้าของข้อมูลส่วนบุคคล (Your Rights under PDPA) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3.5 border-b pb-4">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">6. สิทธิของท่านภายใต้กฎหมาย PDPA (Data Subject Rights)</h2>
              <p class="text-xs text-muted-foreground">ท่านสามารถใช้สิทธิของท่านได้ตลอดเวลาผ่านช่องทางการติดต่อที่ระบุไว้</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div class="p-3.5 bg-muted/40 rounded-2xl border">
              <strong class="text-foreground block mb-1">1. สิทธิในการเข้าถึง (Right of Access)</strong>
              <span>ขอรับสำเนาข้อมูลส่วนบุคคลของท่านที่เราเก็บรักษาไว้</span>
            </div>
            <div class="p-3.5 bg-muted/40 rounded-2xl border">
              <strong class="text-foreground block mb-1">2. สิทธิในการแก้ไข (Right to Rectification)</strong>
              <span>ขอแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์</span>
            </div>
            <div class="p-3.5 bg-muted/40 rounded-2xl border">
              <strong class="text-foreground block mb-1">3. สิทธิในการลบข้อมูล (Right to Erasure)</strong>
              <span>ขอลบ ทำลาย หรือทำให้นิรนามเมื่อสิ้นสุดความจำเป็น</span>
            </div>
            <div class="p-3.5 bg-muted/40 rounded-2xl border">
              <strong class="text-foreground block mb-1">4. สิทธิในการเพิกถอนความยินยอม (Right to Withdraw Consent)</strong>
              <span>เพิกถอนความยินยอมที่เคยให้ไว้ได้ตลอดระยะเวลาการใช้งาน</span>
            </div>
          </div>
        </section>

        <!-- 7. การรักษาความมั่นคงปลอดภัย (Security Measures) -->
        <section class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3.5 border-b pb-4">
            <div class="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Lock class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">7. มาตรการรักษาความปลอดภัยของข้อมูล (Security Standards)</h2>
              <p class="text-xs text-muted-foreground">การปกป้องข้อมูลด้วยเทคโนโลยีระดับมาตรฐานสากล</p>
            </div>
          </div>

          <div class="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <p>เรานำมาตรการทางเทคนิคและการบริหารจัดการ (Technical & Organizational Measures) มาใช้เพื่อป้องกันการสูญหาย การเข้าถึง หรือการเปิดเผยโดยมิชอบ:</p>
            <ul class="list-disc pl-5 space-y-1">
              <li>การเข้ารหัสข้อมูลขณะส่งผ่านเครือข่ายด้วยโปรโตคอล <strong>HTTPS / TLS 1.3 Encryption 256-bit</strong></li>
              <li>การควบคุมสิทธิ์การเข้าถึงฐานข้อมูลแบบ <strong>Row Level Security (RLS)</strong> ป้องกันไม่ให้ร้านค้าเข้าถึงข้อมูลของร้านอื่นได้เด็ดขาด</li>
              <li>การสำรองข้อมูลรายวันแบบอัตโนมัติ (Automated Cloud Backups) และการตรวจสอบความปลอดภัยของเซิร์ฟเวอร์อย่างสม่ำเสมอ</li>
            </ul>
          </div>
        </section>

        <!-- 8. ช่องทางการติดต่อ (Official Contact & DPO) -->
        <section class="bg-gradient-to-br from-emerald-500/10 via-card to-emerald-500/5 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-sm shadow-emerald-200">
              <MessageSquare class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground">8. ช่องทางการติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (Contact & Support)</h2>
              <p class="text-xs text-muted-foreground">สอบถามข้อมูลเพิ่มเติม ร้องเรียน หรือใช้สิทธิทางกฎหมาย</p>
            </div>
          </div>

          <div class="p-4 bg-background border rounded-2xl space-y-3 text-xs sm:text-sm">
            <p class="text-muted-foreground">
              หากท่านมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการยื่นคำร้องขอใช้สิทธิตามกฎหมาย PDPA กรุณาติดต่อทีมงานและเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ได้ทาง:
            </p>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
              <div>
                <p class="font-bold text-foreground">ฝ่ายบริการลูกค้าและคุ้มครองข้อมูล (ChiiMenu Support)</p>
                <p class="text-muted-foreground text-xs">LINE Official Account: <strong>@819wgrsj</strong></p>
              </div>
              <a 
                href="https://line.me/R/ti/p/@819wgrsj" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2"
              >
                <span>💬 ติดต่อเจ้าหน้าที่ผ่าน LINE</span>
              </a>
            </div>
          </div>
        </section>

      </div>

      <!-- Back to Top / Home -->
      <div class="mt-12 text-center">
        <NuxtLink 
          to="/" 
          class="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl border transition-all"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>กลับไปยังหน้าหลัก ChiiMenu</span>
        </NuxtLink>
      </div>

    </main>
  </div>
</template>
