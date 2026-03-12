import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, query, limit } from 'firebase/firestore';

export const subscribeToDocument = (colName: string, docId: string, callback: (data: any | null) => void) => {
  return onSnapshot(doc(db, colName, docId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

export const subscribeToCollection = (colName: string, callback: (data: any[], fromCache: boolean) => void) => {
  return onSnapshot(collection(db, colName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data, snapshot.metadata.fromCache);
  });
};

export const getCollectionLimited = async (colName: string, limitCount: number) => {
  const q = query(collection(db, colName), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveDocument = async (colName: string, docId: string, data: any) => {
  // Remove undefined values
  const cleanData = JSON.parse(JSON.stringify(data));
  await setDoc(doc(db, colName, docId), cleanData);
};

export const updateDocument = async (colName: string, docId: string, data: any) => {
  // Remove undefined values
  const cleanData = JSON.parse(JSON.stringify(data));
  await updateDoc(doc(db, colName, docId), cleanData);
};

export const mergeDocument = async (colName: string, docId: string, data: any) => {
  // Remove undefined values
  const cleanData = JSON.parse(JSON.stringify(data));
  await setDoc(doc(db, colName, docId), cleanData, { merge: true });
};

export const getDocument = async <T>(colName: string, docId: string): Promise<T | null> => {
  const docRef = doc(db, colName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

export const deleteDocument = async (colName: string, docId: string) => {
  await deleteDoc(doc(db, colName, docId));
};

export const queryDocuments = async (colName: string, field: string, operator: any, value: any) => {
  const { where } = await import('firebase/firestore');
  const q = query(collection(db, colName), where(field, operator, value));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
