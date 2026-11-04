import { saveRestaurant } from './menuRepository';
import { isSandbox, isEmulator } from './environment';
import { doc, setDoc } from './dataStore';
import { db } from './firebase';

export const BACK_FRIES_SEED_DATA = {
  name: "BACK FRIES",
  primaryColor: "#A33900",
  logo: "https://lh3.googleusercontent.com/aida/AEtjO1UYzrwvXqABYl6SLV7TZjhpohEHDAXg90Q2TXIx2bltHCE16e_iuisdpjuy80npzAzXKpz8dT9z1qA-y4BF6q2SYqSuOX7WikA021Kr3U74VlsinNtrepLG7dC3DQBEI4gybJ28cyV2X49VylVCBu6RQ2fmThXCyjolRueW-LuFnW9GhLwQv-_ib9iFFworDt64zvzyTqCUxPKCBPiCW4p1RM9e-IMO_9MkpRK0HrEbJJ1nX41tiAxSgTs",
  categories: ["الأكثر طلباً", "سلال البطاطس", "برجر السماش", "المشروبات والصلصات"],
  items: [
    {
      name: "ترافل تشيزي فرايز",
      price: 32,
      description: "بطاطس ذهبية مقرمشة غنية بجبنة الشيدر المعتقة وصلصة الترافل الأسود الفاخر واللحم المقرمش.",
      category: "الأكثر طلباً",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZowfb8RFoALBdVCKovKZ-Rpvm6vGCmxkwnlt9up-xXqrMKbBIRwIPrCWje3tieQWdQTCD5dhSXOPEn-sdJEGvPXzePBVXdcJyn14EWaXM6pNq3E9uIpZ1x6esxP5Uk_deHRaUC3EibJCZcH1xDvd7HIhr8O_TpF6rf2j88lQxZe3vPm0roM88uDz8fshLLaqXVY9_vzqviLpwRKa-z4uPqtBICc_LEG4TM8NCwZhQdG2Fra3I7Kzx"
    },
    {
      name: "دوبل سماش برجر خاص",
      price: 42,
      description: "شريحتان لحم أنجوس طازج مشوي بأسلوب السماش المقرمش، جبنة أمريكية ذائبة، ومخلل منزلي وبصل مكرمل.",
      category: "برجر السماش",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3pKKfr-SH0iAtS70o4FpA_usXzrSQRJpjx3Gb3980lOuCGvDANlaSEd3bQrKXq6UwabUpFpZjBCM0mvK6D9wz6X6QwVLGa3_IIJ-3u1K9PuC6u1T-5zkbb36a2LzfMiNPn8XQ3tNEDXp__uJVbYzyEE51NyBySQODRUftJjrTPA4C-Pfc2LZGNdqYUDKWAIb13XfLikkyWU-gUcDT8xBBplwptgWI_Z2XR4iQjolM7dJmm0iRUyt7"
    },
    {
      name: "فولكانو لودد فرايز",
      price: 29,
      description: "بطاطس متبلة مع قطع الهالبينو المقرمشة وصوص الفولكانو وجبنة المونتري جاك.",
      category: "سلال البطاطس",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkGEF3qxjbe2_aw8KRNTIKC1_4Q-AzKhKKEQ7gW-abIFL0G24kGHSJch_LG7JKXWHxvPjMV8MC8JEglYXXWqPoq45dGkRsjhu4Sxb7a6L-K9mbrh7u2NsSl0HhJKxyhlauspDN1XfNgJbEPaeqGwCsLr6iBGsg_36zWeQf9riLAyQpxi2QW5qeVpJXnvzqy0z7Zbg-g8qwWyQdPupwaiBDxu1EjEViUWXBKjMFBhp8kPjmhCu21LK1"
    },
    {
      name: "باشن فروت موهيتو",
      price: 18,
      description: "ليمون، نعناع، سيرب باشن طبيعي منعش.",
      category: "المشروبات والصلصات",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDU-mgd25bJ8iSOTYjjVkifmootOM1lxxyFHZDL7ttSIyEka1kAtEaKONUnKNTrvoHOaCAqojotWrTCkyY0mor7MSbRaUWZRumEFmErpT99-sUeSGmZZROtRCTY8LqLQDUscL4tDA61_6Xqnmjl54gQyWIQeYLLX_zpvPQvqBh34dqQc90XWeFtMrS-lvlhPg5vX_FfEwqfjVISfRmA4yE6OUeCeLg5a-aTDvi2AdK9L1zqb8NVkAaI"
    }
  ],
  contact: {
    whatsapp: "+966500000000",
    maps: "https://maps.google.com/?q=Back+Fries",
    instagram: "https://instagram.com/backfries",
    phone: "+966500000000"
  }
};

/**
 * زرع وثيقة backfries مباشرة في مجموعة restaurants بـ Firestore
 */
export async function seedBackFriesToFirestore(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      throw new Error("لم يتم تهيئة اتصال Firestore");
    }

    if (!isSandbox && !isEmulator) throw new Error('زرع البيانات متاح في بيئة الاختبار فقط');
    await saveRestaurant('backfries', BACK_FRIES_SEED_DATA, { create: true });

    return { success: true };
  } catch (error: any) {
    console.error("Firestore seeding error:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

