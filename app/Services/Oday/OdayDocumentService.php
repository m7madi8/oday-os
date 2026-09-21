<?php

/**
 * نظام عدي أبو ضحى — ربط المستندات بالمشاريع.
 */

namespace App\Services\Oday;

use App\Models\Document;
use App\Models\Project;
use App\Models\User;

class OdayDocumentService
{
    public function assignToProject(Document $document, Project $project, User $user): Document
    {
        if ($document->company_id !== $project->company_id) {
            abort(403, 'Document and project must belong to the same company.');
        }

        if (! $user->can('edit', $document)) {
            abort(403);
        }

        $document->documentable_type = Project::class;
        $document->documentable_id = $project->id;
        $document->project_id = $project->id;
        $document->save();

        $project->touch();

        return $document->fresh();
    }
}
