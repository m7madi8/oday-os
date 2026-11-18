<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\Backup\OdayBackupRequirements;
use RuntimeException;
use Tests\TestCase;

class OdayBackupRequirementsTest extends TestCase
{
    public function test_encryption_assert_fails_when_key_missing(): void
    {
        config(['oday.backup.encryption_key' => '']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('BACKUP_ENCRYPTION_KEY');

        OdayBackupRequirements::assertEncryptionConfigured();
    }

    public function test_encryption_assert_passes_when_key_set(): void
    {
        config(['oday.backup.encryption_key' => 'test-secret-key-for-unit-tests']);

        OdayBackupRequirements::assertEncryptionConfigured();

        $this->assertTrue(OdayBackupRequirements::encryptionKeyConfigured());
    }

    public function test_google_oauth_assert_lists_missing_env(): void
    {
        config([
            'oday.google_drive_backup.client_id' => '',
            'oday.google_drive_backup.client_secret' => '',
            'oday.backup.google_redirect_uri' => '',
        ]);

        $missing = OdayBackupRequirements::missingGoogleOAuthEnv();
        $this->assertContains('GOOGLE_CLIENT_ID', $missing);
        $this->assertContains('GOOGLE_CLIENT_SECRET', $missing);
        $this->assertContains('GOOGLE_REDIRECT_URI', $missing);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Google Drive backup OAuth');

        OdayBackupRequirements::assertGoogleOAuthConfigured();
    }

    public function test_google_oauth_assert_passes_when_configured(): void
    {
        config([
            'oday.google_drive_backup.client_id' => 'client-id',
            'oday.google_drive_backup.client_secret' => 'client-secret',
            'oday.backup.google_redirect_uri' => 'https://example.test/oauth/callback',
        ]);

        OdayBackupRequirements::assertGoogleOAuthConfigured();
        $this->assertSame([], OdayBackupRequirements::missingGoogleOAuthEnv());
    }
}
