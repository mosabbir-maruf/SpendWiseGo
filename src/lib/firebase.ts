import { initializeApp } from 'firebase/app';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAk6FCljcq0XJagQ1qKlEFPDcEAoe2DaRw",
  authDomain: "spendwisego.firebaseapp.com",
  projectId: "spendwisego",
  storageBucket: "spendwisego.firebasestorage.app",
  messagingSenderId: "110745340173",
  appId: "1:110745340173:web:bd2bec9d432c8883410844"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure auth to require email verification
auth.settings.appVerificationDisabledForTesting = false;

export const db = getFirestore(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.log('Persistence not supported by browser');
    }
});

export default app;
