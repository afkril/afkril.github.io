/**
 * SCRIPT ADMIN - Gestión correcta de usuarios Firebase
 * 
 * Instalar: npm install firebase-admin
 * Ejecutar:  node admin_usuarios.js
 * 
 * Necesitas: serviceAccountKey.json descargado desde
 *   Firebase Console > Configuración del proyecto > Cuentas de servicio
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // <-- descarga este archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lista-mercado-61830-default-rtdb.firebaseio.com"
});

const auth = admin.auth();
const db = admin.database();

// ─────────────────────────────────────────────
// 1. CREAR USUARIO CORRECTAMENTE
// ─────────────────────────────────────────────
async function crearUsuario(email, password, nombre, rol = "usuario") {
  try {
    // Crear en Firebase Auth (contraseña REAL, encriptada)
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: nombre,
    });

    const uid = userRecord.uid;

    // Guardar datos en Realtime Database (SIN contraseña en texto plano)
    await db.ref(`usuarios/${uid}`).set({
      email: email,
      nombre: nombre,
      rol: rol,
      creadoEn: new Date().toISOString(),
      // NO guardar contrasena aquí
    });

    console.log(`✅ Usuario creado: ${nombre} (${uid})`);
    return uid;
  } catch (error) {
    console.error(`❌ Error creando ${email}:`, error.message);
  }
}

// ─────────────────────────────────────────────
// 2. ELIMINAR USUARIO CORRECTAMENTE
//    Borra de Auth Y de todos los nodos de la DB
// ─────────────────────────────────────────────
async function eliminarUsuario(uid) {
  try {
    // 1. Eliminar de Firebase Authentication
    await auth.deleteUser(uid);
    console.log(`🗑️  Auth eliminado: ${uid}`);

    // 2. Eliminar de todos los nodos de la base de datos
    const nodos = [
      `usuarios/${uid}`,
      `user_dirs/${uid}`,
      `user_proveedores/${uid}`,
      `user_logins`, // se limpia por separado (ver abajo)
    ];

    await db.ref(`usuarios/${uid}`).remove();
    await db.ref(`user_dirs/${uid}`).remove();
    await db.ref(`user_proveedores/${uid}`).remove();

    // Limpiar user_logins que contengan este UID
    const loginsRef = db.ref("user_logins");
    const snapshot = await loginsRef.once("value");
    const updates = {};
    snapshot.forEach((child) => {
      if (child.key && child.key.includes(uid.substring(0, 8))) {
        updates[child.key] = null;
      }
    });
    if (Object.keys(updates).length > 0) {
      await loginsRef.update(updates);
    }

    console.log(`✅ Usuario ${uid} eliminado completamente`);
  } catch (error) {
    console.error(`❌ Error eliminando ${uid}:`, error.message);
  }
}

// ─────────────────────────────────────────────
// 3. CAMBIAR CONTRASEÑA CORRECTAMENTE
//    Solo se cambia en Auth, nunca en la DB
// ─────────────────────────────────────────────
async function cambiarContrasena(uid, nuevaContrasena) {
  try {
    await auth.updateUser(uid, { password: nuevaContrasena });
    console.log(`✅ Contraseña actualizada para ${uid}`);
  } catch (error) {
    console.error(`❌ Error cambiando contraseña:`, error.message);
  }
}

// ─────────────────────────────────────────────
// 4. AUDITORÍA - Ver estado actual
//    Compara Auth vs DB y detecta inconsistencias
// ─────────────────────────────────────────────
async function auditarUsuarios() {
  console.log("\n📋 AUDITORÍA DE USUARIOS\n" + "=".repeat(50));

  // Usuarios en DB
  const snapUsuarios = await db.ref("usuarios").once("value");
  const usuariosDB = snapUsuarios.val() || {};

  // Usuarios en user_dirs
  const snapDirs = await db.ref("user_dirs").once("value");
  const dirsDB = snapDirs.val() || {};

  // Todos los UIDs en la DB
  const todosLosUIDs = new Set([
    ...Object.keys(usuariosDB),
    ...Object.keys(dirsDB),
  ]);

  for (const uid of todosLosUIDs) {
    const enUsuarios = !!usuariosDB[uid];
    const enDirs = !!dirsDB[uid];

    let enAuth = false;
    let authEmail = null;
    try {
      const authUser = await auth.getUser(uid);
      enAuth = true;
      authEmail = authUser.email;
    } catch (e) {
      enAuth = false;
    }

    const nombre = usuariosDB[uid]?.nombre || "SIN NOMBRE";
    const email = usuariosDB[uid]?.email || authEmail || "SIN EMAIL";

    let estado = "✅ OK";
    if (!enAuth) estado = "⚠️  HUÉRFANO (existe en DB pero NO en Auth)";
    if (enAuth && !enUsuarios) estado = "⚠️  INCOMPLETO (en Auth pero NO en usuarios/)";

    console.log(`\nUID: ${uid}`);
    console.log(`  Nombre: ${nombre} | Email: ${email}`);
    console.log(`  Auth: ${enAuth} | usuarios/: ${enUsuarios} | user_dirs/: ${enDirs}`);
    console.log(`  Estado: ${estado}`);
  }

  // Verificar campo 'contrasena' en texto plano (inseguro)
  const tienenContrasena = Object.entries(usuariosDB).filter(
    ([uid, u]) => u.contrasena
  );
  if (tienenContrasena.length > 0) {
    console.log(
      "\n🔴 ALERTA: Estos usuarios tienen 'contrasena' en texto plano en la DB (inseguro):"
    );
    tienenContrasena.forEach(([uid, u]) => {
      console.log(`  - ${u.nombre} (${uid})`);
    });
    console.log("  → Ejecuta limpiarContrasenasDB() para eliminar ese campo");
  }
}

// ─────────────────────────────────────────────
// 5. LIMPIAR contraseñas en texto plano de la DB
// ─────────────────────────────────────────────
async function limpiarContrasenasDB() {
  const snap = await db.ref("usuarios").once("value");
  const usuarios = snap.val() || {};
  const updates = {};

  for (const [uid, u] of Object.entries(usuarios)) {
    if (u.contrasena) {
      updates[`usuarios/${uid}/contrasena`] = null;
      console.log(`🧹 Limpiando contrasena de ${u.nombre}`);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
    console.log("✅ Contraseñas en texto plano eliminadas de la DB");
  } else {
    console.log("✅ No hay contraseñas en texto plano en la DB");
  }
}

// ─────────────────────────────────────────────
// 6. SINCRONIZAR: migrar contraseñas de la DB a Auth
//    (solo para usuarios que aún tienen 'contrasena' en DB)
// ─────────────────────────────────────────────
async function migrarContrasenasAAuth() {
  const snap = await db.ref("usuarios").once("value");
  const usuarios = snap.val() || {};

  for (const [uid, u] of Object.entries(usuarios)) {
    if (u.contrasena) {
      console.log(`🔄 Migrando contraseña de ${u.nombre}...`);
      await cambiarContrasena(uid, u.contrasena);
    }
  }

  // Después de migrar, limpiar las contraseñas de la DB
  await limpiarContrasenasDB();
}

// ─────────────────────────────────────────────
// EJECUCIÓN PRINCIPAL
// Descomenta lo que necesites:
// ─────────────────────────────────────────────
async function main() {
  // Ver estado actual:
  await auditarUsuarios();

  // Migrar contraseñas existentes de DB → Auth (hazlo UNA sola vez):
  await migrarContrasenasAAuth();

  // Eliminar el usuario huérfano pj9FmvOZIRYbhRRhbWLzj8rImWk1:
  await eliminarUsuario("pj9FmvOZIRYbhRRhbWLzj8rImWk1");
  await eliminarUsuario("sI8D6UuwcbNK5ZaOJpPrx3SBy6r2");
  await eliminarUsuario("Rqth5kKLqYalFHm0TWrjvuxG3062");

  // Crear un usuario nuevo correctamente:
  // await crearUsuario("nuevo@app.local", "contraseña123", "NUEVO USUARIO");

  // Cambiar contraseña de un usuario existente:
  //await cambiarContrasena("Xy59SESwhKMYuARnmeFYFAbqjGD2", "123456"); //magnolia
  //await cambiarContrasena("pj9FmvOZIRYbhRRhbWLzj8rImWk1", "123456"); //valentina
  //await cambiarContrasena("sI8D6UuwcbNK5ZaOJpPrx3SBy6r2", "123456");//zan
  //await cambiarContrasena("VoSyJpKMq4e57mdTfIMXKPbVKMO2", "123456");//jer
  //await cambiarContrasena("Rqth5kKLqYalFHm0TWrjvuxG3062", "123456");//afkril

  process.exit(0);
}

main().catch(console.error);

	//npm install firebase-admin
	//node admin_usuarios.js