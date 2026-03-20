export function printReport(title: string, bodyHtml: string) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Попап хориглогдсон байна. Хөтчийн тохиргооноос зөвшөөрнө үү.");
    return;
  }

  const now = new Date().toLocaleString("mn-MN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const html = [
    "<!DOCTYPE html><html lang='mn'><head><meta charset='utf-8'>",
    "<title>" + title + "</title>",
    "<style>",
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 24px 32px; }",
    ".header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }",
    ".company { font-size: 15px; font-weight: bold; }",
    ".sub { font-size: 10px; color: #555; margin-top: 2px; }",
    ".report-title { font-size: 17px; font-weight: bold; text-align: center; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }",
    ".stat-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }",
    ".stat-box { border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; min-width: 110px; flex: 1; }",
    ".stat-val { font-size: 20px; font-weight: bold; }",
    ".stat-lbl { font-size: 10px; color: #555; margin-top: 2px; }",
    "table { width: 100%; border-collapse: collapse; margin-top: 10px; }",
    "thead { background: #f0f0f0; }",
    "th { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; font-weight: bold; text-align: left; }",
    "td { border: 1px solid #ddd; padding: 5px 8px; font-size: 11px; }",
    "tr:nth-child(even) { background: #f9f9f9; }",
    ".badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; }",
    ".ok   { background: #d1fae5; color: #065f46; }",
    ".warn { background: #fef3c7; color: #92400e; }",
    ".fail { background: #fee2e2; color: #991b1b; }",
    ".gray { background: #f3f4f6; color: #374151; }",
    ".section-title { font-size: 13px; font-weight: bold; margin: 16px 0 6px; border-left: 3px solid #d97706; padding-left: 8px; }",
    ".footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 10px; color: #777; display: flex; justify-content: space-between; }",
    ".print-btn { display: block; margin: 0 auto 18px; padding: 9px 26px; background: #d97706; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; }",
    "@media print { .print-btn { display: none !important; } }",
    "</style></head><body>",
    "<button class='print-btn' onclick='window.print()'>PDF хэвлэх / Хадгалах</button>",
    "<div class='header'>",
    "<div><div class='company'>ХӨВСГӨЛ ЗАМ ХХК</div><div class='sub'>Зам гүүр, барилга угсралтын компани · Мөрөн, Хөвсгөл аймаг</div></div>",
    "<div style='text-align:right'><div class='sub'>Тайлан гаргасан:</div><div style='font-size:11px;font-weight:bold'>" + now + "</div></div>",
    "</div>",
    "<div class='report-title'>" + title + "</div>",
    bodyHtml,
    "<div class='footer'><span>Зам гүүр, барилга угсралтын Хөвсгөл зам ХХК &copy; " + new Date().getFullYear() + "</span><span>Хэвлэсэн: " + now + "</span></div>",
    "</body></html>",
  ].join("");

  w.document.write(html);
  w.document.close();
  w.focus();
}
