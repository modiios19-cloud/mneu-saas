import { Timestamp } from 'firebase/firestore';
import { publicMenu } from './publicMenu';
const key = 'mneu-sandbox-v2';
let memory: Record<string, any> | undefined;
const encode = (data: any): any => data instanceof Timestamp ? { __timestamp: data.toMillis() } : Array.isArray(data) ? data.map(encode) : data && typeof data === 'object' ? Object.fromEntries(Object.entries(data).filter(([,v]) => v !== undefined).map(([k,v]) => [k,encode(v)])) : data;
const decode = (data: any): any => data?.__timestamp !== undefined ? Timestamp.fromMillis(data.__timestamp) : Array.isArray(data) ? data.map(decode) : data && typeof data === 'object' ? Object.fromEntries(Object.entries(data).map(([k,v]) => [k,decode(v)])) : data;
function store() {
  if (!memory) {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    memory = saved ? JSON.parse(saved) : {};
    if (!saved) {
      const venue = { id: 'sandbox-cafe', slug: 'sandbox-cafe', name: 'مقهى التجربة', isActive: true, primaryColor: '#d8ab52', logoUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23d8ab52%22/%3E%3C/svg%3E', categories: [{id:'drinks',labelAr:'المشروبات'}], products:[{id:'coffee',categoryId:'drinks',nameAr:'قهوة عربية',descriptionAr:'قهوة طازجة',price:15,imageUrl:''}], contact:{}, client:{name:'عميل تجريبي',phone:'+967700000000'}, businessInfo:'ملاحظة خاصة لا تظهر للزوار', stitchDesignCode:'<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;background:#171819;color:#fff;padding:40px}h1{color:#d8ab52}article{padding:20px;border:1px solid #555;border-radius:20px;margin:15px 0}</style></head><body><h1 id="title"></h1><section id="products"></section><script>function render(){document.querySelector("#title").textContent=window.MENU_DATA.restaurant.name;document.querySelector("#products").replaceChildren(...window.MENU_DATA.products.map(p=>{let a=document.createElement("article");a.textContent=p.nameAr+" — "+p.price;return a}))}window.addEventListener("menu-data-update",render);render();</script></body></html>' };
      memory!['restaurants/sandbox-cafe'] = encode(venue);
      memory!['publicMenus/sandbox-cafe'] = encode(publicMenu('sandbox-cafe',venue));
      memory!['settings/general'] = {platformName:'Mneu — تجربة آمنة',publicBaseUrl:'',allowedVenueTypes:[{id:'restaurant',labelAr:'مطاعم'},{id:'cafe',labelAr:'مقاهي'}]};
    }
  }
  return memory!;
}
function persist(next: Record<string, any>) {
  // Persist first: quota failures must not report a successful save.
  if (typeof localStorage !== 'undefined') localStorage.setItem(key,JSON.stringify(next));
  memory = next;
}
function path(args: any[]) { return args.filter(v => typeof v === 'string' || v?.path).map(v => typeof v === 'string' ? v : v.path).join('/'); }
export const collection = (...args: any[]) => ({path:path(args)});
export const doc = (...args: any[]) => { let value=path(args); if(value.split('/').length%2===1) value += '/' + crypto.randomUUID().replaceAll('-',''); return {path:value,id:value.split('/').at(-1)}; };
function snapshot(ref: any, records = store()) { const value=records[ref.path]; return {id:ref.id || ref.path.split('/').at(-1),exists:()=>value!==undefined,data:()=>decode(value)}; }
export const getDoc = async (ref: any) => snapshot(ref);
export const getDocs = async (ref: any) => { const docs=Object.keys(store()).filter(p=>p.startsWith(ref.path+'/') && p.split('/').length===ref.path.split('/').length+1).map(p=>snapshot({path:p})).filter(s=>!ref.filters || ref.filters.every((f:any)=>s.data()[f.field]===f.value)); return {docs,empty:docs.length===0,forEach:(callback:any)=>docs.forEach(callback)}; };
export const where = (field: string, op: string, value: any) => {if(op!=='==') throw Error('Unsupported sandbox query');return {field,value};};
export const query = (ref: any,...filters:any[]) => ({...ref,filters});
export const serverTimestamp = () => Timestamp.now();
export const setDoc = async (ref:any,data:any,options?:any) => { const records=store(); persist({...records,[ref.path]:encode(options?.merge ? {...decode(records[ref.path]||{}),...data}:data)}); };
export const updateDoc = async (ref:any,data:any) => {if(!snapshot(ref).exists())throw Error('Document not found');await setDoc(ref,data,{merge:true});};
let queue = Promise.resolve();
export function runTransaction(_database:any,fn:any):Promise<any> {
  const result=queue.then(async()=>{ const next={...store()};const tx={get:async(ref:any)=>snapshot(ref,next),set:(ref:any,data:any)=>{next[ref.path]=encode(data);},delete:(ref:any)=>{delete next[ref.path];}}; const value=await fn(tx);persist(next);return value; });
  queue=result.catch(()=>{});return result;
}
export const writeBatch = (database:any) => {const ops:any[]=[];const batch={set:(...args:any[])=>{ops.push(args);return batch;},commit:()=>runTransaction(database,async(tx:any)=>{ops.forEach(args=>tx.set(...args));})};return batch;};
