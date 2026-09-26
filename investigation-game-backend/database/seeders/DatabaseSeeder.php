<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the accounts a fresh environment needs before it is usable.
 *
 * Every account is matched on its email and updated in place, so re-seeding is
 * safe: it never trips the unique constraints and never produces a second
 * admin. Credentials come from the environment with development defaults, so a
 * shared environment can override them without editing this file.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAdmin();
        $this->seedPlayer('SEED_HOST_EMAIL', 'host@example.com', 'Host User', 'HostPlayer');
        $this->seedPlayer('SEED_GUEST_EMAIL', 'guest@example.com', 'Guest User', 'GuestPlayer');
    }

    /**
     * Grants the admin flag explicitly rather than through create().
     *
     * `is_admin` is deliberately absent from the model's fillable list so that
     * no request payload can mass-assign it, which means a create() call
     * silently drops the flag and leaves a plain user behind.
     */
    private function seedAdmin(): void
    {
        $admin = $this->upsertUser(
            email: env('SEED_ADMIN_EMAIL', 'admin@example.com'),
            name: env('SEED_ADMIN_NAME', 'System Administrator'),
            username: env('SEED_ADMIN_USERNAME', 'MasterAdmin'),
            password: env('SEED_ADMIN_PASSWORD', 'password'),
        );

        if (! $admin->is_admin) {
            $admin->forceFill(['is_admin' => true])->save();
        }
    }

    private function seedPlayer(string $emailKey, string $defaultEmail, string $name, string $username): void
    {
        $this->upsertUser(
            email: env($emailKey, $defaultEmail),
            name: $name,
            username: $username,
            password: env('SEED_PLAYER_PASSWORD', 'password'),
        );
    }

    /**
     * Create-or-update by email.
     *
     * The password is only applied when the account is first created, so
     * re-seeding never silently resets a credential that was changed after
     * seeding. The model's `hashed` cast does the hashing, so the value is
     * assigned in plain text.
     */
    private function upsertUser(string $email, string $name, string $username, string $password): User
    {
        $user = User::firstOrNew(['email' => $email]);
        $isNew = ! $user->exists;

        $user->name = $name;
        $user->username = $username;
        $user->email_verified_at ??= now();

        if ($isNew) {
            $user->password = $password;
        }

        $user->save();

        return $user;
    }
}
