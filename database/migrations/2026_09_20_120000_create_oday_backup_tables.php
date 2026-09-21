<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id')->unique();
            $table->text('google_refresh_token_encrypted')->nullable();
            $table->string('google_account_email', 320)->nullable();
            $table->string('drive_folder_id', 128)->nullable();
            $table->boolean('drive_enabled')->default(true);
            $table->boolean('local_enabled')->default(true);
            $table->string('local_folder_path', 1024)->nullable();
            $table->string('local_folder_label', 512)->nullable();
            $table->string('local_mode', 16)->default('web');
            $table->string('frequency', 16)->default('daily');
            $table->string('time_of_day', 5)->default('03:00');
            $table->unsignedTinyInteger('weekday')->nullable();
            $table->string('timezone', 64)->default('UTC');
            $table->unsignedSmallInteger('retention_count_drive')->default(14);
            $table->unsignedSmallInteger('retention_count_local')->default(14);
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('last_scheduled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('backup_counters', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id')->unique();
            $table->unsignedInteger('last_seq')->default(0);
            $table->timestamps();
        });

        Schema::create('backup_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id')->index();
            $table->unsignedInteger('seq');
            $table->string('file_name', 255);
            $table->string('type', 16);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->char('checksum_sha256', 64)->nullable();
            $table->string('status', 16)->default('running');
            $table->string('drive_status', 24)->nullable();
            $table->string('drive_file_id', 128)->nullable();
            $table->text('drive_error')->nullable();
            $table->string('local_status', 24)->nullable();
            $table->text('local_error')->nullable();
            $table->text('error_message')->nullable();
            $table->string('storage_path', 512)->nullable();
            $table->unsignedTinyInteger('retry_count')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'seq']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_runs');
        Schema::dropIfExists('backup_counters');
        Schema::dropIfExists('backup_settings');
    }
};
