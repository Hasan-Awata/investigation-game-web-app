<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create the Master Admin Account
        User::create([
            'username' => 'MasterAdmin',
            'name' => 'System Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'XP' => 0,
            'is_admin' => true, 
        ]);

        // 2. Create a couple of standard test users
        User::create([
            'username' => 'HostPlayer',
            'name' => 'Host User',
            'email' => 'host@example.com',
            'password' => Hash::make('password'),
            'XP' => 0,
            'is_admin' => false,
        ]);

        User::create([
            'username' => 'GuestPlayer',
            'name' => 'Guest User',
            'email' => 'guest@example.com',
            'password' => Hash::make('password'),
            'XP' => 0,
            'is_admin' => false,
        ]);

        // 3. Run the Game Case seeder
        $this->call([
            GameCaseSeeder::class,
            BloodOperaCaseSeeder::class, 
        ]);
    }
}