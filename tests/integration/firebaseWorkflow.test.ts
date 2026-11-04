import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,getDocs,collection,Firestore} from 'firebase/firestore';
import {saveRestaurant,saveMenuDraft,createMenuPreview} from '../../src/lib/menuRepository';
const uid='VZMngh2pukhR8r2RoZpNIopt4R82';
test('actual Firestore transaction preserves owner data, drafts, preview and archived menu independently',{timeout:30000},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-mneu-staging',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 try {
 const db=env.authenticatedContext(uid).firestore() as unknown as Firestore;
 const guest=env.unauthenticatedContext().firestore();
 const id='integration-'+Date.now();
 const venue={id,slug:id,name:'Original',primaryColor:'#123456',logoUrl:'',isActive:true,categories:[{id:'c',labelAr:'Drinks'}],products:[{id:'p',nameAr:'Tea',categoryId:'c',descriptionAr:'',imageUrl:'',price:10}],contact:{},client:{name:'Secret Owner',phone:'private'},businessInfo:'Keep me',stitchDesignCode:'<!doctype html><html><body>original</body></html>'};
 await saveRestaurant(id,venue,{create:true},db);
 const draft={...venue,name:'Draft',stitchDesignCode:'<!doctype html><html><body>replacement</body></html>',products:venue.products.map(p=>({...p,price:22}))};
 await saveMenuDraft(id,draft,db);
 assert.equal((await getDoc(doc(db,'menuDrafts',id))).data()!.menu.products[0].price,22);
 assert.equal((await getDoc(doc(guest,'publicMenus',id))).data()!.products[0].price,10);
 const token=await createMenuPreview(draft,db);
 assert.equal((await getDoc(doc(guest,'menuPreviews',token))).data()!.menu.products[0].price,22);
 await saveRestaurant(id,draft,{archive:true},db);
 const versions=await getDocs(collection(db,'menuVersions',id,'versions'));
 assert.equal(versions.docs.length,1);
 assert.equal(versions.docs[0].data().menu.products[0].price,10);
 await saveMenuDraft(id,versions.docs[0].data().menu,db);
 assert.equal((await getDoc(doc(guest,'publicMenus',id))).data()!.products[0].price,22);
 assert.equal((await getDoc(doc(db,'restaurants',id))).data()!.client.name,'Secret Owner');
 assert.ok(!JSON.stringify((await getDoc(doc(guest,'publicMenus',id))).data()).includes('Secret Owner'));
 await saveRestaurant(id,{isActive:false},{},db);
 await assert.rejects(getDoc(doc(guest,'publicMenus',id)));
 // Snapshot remains independent of later edits/deactivation.
 assert.equal((await getDoc(doc(guest,'menuPreviews',token))).data()!.menu.restaurant.name,'Draft');
 } finally {await env.cleanup();}
});
