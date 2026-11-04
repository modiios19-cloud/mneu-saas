import { isSandbox } from '../../lib/environment';
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, ExternalLink, Printer } from 'lucide-react';
import { RestaurantData } from '../../types/restaurant';

interface QRCodeModalProps {
  restaurant: RestaurantData | null;
  isOpen: boolean;
  publicBaseUrl?: string;
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

  const base = isSandbox ? window.location.origin + window.location.pathname : publicBaseUrl || '';
  let menuUrl = '';
  try {
    const url = new URL(base);
    if (!isSandbox && url.protocol !== 'https:') throw new Error('HTTPS required');
    url.search = ''; url.hash = ''; url.searchParams.set('id', restaurant.slug); menuUrl = url.toString();
  } catch { /* Do not generate an invalid AI Studio/placeholder customer QR. */ }


  useEffect(() => {
    if (canvasRef.current && menuUrl) {
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
    if (!dataUrl || !menuUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${restaurant.slug}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 text-center space-y-5 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!menuUrl && <p className="text-sm text-red-600">أضف رابط الموقع العام HTTPS من إعدادات المنصة لإنشاء QR صالح.</p>}
        {/* Header */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center justify-center gap-2">
            {restaurant.logoUrl && (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-8 h-8 rounded-lg object-contain bg-zinc-50 border border-zinc-100 p-0.5"
              />
            )}
            <h3 className="text-base font-extrabold text-[#111111]">
              {restaurant.name}
            </h3>
          </div>
          <p className="text-xs text-[#71717A]">
            امسح الرمز لفتح القائمة الرقمية للعملاء
          </p>
        </div>

        {/* QR Canvas Container */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 inline-block mx-auto shadow-inner">
          <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
        </div>

        {/* Link display & copy */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 text-xs font-mono text-zinc-700">
          <span className="truncate max-w-[200px] text-right dir-ltr" dir="ltr">
            {menuUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-bold text-black hover:text-amber-500 px-2 py-1 rounded-lg bg-white shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span className="text-black font-sans">تم النسخ</span>
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

