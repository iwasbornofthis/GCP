<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MealRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'recorded_at',
        'source',
        'food_name',
        'matched_food_id',
        'energy_kcal',
        'carbohydrate_g',
        'sugars_g',
        'protein_g',
        'fat_g',
        'glucose_risk_level',
        'glucose_risk_score',
        'raw_payload',
    ];

    protected $casts = [
        'recorded_at' => 'date',
        'raw_payload' => 'array',
    ];
}
