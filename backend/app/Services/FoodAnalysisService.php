<?php

namespace App\Services;

use App\Models\Food;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FoodAnalysisService
{
    public function __construct(
        private readonly NutritionRiskService $riskService,
    ) {
    }

    public function detectFood(UploadedFile $photo): array
    {
        $apiKey = (string) config('services.openai.key');

        if ($apiKey === '') {
            throw new RuntimeException('OpenAI API 키가 설정되지 않았습니다.');
        }

        // 개발/오프라인 모드: OPENAI_DISABLE=true이면 외부 호출을 건너뛰고 더미 응답을 반환한다.
        if (filter_var(env('OPENAI_DISABLE', false), FILTER_VALIDATE_BOOL)) {
            return [
                'foodName' => '테스트 샘플',
                'confidence' => null,
                'matchedFood' => null,
                'nutrients' => [],
            ];
        }

        $photoContents = @file_get_contents($photo->getRealPath());

        if ($photoContents === false) {
            throw new RuntimeException('이미지 파일을 읽을 수 없습니다.');
        }

        $payload = [
            'model' => config('services.openai.model', 'gpt-4o'),
            'temperature' => 0.2,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a food recognition expert for Korean cuisine. Always respond with the canonical dish name in Korean (Hangul). Do not use English or romanized terms. Use the shortest possible name without adjectives.',
                ],
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => '사진 속 음식을 보고 가장 대표적인 한국어(한글) 음식명을 딱 한 단어로만 반환하세요. 영어, 로마자, 형용사, 재료 설명 없이 JSON 형식으로 응답합니다.',
                        ],
                        [
                            'type' => 'image_url',
                            'image_url' => [
                                'url' => sprintf(
                                    'data:%s;base64,%s',
                                    $photo->getMimeType(),
                                    base64_encode($photoContents)
                                ),
                            ],
                        ],
                    ],
                ],
            ],
            'response_format' => [
                'type' => 'json_schema',
                'json_schema' => [
                    'name' => 'food_detection',
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'food' => [
                                'type' => 'string',
                                'description' => '인식된 대표 음식 이름',
                            ],
                            'confidence' => [
                                'type' => 'number',
                                'minimum' => 0,
                                'maximum' => 1,
                                'description' => '모델이 판단하는 신뢰도 (0~1)',
                            ],
                        ],
                        'required' => ['food'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($apiKey)
                ->timeout(config('services.openai.timeout', 60))
                ->post(
                    config('services.openai.endpoint', 'https://api.openai.com/v1/chat/completions'),
                    $payload
                )
                ->throw()
                ->json();
        } catch (\Throwable $exception) {
            report($exception);

            throw new RuntimeException('OpenAI API 요청 실패: '.$exception->getMessage());
        }

        $messageContent = $response['choices'][0]['message']['content'] ?? '';
        $normalized = $this->normalizeContent($messageContent);
        $decoded = json_decode($normalized, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            throw new RuntimeException('OpenAI 응답을 파싱할 수 없습니다.');
        }

        $result = [
            'foodName' => $decoded['food'] ?? '알수없음',
            'confidence' => $decoded['confidence'] ?? null,
        ];

        return $this->attachBestMatch($result);
    }

    private function attachBestMatch(array $result): array
    {
        $match = $this->requestMatch($result['foodName'] ?? '');

        if (! $match) {
            return $result;
        }

        $food = $match['food'] ?? null;

        if (! $food) {
            return $result;
        }

        $model = Food::find($food['id'] ?? null);

        if ($model) {
            $food['serving_size'] = $model->serving_size ?? $food['serving_size'] ?? null;
            $food['serving_size_unit'] = $model->serving_size_unit ?? $food['serving_size_unit'] ?? null;
            $food['serving_size_value'] = $model->serving_size_value ?? $food['serving_size_value'] ?? null;
            $food['product_weight'] = $model->product_weight ?? $food['product_weight'] ?? null;
            $food['product_weight_unit'] = $model->product_weight_unit ?? $food['product_weight_unit'] ?? null;
            $food['product_weight_value'] = $model->product_weight_value ?? $food['product_weight_value'] ?? null;

            $fields = ['energy_kcal','protein_g','fat_g','carbohydrate_g','sugars_g','dietary_fiber_g','sodium_mg'];
            $nutrients = [];

            foreach ($fields as $field) {
                if (isset($model->{$field})) {
                    $nutrients[$field] = $model->{$field};
                } elseif (isset($food['nutrients'][$field])) {
                    $nutrients[$field] = $food['nutrients'][$field];
                }
            }

            $food['nutrients'] = $nutrients;
        }

        $result['matchedFood'] = [
            'id' => $food['id'],
            'food_code' => $food['food_code'],
            'food_name' => $food['food_name'],
            'serving_size' => $food['serving_size'] ?? null,
            'serving_size_unit' => $food['serving_size_unit'] ?? null,
            'serving_size_value' => $food['serving_size_value'] ?? null,
            'product_weight' => $food['product_weight'] ?? null,
            'product_weight_unit' => $food['product_weight_unit'] ?? null,
            'product_weight_value' => $food['product_weight_value'] ?? null,
            'score' => round((float) ($match['score'] ?? 0), 4),
        ];

        $result['nutrients'] = $food['nutrients'] ?? [];

        if (! empty($result['nutrients'])) {
            $portionFactor = $this->determinePortionFactor($result['matchedFood']);
            $scaled = $this->scaleNutrients($result['nutrients'], $portionFactor);
            $risk = $this->riskService->assess($scaled);

            if ($risk !== null) {
                $risk['portion_factor'] = $portionFactor;
                $result['glucoseRisk'] = $risk;
            }
        }

        return $result;
    }

    /**
     * @param  mixed  $content
     */
    private function normalizeContent($content): string
    {
        if (is_string($content)) {
            return $content;
        }

        if (! is_array($content)) {
            return '';
        }

        $buffer = '';

        foreach ($content as $segment) {
            if (is_array($segment) && isset($segment['text'])) {
                $buffer .= $segment['text'];
            }
        }

        return $buffer;
    }

    private function requestMatch(string $query): ?array
    {
        $baseUrl = rtrim((string) config('services.matcher.base_url'), '/');

        if ($query === '' || $baseUrl === '') {
            return null;
        }

        $response = Http::timeout(config('services.matcher.timeout', 10))
            ->acceptJson()
            ->post("{$baseUrl}/match", [
                'query' => $query,
                'limit' => 1,
            ]);

        if (! $response->successful()) {
            report(new RuntimeException('Food matcher API 호출 실패: '.$response->body()));

            return null;
        }

        $payload = $response->json();

        return $payload['matches'][0] ?? null;
    }

    private function determinePortionFactor(array $food): float
    {
        $serving = $this->extractMeasurement(
            $food['serving_size_value'] ?? null,
            $food['serving_size_unit'] ?? null,
            $food['serving_size'] ?? null
        );

        $portion = $this->extractMeasurement(
            $food['product_weight_value'] ?? null,
            $food['product_weight_unit'] ?? null,
            $food['product_weight'] ?? null
        );

        if (! $serving || ! $portion || $serving['value'] <= 0) {
            return 1.0;
        }

        if ($serving['unit'] && $portion['unit'] && $serving['unit'] !== $portion['unit']) {
            return 1.0;
        }

        return max(0.1, $portion['value'] / $serving['value']);
    }

    private function extractMeasurement($value, ?string $unit, ?string $raw): ?array
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

        $normalized = preg_replace('/\s+/', '', (string) $raw);

        if (! $normalized) {
            return null;
        }

        if (! preg_match('/^([0-9]+(?:\.[0-9]+)?)([a-zA-Z]*)$/', $normalized, $match)) {
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

    /**
     * @param  array<string, mixed>  $nutrients
     */
    private function scaleNutrients(array $nutrients, float $factor): array
    {
        if ($factor <= 0 || abs($factor - 1.0) < 0.01) {
            return $nutrients;
        }

        $scaled = [];

        foreach ($nutrients as $key => $value) {
            if (is_numeric($value)) {
                $scaled[$key] = (float) $value * $factor;
            } else {
                $scaled[$key] = $value;
            }
        }

        return $scaled;
    }
}
