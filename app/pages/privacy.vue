<script setup lang="ts">
import { ArrowLeft, ShieldCheck, Database, FileText, Share2, UserCheck, AlertCircle, MessageSquare } from 'lucide-vue-next'

useHead({
  title: 'นโยบายความเป็นส่วนตัว (Privacy Policy) - ChiiMenu',
  meta: [
    { name: 'description', content: 'นโยบายความเป็นส่วนตัวของ ChiiMenu ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/20 text-slate-800 dark:text-slate-300">
    <!-- Navbar -->
    <nav class="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div class="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium">
          <ArrowLeft class="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </NuxtLink>
        <div class="flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck class="w-5 h-5 text-primary" />
          ChiiMenu Legal
        </div>
      </div>
    </nav>

    <main class="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <!-- Header -->
      <header class="mb-16">
        <h1 class="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight leading-tight">
          นโยบายความเป็นส่วนตัว<br/>
          <span class="text-2xl md:text-3xl font-bold text-muted-foreground font-normal">(Privacy Policy)</span>
        </h1>
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
          <AlertCircle class="w-4 h-4" />
          ปรับปรุงล่าสุด: {{ new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </div>
      </header>

      <!-- Content -->
      <article class="space-y-12">
        <section>
          <p class="text-lg leading-relaxed text-muted-foreground">
            แพลตฟอร์ม ChiiMenu ("เรา", "พวกเรา", หรือ "แพลตฟอร์ม") ตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของท่าน นโยบายความเป็นส่วนตัวฉบับนี้จัดทำขึ้นเพื่ออธิบายถึงวิธีการที่เรารวบรวม ใช้งาน เปิดเผย และปกป้องข้อมูลส่วนบุคคลของท่าน ทั้งในฐานะ <strong>"ผู้ประกอบการร้านอาหาร"</strong> และ <strong>"ลูกค้าผู้ใช้บริการ"</strong> เพื่อให้สอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
        </section>

        <!-- Section 1 -->
        <section class="bg-card border border-border p-8 rounded-3xl shadow-sm">
          <div class="flex items-center gap-4 mb-6 text-foreground">
            <div class="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
              <Database class="w-6 h-6" />
            </div>
            <h2 class="text-2xl font-bold">1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม</h2>
          </div>
          <div class="space-y-6 text-muted-foreground leading-relaxed">
            <div>
              <h3 class="text-foreground font-bold mb-2">1.1 สำหรับผู้ประกอบการร้านอาหาร (Merchants)</h3>
              <ul class="list-disc pl-6 space-y-2">
                <li>ข้อมูลยืนยันตัวตนและการติดต่อ: ชื่อ-นามสกุล, ที่อยู่อีเมล, รหัสผ่าน (ผ่านการเข้ารหัส), และหมายเลขโทรศัพท์</li>
                <li>ข้อมูลการดำเนินธุรกิจ: ชื่อร้านอาหาร, ที่อยู่ร้านค้า, และบัญชี LINE OA เพื่อการแจ้งเตือน</li>
                <li>ข้อมูลการชำระเงิน: ประวัติการสมัครแพ็กเกจและการชำระเงิน (เราไม่เก็บข้อมูลบัตรเครดิตของท่านโดยตรง)</li>
              </ul>
            </div>
            <div>
              <h3 class="text-foreground font-bold mb-2">1.2 สำหรับลูกค้าผู้ใช้บริการ (Customers)</h3>
              <ul class="list-disc pl-6 space-y-2">
                <li>ข้อมูลการสั่งอาหาร: รายการอาหารที่สั่ง, หมายเลขโต๊ะ, และเวลาที่ทำรายการ</li>
                <li>ข้อมูลอุปกรณ์: ข้อมูลเบราว์เซอร์, ระบบปฏิบัติการ, และหมายเลข IP (เพื่อการวิเคราะห์และป้องกันการโจมตีทางไซเบอร์)</li>
                <li>เรา <strong>ไม่มีการเก็บบันทึก</strong> ชื่อ หมายเลขโทรศัพท์ หรือข้อมูลที่ระบุตัวตนของลูกค้าจากการสแกน QR Code สั่งอาหารตามปกติ เว้นแต่ร้านค้าจะมีการเปิดใช้ระบบสมาชิก (ซึ่งต้องได้รับความยินยอมแยกต่างหาก)</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Section 2 -->
        <section class="bg-card border border-border p-8 rounded-3xl shadow-sm">
          <div class="flex items-center gap-4 mb-6 text-foreground">
            <div class="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
              <FileText class="w-6 h-6" />
            </div>
            <h2 class="text-2xl font-bold">2. วัตถุประสงค์ในการประมวลผลข้อมูล</h2>
          </div>
          <p class="mb-4 text-muted-foreground">เรานำข้อมูลส่วนบุคคลของท่านไปใช้เพื่อวัตถุประสงค์ดังต่อไปนี้:</p>
          <ul class="list-disc pl-6 space-y-3 text-muted-foreground leading-relaxed">
            <li>เพื่อให้บริการแพลตฟอร์มจัดการเมนูดิจิทัลและระบบรับออเดอร์ตามสัญญาการให้บริการ</li>
            <li>เพื่อส่งการแจ้งเตือนแบบเรียลไทม์ (เช่น ออเดอร์ใหม่) ไปยังระบบหลังบ้านและ LINE Notification (ผ่าน LINE ID: @946vhuev)</li>
            <li>เพื่อการสนับสนุนทางเทคนิคและการตอบข้อซักถามของลูกค้า (ผ่าน LINE Support: @819wgrsj)</li>
            <li>เพื่อการจัดทำใบเสร็จรับเงิน เอกสารทางภาษี และการจัดการบัญชีตามกฎหมาย</li>
            <li>เพื่อพัฒนาและปรับปรุงประสิทธิภาพของระบบให้ดียิ่งขึ้น (Data Analytics)</li>
          </ul>
        </section>

        <!-- Section 3 -->
        <section class="bg-card border border-border p-8 rounded-3xl shadow-sm">
          <div class="flex items-center gap-4 mb-6 text-foreground">
            <div class="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
              <Share2 class="w-6 h-6" />
            </div>
            <h2 class="text-2xl font-bold">3. การเปิดเผยข้อมูลให้บุคคลที่สาม</h2>
          </div>
          <p class="text-muted-foreground leading-relaxed mb-4">
            เราขอยืนยันว่า <strong>เราจะไม่มีการนำข้อมูลของท่าน หรือข้อมูลลูกค้าของท่าน ไปจำหน่ายหรือเปิดเผยเพื่อผลประโยชน์ทางการค้าแก่บุคคลที่สามเด็ดขาด</strong> ยกเว้นในกรณีดังต่อไปนี้:
          </p>
          <ul class="list-disc pl-6 space-y-3 text-muted-foreground leading-relaxed">
            <li><strong>ผู้ให้บริการภายนอก (Service Providers):</strong> เช่น ผู้ให้บริการคลาวด์ (Cloud Hosting), ระบบฐานข้อมูล (Supabase), และระบบส่งข้อความ (LINE API) ซึ่งอยู่ภายใต้ข้อตกลงการรักษาความลับอย่างเข้มงวด</li>
            <li><strong>ตามข้อบังคับทางกฎหมาย:</strong> เมื่อได้รับการร้องขอจากหน่วยงานราชการ ศาล หรือเจ้าหน้าที่ที่มีอำนาจตามกฎหมาย</li>
          </ul>
        </section>

        <!-- Section 4 -->
        <section class="bg-card border border-border p-8 rounded-3xl shadow-sm">
          <div class="flex items-center gap-4 mb-6 text-foreground">
            <div class="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
              <ShieldCheck class="w-6 h-6" />
            </div>
            <h2 class="text-2xl font-bold">4. ระยะเวลาในการเก็บรักษาข้อมูล (Data Retention)</h2>
          </div>
          <ul class="list-disc pl-6 space-y-3 text-muted-foreground leading-relaxed">
            <li><strong>ข้อมูลบัญชีร้านค้า:</strong> จะถูกจัดเก็บไว้ตลอดระยะเวลาที่ท่านเป็นสมาชิก และจะถูกทำลายหรือทำให้เป็นข้อมูลนิรนาม (Anonymization) ภายใน 90 วัน หลังจากที่ท่านแจ้งยกเลิกการใช้งานอย่างถาวร</li>
            <li><strong>ข้อมูลประวัติการทำธุรกรรมและภาษี:</strong> เราจำเป็นต้องจัดเก็บข้อมูลที่เกี่ยวข้องกับการชำระเงินและใบกำกับภาษีไว้เป็นระยะเวลาอย่างน้อย 5-10 ปี ตามที่ประมวลรัษฎากรกำหนด</li>
            <li><strong>ข้อมูลออเดอร์ของลูกค้า:</strong> ข้อมูลรายการอาหารจะถูกจัดเก็บไว้เป็นประวัติการขายของร้านค้า (Sales History) โดยไม่มีข้อมูลระบุตัวตนบุคคลเชื่อมโยง</li>
          </ul>
        </section>

        <!-- Section 5 -->
        <section class="bg-card border border-border p-8 rounded-3xl shadow-sm">
          <div class="flex items-center gap-4 mb-6 text-foreground">
            <div class="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
              <UserCheck class="w-6 h-6" />
            </div>
            <h2 class="text-2xl font-bold">5. สิทธิของเจ้าของข้อมูล (User Rights)</h2>
          </div>
          <p class="text-muted-foreground leading-relaxed mb-4">ภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล ท่านมีสิทธิดังต่อไปนี้:</p>
          <ul class="list-disc pl-6 space-y-3 text-muted-foreground leading-relaxed">
            <li><strong>สิทธิในการเข้าถึง:</strong> ขอเข้าถึงหรือขอรับสำเนาข้อมูลส่วนบุคคลของท่าน</li>
            <li><strong>สิทธิในการแก้ไข:</strong> ขอให้เราแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง เป็นปัจจุบัน</li>
            <li><strong>สิทธิในการลบข้อมูล (Right to be Forgotten):</strong> ขอให้เราลบหรือทำลายข้อมูลส่วนบุคคลของท่าน เมื่อหมดความจำเป็น</li>
            <li><strong>สิทธิในการเพิกถอนความยินยอม:</strong> ท่านสามารถเพิกถอนความยินยอมในการให้ประมวลผลข้อมูลได้ตลอดเวลา</li>
          </ul>
        </section>

        <!-- Section 6 (Contact) -->
        <section class="bg-primary/5 border border-primary/20 p-8 rounded-3xl">
          <h2 class="text-2xl font-bold text-foreground mb-4">6. ช่องทางการติดต่อเรา</h2>
          <p class="text-muted-foreground leading-relaxed mb-6">
            หากท่านมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวฉบับนี้ หรือต้องการใช้สิทธิในฐานะเจ้าของข้อมูล กรุณาติดต่อเราผ่านช่องทาง:
          </p>
          <div class="bg-card p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div class="w-16 h-16 bg-[#00B900]/10 text-[#00B900] rounded-full flex items-center justify-center shrink-0">
              <MessageSquare class="w-8 h-8" />
            </div>
            <div>
              <h3 class="font-bold text-lg text-foreground mb-1">LINE Official Account (Support)</h3>
              <p class="text-muted-foreground mb-2">สอบถามข้อมูล แจ้งปัญหา หรือขอลบข้อมูล</p>
              <div class="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-foreground font-mono font-medium">
                @819wgrsj (AskChiiMenu)
              </div>
            </div>
          </div>
        </section>

      </article>
      
      <!-- Footer Spacer -->
      <div class="h-24"></div>
    </main>
  </div>
</template>
