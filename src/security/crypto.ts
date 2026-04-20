import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { ForgeGuard } from '../utils/ForgeWrappers';

const guard = ForgeGuard.init('crypto-security');

export class CryptoSecurity {

    static generateIdentity() {
        return guard.protect(() => {
            const { publicKey, privateKey } = generateKeyPairSync('ed25519');
            return {
                publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
                privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
            };
        }, { path: 'generateIdentity' });
    }

    static signData(data: string, privateKeyPem: string) {
        return guard.protect(() => {
            return sign(null, Buffer.from(data), privateKeyPem).toString('base64');
        }, { path: 'signData' });
    }
    
    // Additional methods (verify, encrypt/decrypt) will be added as PKI foundation grows.
}
