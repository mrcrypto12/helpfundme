import { IReceipt } from '../types';
import { formatCurrency, formatDate } from './helpers';

const fitLines = (ctx: CanvasRenderingContext2D, value: string, width: number): string[] => {
  const words = value.trim().split(/\s+/);
  const lines = ['', ''];
  for (const word of words) {
    const index = ctx.measureText(`${lines[0]} ${word}`.trim()).width <= width ? 0 : 1;
    lines[index] = `${lines[index]} ${word}`.trim();
  }
  while (ctx.measureText(lines[1]).width > width && lines[1].length > 1) {
    lines[1] = lines[1].slice(0, -2).trimEnd() + '…';
  }
  return lines.filter(Boolean);
};

export const createReceiptShareImage = async (receipt: IReceipt): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');

  ctx.fillStyle = '#F5F7F4';
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#103D2B';
  ctx.fillRect(0, 0, 1080, 220);
  try {
    const logo = new Image();
    logo.src = '/logos.png';
    await logo.decode();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(78, 62, 96, 96);
    ctx.drawImage(logo, 82, 66, 88, 88);
  } catch {
    // The share image still works if the decorative logo cannot load.
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText('HelpFundMe', 198, 130);
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText('A little help can change everything', 198, 170);

  ctx.fillStyle = '#E4F4E7';
  ctx.beginPath();
  ctx.arc(540, 340, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1B8A2A';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(507, 339);
  ctx.lineTo(531, 362);
  ctx.lineTo(577, 317);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#103D2B';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText('I supported a cause today', 540, 460);
  ctx.fillStyle = '#4D586A';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('Together, we can make a difference.', 540, 518);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(80, 570, 920, 320);
  ctx.fillStyle = '#5C6478';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText('DONATION', 540, 630);
  ctx.fillStyle = '#1B8A2A';
  ctx.font = 'bold 82px Arial, sans-serif';
  ctx.fillText(formatCurrency(receipt.amount), 540, 725);
  ctx.fillStyle = '#18202D';
  ctx.font = 'bold 34px Arial, sans-serif';
  fitLines(ctx, receipt.campaignTitle, 820).forEach((line, index) => ctx.fillText(line, 540, 795 + index * 42));

  ctx.fillStyle = '#5C6478';
  ctx.font = '26px Arial, sans-serif';
  ctx.fillText(formatDate(receipt.date), 540, 957);
  ctx.fillText('HelpFundMe · Forgetech Company Limited', 540, 1012);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create share image')), 'image/png');
  });
};
