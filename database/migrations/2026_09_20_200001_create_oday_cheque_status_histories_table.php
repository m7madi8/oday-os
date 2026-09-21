<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_cheque_status_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cheque_id');
            $table->string('old_status', 24)->nullable();
            $table->string('new_status', 24);
            $table->text('reason')->nullable();
            $table->unsignedInteger('user_id');
            $table->timestamp('created_at', 6)->useCurrent();

            $table->index(['cheque_id', 'created_at']);
            $table->foreign('cheque_id')->references('id')->on('oday_cheques')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_cheque_status_histories');
    }
};
