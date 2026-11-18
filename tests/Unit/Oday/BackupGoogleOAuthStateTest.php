<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\Backup\BackupGoogleDriveService;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class BackupGoogleOAuthStateTest extends TestCase
{
    public function test_signed_state_round_trips_company_context(): void
    {
        $service = app(BackupGoogleDriveService::class);
        $state = $service->signedState(42, 7);
        $parsed = $service->parseState($state);

        $this->assertIsArray($parsed);
        $this->assertSame(42, $parsed['company_id']);
        $this->assertSame(7, $parsed['user_id']);
    }

    public function test_parse_state_rejects_tampered_payload(): void
    {
        $service = app(BackupGoogleDriveService::class);
        $this->assertNull($service->parseState('not-valid-ciphertext'));
    }

    public function test_parse_state_rejects_expired_state(): void
    {
        $service = app(BackupGoogleDriveService::class);
        $state = Crypt::encryptString(json_encode([
            'company_id' => 1,
            'user_id' => 1,
            'exp' => now()->subMinute()->timestamp,
        ], JSON_THROW_ON_ERROR));

        $this->assertNull($service->parseState($state));
    }
}
