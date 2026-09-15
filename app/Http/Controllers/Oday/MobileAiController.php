<?php

/**
 * نظام عدي أبو ضحى — محادثة الذكاء الاصطناعي للجوال.
 */

namespace App\Http\Controllers\Oday;

use App\Http\Controllers\Controller;
use App\Services\Oday\OdayAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class MobileAiController extends Controller
{
    public function chat(Request $request, OdayAiService $ai): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array|max:8',
            'history.*.role' => 'nullable|string|in:user,assistant',
            'history.*.content' => 'nullable|string|max:2000',
        ]);

        if (! $ai->configured()) {
            return response()->json([
                'code' => 'AI_NOT_CONFIGURED',
                'message' => 'المساعد الذكي غير مُعدّ على الخادم',
            ], 503);
        }

        try {
            $answer = $ai->chat(
                auth()->user(),
                (string) $request->input('message'),
                (array) $request->input('history', []),
            );
        } catch (RuntimeException $exception) {
            $code = $exception->getMessage() === 'AI_NOT_CONFIGURED' ? 503 : 502;

            return response()->json([
                'code' => $exception->getMessage(),
                'message' => 'تعذر الحصول على إجابة المساعد الآن',
            ], $code);
        }

        return response()->json([
            'reply' => $answer,
        ]);
    }
}
