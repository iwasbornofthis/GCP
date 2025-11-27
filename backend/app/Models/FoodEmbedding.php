<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FoodEmbedding extends Model
{
    use HasFactory;

    protected $fillable = [
        'food_id',
        'dimension',
        'embedding',
    ];

    public function food()
    {
        return $this->belongsTo(Food::class);
    }
}
