<?php

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Http\Requests\Oday\EmployeePayRequest;
use App\Http\Requests\Oday\EmployeeStoreRequest;
use App\Http\Requests\Oday\EmployeeUpdateRequest;
use App\Models\OdayEmployee;
use App\Models\OdayPayrollPayment;
use App\Services\Oday\Payroll\OdayPayrollService;
use App\Transformers\OdayEmployeeTransformer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function __construct(
        private OdayPayrollService $payroll,
        private OdayEmployeeTransformer $transformer,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->assertCanView();
        $user = auth()->user();
        $period = $this->payroll->normalizePeriod($request->query('period'));
        $paginator = $this->payroll->listEmployees($user, $request->all());

        return response()->json([
            'data' => collect($paginator->items())->map(function (OdayEmployee $employee) use ($period) {
                return $this->transformer->transform(
                    $employee,
                    $period,
                    $employee->getAttribute('period_payment'),
                    $employee->getAttribute('latest_payment'),
                );
            })->values(),
            'meta' => [
                'summary' => $this->payroll->summary($user, $period),
                'pagination' => [
                    'total' => $paginator->total(),
                    'count' => $paginator->count(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'total_pages' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $this->assertCanView();

        return response()->json([
            'data' => $this->payroll->summary(auth()->user(), $request->query('period')),
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $this->assertCanView();
        $paginator = $this->payroll->listPayments(auth()->user(), $request->all());

        return response()->json([
            'data' => collect($paginator->items())->map(
                fn (OdayPayrollPayment $payment) => $this->transformer->payment($payment)
            )->values(),
            'meta' => [
                'pagination' => [
                    'total' => $paginator->total(),
                    'count' => $paginator->count(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'total_pages' => $paginator->lastPage(),
                ],
            ],
        ]);
    }

    public function show(OdayEmployee $employee): JsonResponse
    {
        $this->assertCanView();
        $this->assertCompany($employee);
        $period = $this->payroll->normalizePeriod(request()->query('period'));
        $this->payroll->attachPayments(collect([$employee]), $period);

        return response()->json([
            'data' => $this->transformer->transform(
                $employee,
                $period,
                $employee->getAttribute('period_payment'),
                $employee->getAttribute('latest_payment'),
            ),
        ]);
    }

    public function store(EmployeeStoreRequest $request): JsonResponse
    {
        $employee = $this->payroll->create(auth()->user(), $request->validatedPayload());
        $period = $this->payroll->normalizePeriod($request->input('period'));

        return response()->json([
            'data' => $this->transformer->transform($employee, $period),
        ], 201);
    }

    public function update(EmployeeUpdateRequest $request, OdayEmployee $employee): JsonResponse
    {
        $this->assertCompany($employee);
        $this->assertCanEdit();

        $employee = $this->payroll->update($employee, $request->validatedPayload());
        $period = $this->payroll->normalizePeriod($request->input('period'));
        $this->payroll->attachPayments(collect([$employee]), $period);

        return response()->json([
            'data' => $this->transformer->transform(
                $employee,
                $period,
                $employee->getAttribute('period_payment'),
                $employee->getAttribute('latest_payment'),
            ),
        ]);
    }

    public function pay(EmployeePayRequest $request, OdayEmployee $employee): JsonResponse
    {
        $this->assertCompany($employee);
        $this->assertCanEdit();

        $payment = $this->payroll->pay($employee, auth()->user(), $request->validatedPayload());

        return response()->json([
            'data' => $this->transformer->payment($payment),
        ], 201);
    }

    public function destroy(OdayEmployee $employee): JsonResponse
    {
        $this->assertCompany($employee);
        $this->assertCanEdit();

        $this->payroll->softDelete($employee);

        return response()->json(['message' => 'تم حذف الموظف']);
    }

    private function assertCompany(OdayEmployee $employee): void
    {
        if ((int) $employee->company_id !== (int) auth()->user()->companyId()) {
            abort(404);
        }
    }

    private function assertCanView(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('view_expense') || $user->hasPermission('create_expense'))) {
            abort(403, 'لا صلاحية لعرض الرواتب');
        }
    }

    private function assertCanEdit(): void
    {
        $user = auth()->user();
        if (! ($user->isSuperUser() || $user->hasPermission('edit_expense') || $user->hasPermission('create_expense'))) {
            abort(403, 'لا صلاحية لتعديل الرواتب');
        }
    }
}
