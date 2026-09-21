<?php

namespace App\Services\Oday\Backup;

use RuntimeException;

final class BackupEncryption
{
    private const VERSION = 1;

    public static function keyMaterial(): string
    {
        $raw = (string) config('oday.backup.encryption_key');
        if ($raw === '') {
            throw new RuntimeException('BACKUP_ENCRYPTION_KEY is not configured');
        }

        return hash('sha256', $raw, true);
    }

    public static function encrypt(string $plaintext): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            self::keyMaterial(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            (string) self::VERSION,
            16
        );

        if ($ciphertext === false) {
            throw new RuntimeException('backup_encrypt_failed');
        }

        return pack('C', self::VERSION).$iv.$tag.$ciphertext;
    }

    public static function decrypt(string $payload): string
    {
        if (strlen($payload) < 1 + 12 + 16 + 1) {
            throw new RuntimeException('backup_payload_invalid');
        }

        $version = unpack('C', $payload[0])[1];
        if ($version !== self::VERSION) {
            throw new RuntimeException('backup_version_unsupported');
        }

        $iv = substr($payload, 1, 12);
        $tag = substr($payload, 13, 16);
        $ciphertext = substr($payload, 29);
        $plain = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            self::keyMaterial(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            (string) $version
        );

        if ($plain === false) {
            throw new RuntimeException('backup_decrypt_failed');
        }

        return $plain;
    }

    public static function encryptToken(string $refreshToken): string
    {
        return base64_encode(self::encrypt($refreshToken));
    }

    public static function decryptToken(string $encrypted): string
    {
        $raw = base64_decode($encrypted, true);
        if ($raw === false) {
            throw new RuntimeException('backup_token_invalid');
        }

        return self::decrypt($raw);
    }
}
