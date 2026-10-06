import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
} from "firebase/firestore";

// Configuração do Firebase
// Utiliza variáveis públicas com fallback para o ID do projeto do repositório
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyFakeKeyForLocalDev123456789",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "desafio-devops-a22de.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "desafio-devops-a22de",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "desafio-devops-a22de.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:123456789012:web:abcdef123456",
};

// Padrão Singleton: evita inicializações múltiplas durante Fast Refresh/SSR no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Leitura das variáveis de ambiente públicas solicitadas
const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE || "api";
const USE_EMULATOR =
  process.env.NEXT_PUBLIC_USE_EMULATOR === "true" ||
  process.env.NEXT_PUBLIC_USE_EMULATOR === "1";

// Se a flag de emulador estiver ativa, conecta ao emulador local na porta 8080
if (USE_EMULATOR) {
  // Evita reexecução em reloads de desenvolvimento (Hot Module Replacement)
  if (!globalThis._firestoreEmulatorConnected) {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      globalThis._firestoreEmulatorConnected = true;
      console.log(
        "[Firebase] Conectado ao emulador do Firestore em 127.0.0.1:8080",
      );
    } catch (error) {
      console.warn("[Firebase] Aviso ao conectar emulador:", error.message);
    }
  }
}

/**
 * Camada de abstração para obtenção dos dados.
 * Alterna entre Firestore e API REST (Django) conforme NEXT_PUBLIC_DATA_SOURCE.
 */
export async function getDashboardData() {
  if (DATA_SOURCE === "firebase") {
    const querySnapshot = await getDocs(collection(db, "items"));
    const items = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return data.name || data.title || data.text || doc.id;
    });

    return {
      status: "ok (firestore)",
      items:
        items.length > 0
          ? items
          : ["Configurar Docker", "Automatizar CI", "Publicar no GHCR"],
    };
  }

  // Fallback padrão: API REST backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/api/health/`);
  if (!res.ok) {
    throw new Error("Falha ao comunicar com a API");
  }
  return res.json();
}

export { app, db, DATA_SOURCE, USE_EMULATOR };
