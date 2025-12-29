// Web Crypto API Helpers

// Generate a key from password
const deriveKey = async (password, salt, usage) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        usage
    );
};

// Encrypt Object
export const encryptBackup = async (dataObj, password) => {
    try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt, ["encrypt"]);

        const enc = new TextEncoder();
        const encodedData = enc.encode(JSON.stringify(dataObj));

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedData
        );

        // Convert buffers to Base64 strings for JSON storage
        const bufferToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

        return {
            v: 1, // Versioning
            salt: bufferToBase64(salt),
            iv: bufferToBase64(iv),
            data: bufferToBase64(ciphertext) // The encrypted payload
        };
    } catch (e) {
        console.error("Encryption Failed", e);
        throw new Error("Encryption Failed");
    }
};

// Decrypt Object
export const decryptBackup = async (backupObj, password) => {
    try {
        const base64ToBuffer = (str) => {
            const bin = atob(str);
            const len = bin.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            return bytes;
        };

        const salt = base64ToBuffer(backupObj.salt);
        const iv = base64ToBuffer(backupObj.iv);
        const ciphertext = base64ToBuffer(backupObj.data);

        const key = await deriveKey(password, salt, ["decrypt"]);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        return JSON.parse(dec.decode(decrypted));
    } catch (e) {
        console.error("Decryption Failed", e);
        throw new Error("Invalid Password or Corrupt File");
    }
};
