<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MealRecord;
use App\Services\MealRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MealController extends Controller
{
    public function __construct(
        private readonly MealRecommendationService $recommendationService,
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recorded_at' => ['nullable', 'date'],
            'source' => ['required', 'in:photo,qr'],
            'food_name' => ['nullable', 'string', 'max:255'],
            'matched_food_id' => ['nullable', 'integer'],
            'energy_kcal' => ['nullable', 'numeric'],
            'carbohydrate_g' => ['nullable', 'numeric'],
            'sugars_g' => ['nullable', 'numeric'],
            'protein_g' => ['nullable', 'numeric'],
            'fat_g' => ['nullable', 'numeric'],
            'glucose_risk_level' => ['nullable', 'string', 'max:20'],
            'glucose_risk_score' => ['nullable', 'numeric'],
            'raw_payload' => ['nullable', 'array'],
        ]);

        $recordedAt = $data['recorded_at'] ?? Carbon::now()->toDateString();

        $scaled = $this->extractScaledNutrients($data['raw_payload'] ?? null);

        $record = MealRecord::create([
            'user_id' => $request->user()->id,
            'recorded_at' => $recordedAt,
            'source' => $data['source'],
            'food_name' => $data['food_name'] ?? null,
            'matched_food_id' => $data['matched_food_id'] ?? null,
            'energy_kcal' => $scaled['energy_kcal'] ?? $data['energy_kcal'] ?? null,
            'carbohydrate_g' => $scaled['carbohydrate_g'] ?? $data['carbohydrate_g'] ?? null,
            'sugars_g' => $scaled['sugars_g'] ?? $data['sugars_g'] ?? null,
            'protein_g' => $scaled['protein_g'] ?? $data['protein_g'] ?? null,
            'fat_g' => $scaled['fat_g'] ?? $data['fat_g'] ?? null,
            'glucose_risk_level' => $this->normalizeRisk($data['glucose_risk_level'] ?? null),
            'glucose_risk_score' => $data['glucose_risk_score'] ?? null,
            'raw_payload' => $data['raw_payload'] ?? null,
        ]);

        return response()->json([
            'record' => $record,
        ], 201);
    }

    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = $validated['date'] ?? Carbon::now()->toDateString();

        $baseQuery = MealRecord::query()
            ->where('user_id', $request->user()->id)
            ->whereDate('recorded_at', $date);

        $totals = (clone $baseQuery)->selectRaw(
            'COALESCE(SUM(energy_kcal),0) AS energy_kcal,
             COALESCE(SUM(carbohydrate_g),0) AS carbohydrate_g,
             COALESCE(SUM(sugars_g),0) AS sugars_g,
             COALESCE(SUM(protein_g),0) AS protein_g,
             COALESCE(SUM(fat_g),0) AS fat_g'
        )->first();

        $riskStats = (clone $baseQuery)->selectRaw(
            'SUM(CASE WHEN glucose_risk_level = "high" THEN 1 ELSE 0 END) AS high,
             SUM(CASE WHEN glucose_risk_level = "medium" THEN 1 ELSE 0 END) AS medium,
             SUM(CASE WHEN glucose_risk_level = "low" THEN 1 ELSE 0 END) AS low,
             AVG(glucose_risk_score) AS avg_score'
        )->first();

        $records = (clone $baseQuery)->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'date' => $date,
            'totals' => [
                'energy_kcal' => (float) $totals->energy_kcal,
                'carbohydrate_g' => (float) $totals->carbohydrate_g,
                'sugars_g' => (float) $totals->sugars_g,
                'protein_g' => (float) $totals->protein_g,
                'fat_g' => (float) $totals->fat_g,
            ],
            'glucose_risk' => [
                'counts' => [
                    'high' => (int) $riskStats->high,
                    'medium' => (int) $riskStats->medium,
                    'low' => (int) $riskStats->low,
                ],
                'avg_score' => $riskStats->avg_score !== null ? round((float) $riskStats->avg_score, 1) : null,
            ],
            'records' => $records,
        ]);
    }

    public function recommend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = $validated['date'] ?? Carbon::now()->toDateString();
        $today = Carbon::now()->toDateString();

        if ($date !== $today) {
            return response()->json([
                'message' => '오늘 날짜에 대해서만 추천을 제공합니다.',
            ], 422);
        }

        $baseQuery = MealRecord::query()
            ->where('user_id', $request->user()->id)
            ->whereDate('recorded_at', $date);

        $records = (clone $baseQuery)->orderByDesc('created_at')->limit(50)->get();

        if ($records->isEmpty()) {
            return response()->json([
                'message' => '오늘 기록된 식단이 없습니다.',
            ], 400);
        }

        $totals = (clone $baseQuery)->selectRaw(
            'COALESCE(SUM(energy_kcal),0) AS energy_kcal,
             COALESCE(SUM(carbohydrate_g),0) AS carbohydrate_g,
             COALESCE(SUM(sugars_g),0) AS sugars_g,
             COALESCE(SUM(protein_g),0) AS protein_g,
             COALESCE(SUM(fat_g),0) AS fat_g'
        )->first();

        $payloadTotals = [
            'energy_kcal' => (float) $totals->energy_kcal,
            'carbohydrate_g' => (float) $totals->carbohydrate_g,
            'sugars_g' => (float) $totals->sugars_g,
            'protein_g' => (float) $totals->protein_g,
            'fat_g' => (float) $totals->fat_g,
        ];

        $recordsPayload = $records->map(function (MealRecord $record) {
            return [
                'food_name' => $record->food_name,
                'energy_kcal' => $record->energy_kcal,
                'carbohydrate_g' => $record->carbohydrate_g,
                'sugars_g' => $record->sugars_g,
                'protein_g' => $record->protein_g,
                'fat_g' => $record->fat_g,
                'glucose_risk_level' => $record->glucose_risk_level,
            ];
        })->all();

        $recommendation = $this->recommendationService->recommend($recordsPayload, $payloadTotals);

        return response()->json([
            'date' => $date,
            'recommendation' => $recommendation,
        ]);
    }

    private function normalizeRisk(?string $level): ?string
    {
        if ($level === null) {
            return null;
        }

        $normalized = strtolower(trim($level));

        return match (true) {
            str_contains($normalized, 'high') => 'high',
            str_contains($normalized, 'medium'), str_contains($normalized, 'mid') => 'medium',
            str_contains($normalized, 'low') => 'low',
            default => $normalized !== '' ? $normalized : null,
        };
    }

    /**
     * Scale nutrient values using portion_factor or product_weight vs serving_size.
     *
     * @param  array<string, mixed>|null  $rawPayload
     * @return array<string, float>
     */
    private function extractScaledNutrients($rawPayload): array
    {
        if (! is_array($rawPayload)) {
            return [];
        }

        $nutrients = $rawPayload['nutrients'] ?? [];
        if (! is_array($nutrients)) {
            return [];
        }

        $factor = $this->resolvePortionFactor($rawPayload);
        if ($factor <= 0) {
            return [];
        }

        $keys = ['energy_kcal', 'carbohydrate_g', 'sugars_g', 'protein_g', 'fat_g'];
        $scaled = [];

        foreach ($keys as $key) {
            if (isset($nutrients[$key]) && is_numeric($nutrients[$key])) {
                $scaled[$key] = (float) $nutrients[$key] * $factor;
            }
        }

        return $scaled;
    }

    /**
     * Decide portion factor: prefer glucoseRisk.portion_factor; otherwise derive from product_weight / serving_size.
     */
    private function resolvePortionFactor(array $rawPayload): float
    {
        $portionFactor = $rawPayload['glucoseRisk']['portion_factor'] ?? null;
        if (is_numeric($portionFactor) && (float) $portionFactor > 0) {
            return (float) $portionFactor;
        }

        $matchedFood = $rawPayload['matchedFood'] ?? [];
        if (! is_array($matchedFood)) {
            return 0.0;
        }

        $product = $this->parseMeasurement(
            $matchedFood['product_weight_value'] ?? null,
            $matchedFood['product_weight_unit'] ?? null,
            $matchedFood['product_weight'] ?? null
        );
        $serving = $this->parseMeasurement(
            $matchedFood['serving_size_value'] ?? null,
            $matchedFood['serving_size_unit'] ?? null,
            $matchedFood['serving_size'] ?? null
        );

        if (! $product || ! $serving || $serving['value'] <= 0) {
            return 0.0;
        }

        if ($product['unit'] && $serving['unit'] && $product['unit'] !== $serving['unit']) {
            return 0.0;
        }

        return max(0.0, $product['value'] / $serving['value']);
    }

    private function parseMeasurement($value, ?string $unit, ?string $raw): ?array
    {
        if (is_numeric($value)) {
            return [
                'value' => (float) $value,
                'unit' => $this->normalizeUnit($unit),
            ];
        }

        if (empty($raw)) {
            return null;
        }

        $normalized = preg_replace('/\\s+/', '', (string) $raw);
        if (! $normalized) {
            return null;
        }

        if (! preg_match('/^([0-9]+(?:\\.[0-9]+)?)([a-zA-Z]*)$/', $normalized, $match)) {
            return null;
        }

        return [
            'value' => (float) $match[1],
            'unit' => $this->normalizeUnit($match[2] ?: $unit),
        ];
    }

    private function normalizeUnit(?string $unit): ?string
    {
        if (! $unit) {
            return null;
        }

        return strtolower(trim($unit));
    }
}
