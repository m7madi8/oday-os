<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backup_runs', function (Blueprint $table) {
            if (! Schema::hasColumn('backup_runs', 'archive_scope')) {
                $table->string('archive_scope', 16)->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('backup_runs', function (Blueprint $table) {
            if (Schema::hasColumn('backup_runs', 'archive_scope')) {
                $table->dropColumn('archive_scope');
            }
        });
    }
};
