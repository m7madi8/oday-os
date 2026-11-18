<?php

namespace Tests\Unit\Oday;

use App\Http\Middleware\EnsureOdayBackupSuperUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Mockery;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class EnsureOdayBackupSuperUserTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_rejects_when_user_is_not_super_user(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('isSuperUser')->once()->andReturn(false);

        Auth::partialMock()->shouldReceive('user')->once()->andReturn($user);

        $middleware = new EnsureOdayBackupSuperUser();
        $request = Request::create('/api/backup/run', 'POST');

        try {
            $middleware->handle($request, fn () => response()->json(['ok' => true]));
            $this->fail('Expected HttpException');
        } catch (HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
            $this->assertSame('لا صلاحية لإدارة النسخ الاحتياطي', $e->getMessage());
        }
    }

    public function test_rejects_when_not_authenticated(): void
    {
        Auth::partialMock()->shouldReceive('user')->once()->andReturn(null);

        $middleware = new EnsureOdayBackupSuperUser();
        $request = Request::create('/api/backup/restore', 'POST');

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('لا صلاحية لإدارة النسخ الاحتياطي');

        $middleware->handle($request, fn () => response()->json(['ok' => true]));
    }

    public function test_allows_super_user(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('isSuperUser')->once()->andReturn(true);

        Auth::partialMock()->shouldReceive('user')->once()->andReturn($user);

        $middleware = new EnsureOdayBackupSuperUser();
        $request = Request::create('/api/backup/settings', 'PUT');

        $response = $middleware->handle($request, fn () => response()->json(['ok' => true]));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['ok' => true], $response->getData(true));
    }
}
