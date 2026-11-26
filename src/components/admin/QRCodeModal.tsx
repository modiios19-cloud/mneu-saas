import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { RestaurantData } from '../../types/restaurant';
import { menuUrl as buildMenuUrl, isTemporaryMenuUrl } from '../../lib/menuUrl';

interface QRCodeModalProps {
  restaurant: RestaurantData | null;
  publicBaseUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  restaurant,
  publicBaseUrl,
  isOpen,
  onClose
}) => {
  if (!isOpen || !restaurant) return null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>('');

  const menuUrl = buildMenuUrl(restaurant.slug, publicBaseUrl);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        menuUrl,
        {
          width: 260,
          margin: 2,
          color: {
            dark: '#111111',
            light: '#FFFFFF'
          }
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
          if (canvasRef.current) {
            setDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [menuUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${restaurant.slug}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#272729] border border-zinc-700 text-zinc-100 rounded-3xl p-6 shadow-2xl z-10 text-center space-y-5 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-center gap-2">
            {restaurant.logoUrl && (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-8 h-8 rounded-lg object-contain bg-zinc-800 border border-zinc-700 p-0.5"
              />
            )}
            <h3 className="text-base font-extrabold text-white">
              {restaurant.name}
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            امسح الرمز لفتح القائمة الرقمية للعملاء
          </p>
        </div>

        {isTemporaryMenuUrl(menuUrl) && <p className="text-xs text-amber-300">هذا رابط المعاينة المؤقت. استخدم الموقع المنشور للحصول على رابط مناسب للطباعة والمشاركة.</p>}
        {/* QR Canvas Container */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 inline-block mx-auto shadow-inner">
          <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
        </div>

        {/* Link display & copy */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 text-xs font-mono text-zinc-300">
          <span className="truncate max-w-[200px] text-right dir-ltr" dir="ltr">
            {menuUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 px-2 py-1 rounded-lg bg-zinc-700 shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-amber-300 font-sans">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">نسخ</span>
              </>
            )}
          </button>
        </div>

        {/* Actions (Strictly Yellow & Black) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownload}
            className="py-2.5 px-3 rounded-xl bg-black hover:bg-zinc-900 text-amber-400 border border-amber-400/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تنزيل PNG</span>
          </button>

          <button
            onClick={() => window.open(menuUrl, '_blank')}
            className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-black" />
            <span>معاينة الرابط</span>
          </button>
        </div>
      </div>
    </div>
  );
};
