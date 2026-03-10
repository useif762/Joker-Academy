import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDSBmjje52iZaspRJdnA1P7NzfgCppYzvY",
  authDomain: "joker-academy.firebaseapp.com",
  projectId: "joker-academy",
  storageBucket: "joker-academy.appspot.com", // Changed to .appspot.com which is more stable for older projects
  messagingSenderId: "349111315995",
  appId: "1:349111315995:web:6b3395dc8f66bee1e112be",
  measurementId: "G-2WJ7LCFPRG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app,"(default)");
export const storage = getStorage(app);
