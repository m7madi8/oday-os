<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oday_employees', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('user_id');
            $table->string('name', 160);
            $table->string('job_title', 120)->nullable();
            $table->string('phone', 40)->nullable();
            $table->decimal('salary_amount', 20, 6)->default(0);
            $table->string('currency_code', 3)->default('ILS');
            $table->date('hired_on')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps(6);
            $table->softDeletes('deleted_at', 6);

            $table->index(['company_id', 'is_active']);
            $table->index(['company_id', 'name']);
        });

        Schema::create('oday_payroll_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_id');
            $table->unsignedInteger('user_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedInteger('expense_id')->nullable();
            $table->decimal('amount', 20, 6)->default(0);
            $table->string('currency_code', 3)->default('ILS');
            $table->string('period', 7);
            $table->date('paid_on');
            $table->string('method', 24)->default('cash');
            $table->text('notes')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps(6);
            $table->softDeletes('deleted_at', 6);

            $table->index(['company_id', 'period']);
            $table->index(['company_id', 'employee_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oday_payroll_payments');
        Schema::dropIfExists('oday_employees');
    }
};
