const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "mysecret123";

// ตารางราคาเครดิต
const CREDIT_COSTS = {
  image: 0,
  video: {
    "Omni Flash": 12,
    "Veo 3.1 Lite": 10,
    "Veo 3.1 - Lite": 10,
    "Veo 3.1 Fast": 20,
    "Veo 3.1 - Fast": 20,
    "Veo 3.1 Quality": 100,
    "Veo 3.1 - Quality": 100
  }
};

let accounts = [
  { id: "Account_1", cookie: "", credits: 50, used: 0, status: "waiting_cookie" },
  { id: "Account_2", cookie: "", credits: 50, used: 0, status: "waiting_cookie" },
  { id: "Account_3", cookie: "", credits: 50, used: 0, status: "waiting_cookie" }
];

// รีเซ็ตเครดิตทุกเที่ยงคืน
cron.schedule('0 0 * * *', () => {
  accounts.forEach(acc => {
    acc.used = 0;
    if (acc.cookie) acc.status = "active";
  });
});

function calculateCost(type, model) {
  if (type === "image") return 0;
  if (type === "video") return CREDIT_COSTS.video[model] || 10;
  return 0;
}

function getAvailableAccount(cost) {
  return accounts.find(acc => acc.status === "active" && (acc.credits - acc.used) >= cost && acc.cookie !== "");
}

// 🌐 หน้าเว็บ Dashboard สไตล์ ClipFlow TH
app.get('/', (req, res) => {
  const accountCards = accounts.map(acc => {
    const remaining = acc.credits - acc.used;
    const percent = Math.max(0, Math.min(100, (remaining / acc.credits) * 100));
    const isReady = acc.cookie !== "";

    return `
      <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500'}"></span>
            <span class="font-bold text-white">${acc.id}</span>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full ${isReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
            ${isReady ? 'พร้อมใช้งาน' : 'รอ Cookie'}
          </span>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between text-xs text-slate-400">
            <span>เครดิตคงเหลือ</span>
            <span class="font-semibold text-slate-200">${remaining} / ${acc.credits} $</span>
          </div>
          <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style="width: ${percent}%"></div>
          </div>
        </div>

        <button onclick="selectAccountForCookie('${acc.id}')" class="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition border border-slate-700">
          🔑 จัดการ Cookie
        </button>
      </div>
    `;
  }).join('');

  const accountOptions = accounts.map(acc => `<option value="${acc.id}">${acc.id}</option>`).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="th" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ClipFlow TH - AI Studio Proxy</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Prompt', sans-serif; }
      </style>
    </head>
    <body class="bg-[#0b0f17] text-slate-100 min-h-screen pb-12 selection:bg-blue-500 selection:text-white">
      
      <!-- Navbar -->
      <nav class="border-b border-slate-800/80 bg-[#0b0f17]/80 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
              CF
            </div>
            <div>
              <h1 class="font-bold text-lg leading-none bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">ClipFlow TH</h1>
              <p class="text-[10px] text-slate-400 tracking-wider font-light">MULTI-ACCOUNT AI PROXY SYSTEM</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Google Flow Connected
            </span>
          </div>
        </div>
      </nav>

      <main class="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        
        <!-- Status Header -->
        <section>
          <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📊 Status & Accounts</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${accountCards}
          </div>
        </section>

        <!-- Studio Generator Section -->
        <section class="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>✨ AI Generator Studio</span>
            </h2>
          </div>

          <!-- Type Tabs -->
          <div class="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 max-w-md mb-6">
            <button id="tab-image" onclick="switchType('image')" class="flex-1 py-2 text-sm font-semibold rounded-lg transition bg-blue-600 text-white shadow-md">
              🖼️ สร้างภาพ (ฟรี 0$)
            </button>
            <button id="tab-video" onclick="switchType('video')" class="flex-1 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition">
              🎬 สร้างวิดีโอ
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Model Select -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-2">โมเดล AI (Model)</label>
              <select id="gen_model" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-200">
                <!-- Auto Loaded -->
              </select>
            </div>

            <!-- Aspect Ratio Select -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-2">อัตราส่วนภาพ (Aspect Ratio)</label>
              <select id="gen_aspect" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition text-slate-200">
                <option value="16:9">16:9 (แนวนอนมาตรฐาน)</option>
                <option value="9:16">9:16 (แนวตั้ง TikTok/Reels)</option>
                <option value="1:1">1:1 (สี่เหลี่ยมจัตุรัส)</option>
                <option value="4:3">4:3 (คลาสสิก)</option>
                <option value="3:4">3:4 (แนวตั้งพอร์เทรต)</option>
              </select>
            </div>
          </div>

          <!-- Prompt Box -->
          <div class="mb-6">
            <label class="block text-xs font-semibold text-slate-300 mb-2">คำสั่งสร้างภาพ/วิดีโอ (Prompt)</label>
            <textarea id="gen_prompt" rows="3" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition text-slate-100 placeholder-slate-600" placeholder="อธิบายรายละเอียดรูปภาพหรือวิดีโอที่คุณต้องการสร้าง... (ภาษาไทย หรือ อังกฤษ)"></textarea>
          </div>

          <!-- Generate Button -->
          <button onclick="generateContent()" class="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 font-bold text-white rounded-xl shadow-lg shadow-blue-500/25 transition transform active:scale-[0.99] flex items-center justify-center gap-2">
            <span>🚀 สั่งสร้างผลงาน</span>
          </button>

          <!-- Result Output -->
          <div id="resultBox" class="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto hidden"></div>
        </section>

        <!-- Cookie Manager Section -->
        <section class="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🔑 Cookie Management Panel</span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label class="block text-xs text-slate-400 mb-1">เลือกบัญชี</label>
              <select id="cookie_account" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200">
                ${accountOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">รหัสผ่านแอดมิน (Admin Secret)</label>
              <input type="password" id="cookie_secret" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200" placeholder="ใส่รหัสผ่านแอดมิน">
            </div>
            <div class="md:col-span-3">
              <label class="block text-xs text-slate-400 mb-1">ข้อความ Cookie</label>
              <textarea id="cookie_value" rows="3" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600" placeholder="วาง Cookie ที่คัดลอกมา..."></textarea>
            </div>
          </div>

          <button onclick="submitCookie()" class="w-full md:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white rounded-lg transition">
            💾 บันทึกข้อมูล Cookie
          </button>
        </section>

      </main>

      <script>
        let currentType = 'image';

        function switchType(type) {
          currentType = type;
          const tabImage = document.getElementById('tab-image');
          const tabVideo = document.getElementById('tab-video');
          const modelSelect = document.getElementById('gen_model');

          if (type === 'image') {
            tabImage.className = "flex-1 py-2 text-sm font-semibold rounded-lg transition bg-blue-600 text-white shadow-md";
            tabVideo.className = "flex-1 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition";
            
            modelSelect.innerHTML = \`
              <option value="Nano Banana Pro">Nano Banana Pro (ฟรี 0$)</option>
              <option value="Nano Banana 2">Nano Banana 2 (ฟรี 0$)</option>
              <option value="Nano Banana 2 Lite">Nano Banana 2 Lite (ฟรี 0$)</option>
            \`;
          } else {
            tabVideo.className = "flex-1 py-2 text-sm font-semibold rounded-lg transition bg-blue-600 text-white shadow-md";
            tabImage.className = "flex-1 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition";

            modelSelect.innerHTML = \`
              <option value="Veo 3.1 Lite">Veo 3.1 Lite (หัก 10$)</option>
              <option value="Omni Flash">Omni Flash (หัก 12$)</option>
              <option value="Veo 3.1 Fast">Veo 3.1 Fast (หัก 20$)</option>
              <option value="Veo 3.1 Quality">Veo 3.1 Quality (หัก 100$)</option>
            \`;
          }
        }
        switchType('image');

        function selectAccountForCookie(id) {
          document.getElementById('cookie_account').value = id;
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }

        async function submitCookie() {
          const account_id = document.getElementById('cookie_account').value;
          const secret_key = document.getElementById('cookie_secret').value;
          const cookie = document.getElementById('cookie_value').value;

          if (!secret_key || !cookie) {
            alert('กรุณากรอกรหัสผ่านและ Cookie ให้ครบถ้วน');
            return;
          }

          try {
            const res = await fetch('/api/update-cookie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ account_id, secret_key, cookie })
            });

            if (res.ok) {
              alert('✅ บันทึก Cookie เรียบร้อยแล้ว!');
              location.reload();
            } else {
              const data = await res.json();
              alert('❌ เกิดข้อผิดพลาด: ' + data.error);
            }
          } catch (err) {
            alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
          }
        }

        async function generateContent() {
          const model = document.getElementById('gen_model').value;
          const aspect_ratio = document.getElementById('gen_aspect').value;
          const prompt = document.getElementById('gen_prompt').value;
          const resultBox = document.getElementById('resultBox');

          if (!prompt) {
            alert('กรุณากรอก Prompt');
            return;
          }

          resultBox.classList.remove('hidden');
          resultBox.innerText = '⏳ กำลังส่งคำขอไปยัง Google Flow และเลือกบัญชีที่เครดิตพอให้อัตโนมัติ...';

          try {
            const res = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: currentType, model, aspect_ratio, prompt })
            });

            const data = await res.json();
            if (res.ok) {
              resultBox.innerText = '✅ สร้างผลงานสำเร็จ!\n' +
                '• บัญชีที่ใช้: ' + data.account_used + '\n' +
                '• เครดิตที่หัก: ' + data.cost_deducted + '$\n' +
                '• เครดิตคงเหลือในบัญชีนี้: ' + data.credits_left + '$\n\n' +
                JSON.stringify(data.data, null, 2);
            } else {
              resultBox.innerText = '❌ ข้อผิดพลาด: ' + data.error;
            }
          } catch (err) {
            resultBox.innerText = '❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API รับ Cookie
app.post('/api/update-cookie', (req, res) => {
  const { account_id, cookie, secret_key } = req.body;
  if (secret_key !== ADMIN_SECRET) return res.status(403).json({ error: "รหัสผ่านไม่ถูกต้อง" });

  const acc = accounts.find(a => a.id === account_id);
  if (acc) {
    acc.cookie = cookie;
    acc.status = "active";
    return res.json({ success: true });
  }
  return res.status(404).json({ error: "ไม่พบบัญชี" });
});

// API สร้างผลงาน
app.post('/api/generate', async (req, res) => {
  const { prompt, type = "image", model = "Nano Banana Pro", aspect_ratio = "16:9" } = req.body;

  if (!prompt) return res.status(400).json({ error: "โปรดระบุ prompt" });

  const cost = calculateCost(type, model);
  const account = getAvailableAccount(cost);

  if (!account) {
    return res.status(429).json({ 
      error: `ไม่มีบัญชีที่มีเครดิตเพียงพอสำหรับการใช้งานนี้ (ต้องการ ${cost}$ เครดิต)` 
    });
  }

  try {
    const response = await axios.post('https://labs.google/api/flow/generate', 
      { prompt, type, model, aspect_ratio },
      {
        headers: {
          'Cookie': account.cookie,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
      }
    );

    account.used += cost;

    return res.json({
      success: true,
      account_used: account.id,
      cost_deducted: cost,
      credits_left: account.credits - account.used,
      data: response.data
    });

  } catch (error) {
    account.status = "error";
    return res.status(500).json({ error: "เกิดข้อผิดพลาดจาก " + account.id + ": " + error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
