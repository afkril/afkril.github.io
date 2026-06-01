// ============================================================
// CONFIGURACIÓN DE FIREBASE
// Este archivo se puede cargar desde el servidor de forma segura
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDX9mBXhGSx6vVqvrLgMLY0Stno4nI-jPw",
    authDomain: "moonbox-b997c.firebaseapp.com",
    databaseURL: "https://moonbox-b997c-default-rtdb.firebaseio.com",
    projectId: "moonbox-b997c",
    storageBucket: "moonbox-b997c.firebasestorage.app",
    messagingSenderId: "507195516792",
    appId: "1:507195516792:web:a4ed4d8715e137d6e48a8d",
    measurementId: "G-10F98RC1Z0"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
