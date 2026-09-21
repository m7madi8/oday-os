<?php

use App\Services\Oday\Cheque\ChequeMigrationMapper;
use App\Services\Oday\OdayChequeMoney;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('oday_cheques', function (Blueprint $table) {
            if (! Schema::hasColumn('oday_cheques', 'amount_minor')) {
                $table->unsignedBigInteger('amount_minor')->default(0)->after('amount');
            }
            if (! Schema::hasColumn('oday_cheques', 'issue_date')) {
                $table->date('issue_date')->nullable()->after('currency_code');
            }
            if (! Schema::hasColumn('oday_cheques', 'project_id')) {
                $table->unsignedInteger('project_id')->nullable()->after('client_id');
            }
            if (! Schema::hasColumn('oday_cheques', 'bank_id')) {
                $table->string('bank_id', 64)->nullable()->after('bank_name');
            }
            if (! Schema::hasColumn('oday_cheques', 'drawer_name')) {
                $table->string('drawer_name', 160)->nullable()->after('payee_name');
            }
            if (! Schema::hasColumn('oday_cheques', 'account_reference')) {
                $table->string('account_reference', 120)->nullable()->after('drawer_name');
            }
            if (! Schema::hasColumn('oday_cheques', 'updated_by_user_id')) {
                $table->unsignedInteger('updated_by_user_id')->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('oday_cheques', 'dedupe_key')) {
                $table->string('dedupe_key', 191)->nullable()->after('number');
            }

            $table->index(['company_id', 'project_id']);
            $table->index(['company_id', 'bank_id']);
        });

        $mapper = new ChequeMigrationMapper();
        $unmappedStatuses = [];
        $unmappedDirections = [];

        DB::table('oday_cheques')->orderBy('id')->chunkById(200, function ($rows) use ($mapper, &$unmappedStatuses, &$unmappedDirections) {
            foreach ($rows as $row) {
                $direction = $mapper->mapDirection((string) $row->direction, $unmappedDirections);
                $status = $mapper->mapStatus((string) $row->status, (string) $direction, $unmappedStatuses);
                $currency = $row->currency_code ?: OdayChequeMoney::CURRENCY_ILS;
                $minor = OdayChequeMoney::decimalToMinor((string) $row->amount, $currency);
                $dedupe = ChequeMigrationMapper::buildDedupeKey(
                    $row->bank_id,
                    $row->bank_name,
                    $row->account_reference ?? null,
                    $row->number,
                );

                DB::table('oday_cheques')->where('id', $row->id)->update([
                    'direction' => $direction,
                    'status' => $status,
                    'amount_minor' => $minor,
                    'issue_date' => $row->issue_date ?? ($row->created_at ? \Illuminate\Support\Carbon::parse($row->created_at)->toDateString() : null),
                    'dedupe_key' => $dedupe,
                ]);
            }
        });

        if ($unmappedStatuses !== [] || $unmappedDirections !== []) {
            Log::warning('ODAY cheques migration: unmapped values', [
                'statuses' => array_values(array_unique($unmappedStatuses)),
                'directions' => array_values(array_unique($unmappedDirections)),
            ]);
        }

        Schema::table('oday_cheques', function (Blueprint $table) {
            $table->unique(['company_id', 'dedupe_key'], 'oday_cheques_company_dedupe_unique');
        });
    }

    public function down(): void
    {
        Schema::table('oday_cheques', function (Blueprint $table) {
            $table->dropUnique('oday_cheques_company_dedupe_unique');
            $table->dropIndex(['company_id', 'project_id']);
            $table->dropIndex(['company_id', 'bank_id']);
            $table->dropColumn([
                'amount_minor',
                'issue_date',
                'project_id',
                'bank_id',
                'drawer_name',
                'account_reference',
                'updated_by_user_id',
                'dedupe_key',
            ]);
        });

        DB::table('oday_cheques')->where('direction', 'incoming')->update(['direction' => 'in']);
        DB::table('oday_cheques')->where('direction', 'outgoing')->update(['direction' => 'out']);
    }
};
