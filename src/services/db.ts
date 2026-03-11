import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, query, limit } from 'firebase/firestore';

export const subscribeToCollection = (colName: string, callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, colName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
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
