<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NutritionRiskService;
use App\Services\FoodQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FoodQrController extends Controller
{
    public function __construct(private readonly NutritionRiskService $riskService)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'barcode' => ['nullable', 'string'],
            'qrData' => ['nullable', 'string'],
        ]);

        $code = $data['barcode'] ?? $data['qrData'] ?? '';
        $code = $this->extractCode($code);

        if ($code === '') {
            return response()->json([
                'message' => '바코드 또는 QR 데이터가 필요합니다.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $service = FoodQrService::make();
            $payload = $service->lookupByBarcode($code);
            $payload['glucoseRisk'] = $this->riskService->assess($payload['nutrients'] ?? []);

            return response()->json($payload);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'FoodQR 조회 실패: '.$exception->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }
    }

    private function extractCode(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }

        // URL이면 경로의 마지막 세그먼트만 추출 (숫자만)
        if (filter_var($raw, FILTER_VALIDATE_URL)) {
            $path = parse_url($raw, PHP_URL_PATH) ?: '';
            $last = trim((string) preg_replace('#.*/#', '', $path));
            $digits = preg_replace('/\\D+/', '', $last ?? '');
            return $digits ?? '';
        }

        // 숫자만 남기기
        $digits = preg_replace('/\\D+/', '', $raw);
        return $digits ?? '';
    }
}
