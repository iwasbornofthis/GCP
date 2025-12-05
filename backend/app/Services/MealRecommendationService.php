<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class MealRecommendationService
{
    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<string, float|int|null>  $totals
     * @return array<string, mixed>
     */
    public function recommend(array $records, array $totals): array
    {
        $apiKey = (string) config('services.openai.key');
        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API 키가 설정되지 않았습니다.');
        }

        if (filter_var(env('OPENAI_DISABLE', false), FILTER_VALIDATE_BOOL)) {
            return [
                'summary' => '테스트 모드: 오늘 식단을 기반으로 한 샘플 추천입니다.',
                'recommendations' => [
                    ['name' => '샐러드', 'reason' => '가벼운 단백질과 채소 보충'],
                    ['name' => '현미밥과 닭가슴살', 'reason' => '복합 탄수화물과 단백질 균형'],
                    ['name' => '두부 야채볶음', 'reason' => '식이섬유와 단백질 보충'],
                ],
            ];
        }

        $payload = [
            'model' => config('services.openai.model', 'gpt-4o'),
            'temperature' => 0.4,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => '너는 한국어로 답하는 영양사다. 사용자가 오늘 먹은 식단을 요약해 주면, 과잉/부족 영양소를 간단히 짚고 한국 음식으로 3가지 식단/음식 조합을 제안해라. 답변은 짧고 실행 가능해야 한다.',
                ],
                [
                    'role' => 'user',
                    'content' => "오늘 식단 기록:\n".json_encode($records, JSON_UNESCAPED_UNICODE)
                        ."\n총합 영양소:\n".json_encode($totals, JSON_UNESCAPED_UNICODE)
                        ."\n위 데이터를 참고해 간단 요약과 3가지 추천안을 JSON으로 반환해줘.",
                ],
            ],
            'response_format' => [
                'type' => 'json_schema',
                'json_schema' => [
                    'name' => 'meal_recommendations',
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'summary' => ['type' => 'string', 'description' => '오늘 식단 요약 및 한 줄 피드백'],
                            'recommendations' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'name' => ['type' => 'string', 'description' => '추천 음식 또는 식단 이름'],
                                        'reason' => ['type' => 'string', 'description' => '추천 이유 또는 영양 균형 포인트'],
                                    ],
                                    'required' => ['name', 'reason'],
                                    'additionalProperties' => false,
                                ],
                                'maxItems' => 3,
                            ],
                        ],
                        'required' => ['summary', 'recommendations'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout(config('services.openai.timeout', 60))
                ->post(config('services.openai.endpoint', 'https://api.openai.com/v1/chat/completions'), $payload)
                ->throw()
                ->json();
        } catch (\Throwable $exception) {
            report($exception);
            throw new RuntimeException('OpenAI API 요청 실패: '.$exception->getMessage());
        }

        $messageContent = $response['choices'][0]['message']['content'] ?? '';
        $decoded = json_decode($messageContent, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            throw new RuntimeException('OpenAI 응답을 파싱할 수 없습니다.');
        }

        return $decoded;
    }
}
