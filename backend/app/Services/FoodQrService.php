<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class FoodQrService
{
    private string $baseUrl = 'https://foodqr.kr/openapi/service/qr1008/F008';

    public function __construct(private readonly string $apiKey)
    {
    }

    public static function make(): self
    {
        $key = (string) env('FOODQR_API_KEY', '');
        if ($key === '') {
            throw new RuntimeException('FOODQR_API_KEY 가 설정되지 않았습니다.');
        }

        return new self($key);
    }

    /**
     * @return array<string,mixed>
     */
    public function lookupByBarcode(string $barcode): array
    {
        if ($barcode === '') {
            throw new RuntimeException('바코드가 비어 있습니다.');
        }

        $response = Http::acceptJson()
            ->get($this->baseUrl, [
                'accessKey' => $this->apiKey,
                'brcdNo' => $barcode,
                'numOfRows' => 50,
                'pageNo' => 1,
                '_type' => 'json',
            ])
            ->throw()
            ->json();

        $body = $response['response']['body'] ?? null;
        if (! $body) {
            throw new RuntimeException('FoodQR 응답 형식이 올바르지 않습니다.');
        }

        $items = $body['items']['item'] ?? [];
        $items = $this->isAssoc($items) ? [$items] : $items;

        return $this->mapNutrition($items);
    }

    /**
     * @param array<int,array<string,mixed>> $items
     * @return array<string,mixed>
     */
    private function mapNutrition(array $items): array
    {
        $product = $items[0] ?? [];

        $nutrients = [];
        foreach ($items as $row) {
            $name = $row['nirwmtNm'] ?? null;
            $value = $row['cta'] ?? null;
            $unit = $row['igrdUcd'] ?? null;
            if ($name === null || $value === null) {
                continue;
            }
            $nutrients[$this->normalizeName($name)] = [
                'value' => $value,
                'unit' => $unit,
                'raw_name' => $name,
            ];
        }

        return [
            'product' => [
                'name' => $product['prdctNm'] ?? null,
                'barcode' => $product['brcdNo'] ?? null,
                'manufacturer' => $product['buesNm'] ?? null,
                'serving_total' => $product['ntrtnIndctTct'] ?? null,
                'serving_total_unit' => $product['ntrtnIndctTcd'] ?? null,
                'serving_unit_value' => $product['ntrtnIcutCtv'] ?? null,
                'serving_unit' => $product['ntrtnIcutCvucd'] ?? null,
            ],
            'nutrients' => $this->pickKeyNutrients($nutrients),
        ];
    }

    /**
     * @param array<string,array<string,mixed>> $nutrients
     * @return array<string,float>
     */
    private function pickKeyNutrients(array $nutrients): array
    {
        $map = [
            '열량' => 'energy_kcal',
            '에너지' => 'energy_kcal',
            '탄수화물' => 'carbohydrate_g',
            '단백질' => 'protein_g',
            '지방' => 'fat_g',
            '당류' => 'sugars_g',
            '나트륨' => 'sodium_mg',
            '포화지방' => 'saturated_fatty_acids_g',
            '트랜스지방' => 'trans_fatty_acids_g',
        ];

        $result = [];
        foreach ($map as $source => $target) {
            if (isset($nutrients[$source]['value'])) {
                $val = $nutrients[$source]['value'];
                $result[$target] = is_numeric($val) ? (float) $val : $val;
            }
        }

        return $result;
    }

    private function normalizeName(string $name): string
    {
        return trim($name);
    }

    private function isAssoc(mixed $value): bool
    {
        if (! is_array($value)) {
            return false;
        }

        return array_keys($value) !== range(0, count($value) - 1);
    }
}
