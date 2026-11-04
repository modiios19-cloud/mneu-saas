import {test,expect} from '@playwright/test';
test('dashboard autosaves, reopens drafts, versions, independent previews and editable WhatsApp',async({page})=>{
 test.setTimeout(60000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?admin=true');
 await expect(page.getByText('بيئة تجربة محلية', {exact:false})).toBeVisible();
 await page.getByRole('button',{name:'فتح المحرر المرئي',exact:false}).click();
 await expect(page.getByText('المسودة محفوظة تلقائيًا')).toBeVisible();
 // Field and button selectors are based on editor labels.
 const design = page.locator('textarea').filter({visible:true});
 await page.locator('summary').filter({hasText:'إضافة / استبدال تصميم Stitch'}).click();
 const html=page.locator('textarea').first();
 const original=await html.inputValue();
 await html.fill(original.replace('قهوة طازجة','قهوة طازجة')+'\n<!-- replacement-design -->');
 await expect(page.getByText('المسودة محفوظة تلقائيًا')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'فتح المحرر المرئي',exact:false}).click();
 await expect(page.getByText('المسودة محفوظة تلقائيًا')).toBeVisible();
 await page.locator('summary').filter({hasText:'إضافة / استبدال تصميم Stitch'}).click();
 await expect(page.locator('textarea').first()).toHaveValue(/replacement-design/);
 await page.getByRole('button',{name:'معاينة وإرسال للعميل',exact:true}).click();
 await expect(page.getByRole('heading',{name:'معاينة خاصة لصاحب المطعم'})).toBeVisible();
 const previewUrl=await page.locator('a[href*="?preview="]').getAttribute('href');
 await expect(page.locator('textarea[rows="6"]')).toHaveValue(new RegExp(previewUrl!.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 await page.locator('input[type=tel]').fill('+967 771 234 567');
 await page.locator('textarea[rows="6"]').fill('رسالة مخصصة '+previewUrl);
 // Intercept the click target without contacting WhatsApp or sending a message.
 await page.evaluate(()=>{window.open=(url?:string|URL)=>{document.body.dataset.whatsapp=String(url);return null;};});
 await page.getByRole('button',{name:'فتح محادثة العميل في واتساب برسالة جاهزة'}).click();
 await expect(page.locator('body')).toHaveAttribute('data-whatsapp',/https:\/\/wa.me\/967771234567\?text=/);
 const url=await page.locator('body').getAttribute('data-whatsapp');expect(decodeURIComponent(url!.split('text=')[1])).toContain('رسالة مخصصة');
 await page.getByRole('button',{name:'إغلاق',exact:true}).click();
 await page.getByRole('button',{name:'حفظ ونشر إلى Firebase',exact:false}).click();
 await page.getByRole('button',{name:'فتح المحرر المرئي',exact:false}).click();
 await expect(page.getByText('المسودة محفوظة تلقائيًا')).toBeVisible();
 await page.getByRole('button',{name:'الإصدارات السابقة',exact:true}).click();
 await expect(page.getByText('نسخة مؤرشفة', {exact:false})).toBeVisible();
 await page.getByRole('button',{name:'نسخة مؤرشفة',exact:false}).click();
 await expect(page.getByText('المسودة محفوظة تلقائيًا')).toBeVisible();
 await page.goto(previewUrl!);
 await expect(page.getByText('معاينة للعميل فقط', {exact:false})).toBeVisible();
 await expect(page.frameLocator('iframe').getByRole('heading',{name:'مقهى التجربة'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('platform settings autosave and survive reload',async({page})=>{
 await page.goto('/?admin=true');
 await page.getByRole('button',{name:/tune.*إعدادات/}).first().click();
 const name=page.getByLabel('اسم المنصة (Platform Brand Name) *');
 await name.fill('منصة اختبار معدلة');
 await expect(page.getByText('الإعدادات محفوظة تلقائيًا في Firebase')).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:/tune.*إعدادات/}).first().click();
 await expect(page.getByLabel('اسم المنصة (Platform Brand Name) *')).toHaveValue('منصة اختبار معدلة');
});
