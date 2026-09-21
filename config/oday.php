<?php

/**
 * نظام عدي أبو ضحى — إعدادات الهوية والمزامنة والطبقة المتنقلة.
 */

return [
    'owner' => 'عدي أبو ضحى',
    'owner_en' => 'Oday Abu Doha',
    'firm' => 'Oday Abu Doha Architects',
    'product' => 'لوحة التحكم — عدي أبو ضحى',
    'dashboard_url' => rtrim(env('ODAY_DASHBOARD_URL', env('REACT_URL', 'http://localhost:5173')), '/'),
    'dashboard_token' => env('ODAY_DASHBOARD_TOKEN', 'oday-office-sync'),
    'ai' => [
        'api_key' => env('ODAY_AI_API_KEY', ''),
        'base_url' => env('ODAY_AI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('ODAY_AI_MODEL', 'gpt-4o-mini'),
    ],
    'desktop' => [
        'feed_url' => env('ODAY_UPDATE_FEED_URL', ''),
    ],
    'google_drive_backup' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => env(
            'GOOGLE_REDIRECT_URI',
            env(
                'GOOGLE_OAUTH_REDIRECT',
                rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/').'/api/backup/google/callback'
            )
        ),
    ],
    'cheques' => [
        // Duplicate key = SHA-256(bank_id|bank_name|account_reference|cheque_number). Null/empty account_reference is treated as "" (collisions possible across cheques with no account on file).
    ],
    'backup' => [
        'encryption_key' => env('BACKUP_ENCRYPTION_KEY'),
        'cron_secret' => env('CRON_SECRET'),
        'google_redirect_uri' => env(
            'GOOGLE_REDIRECT_URI',
            env(
                'GOOGLE_OAUTH_REDIRECT',
                rtrim(env('APP_URL', 'http://127.0.0.1:8000'), '/').'/api/backup/google/callback'
            )
        ),
    ],
];
