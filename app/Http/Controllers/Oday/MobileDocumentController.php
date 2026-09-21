<?php

/**
 * نظام عدي أبو ضحى — ربط مستندات المشاريع.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Project;
use App\Services\Oday\OdayDocumentService;
use App\Transformers\DocumentTransformer;
use App\Utils\Traits\MakesHash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MobileDocumentController extends Controller
{
    use MakesHash;

    public function assignProject(Request $request, Document $document, OdayDocumentService $service): JsonResponse
    {
        $request->validate([
            'project_id' => 'required|string',
        ]);

        $project_pk = $this->decodePrimaryKey($request->input('project_id'));
        if (! $project_pk) {
            return response()->json(['message' => 'معرّف المشروع غير صالح'], 422);
        }

        $project = Project::query()
            ->where('company_id', auth()->user()->companyId())
            ->where('is_deleted', false)
            ->whereNull('deleted_at')
            ->find($project_pk);

        if (! $project) {
            return response()->json(['message' => 'المشروع غير موجود'], 422);
        }

        $document = $service->assignToProject($document, $project, auth()->user());

        return response()->json((new DocumentTransformer())->transform($document));
    }
}
