<?php

/**
 * نظام عدي أبو ضحى — وكيل الذكاء الاصطناعي على الخادم فقط.
 */

namespace App\Services\Oday;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\OdayCheque;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OdayAiService
{
    public function configured(): bool
    {
        return trim((string) config('oday.ai.api_key')) !== '';
    }

    public function chat(User $user, string $message, array $history = []): string
    {
        if (! $this->configured()) {
            throw new RuntimeException('AI_NOT_CONFIGURED');
        }

        $context = $this->officeContext($user, $message);
        $messages = [
            [
                'role' => 'system',
                'content' => implode("\n", [
                    'أنت مساعد مكتبي لنظام ODAY OS لمكتب عدي أبو ضحى المعماري.',
                    'أجب بالعربية الفصحى المبسطة، باختصار ووضوح، وبالاعتماد فقط على بيانات المكتب التالية.',
                    'لا تخترع أرقاماً أو مشاريع غير موجودة في السياق.',
                    'إذا لم تكفِ البيانات، قل ذلك صراحة.',
                    '--- بيانات المكتب ---',
                    $context,
                ]),
            ],
        ];

        foreach (array_slice($history, -6) as $turn) {
            if (! is_array($turn)) {
                continue;
            }
            $role = ($turn['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = trim((string) ($turn['content'] ?? ''));
            if ($content === '') {
                continue;
            }
            $messages[] = [
                'role' => $role,
                'content' => mb_substr($content, 0, 1200),
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => mb_substr($message, 0, 2000),
        ];

        $base = rtrim((string) config('oday.ai.base_url'), '/');
        $response = Http::withToken((string) config('oday.ai.api_key'))
            ->acceptJson()
            ->timeout(45)
            ->post($base.'/chat/completions', [
                'model' => (string) config('oday.ai.model'),
                'temperature' => 0.2,
                'max_tokens' => 700,
                'messages' => $messages,
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('AI_PROVIDER_ERROR');
        }

        $answer = trim((string) data_get($response->json(), 'choices.0.message.content', ''));

        if ($answer === '') {
            throw new RuntimeException('AI_EMPTY_RESPONSE');
        }

        return $answer;
    }

    private function officeContext(User $user, string $message): string
    {
        $companyId = $user->companyId();
        $today = Carbon::today()->toDateString();
        $monthStart = Carbon::now()->startOfMonth()->toDateString();
        $monthEnd = Carbon::now()->endOfMonth()->toDateString();

        $open = Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereNull('deleted_at')
            ->whereIn('status_id', [Invoice::STATUS_SENT, Invoice::STATUS_PARTIAL])
            ->where('balance', '>', 0);

        $receivables = (float) (clone $open)->sum('balance');

        $overdue = (clone $open)
            ->with('client')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->orderByDesc('balance')
            ->limit(8)
            ->get();

        $projects = Project::query()
            ->with('client')
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereNull('deleted_at')
            ->orderByDesc('updated_at')
            ->limit(12)
            ->get();

        $monthPaid = (float) Invoice::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereBetween('date', [$monthStart, $monthEnd])
            ->selectRaw('COALESCE(SUM(amount - balance), 0) as paid')
            ->value('paid');

        $chequesDue = OdayCheque::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->whereIn('status', [OdayCheque::STATUS_RECEIVED, OdayCheque::STATUS_DEPOSITED, OdayCheque::STATUS_PROCESSING])
            ->orderBy('due_date')
            ->limit(8)
            ->get();

        $lateClients = Client::query()
            ->where('company_id', $companyId)
            ->where('is_deleted', false)
            ->where('balance', '>', 0)
            ->orderByDesc('balance')
            ->limit(8)
            ->get(['id', 'name', 'balance']);

        $namedProject = null;
        foreach ($projects as $project) {
            if ($project->name && mb_stripos($message, $project->name) !== false) {
                $namedProject = $project;
                break;
            }
        }

        $lines = [
            'تاريخ اليوم: '.$today,
            'إجمالي المستحقات المفتوحة: '.$receivables,
            'تحصيلات الفواتير هذا الشهر (تقريبي): '.$monthPaid,
            'عدد المشاريع النشطة: '.$projects->count(),
        ];

        $lines[] = 'عملاء عليهم أرصدة:';
        foreach ($lateClients as $client) {
            $lines[] = '- '.$client->name.' رصيد '.$client->balance;
        }

        $lines[] = 'فواتير متأخرة:';
        foreach ($overdue as $invoice) {
            $clientName = $invoice->client?->name ?: 'عميل';
            $lines[] = '- فاتورة '.$invoice->number.' للعميل '.$clientName.' رصيد '.$invoice->balance.' استحقاق '.$invoice->due_date;
        }

        $lines[] = 'مشاريع نشطة:';
        foreach ($projects as $project) {
            $clientName = $project->client?->name ?: 'بدون عميل';
            $lines[] = '- '.$project->name.' / '.$clientName.' قيمة تقديرية '.$project->budgeted_amount.' استحقاق '.($project->due_date ?: 'غير محدد');
        }

        $lines[] = 'شيكات قيد المتابعة:';
        foreach ($chequesDue as $cheque) {
            $lines[] = '- شيك '.$cheque->number.' مبلغ '.$cheque->amount.' حالة '.$cheque->status.' تاريخ '.$cheque->due_date;
        }

        if ($namedProject) {
            $invoices = Invoice::query()
                ->where('company_id', $companyId)
                ->where('project_id', $namedProject->id)
                ->where('is_deleted', false)
                ->limit(8)
                ->get(['number', 'amount', 'balance', 'status_id', 'due_date']);

            $lines[] = 'تفاصيل المشروع المذكور ('.$namedProject->name.'):';
            foreach ($invoices as $invoice) {
                $lines[] = '- فاتورة '.$invoice->number.' مبلغ '.$invoice->amount.' متبقي '.$invoice->balance.' استحقاق '.$invoice->due_date;
            }
        }

        return implode("\n", $lines);
    }
}
