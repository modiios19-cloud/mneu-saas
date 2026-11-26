import { getContactLinks, safeWebUrl } from '../lib/contactLinks';
import { GanjiCredit } from './GanjiCredit';
import { Facebook } from 'lucide-react';
import React, { useState } from 'react';
import { RestaurantContact } from '../types/restaurant';
import { Check, Copy } from 'lucide-react';

interface FooterProps {
  contact: RestaurantContact;
  restaurantName: string;
  primaryColor?: string;
  lang: 'ar' | 'en';
}

export const Footer: React.FC<FooterProps> = ({
  contact,
  restaurantName,
  primaryColor = '#A33900',
  lang
}) => {
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);
  const phoneLink = getContactLinks(contact).find(link => link.kind === 'phone');
  const whatsappLink = getContactLinks(contact).find(link => link.kind === 'whatsapp');

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!contact.phone) return;
    navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAnySocial = Boolean(
    contact.tiktok || contact.instagram || contact.facebook || contact.maps || contact.whatsapp || contact.phone
  );

  return (
    <footer className="mt-12 pt-10 pb-16 border-t border-[#F1F1F4]/80 text-center flex flex-col items-center justify-center space-y-6">
      {/* Heading & Subtitle */}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">
          {isAr ? 'تواصل معنا' : 'Contact Us'}
        </h3>
        <p className="text-xs text-[#71717A] font-en tracking-wider uppercase">
          GET IN TOUCH
        </p>
      </div>

      {/* Dynamic Contact Icons */}
      {hasAnySocial && (
        <div className="flex items-center justify-center gap-3.5 flex-wrap">
          {/* TikTok */}
          {safeWebUrl(contact.tiktok) && (
            <a
              href={safeWebUrl(contact.tiktok)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 hover:text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              style={{ '--btn-hover': primaryColor } as React.CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#F1F1F4';
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.81-.07 3.27-1.57 3.33-3.39.04-2.87.03-5.74.03-8.61V.02h-.08z" />
              </svg>
            </a>
          )}

          {/* Instagram */}
          {safeWebUrl(contact.instagram) && (
            <a
              href={safeWebUrl(contact.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 hover:text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#F1F1F4';
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          )}

          {safeWebUrl(contact.facebook) && (
            <a href={safeWebUrl(contact.facebook)} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 flex items-center justify-center shadow-xs hover:opacity-70">
              <Facebook className="w-5 h-5" style={{ color: primaryColor }}/>
            </a>
          )}

          {/* Location / Google Maps */}
          {safeWebUrl(contact.maps) && (
            <a
              href={safeWebUrl(contact.maps)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Location"
              className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 hover:text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#F1F1F4';
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </a>
          )}

          {/* WhatsApp */}
          {whatsappLink && (
            <a
              href={whatsappLink.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 hover:text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#F1F1F4';
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.25.56-.64.92-1.09.99-.4.06-.86.08-2.61-.62-2.12-.85-3.53-3.03-3.64-3.17-.11-.15-.86-1.14-.86-2.17s.54-1.54.73-1.75c.19-.21.42-.26.56-.26.14 0 .28 0 .4.01.13.01.3-.05.47.36.17.41.6 1.46.65 1.57.05.11.08.24.01.39-.07.15-.11.24-.22.37-.11.13-.23.28-.33.38-.11.1-.23.22-.1.44.13.22.58.96 1.24 1.55.85.76 1.57 1 1.79 1.11.22.11.35.09.48-.06.13-.15.56-.65.71-.88.15-.22.3-.19.51-.11l1.79.88zM12 2a9.96 9.96 0 00-8.58 15.06L2 22l5.08-1.33A9.97 9.97 0 1012 2zm0 18.2a8.21 8.21 0 01-4.18-1.15l-.3-.18-3.09.81.83-3.01-.2-.31A8.2 8.2 0 1112 20.2z" />
              </svg>
            </a>
          )}

          {/* Phone */}
          {phoneLink && (
            <a
              href={phoneLink.href}
              aria-label="Phone"
              className="contact-btn w-11 h-11 rounded-full border border-[#F1F1F4] bg-white text-[#111111]/80 hover:text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = primaryColor;
                e.currentTarget.style.borderColor = primaryColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#F1F1F4';
              }}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Copy phone helper */}
      {contact.phone && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPhone}
            className="inline-flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#111111] transition-colors py-1 px-3 rounded-full hover:bg-zinc-100 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">
                  {isAr ? 'تم نسخ الرقم!' : 'Phone copied!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-en">{contact.phone}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Copyright */}
      <div className="pt-2 text-center">
        <p className="text-[11px] font-normal text-[#A1A1AA] tracking-wide font-en">
          © {new Date().getFullYear()} {restaurantName.toUpperCase()}. ALL RIGHTS RESERVED.
        </p>
      </div>
      <GanjiCredit />
    </footer>
  );
};
