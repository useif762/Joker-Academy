import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

export const subscribeToCollection = (colName: string, callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, colName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

export const saveDocument = async (colName: string, docId: string, data: any) => {
  await setDoc(doc(db, colName, docId), data);
};

export const updateDocument = async (colName: string, docId: string, data: any) => {
  await updateDoc(doc(db, colName, docId), data);
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
