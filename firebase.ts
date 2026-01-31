
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// NOT: Bu bilgileri Firebase Console -> Project Settings -> General altından almalısınız.
// Mevcut yapılandırma bir şablondur.
const firebaseConfig = {
  apiKey: "AIzaSyALSmP6mq-1Ekw8dZQz4z16C1M9QQl-wWA",
  authDomain: "surf-side-reservation.firebaseapp.com",
  projectId: "surf-side-reservation",
  storageBucket: "surf-side-reservation.firebasestorage.app",
  messagingSenderId: "852824402084",
  appId: "1:852824402084:web:9b99cb1c26729a66911e31"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
