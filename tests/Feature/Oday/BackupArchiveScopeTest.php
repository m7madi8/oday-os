<?php

namespace Tests\Feature\Oday;

use App\Models\Company;
use App\Models\OdayBackupRun;
use App\Services\Oday\Backup\BackupArchiveBuilder;
use App\Services\OdayDashboardStore;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\MockAccountData;
use Tests\TestCase;
use ZipArchive;

class BackupArchiveScopeTest extends TestCase
{
    use DatabaseTransactions;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
    }

    public function test_company_archive_does_not_include_another_company_or_the_global_settings_file(): void
    {
        $other = Company::factory()->create(['account_id' => $this->account->id]);
        DB::table('oday_cheques')->insert([
            'company_id' => $this->company->id,
            'user_id' => $this->user->id,
            'number' => 'OWN-CHEQUE',
            'direction' => 'in',
            'amount' => '10.100000',
            'amount_minor' => 1010,
            'currency_code' => 'ILS',
            'status' => 'received',
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('oday_cheques')->insert([
            'company_id' => $other->id,
            'user_id' => $this->user->id,
            'number' => 'FOREIGN-CHEQUE',
            'direction' => 'in',
            'amount' => '99.000000',
            'amount_minor' => 9900,
            'currency_code' => 'ILS',
            'status' => 'received',
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        app(OdayDashboardStore::class)->put('office-settings', '{"officeName":"FOREIGN-OFFICE"}', 1);

        $built = app(BackupArchiveBuilder::class)->build((int) $this->company->id, 1, 'manual', 'UTC');
        try {
            $zip = new ZipArchive();
            $this->assertTrue($zip->open($built['zip_path']) === true);
            $names = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $names[] = $zip->getNameIndex($i);
            }
            $this->assertNotContains('database.sql', $names);
            $this->assertNotContains('oday-dashboard.json', $names);
            $database = (string) $zip->getFromName('database.json');
            $manifest = json_decode((string) $zip->getFromName('manifest.json'), true);
            $zip->close();

            $this->assertSame('company', $manifest['scope']);
            $this->assertStringContainsString('OWN-CHEQUE', $database);
            $this->assertStringNotContainsString('FOREIGN-CHEQUE', $database);
            $this->assertStringNotContainsString('FOREIGN-OFFICE', $database);
        } finally {
            if (File::exists($built['zip_path'])) {
                File::delete($built['zip_path']);
            }
        }
    }

    public function test_download_of_an_unscoped_archive_is_refused(): void
    {
        $run = new OdayBackupRun();
        $run->company_id = $this->company->id;
        $run->seq = 1;
        $run->file_name = 'old.zip.enc';
        $run->type = OdayBackupRun::TYPE_MANUAL;
        $run->archive_scope = null;
        $run->status = OdayBackupRun::STATUS_SUCCESS;
        $run->storage_path = storage_path('app/oday/backups/missing-old.zip.enc');
        $run->save();

        $this->withHeaders([
            'X-API-SECRET' => config('ninja.api_secret'),
            'X-API-TOKEN' => $this->token,
        ])->get('/api/backup/runs/'.$run->id.'/download')
            ->assertStatus(409)
            ->assertJsonPath('code', 'backup_download_blocked');
    }
}
