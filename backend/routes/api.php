<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FoodAnalysisController;
use App\Http\Controllers\Api\FoodQrController;
use App\Http\Controllers\Api\MealController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/foods/lookup', FoodQrController::class);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/foods/analyze', FoodAnalysisController::class);
    Route::post('/meals', [MealController::class, 'store']);
    Route::get('/meals/summary', [MealController::class, 'summary']);
    Route::post('/meals/recommendations', [MealController::class, 'recommend']);
});
