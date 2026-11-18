<?php

namespace Tests\Unit\Oday;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\MockAccountData;
use Tests\TestCase;

class BackupSettingsApiTest extends TestCase
{
    use DatabaseTransactions;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
        config([
            'oday.backup.encryption_key' => '',
            'oday.google_drive_backup.client_id' => '',
            'oday.google_drive_backup.client_secret' => '',
            'oday.backup.google_redirect_uri' => '',
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function apiHeaders(): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ];
    }

    public function test_settings_show_works_without_backup_env(): void
    {
        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/settings')
            ->assertOk()
            ->assertJsonStructure(['settings', 'google_connected']);
    }

    public function test_enabling_local_backup_requires_encryption_key(): void
    {
        $response = $this->withHeaders($this->apiHeaders())->putJson('/api/backup/settings', [
            'local_enabled' => true,
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'BACKUP_ENCRYPTION_KEY is not configured. Set it in .env before using ODAY OS backups.']);
    }

    public function test_enabling_drive_backup_requires_oauth_and_encryption(): void
    {
        config(['oday.backup.encryption_key' => 'unit-test-backup-key']);

        $response = $this->withHeaders($this->apiHeaders())->putJson('/api/backup/settings', [
            'drive_enabled' => true,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Google Drive backup OAuth', (string) $response->json('message'));
    }

    public function test_enabling_drive_backup_succeeds_when_fully_configured(): void
    {
        config([
            'oday.backup.encryption_key' => 'unit-test-backup-key',
            'oday.google_drive_backup.client_id' => 'test-client',
            'oday.google_drive_backup.client_secret' => 'test-secret',
            'oday.backup.google_redirect_uri' => 'https://example.test/callback',
        ]);

        $this->withHeaders($this->apiHeaders())
            ->putJson('/api/backup/settings', ['drive_enabled' => true, 'local_enabled' => false])
            ->assertOk()
            ->assertJsonPath('settings.drive_enabled', true);
    }
}
