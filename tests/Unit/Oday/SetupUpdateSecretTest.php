<?php

namespace Tests\Unit\Oday;

use Tests\TestCase;

class SetupUpdateSecretTest extends TestCase
{
    public function test_update_route_rejects_when_update_secret_not_configured(): void
    {
        config(['ninja.update_secret' => '']);

        $this->get('/update?secret=anything')
            ->assertRedirect('/');
    }

    public function test_update_route_rejects_wrong_secret(): void
    {
        config(['ninja.update_secret' => 'update-secret-for-feature-test']);

        $this->get('/update?secret=wrong')
            ->assertRedirect('/');
    }
}
