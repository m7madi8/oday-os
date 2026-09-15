<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_cheques', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('assigned_user_id')->nullable();
            $table->unsignedInteger('client_id')->nullable();
            $table->unsignedInteger('invoice_id')->nullable();
            $table->unsignedInteger('payment_id')->nullable();
            $table->string('direction', 16)->default('in');
            $table->string('number', 64);
            $table->string('bank_name', 120)->nullable();
            $table->decimal('amount', 20, 6)->default(0);
            $table->date('due_date')->nullable();
            $table->string('status', 24)->default('pending');
            $table->text('notes')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps(6);
            $table->softDeletes('deleted_at', 6);

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'due_date']);
            $table->index(['company_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_cheques');
    }
};
