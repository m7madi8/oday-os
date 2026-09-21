<?php

namespace Tests\Unit\Oday;

use App\Services\Oday\Cheque\BankLogoSvgSanitizer;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BankLogoSvgSanitizerTest extends TestCase
{
    public function test_accepts_clean_svg(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
        $out = (new BankLogoSvgSanitizer())->sanitize($svg);
        $this->assertStringContainsString('<svg', $out);
    }

    public function test_rejects_script(): void
    {
        $this->expectException(ValidationException::class);
        (new BankLogoSvgSanitizer())->sanitize('<svg><script>alert(1)</script></svg>');
    }

    public function test_rejects_onclick(): void
    {
        $this->expectException(ValidationException::class);
        (new BankLogoSvgSanitizer())->sanitize('<svg onclick="x()"></svg>');
    }
}
