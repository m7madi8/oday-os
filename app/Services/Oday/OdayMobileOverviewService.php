<?php

/**
 * نظام عدي أبو ضحى — تجميع نظرة الجوال من سجلات Invoice Ninja.
 */

namespace App\Services\Oday;

use App\Models\Activity;
use App\Models\Invoice;
use App\Models\OdayCheque;
use App\Models\Project;
use App\Models\User;
use App\Utils\Traits\MakesHash;
use Illuminate\Support\Carbon;

class OdayMobileOverviewService
{
    use MakesHash;

    public function build(User $user): array
    {
        $companyId = $user->companyId();
        $today = Carbon::today()->toDateString();
        $soon = Carbon::today()->addDays(14)->toDateString();
        $horizon = Carbon::today()->addDays(30)->toDateString();

        $openInvoices = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereNull('deleted_at')
            ->whereIn('status_id', [Invoice::STATUS_SENT, Invoice::STATUS_PARTIAL])
            ->where('balance', '>', 0);

        $receivables = (float) (clone $openInvoices)->sum('balance');

        $upcomingPaymentsQuery = (clone $openInvoices)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today)
            ->whereDate('due_date', '<=', $horizon);

        $upcomingPaymentsCount = (clone $upcomingPaymentsQuery)->count();
        $upcomingPaymentsTotal = (float) (clone $upcomingPaymentsQuery)->sum('balance');
        $upcomingPayments = (clone $upcomingPaymentsQuery)
            ->orderBy('due_date')
            ->limit(8)
            ->get(['id', 'number', 'due_date', 'balance', 'client_id']);

        $overdueInvoices = (clone $openInvoices)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->orderBy('due_date')
            ->limit(8)
            ->get(['id', 'number', 'due_date', 'balance', 'client_id']);

        $activeProjects = Project::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereNull('deleted_at')
            ->count();

        $upcomingCheques = OdayCheque::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereIn('status', [OdayCheque::STATUS_PENDING, OdayCheque::STATUS_DEPOSITED])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $today)
            ->whereDate('due_date', '<=', $horizon)
            ->orderBy('due_date')
            ->limit(8)
            ->get();

        $alerts = [];

        foreach ($overdueInvoices as $invoice) {
            $alerts[] = [
                'id' => 'invoice-'.$invoice->hashed_id,
                'type' => 'overdue_invoice',
                'title' => 'فاتورة متأخرة',
                'body' => 'فاتورة '.$invoice->number.' مستحقة منذ '.$invoice->due_date,
                'amount' => (float) $invoice->balance,
                'entity_id' => $invoice->hashed_id,
                'entity_type' => 'invoice',
            ];
        }

        $dueSoonCheques = $upcomingCheques->filter(function (OdayCheque $cheque) use ($soon) {
            return $cheque->due_date && $cheque->due_date <= $soon;
        });

        foreach ($dueSoonCheques as $cheque) {
            $alerts[] = [
                'id' => 'cheque-'.$cheque->hashed_id,
                'type' => 'cheque_due',
                'title' => 'شيك قريب الاستحقاق',
                'body' => 'شيك رقم '.$cheque->number.' بتاريخ '.$cheque->due_date,
                'amount' => (float) $cheque->amount,
                'entity_id' => $cheque->hashed_id,
                'entity_type' => 'cheque',
            ];
        }

        $bounced = OdayCheque::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->where('status', OdayCheque::STATUS_BOUNCED)
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get();

        foreach ($bounced as $cheque) {
            $alerts[] = [
                'id' => 'bounced-'.$cheque->hashed_id,
                'type' => 'cheque_bounced',
                'title' => 'شيك مرتجع',
                'body' => 'شيك رقم '.$cheque->number.' بحاجة إلى متابعة',
                'amount' => (float) $cheque->amount,
                'entity_id' => $cheque->hashed_id,
                'entity_type' => 'cheque',
            ];
        }

        $activities = Activity::query()
            ->where('company_id', $companyId)
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        return [
            'kpis' => [
                'receivables' => $receivables,
                'upcoming_payments_count' => $upcomingPaymentsCount,
                'upcoming_payments_total' => $upcomingPaymentsTotal,
                'upcoming_cheques_count' => $upcomingCheques->count(),
                'upcoming_cheques_total' => (float) $upcomingCheques->sum('amount'),
                'active_projects' => $activeProjects,
            ],
            'upcoming_payments' => $upcomingPayments->map(fn (Invoice $invoice) => [
                'id' => $invoice->hashed_id,
                'number' => $invoice->number,
                'due_date' => $invoice->due_date,
                'balance' => (float) $invoice->balance,
            ])->values(),
            'upcoming_cheques' => $upcomingCheques->map(fn (OdayCheque $cheque) => [
                'id' => $cheque->hashed_id,
                'number' => $cheque->number,
                'due_date' => $cheque->due_date,
                'amount' => (float) $cheque->amount,
                'status' => $cheque->status,
            ])->values(),
            'alerts' => array_values($alerts),
            'activity' => $activities->map(fn (Activity $activity) => [
                'id' => $this->encodePrimaryKey($activity->id),
                'type_id' => (int) $activity->activity_type_id,
                'notes' => (string) ($activity->notes ?: ''),
                'label' => $this->activityLabel($activity),
                'created_at' => (int) $activity->created_at,
            ])->values(),
        ];
    }

    private function activityLabel(Activity $activity): string
    {
        return match ((int) $activity->activity_type_id) {
            Activity::CREATE_CLIENT => 'تم إنشاء عميل',
            Activity::CREATE_INVOICE => 'تم إنشاء فاتورة',
            Activity::UPDATE_INVOICE => 'تم تحديث فاتورة',
            Activity::CREATE_PAYMENT => 'تم تسجيل دفعة',
            Activity::CREATE_EXPENSE => 'تم تسجيل مصروف',
            default => $activity->notes ?: 'حركة مكتبية',
        };
    }
}
