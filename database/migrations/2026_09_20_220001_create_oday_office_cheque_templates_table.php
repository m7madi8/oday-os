<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_office_cheque_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id');
            $table->string('bank_id', 64);
            $table->string('mode', 32)->default('scan-overlay');
            $table->decimal('width_mm', 8, 2);
            $table->decimal('height_mm', 8, 2);
            $table->json('fields_json');
            $table->unsignedInteger('scan_document_id')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedInteger('verified_by_user_id')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'bank_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_office_cheque_templates');
    }
};
