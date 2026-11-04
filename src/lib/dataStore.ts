import * as firestore from 'firebase/firestore';
import * as sandbox from './sandboxStore';
import { isSandbox } from './environment';
// The local sandbox is a UI preview only. Firebase security is tested separately in emulators.
export const doc = (isSandbox ? sandbox.doc : firestore.doc) as typeof firestore.doc;
export const collection = (isSandbox ? sandbox.collection : firestore.collection) as typeof firestore.collection;
export const getDoc = (isSandbox ? sandbox.getDoc : firestore.getDoc) as typeof firestore.getDoc;
export const getDocs = (isSandbox ? sandbox.getDocs : firestore.getDocs) as typeof firestore.getDocs;
export const setDoc = (isSandbox ? sandbox.setDoc : firestore.setDoc) as typeof firestore.setDoc;
export const updateDoc = (isSandbox ? sandbox.updateDoc : firestore.updateDoc) as typeof firestore.updateDoc;
export const query = (isSandbox ? sandbox.query : firestore.query) as typeof firestore.query;
export const where = (isSandbox ? sandbox.where : firestore.where) as typeof firestore.where;
export const runTransaction = (isSandbox ? sandbox.runTransaction : firestore.runTransaction) as typeof firestore.runTransaction;
export const writeBatch = (isSandbox ? sandbox.writeBatch : firestore.writeBatch) as typeof firestore.writeBatch;
export const serverTimestamp = (isSandbox ? sandbox.serverTimestamp : firestore.serverTimestamp) as typeof firestore.serverTimestamp;
export const Timestamp = firestore.Timestamp;
export type Timestamp = firestore.Timestamp;
