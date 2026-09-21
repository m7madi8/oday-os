<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_office_cheque_print_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id')->unique();
            $table->decimal('offset_x_mm', 5, 1)->default(0);
            $table->decimal('offset_y_mm', 5, 1)->default(0);
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_office_cheque_print_settings');
    }
};
