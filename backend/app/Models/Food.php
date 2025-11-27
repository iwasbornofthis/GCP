<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Food extends Model
{
    use HasFactory;

    protected $table = 'foods';

    protected $fillable = [
        'food_code',
        'food_name',
        'common_name',
        'serving_size',
        'energy_kcal',
        'moisture_g',
        'protein_g',
        'fat_g',
        'carbohydrate_g',
        'sugars_g',
        'dietary_fiber_g',
        'sodium_mg',
        'beta_carotene_mcg',
        'cholesterol_mg',
        'saturated_fatty_acids_g',
        'trans_fatty_acids_g',
        'fructose_g',
        'lactose_g',
        'sucrose_g',
        'glucose_g',
        'product_weight',
    ];

    public function embedding()
    {
        return $this->hasOne(FoodEmbedding::class);
    }
}
