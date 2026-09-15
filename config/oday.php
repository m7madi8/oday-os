<?php

/**
 * نظام عدي أبو ضحى — إعدادات الهوية والمزامنة والطبقة المتنقلة.
 */

return [
    'owner' => 'عدي أبو ضحى',
    'owner_en' => 'Oday Abu Doha',
    'firm' => 'Oday Abu Doha Architects',
    'product' => 'لوحة التحكم — عدي أبو ضحى',
    'dashboard_token' => env('ODAY_DASHBOARD_TOKEN', 'oday-office-sync'),
    'ai' => [
        'api_key' => env('ODAY_AI_API_KEY', ''),
        'base_url' => env('ODAY_AI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('ODAY_AI_MODEL', 'gpt-4o-mini'),
    ],
    'desktop' => [
        'feed_url' => env('ODAY_UPDATE_FEED_URL', ''),
    ],
];
