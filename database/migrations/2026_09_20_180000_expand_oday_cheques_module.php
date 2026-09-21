<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('oday_cheques', function (Blueprint $table) {
            $table->string('currency_code', 3)->default('ILS')->after('amount');
            $table->unsignedInteger('vendor_id')->nullable()->after('client_id');
            $table->string('payee_name', 160)->nullable()->after('vendor_id');
            $table->text('status_reason')->nullable()->after('status');
            $table->unsignedInteger('scan_document_id')->nullable()->after('payment_id');

            $table->index(['company_id', 'vendor_id']);
            $table->index(['company_id', 'currency_code']);
        });

        DB::table('oday_cheques')->where('status', 'pending')->update(['status' => 'received']);
        DB::table('oday_cheques')->where('status', 'bounced')->update(['status' => 'returned']);
        DB::table('oday_cheques')
            ->where('direction', 'out')
            ->where('status', 'received')
            ->update(['status' => 'draft']);
    }

    public function down(): void
    {
        DB::table('oday_cheques')->where('status', 'received')->update(['status' => 'pending']);
        DB::table('oday_cheques')->where('status', 'returned')->update(['status' => 'bounced']);
        DB::table('oday_cheques')
            ->whereIn('status', ['processing', 'draft', 'printed', 'delivered'])
            ->update(['status' => 'pending']);

        Schema::table('oday_cheques', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'vendor_id']);
            $table->dropIndex(['company_id', 'currency_code']);
            $table->dropColumn([
                'currency_code',
                'vendor_id',
                'payee_name',
                'status_reason',
                'scan_document_id',
            ]);
        });
    }
};
