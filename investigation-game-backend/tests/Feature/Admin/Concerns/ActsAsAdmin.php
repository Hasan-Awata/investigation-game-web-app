<?php

namespace Tests\Feature\Admin\Concerns;

use App\Models\User;
use Laravel\Sanctum\Sanctum;

trait ActsAsAdmin
{
    protected function actingAsAdmin(): User
    {
        $user = User::create([
            'name' => 'Admin Tester',
            'username' => 'admin_'.uniqid(),
            'email' => uniqid().'@test.local',
            'password' => 'secret-password',
        ]);

        // `is_admin` is intentionally guarded from mass assignment.
        $user->is_admin = true;
        $user->save();

        Sanctum::actingAs($user);

        return $user;
    }
}
