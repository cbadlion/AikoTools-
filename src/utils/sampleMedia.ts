/**
 * Built-in studio sample generator for instant 1-click testing
 * Allows users to try background removal, conversion, effects, and gif making
 * without needing to search their local device for images.
 */

export function generateSampleImage(type: 'portrait' | 'icon' | 'landscape' | 'sticker'): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (type === 'portrait') {
      // Create a high contrast portrait/subject with clear background for testing Magic Wand & Bg Remover
      canvas.width = 600;
      canvas.height = 600;

      // Solid color background with soft gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
      bgGrad.addColorStop(0, '#3B82F6');
      bgGrad.addColorStop(1, '#1D4ED8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 600, 600);

      // Cute character/avatar body
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(300, 420, 160, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(300, 260, 120, 0, Math.PI * 2);
      ctx.fill();

      // Cheeks (blush)
      ctx.fillStyle = '#F87171';
      ctx.beginPath();
      ctx.arc(220, 280, 24, 0, Math.PI * 2);
      ctx.arc(380, 280, 24, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(245, 235, 16, 0, Math.PI * 2);
      ctx.arc(355, 235, 16, 0, Math.PI * 2);
      ctx.fill();

      // Eye shines
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(250, 230, 6, 0, Math.PI * 2);
      ctx.arc(360, 230, 6, 0, Math.PI * 2);
      ctx.fill();

      // Cute smiling mouth
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(300, 280, 24, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Star badge on chest
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(300, 390, 28, 0, Math.PI * 2);
      ctx.fill();

      // Text label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aiko Sample Avatar', 300, 560);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'sample_avatar_para_recorte.png', { type: 'image/png' }));
        }
      }, 'image/png');

    } else if (type === 'icon') {
      // Transparent icon sample
      canvas.width = 512;
      canvas.height = 512;

      ctx.clearRect(0, 0, 512, 512);

      // Badge
      const grad = ctx.createLinearGradient(50, 50, 460, 460);
      grad.addColorStop(0, '#10B981');
      grad.addColorStop(1, '#047857');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(60, 60, 392, 392, 90);
      ctx.fill();

      // Glowing lightning bolt
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(280, 110);
      ctx.lineTo(170, 280);
      ctx.lineTo(260, 280);
      ctx.lineTo(230, 400);
      ctx.lineTo(350, 230);
      ctx.lineTo(260, 230);
      ctx.closePath();
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'sample_icon_pro.png', { type: 'image/png' }));
        }
      }, 'image/png');

    } else if (type === 'sticker') {
      // Cute sticker with white border
      canvas.width = 500;
      canvas.height = 500;

      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.arc(250, 250, 180, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ AIKO ✨', 250, 260);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'sample_sticker.webp', { type: 'image/webp' }));
        }
      }, 'image/webp');

    } else {
      // Landscape colorful sunset
      canvas.width = 800;
      canvas.height = 500;

      const grad = ctx.createLinearGradient(0, 0, 0, 500);
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(0.5, '#EF4444');
      grad.addColorStop(1, '#831843');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 500);

      // Sun
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(400, 280, 90, 0, Math.PI * 2);
      ctx.fill();

      // Mountains
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.moveTo(0, 500);
      ctx.lineTo(250, 280);
      ctx.lineTo(500, 500);
      ctx.fill();

      ctx.fillStyle = '#27272A';
      ctx.beginPath();
      ctx.moveTo(300, 500);
      ctx.lineTo(600, 240);
      ctx.lineTo(800, 500);
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'sample_paisaje_hd.jpg', { type: 'image/jpeg' }));
        }
      }, 'image/jpeg', 0.95);
    }
  });
}
