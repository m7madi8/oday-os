<?php

namespace Tests\Unit\Oday;

use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ChequePrintCalibrationTest extends TestCase
{
    public function test_validation_rejects_out_of_range_offsets(): void
    {
        $validator = Validator::make([
            'offset_x_mm' => 25,
            'offset_y_mm' => 0,
        ], [
            'offset_x_mm' => ['required', 'numeric', 'between:-20,20'],
            'offset_y_mm' => ['required', 'numeric', 'between:-20,20'],
        ]);

        $this->assertTrue($validator->fails());
    }
}
