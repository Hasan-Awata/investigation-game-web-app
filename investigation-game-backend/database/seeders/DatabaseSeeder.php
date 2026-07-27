<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create a couple of test users
        User::create([
            'username' => 'HostPlayer',
            'name' => 'Host User',
            'email' => 'host@example.com',
            'password' => Hash::make('password'),
            'XP' => 0,
        ]);

        User::create([
            'username' => 'GuestPlayer',
            'name' => 'Guest User',
            'email' => 'guest@example.com',
            'password' => Hash::make('password'),
            'XP' => 0,
        ]);

        // Run the Game Case seeder
        $this->call([
            GameCaseSeeder::class,
        ]);
    }
}
