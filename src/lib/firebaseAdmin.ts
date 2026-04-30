import admin from 'firebase-admin';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

let firebaseAdminApp: App;

const serviceAccountRes = './service-account.json'; // Default location

if (getApps().length === 0) {
    if (fs.existsSync(serviceAccountRes)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountRes, 'utf8'));
        firebaseAdminApp = initializeApp({
            credential: cert(serviceAccount)
        });
    } else {
        // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS might be set or using default credentials
        firebaseAdminApp = initializeApp();
    }
} else {
    firebaseAdminApp = getApp();
}

export const db = getFirestore(firebaseAdminApp);
export const auth = getAuth(firebaseAdminApp);
export default admin;
