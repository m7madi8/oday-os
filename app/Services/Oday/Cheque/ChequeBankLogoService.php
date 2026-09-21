<?php

namespace App\Services\Oday\Cheque;

use App\Jobs\Util\UploadFile;
use App\Models\Company;
use App\Models\OdayOfficeBankLogo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

class ChequeBankLogoService
{
    public function __construct(private BankLogoSvgSanitizer $svgSanitizer)
    {
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function listForCompany(int $companyId): array
    {
        $rows = OdayOfficeBankLogo::query()
            ->where('company_id', $companyId)
            ->with('document')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $doc = $row->document;
            if (! $doc) {
                continue;
            }
            $map[$row->bank_id] = [
                'bank_id' => $row->bank_id,
                'document_id' => $doc->hashed_id,
                'name' => $doc->name,
                'updated_at' => $row->updated_at?->toIso8601String(),
            ];
        }

        return $map;
    }

    public function store(User $user, string $bankId, UploadedFile $file): OdayOfficeBankLogo
    {
        $bankId = trim($bankId);
        if ($bankId === '') {
            throw ValidationException::withMessages(['bank_id' => ['معرّف البنك مطلوب']]);
        }

        if ($file->getSize() > 512000) {
            throw ValidationException::withMessages(['logo' => ['حجم الشعار يجب أن لا يتجاوز 500 كيلوبايت']]);
        }

        $ext = strtolower($file->getClientOriginalExtension());
        $mime = strtolower($file->getMimeType() ?: '');

        if ($ext === 'svg' || str_contains($mime, 'svg')) {
            $sanitized = $this->svgSanitizer->sanitize($file->get());
            $tmp = tempnam(sys_get_temp_dir(), 'bank-logo');
            File::put($tmp, $sanitized);
            $file = new UploadedFile($tmp, $bankId.'.svg', 'image/svg+xml', null, true);
            $ext = 'svg';
        } elseif (! in_array($ext, ['png', 'webp'], true)) {
            throw ValidationException::withMessages(['logo' => ['نوع الملف غير مدعوم (svg, png, webp)']]);
        } else {
            $image = @getimagesize($file->getPathname());
            if (! $image || ($image[0] ?? 0) < 32) {
                throw ValidationException::withMessages(['logo' => ['أبعاد الصورة غير صالحة']]);
            }
        }

        $company = Company::findOrFail($user->companyId());

        $document = (new UploadFile(
            $file,
            UploadFile::DOCUMENT,
            $user,
            $company,
            $company,
            null,
            true,
        ))->handle();

        if (! $document) {
            throw ValidationException::withMessages(['logo' => ['تعذر حفظ الشعار']]);
        }

        $document->name = 'bank-logo-'.$bankId.'.'.$ext;
        $document->type = 'bank_logo';
        $document->save();

        return OdayOfficeBankLogo::query()->updateOrCreate(
            ['company_id' => $user->companyId(), 'bank_id' => $bankId],
            ['document_id' => $document->id],
        );
    }

    public function remove(User $user, string $bankId): void
    {
        OdayOfficeBankLogo::query()
            ->where('company_id', $user->companyId())
            ->where('bank_id', $bankId)
            ->delete();
    }
}
