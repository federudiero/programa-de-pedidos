// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import {
 
  initializeFirestore,
  persistentLocalCache
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBCOZeq8qi33X1cIH0FrTRSNT9UxfTac08",
  authDomain: "pedidospintureria-3ec7b.firebaseapp.com",
  projectId: "pedidospintureria-3ec7b",
  storageBucket: "pedidospintureria-3ec7b.appspot.com", // corregido
  messagingSenderId: "907598985609",
  appId: "1:907598985609:web:e39f635d3dd4c232438958"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
