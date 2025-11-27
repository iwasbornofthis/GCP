<?php

namespace App\Services;

class NutritionRiskService
{
    /**
     * Assess blood glucose risk level from macro nutrients.
     *
     * @param  array<string, mixed>  $nutrients
     */
    public function assess(array $nutrients): ?array
    {
        $carbs = $this->num($nutrients['carbohydrate_g'] ?? null);
        $protein = $this->num($nutrients['protein_g'] ?? null);
        $fat = $this->num($nutrients['fat_g'] ?? null);
        $fiber = $this->num($nutrients['dietary_fiber_g'] ?? null);
        $sugars = $this->num($nutrients['sugars_g'] ?? null);

        if ($carbs === null && $protein === null && $fat === null) {
            return null;
        }

        $carbs = $carbs ?? 0.0;
        $protein = $protein ?? 0.0;
        $fat = $fat ?? 0.0;
        $fiber = $fiber ?? 0.0;
        $sugars = $sugars ?? 0.0;

        $netCarbs = max(0.0, $carbs - $fiber);

        // Simplified eGL-style score: net carbs + sugar load - buffering from protein/fat.
        $sugarLoad = min(30.0, $sugars * 0.7);
        $buffer = min($netCarbs * 0.5, ($protein * 0.35) + ($fat * 0.2));

        $score = max(0.0, $netCarbs + $sugarLoad - $buffer);

        $level = 'low';

        if ($score >= 60) {
            $level = 'high';
        } elseif ($score >= 30) {
            $level = 'medium';
        }

        return [
            'level' => $level,
            'score' => round($score, 1),
            'net_carbs' => round($netCarbs, 1),
            'details' => [
                'carbs_g' => round($carbs, 1),
                'fiber_g' => round($fiber, 1),
                'protein_g' => round($protein, 1),
                'fat_g' => round($fat, 1),
                'sugars_g' => round($sugars, 1),
            ],
            'message' => $this->message($level),
        ];
    }

    private function num(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }

    private function message(string $level): string
    {
        return match ($level) {
            'high' => '탄수화물 대비 완충영양이 부족해 식후 급격한 혈당 상승 가능성이 높습니다.',
            'medium' => '보통 수준의 위험입니다. 단백질·식이섬유를 조금 더 추가하면 안전합니다.',
            default => '식이섬유·단백질 비율이 좋아 비교적 안정적인 식후 혈당이 예상됩니다.',
        };
    }
}
