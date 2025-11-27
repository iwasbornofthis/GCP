<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('foods', function (Blueprint $table) {
            $table->id();
            $table->string('food_code')->unique();
            $table->string('food_name')->index();
            $table->string('common_name')->nullable();
            $table->string('serving_size')->nullable();
            $table->decimal('energy_kcal', 8, 2)->nullable();
            $table->decimal('moisture_g', 8, 2)->nullable();
            $table->decimal('protein_g', 8, 2)->nullable();
            $table->decimal('fat_g', 8, 2)->nullable();
            $table->decimal('carbohydrate_g', 8, 2)->nullable();
            $table->decimal('sugars_g', 8, 2)->nullable();
            $table->decimal('dietary_fiber_g', 8, 2)->nullable();
            $table->decimal('sodium_mg', 10, 2)->nullable();
            $table->decimal('beta_carotene_mcg', 10, 2)->nullable();
            $table->decimal('cholesterol_mg', 10, 2)->nullable();
            $table->decimal('saturated_fatty_acids_g', 8, 3)->nullable();
            $table->decimal('trans_fatty_acids_g', 8, 3)->nullable();
            $table->decimal('fructose_g', 8, 3)->nullable();
            $table->decimal('lactose_g', 8, 3)->nullable();
            $table->decimal('sucrose_g', 8, 3)->nullable();
            $table->decimal('glucose_g', 8, 3)->nullable();
            $table->string('product_weight')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('foods');
    }
};
