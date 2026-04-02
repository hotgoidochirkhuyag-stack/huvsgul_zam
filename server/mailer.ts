import nodemailer from "nodemailer";

const COMPANY_EMAIL = "huvsgulzamllc@gmail.com";

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendMail(subject: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    console.log("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD тохируулаагүй — имэйл илгээгээгүй:", subject);
    return;
  }
  try {
    await transport.sendMail({
      from: `"Хөвсгөл Зам ERP" <${process.env.GMAIL_USER}>`,
      to: COMPANY_EMAIL,
      subject,
      html,
    });
    console.log("[mailer] Имэйл илгээгдлээ:", subject);
  } catch (e) {
    console.error("[mailer] Имэйл илгээхэд алдаа:", e);
  }
}

function row(label: string, value: string | number | undefined | null) {
  if (!value && value !== 0) return "";
  return `<tr><td style="padding:6px 12px;color:#888;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#1a1a1a;font-weight:600">${value}</td></tr>`;
}

function table(rows: string) {
  return `<table style="border-collapse:collapse;width:100%;background:#f9f9f9;border-radius:8px;overflow:hidden;margin-top:12px">${rows}</table>`;
}

function card(title: string, color: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
      <div style="background:${color};padding:20px 24px">
        <h2 style="margin:0;color:#fff;font-size:18px">${title}</h2>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px">Хөвсгөл Зам ХХК — ERP мэдэгдэл</p>
      </div>
      <div style="padding:20px 24px">${body}</div>
      <div style="padding:12px 24px;background:#f5f5f5;font-size:12px;color:#999;text-align:center">
        Энэ имэйл автоматаар илгээгдсэн. Хөвсгөл Зам ХХК ERP систем.
      </div>
    </div>`;
}

export async function notifyNewContact(c: {
  name: string; email: string; phone?: string | null; message: string; type?: string | null;
}) {
  const subject = `📬 Шинэ харилцагч маягт — ${c.name} (${c.type ?? "Холбоо барих"})`;
  const html = card(
    "Шинэ харилцагч маягт ирлээ",
    "#0f172a",
    table(
      row("Нэр", c.name) +
      row("Имэйл", c.email) +
      row("Утас", c.phone ?? "—") +
      row("Төрөл", c.type ?? "Холбоо барих") +
      row("Мессеж", c.message)
    )
  );
  await sendMail(subject, html);
}

export async function notifyNewQuote(q: {
  name: string; phone?: string | null; email?: string | null; company?: string | null;
  product: string; quantity?: string | null; unit?: string | null;
  unitPrice?: string | null; totalAmount?: number; deliveryAddress?: string | null; note?: string | null;
}) {
  const subject = `💰 Шинэ үнийн санал хүсэлт — ${q.name} (${q.product})`;
  const total = q.totalAmount ? q.totalAmount.toLocaleString("mn-MN") + "₮" : "—";
  const html = card(
    "Шинэ үнийн санал хүсэлт",
    "#d97706",
    table(
      row("Нэр", q.name) +
      row("Утас", q.phone) +
      row("Имэйл", q.email) +
      row("Байгууллага", q.company) +
      row("Бүтээгдэхүүн", q.product) +
      row("Тоо хэмжээ", `${q.quantity ?? "—"} ${q.unit ?? ""}`) +
      row("Нийт дүн", total) +
      row("Хүргэлтийн хаяг", q.deliveryAddress) +
      row("Нэмэлт тэмдэглэл", q.note)
    )
  );
  await sendMail(subject, html);
}

export async function notifyNewSalesOrder(o: {
  id?: number; customerName: string; product: string;
  quantity?: number | null; unit?: string | null;
  pricePerUnit?: number | null; status?: string | null;
}) {
  const subject = `📦 Шинэ борлуулалтын захиалга #${o.id ?? "?"} — ${o.customerName}`;
  const total = o.pricePerUnit && o.quantity
    ? (o.pricePerUnit * o.quantity).toLocaleString("mn-MN") + "₮"
    : "—";
  const html = card(
    "Шинэ борлуулалтын захиалга",
    "#1e40af",
    table(
      row("Захиалгын дугаар", `#${o.id ?? "?"}`) +
      row("Харилцагч", o.customerName) +
      row("Бүтээгдэхүүн", o.product) +
      row("Тоо хэмжээ", `${o.quantity ?? "—"} ${o.unit ?? ""}`) +
      row("Нийт дүн", total) +
      row("Статус", o.status ?? "—")
    )
  );
  await sendMail(subject, html);
}

export async function notifyNewContract(c: {
  contractNo?: string; clientName: string; clientEmail?: string | null;
  clientPhone?: string | null; product?: string | null;
  quantity?: number | null; unit?: string | null;
  totalAmount?: number | null;
}) {
  const subject = `📝 Шинэ гэрээ бүртгэгдлээ — ${c.contractNo ?? ""} · ${c.clientName}`;
  const total = c.totalAmount ? c.totalAmount.toLocaleString("mn-MN") + "₮" : "—";
  const html = card(
    "Шинэ онлайн гэрээ бүртгэгдлээ",
    "#065f46",
    table(
      row("Гэрээний дугаар", c.contractNo) +
      row("Харилцагч", c.clientName) +
      row("Имэйл", c.clientEmail) +
      row("Утас", c.clientPhone) +
      row("Бүтээгдэхүүн", c.product) +
      row("Тоо хэмжээ", `${c.quantity ?? "—"} ${c.unit ?? ""}`) +
      row("Нийт дүн", total)
    )
  );
  await sendMail(subject, html);
}
