// ==================== FIREBASE CONFIG ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const firebaseConfig = {
    apiKey: "AIzaSyCrC5m1hm6uV2MngN7OVkVMC3987FcMTa8",
    authDomain: "lista-mercado-61830.firebaseapp.com",
    databaseURL: "https://lista-mercado-61830-default-rtdb.firebaseio.com",
    projectId: "lista-mercado-61830",
    storageBucket: "lista-mercado-61830.firebasestorage.app",
    messagingSenderId: "1015835944569",
    appId: "1:1015835944569:web:732e412c436499a11116a8",
    measurementId: "G-L143WME3CG"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseDB = getDatabase(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);

// Expose globally for legacy code
window.firebaseApp = firebaseApp;
window.firebaseDB = firebaseDB;
window.firebaseAuth = firebaseAuth;
window.firebaseRef = ref;
window.firebaseGet = get;
window.firebaseSet = set;
window.firebaseOnValue = onValue;
window.firebaseUpdate = update;
window.firebaseCreateUser = createUserWithEmailAndPassword;
window.firebaseSignIn = signInWithEmailAndPassword;
window.firebaseSignOut = signOut;
window.firebaseOnAuthStateChanged = onAuthStateChanged;
window.firebaseUpdateProfile = updateProfile;

// ── Nuevas funciones para recuperar/cambiar contraseña ──────────────
window.firebaseSendPasswordReset     = sendPasswordResetEmail;
window.firebaseUpdatePasswordFn      = updatePassword;
window.firebaseEmailAuthProvider     = EmailAuthProvider;
window.firebaseReauthenticate        = reauthenticateWithCredential;

onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
        window.currentUser = user;
        if (typeof onUserLoggedIn === 'function') onUserLoggedIn(user);
    } else {
        window.currentUser = null;
        if (typeof onUserLoggedOut === 'function') onUserLoggedOut();
    }
});
