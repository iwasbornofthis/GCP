<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FoodAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class FoodAnalysisController extends Controller
{
    public function __construct(private readonly FoodAnalysisService $service)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:4096'],
        ]);

        $photo = $request->file('photo');

        if ($photo === null) {
            return response()->json([
                'message' => '업로드된 파일을 찾을 수 없습니다.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->service->detectFood($photo);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json($result);
    }
}
