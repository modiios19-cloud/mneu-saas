import {test,expect} from 'bun:test';
import {saveRestaurant,saveMenuDraft,createMenuPreview} from '../../src/lib/menuRepository';
import {getDoc,doc,getDocs,collection} from '../../src/lib/dataStore';
import {db} from '../../src/lib/firebase';
import {publicMenu} from '../../src/lib/publicMenu';
const venue={id:'workflow-test',slug:'workflow-test',name:'Test',isActive:true,primaryColor:'#123456',logoUrl:'',contact:{phone:'public',privateNotes:'secret nested'},categories:[{id:'c',labelAr:'A',client:'nested private'}],products:[{id:'p',nameAr:'Coffee',categoryId:'c',descriptionAr:'',price:12,imageUrl:'',internalCost:2}],client:{name:'Private Owner',phone:'private'},businessInfo:'Internal',stitchDesignCode:'<!doctype html><html><body>old</body></html>'};
test('public projection strips private/unknown fields including nested values and preserves legacy items',()=>{
 const menu=publicMenu(venue.id,venue);
 expect(JSON.stringify(menu)).not.toContain('private');expect(menu.products[0]).not.toHaveProperty('internalCost');
 expect(menu).not.toHaveProperty('businessInfo');
 const legacy=publicMenu('legacy',{categories:['A'],items:[{name:'Old',category:'A',price:9,image:'img'}]});
 expect(legacy.products[0]).toMatchObject({nameAr:'Old',price:9,imageUrl:'img',categoryId:'A'});
});
test('draft persists/reopens, replacing HTML preserves products; publication archives old version; restore changes draft only',async()=>{
 await saveRestaurant(venue.id,venue,{create:true});
 const replacement={...venue,stitchDesignCode:'<!doctype html><html><body>new</body></html>',products:venue.products.map(p=>({...p,price:25}))};
 await saveMenuDraft(venue.id,replacement);
 let draft=(await getDoc(doc(db,'menuDrafts',venue.id))).data().menu;
 expect(draft.products[0].id).toBe('p');expect(draft.products[0].price).toBe(25);
 expect((await getDoc(doc(db,'publicMenus',venue.id))).data().products[0].price).toBe(12);
 await saveRestaurant(venue.id,draft,{archive:true});
 const history=await getDocs(collection(db,'menuVersions',venue.id,'versions'));
 expect(history.docs).toHaveLength(1);expect(history.docs[0].data().menu.products[0].price).toBe(12);
 await saveMenuDraft(venue.id,history.docs[0].data().menu);
 expect((await getDoc(doc(db,'publicMenus',venue.id))).data().products[0].price).toBe(25);
 expect((await getDoc(doc(db,'restaurants',venue.id))).data().client).toEqual(venue.client);
 await expect(saveRestaurant(venue.id,{name:'collision'},{create:true})).rejects.toThrow();
});
test('preview is independent, time-limited, and excludes owner data',async()=>{
 const token=await createMenuPreview(venue);
 await saveMenuDraft(venue.id,{...venue,name:'Changed later'});
 const preview=(await getDoc(doc(db,'menuPreviews',token))).data();
 expect(preview.menu.restaurant.name).toBe('Test');expect(preview.expiresAt.toMillis()).toBeGreaterThan(Date.now());
 expect(JSON.stringify(preview)).not.toContain('Private Owner');
 expect(JSON.stringify(preview)).not.toContain('internalCost');
});
