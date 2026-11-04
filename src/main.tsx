import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isSandbox } from './lib/environment';

createRoot(document.getElementById('root')!).render(<>{isSandbox && <aside dir="rtl" className="fixed bottom-0 right-0 z-[200] rounded-tl-xl bg-amber-300 px-4 py-2 text-xs font-bold text-black">بيئة تجربة محلية · بيانات وهمية · لا تتصل بـ Firebase الحقيقي <a href="?admin=true" className="mr-3 underline">فتح لوحة الإدارة</a></aside>}<App /></>);

