<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_office_bank_logos', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id');
            $table->string('bank_id', 64);
            $table->unsignedInteger('document_id');
            $table->timestamps();

            $table->unique(['company_id', 'bank_id']);
            $table->index('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_office_bank_logos');
    }
};
