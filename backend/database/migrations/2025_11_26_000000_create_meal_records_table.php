<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('meal_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('recorded_at')->index();
            $table->string('source', 20)->default('photo'); // photo | qr
            $table->string('food_name')->nullable();
            $table->unsignedBigInteger('matched_food_id')->nullable();
            $table->double('energy_kcal')->nullable();
            $table->double('carbohydrate_g')->nullable();
            $table->double('sugars_g')->nullable();
            $table->double('protein_g')->nullable();
            $table->double('fat_g')->nullable();
            $table->string('glucose_risk_level', 20)->nullable();
            $table->double('glucose_risk_score')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meal_records');
    }
};
