const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
// 🔒 รหัสผ่านเข้าจัดการหน้าเว็บ (สามารถเปลี่ยนได้ตามต้องการ)
const ADMIN_SECRET = process.env.ADMIN_SECRET || "mysecret123";

// รายชื่อบัญชีที่คุณต้องการสลับใช้งาน (สามารถเพิ่ม Account_3, Account_4 ได้)
let accounts = [
  { id: "Account_1", cookie: "", credits: 50, used: 0, status: "waiting_cookie" },
  { id: "Account_2", cookie: "", credits: 50, used: 0, status: "waiting_cookie" },
  { id: "Account_3", cookie: "", credits: 50, used: 0, status: "waiting_cookie" }
];

// รีเซ็ตโควต้าเครดิตฟรีทุกเที่ยงคืน
cron.schedule('0 0 * * *', () => {
  console.log("⏰ รีเซ็ตโควต้าประจำวันเรียบร้อยแล้ว");
  accounts.forEach(acc => {
    acc.used = 0;
    if (acc.cookie) acc.status = "active";
  });
});

function getNextAccount() {
  return accounts.find(acc => acc.status === "active" && acc.used < acc.credits && acc.cookie !== "");
}

// 🌐 1. หน้าเว็บ Dashboard สำหรับจัดการ Cookie และดูสถานะ
app.get('/', (req, res) => {
  const accountRows = accounts.map(acc => `
    <tr>
      <td><b>${acc.id}</b></td>
      <td>
        <span class="badge ${acc.cookie ? 'bg-success' : 'bg-warning'}">
          ${acc.cookie ? 'พร้อมใช้งาน' : 'ยังไม่มี Cookie'}
        </span>
      </td>
      <td>${acc.credits - acc.used} / ${acc.credits}</td>
      <td>
        <button onclick="fillForm('${acc.id}')" class="btn-sm">จัดการ Cookie</button>
      </td>
    </tr>
  `).join('');

  const accountOptions = accounts.map(acc => `<option value="${acc.id}">${acc.id}</option>`).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Flow Multi-Account Dashboard</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #f4f6f9; padding: 20px; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        h1 { color: #1a73e8; margin-top: 0; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background-color: #f8f9fa; }
        .badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; color: white; }
        .bg-success { background-color: #28a745; }
        .bg-warning { background-color: #ffc107; color: #333; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
        textarea { height: 90px; resize: vertical; }
        button { background-color: #1a73e8; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; width: 100%; }
        button:hover { background-color: #1557b0; }
        .btn-sm { padding: 6px 12px; width: auto; font-size: 12px; }
        .card { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Google Flow Cookie Manager</h1>
        
        <h3>📊 สถานะบัญชีทั้งหมด</h3>
        <table>
          <thead>
            <tr>
              <th>ชื่อบัญชี</th>
              <th>สถานะ Cookie</th>
              <th>เครดิตคงเหลือ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${accountRows}
          </tbody>
        </table>

        <div class="card">
          <h3>🔑 อัปเดต/ใส่ Cookie บัญชี</h3>
          <form id="cookieForm">
            <div class="form-group">
              <label>เลือกบัญชี:</label>
              <select id="account_id">${accountOptions}</select>
            </div>
            
            <div class="form-group">
              <label>รหัสผ่านแอดมิน (Admin Secret):</label>
              <input type="password" id="secret_key" placeholder="ใส่รหัสผ่านแอดมิน" required>
            </div>

            <div class="form-group">
              <label>ข้อความ Cookie (วางทั้งหมดได้เลย):</label>
              <textarea id="cookie" placeholder="วาง Cookie ที่ก๊อปปี้มาจากเบราว์เซอร์ตรงนี้..." required></textarea>
            </div>

            <button type="button" onclick="submitCookie()">💾 บันทึก Cookie</button>
          </form>
        </div>
      </div>

      <script>
        function fillForm(id) {
          document.getElementById('account_id').value = id;
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }

        async function submitCookie() {
          const account_id = document.getElementById('account_id').value;
          const secret_key = document.getElementById('secret_key').value;
          const cookie = document.getElementById('cookie').value;

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

            const data = await res.json();
            if (res.ok) {
              alert('✅ บันทึก Cookie เรียบร้อยแล้ว!');
              location.reload();
            } else {
              alert('❌ เกิดข้อผิดพลาด: ' + data.error);
            }
          } catch (err) {
            alert('❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 2. API รับข้อมูล Cookie จากหน้าเว็บ
app.post('/api/update-cookie', (req, res) => {
  const { account_id, cookie, secret_key } = req.body;

  if (secret_key !== ADMIN_SECRET) {
    return res.status(403).json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" });
  }

  const acc = accounts.find(a => a.id === account_id);
  if (acc) {
    acc.cookie = cookie;
    acc.status = "active";
    console.log(`✅ อัปเดต Cookie ให้ [${account_id}] เรียบร้อยแล้ว`);
    return res.json({ success: true });
  }

  return res.status(404).json({ error: "ไม่พบบัญชีนี้" });
});

// 3. API สำหรับสร้างวิดีโอ (สลับบัญชีให้อัตโนมัติ)
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  const account = getNextAccount();

  if (!account) {
    return res.status(429).json({ error: "ไม่มีบัญชีที่มี Cookie พร้อมใช้งาน หรือเครดิตฟรีวันนี้หมดแล้ว" });
  }

  try {
    const response = await axios.post('https://labs.google/api/flow/generate', 
      { prompt: prompt },
      {
        headers: {
          'Cookie': account.cookie,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
      }
    );

    account.used += 1;
    return res.json({
      success: true,
      account_used: account.id,
      credits_left: account.credits - account.used,
      data: response.data
    });

  } catch (error) {
    account.status = "error";
    return res.status(500).json({ error: "เกิดข้อผิดพลาดจากบัญชี " + account.id + ": " + error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
