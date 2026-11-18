<?php

namespace Tests\Unit\Oday;

use App\Models\CompanyUser;
use App\Models\OdayBackupRun;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\MockAccountData;
use Tests\TestCase;

class BackupAuthorizationApiTest extends TestCase
{
    use DatabaseTransactions;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
    }

    /**
     * @return array<string, string>
     */
    private function apiHeaders(?string $token = null): array
    {
        return [
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $token ?? $this->token,
        ];
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->postJson('/api/backup/restore', ['run_id' => 1, 'confirm' => true])
            ->assertStatus(403)
            ->assertJson(['message' => 'Invalid token']);
    }

    public function test_limited_user_cannot_restore_or_change_settings(): void
    {
        $this->demoteCurrentUser();

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/restore', ['run_id' => 1, 'confirm' => true])
            ->assertStatus(403)
            ->assertJson(['message' => 'لا صلاحية لإدارة النسخ الاحتياطي']);

        $this->withHeaders($this->apiHeaders())
            ->putJson('/api/backup/settings', ['local_enabled' => false])
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/google/connect')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/run')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/runs/1/retry')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/runs/1/download')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/runs/1/local-synced')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->deleteJson('/api/backup/google')
            ->assertStatus(403);

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/test-local', ['path' => 'C:\\temp'])
            ->assertStatus(403);
    }

    public function test_company_admin_without_owner_flag_can_manage_backup(): void
    {
        CompanyUser::query()
            ->where('user_id', $this->user->id)
            ->where('company_id', $this->company->id)
            ->update([
                'is_owner' => false,
                'is_admin' => true,
            ]);

        config([
            'oday.google_drive_backup.client_id' => '',
            'oday.google_drive_backup.client_secret' => '',
        ]);

        $response = $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/google/connect');

        $response->assertStatus(422);
        $this->assertNotSame('لا صلاحية لإدارة النسخ الاحتياطي', $response->json('message'));
        $this->assertStringContainsString('Google Drive backup OAuth', (string) $response->json('message'));
    }

    public function test_limited_user_can_read_backup_status(): void
    {
        $this->demoteCurrentUser();

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/settings')
            ->assertOk()
            ->assertJsonStructure(['settings', 'google_connected']);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/runs')
            ->assertOk()
            ->assertJsonStructure(['runs']);
    }

    public function test_super_user_can_read_backup_settings(): void
    {
        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/backup/settings')
            ->assertOk();
    }

    public function test_restore_rejects_run_from_another_company(): void
    {
        $foreignRun = new OdayBackupRun();
        $foreignRun->company_id = $this->company->id + 9999;
        $foreignRun->seq = 1;
        $foreignRun->file_name = 'foreign.zip';
        $foreignRun->type = OdayBackupRun::TYPE_MANUAL;
        $foreignRun->status = OdayBackupRun::STATUS_SUCCESS;
        $foreignRun->storage_path = storage_path('app/oday/backups/missing.zip');
        $foreignRun->save();

        config(['oday.backup.encryption_key' => 'unit-test-backup-key']);

        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/restore', [
                'run_id' => $foreignRun->id,
                'confirm' => true,
            ])
            ->assertStatus(409)
            ->assertJson(['code' => 'restore_disabled']);

        $this->assertSame('foreign.zip', $foreignRun->fresh()->file_name);
    }

    public function test_scheduled_backup_route_does_not_use_token_auth(): void
    {
        config(['oday.backup.cron_secret' => '']);

        $this->postJson('/api/backup/run-scheduled')
            ->assertStatus(401)
            ->assertJson(['message' => 'Unauthorized']);
    }

    private function demoteCurrentUser(): void
    {
        CompanyUser::query()
            ->where('user_id', $this->user->id)
            ->where('company_id', $this->company->id)
            ->update([
                'is_owner' => false,
                'is_admin' => false,
                'permissions' => '["view_client"]',
            ]);
    }
}
