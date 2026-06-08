/**
 * SCRIPT ADMIN - Gestión completa de usuarios Firebase
 *
 * Instalar: npm install firebase-admin
 * Ejecutar:  node admin_usuarios.js
 *
 * Necesitas: serviceAccountKey.json descargado desde
 *   Firebase Console > Configuración del proyecto > Cuentas de servicio
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://lista-mercado-61830-default-rtdb.firebaseio.com",
});

const auth = admin.auth();
const db = admin.database();

// ══════════════════════════════════════════════════════
// 1. AUDITORÍA — ver todos los usuarios y su estado
// ══════════════════════════════════════════════════════
async function auditarUsuarios() {
  console.log("\n📋 AUDITORÍA DE USUARIOS\n" + "═".repeat(60));

  const snapUsuarios = await db.ref("usuarios").once("value");
  const usuariosDB = snapUsuarios.val() || {};

  const snapDirs = await db.ref("user_dirs").once("value");
  const dirsDB = snapDirs.val() || {};

  const todosLosUIDs = new Set([
    ...Object.keys(usuariosDB),
    ...Object.keys(dirsDB),
  ]);

  for (const uid of todosLosUIDs) {
    const enUsuarios = !!usuariosDB[uid];
    const enDirs     = !!dirsDB[uid];
    let enAuth = false, authEmail = null;

    try {
      const authUser = await auth.getUser(uid);
      enAuth    = true;
      authEmail = authUser.email;
    } catch (e) { enAuth = false; }

    const u      = usuariosDB[uid] || {};
    const nombre = u.nombre   || "SIN NOMBRE";
    const email  = u.email    || authEmail || "SIN EMAIL";
    const usuario= u.usuario  || "—";
    const rol    = u.rol      || "—";

    let estado = "✅ OK";
    if (!enAuth)            estado = "⚠️  HUÉRFANO (en DB pero NO en Auth)";
    if (enAuth && !enUsuarios) estado = "⚠️  INCOMPLETO (en Auth pero NO en usuarios/)";

    console.log(`\nUID    : ${uid}`);
    console.log(`  Nombre  : ${nombre}`);
    console.log(`  Usuario : ${usuario}`);
    console.log(`  Email   : ${email}`);
    console.log(`  Rol     : ${rol}`);
    console.log(`  Auth: ${enAuth ? "✅" : "❌"} | usuarios/: ${enUsuarios ? "✅" : "❌"} | user_dirs/: ${enDirs ? "✅" : "❌"}`);
    console.log(`  Estado  : ${estado}`);
  }

  // Alertar contraseñas en texto plano
  const conClave = Object.entries(usuariosDB).filter(([, u]) => u.contrasena);
  if (conClave.length > 0) {
    console.log("\n🔴 ALERTA — contraseñas en texto plano detectadas:");
    conClave.forEach(([uid, u]) => console.log(`   - ${u.nombre} (${uid})`));
    console.log("   → Ejecuta migrarContrasenasAAuth() para corregirlo\n");
  }
}

// ══════════════════════════════════════════════════════
// 2. MOSTRAR TODAS LAS CONTRASEÑAS guardadas en la DB
//    (solo las que aún están en texto plano)
// ══════════════════════════════════════════════════════
async function mostrarContrasenasDB() {
  console.log("\n🔑 CONTRASEÑAS EN LA BASE DE DATOS\n" + "═".repeat(60));

  const snap = await db.ref("usuarios").once("value");
  const usuarios = snap.val() || {};

  let encontradas = 0;
  for (const [uid, u] of Object.entries(usuarios)) {
    if (u.contrasena) {
      encontradas++;
      console.log(`\n  Nombre  : ${u.nombre || "SIN NOMBRE"}`);
      console.log(`  Usuario : ${u.usuario || "—"}`);
      console.log(`  Email   : ${u.email   || "—"}`);
      console.log(`  UID     : ${uid}`);
      console.log(`  🔓 Clave : ${u.contrasena}`);
    }
  }

  if (encontradas === 0) {
    console.log("\n  ✅ No hay contraseñas en texto plano en la DB.");
    console.log("     (Ya fueron migradas a Firebase Auth correctamente)\n");
  } else {
    console.log(`\n  Total encontradas: ${encontradas}`);
    console.log("  ⚠️  Ejecuta migrarContrasenasAAuth() para pasarlas a Auth y limpiarlas.\n");
  }
}

// ══════════════════════════════════════════════════════
// 3. CREAR USUARIO (en Auth + DB al mismo tiempo)
// ══════════════════════════════════════════════════════
async function crearUsuario(email, password, nombre, usuarioLogin, rol = "usuario") {
  try {
    const userRecord = await auth.createUser({
      email:       email,
      password:    password,
      displayName: nombre,
    });
    const uid = userRecord.uid;

    await db.ref(`usuarios/${uid}`).set({
      email:        email,
      nombre:       nombre,
      usuario:      usuarioLogin,
      rol:          rol,
      creadoEn:     new Date().toISOString(),
      ultimoIngreso: null,
      // NO se guarda la contraseña aquí
    });

    console.log(`\n✅ Usuario creado correctamente`);
    console.log(`   Nombre  : ${nombre}`);
    console.log(`   Usuario : ${usuarioLogin}`);
    console.log(`   Email   : ${email}`);
    console.log(`   UID     : ${uid}\n`);
    return uid;
  } catch (error) {
    console.error(`\n❌ Error creando usuario: ${error.message}\n`);
  }
}

// ══════════════════════════════════════════════════════
// 4. EDITAR DATOS DE UN USUARIO
//    Actualiza nombre, email y/o usuario en Auth + DB
//    Solo incluye los campos que quieras cambiar
// ══════════════════════════════════════════════════════
async function editarUsuario(uid, cambios = {}) {
  // cambios puede tener: nombre, email, usuario, rol
  try {
    const authUpdates = {};
    const dbUpdates   = {};

    if (cambios.nombre) {
      authUpdates.displayName       = cambios.nombre;
      dbUpdates[`usuarios/${uid}/nombre`] = cambios.nombre;
    }
    if (cambios.email) {
      authUpdates.email                  = cambios.email;
      dbUpdates[`usuarios/${uid}/email`] = cambios.email;
    }
    if (cambios.usuario) {
      dbUpdates[`usuarios/${uid}/usuario`] = cambios.usuario;
    }
    if (cambios.rol) {
      dbUpdates[`usuarios/${uid}/rol`] = cambios.rol;
    }

    // Actualizar en Auth si hay cambios de Auth
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(uid, authUpdates);
      console.log(`\n✅ Auth actualizado:`, authUpdates);
    }

    // Actualizar en DB
    if (Object.keys(dbUpdates).length > 0) {
      await db.ref().update(dbUpdates);
      console.log(`✅ DB actualizada:`, dbUpdates);
    }

    console.log(`\n✅ Usuario ${uid} editado correctamente\n`);
  } catch (error) {
    console.error(`\n❌ Error editando usuario: ${error.message}\n`);
  }
}

// ══════════════════════════════════════════════════════
// 5. CAMBIAR CONTRASEÑA (solo en Auth, nunca en la DB)
// ══════════════════════════════════════════════════════
async function cambiarContrasena(uid, nuevaContrasena) {
  try {
    await auth.updateUser(uid, { password: nuevaContrasena });
    console.log(`\n✅ Contraseña actualizada en Auth para ${uid}\n`);
  } catch (error) {
    console.error(`\n❌ Error cambiando contraseña: ${error.message}\n`);
  }
}

// ══════════════════════════════════════════════════════
// 6. ELIMINAR USUARIO (de Auth + todos los nodos DB)
// ══════════════════════════════════════════════════════
async function eliminarUsuario(uid) {
  try {
    await auth.deleteUser(uid);
    console.log(`\n🗑️  Eliminado de Auth: ${uid}`);

    await db.ref(`usuarios/${uid}`).remove();
    await db.ref(`user_dirs/${uid}`).remove();
    await db.ref(`user_proveedores/${uid}`).remove();

    // Limpiar entradas de user_logins asociadas al UID
    const loginsSnap = await db.ref("user_logins").once("value");
    const updates = {};
    loginsSnap.forEach((child) => {
      if (child.key && child.key.includes(uid.substring(0, 8))) {
        updates[child.key] = null;
      }
    });
    if (Object.keys(updates).length > 0) {
      await db.ref("user_logins").update(updates);
    }

    console.log(`✅ Usuario ${uid} eliminado de Auth y DB completamente\n`);
  } catch (error) {
    console.error(`\n❌ Error eliminando usuario: ${error.message}\n`);
  }
}

// ══════════════════════════════════════════════════════
// 7. MIGRAR contraseñas de la DB → Auth (una sola vez)
//    Luego las borra de la DB
// ══════════════════════════════════════════════════════
async function migrarContrasenasAAuth() {
  console.log("\n🔄 Migrando contraseñas de DB → Auth...\n");
  const snap = await db.ref("usuarios").once("value");
  const usuarios = snap.val() || {};
  let migradas = 0;

  for (const [uid, u] of Object.entries(usuarios)) {
    if (u.contrasena) {
      await cambiarContrasena(uid, u.contrasena);
      migradas++;
    }
  }

  if (migradas > 0) {
    await limpiarContrasenasDB();
    console.log(`✅ ${migradas} contraseña(s) migrada(s) y limpiadas de la DB\n`);
  } else {
    console.log("✅ No había contraseñas pendientes de migrar\n");
  }
}

// ══════════════════════════════════════════════════════
// 8. LIMPIAR campo 'contrasena' de la DB (sin migrar)
// ══════════════════════════════════════════════════════
async function limpiarContrasenasDB() {
  const snap = await db.ref("usuarios").once("value");
  const usuarios = snap.val() || {};
  const updates = {};

  for (const [uid, u] of Object.entries(usuarios)) {
    if (u.contrasena) {
      updates[`usuarios/${uid}/contrasena`] = null;
      console.log(`  🧹 Limpiando clave de ${u.nombre}`);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
    console.log("✅ Contraseñas en texto plano eliminadas de la DB\n");
  } else {
    console.log("✅ No hay contraseñas en texto plano en la DB\n");
  }
}

// ══════════════════════════════════════════════════════
// EJECUCIÓN PRINCIPAL — descomenta lo que necesites
// ══════════════════════════════════════════════════════
async function main() {

  // ── Ver estado general de todos los usuarios ──
  await auditarUsuarios();

  // ── Ver contraseñas guardadas en texto plano en la DB ──
  //await mostrarContrasenasDB();

  // ── Migrar contraseñas de DB → Auth y limpiarlas (hazlo UNA sola vez) ──
  await migrarContrasenasAAuth();

  // ── Limpiar contraseñas de la DB sin migrar ──
  // await limpiarContrasenasDB();

  // ── Crear un usuario nuevo ──
  // await crearUsuario(
  //   "nuevo@app.local",   // email
  //   "clave123",          // contraseña
  //   "LUIS PEREZ",        // nombre completo
  //   "LUISPEREZ"          // nombre de usuario para login
  // );

  // ── Editar datos de un usuario (solo pon los campos que cambias) ──
  // await editarUsuario("Xy59SESwhKMYuARnmeFYFAbqjGD2", {
  //   nombre:  "MAGNOLIA GARCIA",       // cambia nombre en Auth + DB
  //   email:   "magnolia2@app.local",   // cambia email en Auth + DB
  //   usuario: "MAGNOLIA2",             // cambia usuario en DB
  //   rol:     "admin",                 // cambia rol en DB
  // });

  // ── Cambiar solo la contraseña de un usuario ──
  // await cambiarContrasena("Xy59SESwhKMYuARnmeFYFAbqjGD2", "nuevaClave456");

  // ── Eliminar usuario huérfano ──
  // await eliminarUsuario("pj9FmvOZIRYbhRRhbWLzj8rImWk1");

  process.exit(0);
}

main().catch(console.error);
