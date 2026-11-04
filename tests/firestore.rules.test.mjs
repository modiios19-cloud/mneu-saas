import {readFileSync} from 'node:fs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,Timestamp} from 'firebase/firestore';
let env;
const uid='VZMngh2pukhR8r2RoZpNIopt4R82';
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-mneu-staging',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async context=>{
 const db=context.firestore();
 for(const [path,value] of Object.entries({
 'restaurants/test':{client:{phone:'private'},name:'test'},
 'publicMenus/test':{name:'test',isActive:true},'publicMenus/inactive':{name:'hidden',isActive:false},
 'menuDrafts/test':{menu:{name:'draft'}},'menuVersions/test/versions/one':{menu:{name:'past'}},
 'settings/general':{platformName:'Private config'},
 'menuPreviews/activeToken000000001':{status:'active',expiresAt:Timestamp.fromMillis(Date.now()+60000),menu:{restaurant:{name:'test'}}},
 'menuPreviews/expiredToken000001':{status:'active',expiresAt:Timestamp.fromMillis(Date.now()-1000)},
 'menuPreviews/revokedToken000001':{status:'revoked',expiresAt:Timestamp.fromMillis(Date.now()+60000)}
 }))await setDoc(doc(db,path),value);
 });
});
after(async()=>{await env?.cleanup();});
test('anonymous and signed-in non-admin cannot access private records or write menus',async()=>{
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('stranger').firestore()]){
 for(const path of ['restaurants/test','menuDrafts/test','menuVersions/test/versions/one','settings/general'])await assertFails(getDoc(doc(db,path)));
 await assertFails(getDocs(collection(db,'restaurants')));
 await assertFails(setDoc(doc(db,'publicMenus/test'),{name:'hacked',isActive:true}));
 await assertFails(setDoc(doc(db,'menuDrafts/test'),{menu:{}}));
 }
});
test('public gets only active menu and unexpired token; cannot enumerate',async()=>{
 const db=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDoc(doc(db,'publicMenus/test')));
 await assertFails(getDoc(doc(db,'publicMenus/inactive')));
 await assertFails(getDocs(collection(db,'publicMenus')));
 await assertSucceeds(getDoc(doc(db,'menuPreviews/activeToken000000001')));
 for(const id of ['expiredToken000001','revokedToken000001'])await assertFails(getDoc(doc(db,'menuPreviews',id)));
 await assertFails(getDocs(collection(db,'menuPreviews')));
});
test('admin can manage all venues, drafts, history and settings; projection rejects private fields',async()=>{
 const db=env.authenticatedContext(uid).firestore();
 for(const path of ['restaurants/test','menuDrafts/test','menuVersions/test/versions/one','settings/general'])await assertSucceeds(setDoc(doc(db,path),{value:'saved'}));
 await assertSucceeds(getDocs(collection(db,'restaurants')));
 await assertSucceeds(setDoc(doc(db,'publicMenus/test'),{name:'updated',isActive:true}));
 await assertFails(setDoc(doc(db,'publicMenus/test'),{name:'bad',isActive:true,client:{phone:'private'}}));
 assert.equal((await getDoc(doc(db,'publicMenus/test'))).data().name,'updated');
});
