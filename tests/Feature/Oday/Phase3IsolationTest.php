<?php

namespace Tests\Feature\Oday;

use App\Models\Company;
use App\Utils\Traits\MakesHash;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\MockAccountData;
use Tests\TestCase;

class Phase3IsolationTest extends TestCase
{
    use DatabaseTransactions;
    use MakesHash;
    use MockAccountData;

    protected function setUp(): void
    {
        parent::setUp();
        $this->makeTestData();
    }

    public function test_foreign_employee_and_document_are_not_visible(): void
    {
        $other = Company::factory()->create(['account_id' => $this->account->id]);
        $ownId = DB::table('oday_employees')->insertGetId([
            'company_id' => $this->company->id,
            'user_id' => $this->user->id,
            'name' => 'موظف الشركة الحالية',
            'salary_amount' => '10.100000',
            'currency_code' => 'ILS',
            'is_active' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $employeeId = DB::table('oday_employees')->insertGetId([
            'company_id' => $other->id,
            'user_id' => $this->user->id,
            'name' => 'موظف شركة أخرى',
            'salary_amount' => '10.100000',
            'currency_code' => 'ILS',
            'is_active' => 1,
            'is_deleted' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $ownDocumentId = DB::table('documents')->insertGetId([
            'user_id' => $this->user->id,
            'company_id' => $this->company->id,
            'name' => 'own.pdf',
            'documentable_id' => $this->company->id,
            'documentable_type' => Company::class,
            'is_public' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $documentId = DB::table('documents')->insertGetId([
            'user_id' => $this->user->id,
            'company_id' => $other->id,
            'name' => 'foreign.pdf',
            'documentable_id' => $other->id,
            'documentable_type' => Company::class,
            'is_public' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/v1/employees/'.$this->encodePrimaryKey($ownId))
            ->assertOk();

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/v1/employees/'.$this->encodePrimaryKey($employeeId))
            ->assertStatus(404);

        $this->assertNotSame(404, $this->withHeaders($this->apiHeaders())
            ->putJson('/api/oday/mobile/documents/'.$this->encodePrimaryKey($ownDocumentId).'/assign-project', [
                'project_id' => $this->project->hashed_id,
            ])->status());

        $this->withHeaders($this->apiHeaders())
            ->putJson('/api/oday/mobile/documents/'.$this->encodePrimaryKey($documentId).'/assign-project', [
                'project_id' => $this->project->hashed_id,
            ])
            ->assertStatus(404);

        $this->assertNull(DB::table('documents')->where('id', $documentId)->value('project_id'));
    }

    public function test_confirmed_restore_stays_disabled_for_an_owner(): void
    {
        $this->withHeaders($this->apiHeaders())
            ->postJson('/api/backup/restore', [
                'run_id' => 1,
                'confirm' => true,
            ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'restore_disabled');
    }

    public function test_payroll_and_report_routes_reject_missing_tokens(): void
    {
        $this->getJson('/api/v1/employees')->assertStatus(403);
        $this->getJson('/api/v1/reports/office-summary?year=2026')->assertStatus(403);
        $this->postJson('/api/backup/restore', [
            'run_id' => 1,
            'confirm' => true,
        ])->assertStatus(403);
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
}
