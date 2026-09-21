<?php

namespace App\Services\Oday\Cheque;

use Illuminate\Validation\ValidationException;

class BankLogoSvgSanitizer
{
    /**
     * @return string sanitized SVG XML
     */
    public function sanitize(string $contents): string
    {
        $contents = trim($contents);
        if ($contents === '') {
            throw ValidationException::withMessages(['logo' => ['ملف الشعار فارغ']]);
        }

        if (stripos($contents, '<svg') === false) {
            throw ValidationException::withMessages(['logo' => ['ملف SVG غير صالح']]);
        }

        $blocked = [
            '/<script\b/i',
            '/on\w+\s*=/i',
            '/<foreignObject\b/i',
            '/<use\b[^>]+xlink:href\s*=\s*["\']https?:/i',
            '/<use\b[^>]+href\s*=\s*["\']https?:/i',
        ];

        foreach ($blocked as $pattern) {
            if (preg_match($pattern, $contents)) {
                throw ValidationException::withMessages(['logo' => ['ملف SVG يحتوي محتوى غير مسموح']]);
            }
        }

        return $contents;
    }
}
