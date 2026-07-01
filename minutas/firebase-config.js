// ============================================================
// CONFIGURACIÓN DE FIREBASE
// Este archivo se puede cargar desde el servidor de forma segura
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAqfJd3mRI9DFE-jmaCtX5RSkdJqhAZ75M",
    authDomain: "reportenovedades-a9301.firebaseapp.com",
    databaseURL: "https://reportenovedades-a9301-default-rtdb.firebaseio.com/",
    projectId: "reportenovedades-a9301",
    storageBucket: "reportenovedades-a9301.firebasestorage.app",
    messagingSenderId: "266098672322",
    appId: "1:266098672322:web:115e0be501fd6b8882b15b"
    measurementId: "G-10F98RC1Z0"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

