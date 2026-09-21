<?php

/**
 * نظام عدي أبو ضحى — مبالغ الشيكات بدون أعداد عشرية عائمة.
 */

namespace App\Services\Oday;

use Illuminate\Validation\ValidationException;

class OdayChequeMoney
{
    public const CURRENCY_ILS = 'ILS';
    public const CURRENCY_USD = 'USD';
    public const CURRENCY_JOD = 'JOD';

    /**
     * @return list<string>
     */
    public static function allowedCurrencies(): array
    {
        return [
            self::CURRENCY_ILS,
            self::CURRENCY_USD,
            self::CURRENCY_JOD,
        ];
    }

    public static function decimalPlaces(string $currency): int
    {
        return strtoupper($currency) === self::CURRENCY_JOD ? 3 : 2;
    }

    public static function normalize(string $amount, string $currency): string
    {
        $currency = strtoupper(trim($currency));
        $raw = trim(str_replace(',', '', $amount));

        if ($raw === '' || ! is_numeric($raw)) {
            throw ValidationException::withMessages([
                'amount' => ['المبلغ غير صالح'],
            ]);
        }

        $places = self::decimalPlaces($currency);
        $negative = str_starts_with($raw, '-');
        $raw = ltrim($raw, '-');

        if (! preg_match('/^\d+(\.\d+)?$/', $raw)) {
            throw ValidationException::withMessages([
                'amount' => ['المبلغ غير صالح'],
            ]);
        }

        [$whole, $fraction] = array_pad(explode('.', $raw, 2), 2, '');

        if ($fraction !== '' && strlen($fraction) > $places) {
            throw ValidationException::withMessages([
                'amount' => ['عدد خانات العشرية غير متوافق مع العملة'],
            ]);
        }

        $fraction = str_pad(substr($fraction, 0, $places), $places, '0');

        $normalized = $places > 0 ? $whole.'.'.$fraction : $whole;

        if (bccomp($normalized, '0', $places) <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['المبلغ يجب أن يكون أكبر من صفر'],
            ]);
        }

        return $negative ? '-'.$normalized : $normalized;
    }

    public static function decimalToMinor(string $amount, string $currency): int
    {
        $normalized = self::normalize($amount, $currency);
        $places = self::decimalPlaces($currency);
        $parts = explode('.', $normalized);
        $whole = (int) $parts[0];
        $fraction = (int) ($parts[1] ?? 0);
        $factor = (int) str_pad('1', $places + 1, '0');

        return ($whole * $factor) + $fraction;
    }

    public static function minorToDecimal(int $minor, string $currency): string
    {
        $places = self::decimalPlaces($currency);
        $factor = (int) str_pad('1', $places + 1, '0');
        $whole = intdiv($minor, $factor);
        $fraction = $minor % $factor;

        return $places > 0
            ? $whole.'.'.str_pad((string) $fraction, $places, '0', STR_PAD_LEFT)
            : (string) $whole;
    }

    public static function formatStoredMinor(int $minor, string $currency): string
    {
        return self::minorToDecimal($minor, $currency);
    }

    public static function formatStored(mixed $amount, string $currency): string
    {
        if (is_int($amount)) {
            return self::minorToDecimal($amount, $currency);
        }

        $currency = strtoupper($currency);
        $places = self::decimalPlaces($currency);
        $value = is_string($amount) ? $amount : number_format((float) $amount, $places, '.', '');

        return self::normalize($value, $currency);
    }
}
