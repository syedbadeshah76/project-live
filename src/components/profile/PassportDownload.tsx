import { useCallback } from "react";

interface PassportData {
  name: string;
  email: string;
  avatar: string;
  memberSince: string;
  status: string;
  stamps?: { title: string; date: string }[];
}

const PASSPORT_W = 600;
const PASSPORT_H = 920;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Generate simple sharp QR code pattern for canvas pointing to https://edvanz.co
function drawQRCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  // Container box
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, x - 6, y - 6, size + 12, size + 12, 10);
  ctx.fill();
  ctx.strokeStyle = "#e0e7ff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // QR Modules Matrix representation
  const modules = 21;
  const cellSize = size / modules;
  ctx.fillStyle = "#2563EB";

  // Functional QR simulation grid for edvanz.co
  const qrGrid = [
    [1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,1,0,1,0,1,1,1,0,0,1,0,1,1,0,1,1,0,1,1,0],
    [0,1,1,0,1,0,0,1,1,1,0,1,0,0,1,0,0,1,0,1,1],
    [1,0,0,1,1,1,1,0,1,0,1,1,0,1,0,1,1,0,1,0,0],
    [0,1,1,0,0,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,1,0,0,1,1,0,0,1],
    [0,0,0,0,0,0,0,0,1,0,1,0,1,1,1,0,1,0,1,1,0],
    [1,1,1,1,1,1,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,1,1,0,1,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,0,1,1,1,0,1,1,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,0,1,0,0,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,0,1,1,1,0,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,0,1,0,1,0,0,1,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,1]
  ];

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (qrGrid[r]?.[c] === 1) {
        ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize - 0.2, cellSize - 0.2);
      }
    }
  }
}

async function drawPassportPage(
  ctx: CanvasRenderingContext2D,
  data: PassportData
) {
  const w = PASSPORT_W;
  const h = PASSPORT_H;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#FAF8FF");
  bgGrad.addColorStop(0.5, "#F6F8FF");
  bgGrad.addColorStop(1, "#EDF2FF");
  ctx.fillStyle = bgGrad;
  drawRoundedRect(ctx, 0, 0, w, h, 36);
  ctx.fill();

  // Subtle Outer Border
  ctx.strokeStyle = "rgba(199, 210, 254, 0.8)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 1, 1, w - 2, h - 2, 36);
  ctx.stroke();

  // Header: EZ Logo badge
  const logoGrad = ctx.createLinearGradient(195, 45, 235, 85);
  logoGrad.addColorStop(0, "#2D4BFF");
  logoGrad.addColorStop(1, "#8042FF");
  ctx.fillStyle = logoGrad;
  drawRoundedRect(ctx, 210, 45, 38, 38, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 16px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EZ", 229, 65);

  // EDVANZ text
  const textGrad = ctx.createLinearGradient(258, 0, 390, 0);
  textGrad.addColorStop(0, "#2D4BFF");
  textGrad.addColorStop(1, "#8042FF");
  ctx.fillStyle = textGrad;
  ctx.font = "italic 900 32px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("EDVANZ", 258, 65);

  // Beyond Learning.
  ctx.fillStyle = "#8042FF";
  ctx.font = "italic bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Beyond Learning.", w / 2, 108);

  // PASSPORT Title
  const titleGrad = ctx.createLinearGradient(120, 0, 480, 0);
  titleGrad.addColorStop(0, "#2D4BFF");
  titleGrad.addColorStop(0.5, "#4F46E5");
  titleGrad.addColorStop(1, "#8042FF");
  ctx.fillStyle = titleGrad;
  ctx.font = "900 44px Arial, sans-serif";
  ctx.letterSpacing = "10px";
  ctx.fillText("PASSPORT", w / 2, 160);

  // Slogan: LEARN • ACHIEVE • GROW
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("LEARN   •   ACHIEVE   •   GROW", w / 2, 196);
  ctx.letterSpacing = "0px";

  // Middle Section: Photo on Left
  const photoX = 40;
  const photoY = 240;
  const photoW = 210;
  const photoH = 280;

  // Photo Frame
  ctx.fillStyle = "#EEF2FF";
  drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
  ctx.fill();
  ctx.strokeStyle = "#C7D2FE";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Avatar Image if possible, otherwise draw stylish initials avatar
  let imageDrawn = false;
  if (data.avatar) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = data.avatar;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        setTimeout(() => reject(), 2000);
      });
      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 24);
      ctx.clip();
      ctx.drawImage(img, photoX, photoY, photoW, photoH);
      ctx.restore();
      imageDrawn = true;
    } catch {
      imageDrawn = false;
    }
  }

  if (!imageDrawn) {
    ctx.fillStyle = "#4F46E5";
    ctx.font = "900 72px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.name.charAt(0).toUpperCase(), photoX + photoW / 2, photoY + photoH / 2 - 10);
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillStyle = "#818CF8";
    ctx.fillText("PASSPORT PHOTO", photoX + photoW / 2, photoY + photoH / 2 + 50);
  }

  // Right: Globe Watermark
  ctx.save();
  ctx.strokeStyle = "rgba(99, 102, 241, 0.18)";
  ctx.lineWidth = 1.5;
  const gX = 460;
  const gY = 380;
  const gR = 120;
  ctx.beginPath();
  ctx.arc(gX, gY, gR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(gX, gY, gR, 55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(gX, gY, 55, gR, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gX - gR, gY);
  ctx.lineTo(gX + gR, gY);
  ctx.stroke();
  ctx.fillStyle = "rgba(99, 102, 241, 0.12)";
  ctx.font = "italic 900 64px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("EZ", gX, gY + 22);
  ctx.restore();

  // Right: Data Fields
  const startFieldX = 280;
  let fieldY = 285;

  // Field: NAME
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#6366F1";
  ctx.font = "900 13px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("NAME", startFieldX, fieldY);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#0F172A";
  ctx.font = "900 22px Arial, sans-serif";
  ctx.fillText(data.name.toUpperCase(), startFieldX, fieldY + 30);

  // Field: MEMBER SINCE
  fieldY += 80;
  ctx.fillStyle = "#6366F1";
  ctx.font = "900 13px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("MEMBER SINCE", startFieldX, fieldY);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#0F172A";
  ctx.font = "900 22px Arial, sans-serif";
  ctx.fillText(data.memberSince.toUpperCase(), startFieldX, fieldY + 30);

  // Field: STATUS
  fieldY += 80;
  ctx.fillStyle = "#6366F1";
  ctx.font = "900 13px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("STATUS", startFieldX, fieldY);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#0F172A";
  ctx.font = "900 22px Arial, sans-serif";
  ctx.fillText(data.status.toUpperCase(), startFieldX, fieldY + 30);

  // Divider Line
  ctx.strokeStyle = "#E0E7FF";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 580);
  ctx.lineTo(w - 40, 580);
  ctx.stroke();

  // Bottom Commitment: Globe badge + slogan on left
  const iconGrad = ctx.createLinearGradient(40, 620, 105, 685);
  iconGrad.addColorStop(0, "#4F46E5");
  iconGrad.addColorStop(1, "#7C3AED");
  ctx.fillStyle = iconGrad;
  drawRoundedRect(ctx, 40, 625, 65, 65, 18);
  ctx.fill();

  // Globe icon
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(72, 657, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(72, 657, 18, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(72, 657, 8, 18, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Slogan Text
  ctx.fillStyle = "#0F172A";
  ctx.font = "900 15px Arial, sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillText("YOUR JOURNEY", 120, 652);
  ctx.fillText("OUR COMMITMENT.", 120, 676);
  ctx.letterSpacing = "0px";

  // QR Code on right pointing to https://edvanz.co
  drawQRCode(ctx, w - 145, 615, 88);

  // Bottom Ribbon: EDVANZ EDUCATION ECOSYSTEM
  const botGrad = ctx.createLinearGradient(0, 0, w, 0);
  botGrad.addColorStop(0, "#2563EB");
  botGrad.addColorStop(0.5, "#4F46E5");
  botGrad.addColorStop(1, "#8042FF");
  ctx.fillStyle = botGrad;

  // Fill bottom rounded corners
  ctx.save();
  drawRoundedRect(ctx, 0, 0, w, h, 36);
  ctx.clip();
  ctx.fillRect(0, h - 60, w, 60);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EDVANZ EDUCATION ECOSYSTEM", w / 2, h - 30);
}

export function usePassportDownload() {
  const download = useCallback(async (data: PassportData) => {
    const canvas = document.createElement("canvas");
    canvas.width = PASSPORT_W * 2;
    canvas.height = PASSPORT_H * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    await drawPassportPage(ctx, data);

    const link = document.createElement("a");
    link.download = `${data.name.replace(/\s+/g, "_")}_Skill_Passport.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return { downloadPassport: download };
}

