<?php

namespace App\Console\Commands;

use App\Models\Food;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ImportFoodsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'foods:import
        {path? : CSV 파일 경로 (기본값: 프로젝트 루트의 DB.csv)}
        {--truncate : Import 전에 foods 테이블을 비웁니다.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'db.csv 파일을 읽어서 foods 테이블에 영양 정보를 적재합니다.';

    /**
     * Column order mapping for the provided CSV file.
     *
     * @var array<int, string>
     */
    private array $columnMap = [
        0 => 'food_code',
        1 => 'food_name',
        2 => 'common_name',
        3 => 'serving_size',
        4 => 'energy_kcal',
        5 => 'moisture_g',
        6 => 'protein_g',
        7 => 'fat_g',
        8 => 'carbohydrate_g',
        9 => 'sugars_g',
        10 => 'dietary_fiber_g',
        11 => 'sodium_mg',
        12 => 'beta_carotene_mcg',
        13 => 'cholesterol_mg',
        14 => 'saturated_fatty_acids_g',
        15 => 'trans_fatty_acids_g',
        16 => 'fructose_g',
        17 => 'lactose_g',
        18 => 'sucrose_g',
        19 => 'glucose_g',
        20 => 'product_weight',
    ];

    /**
     * @var array<string>
     */
    private array $numericColumns = [
        'energy_kcal',
        'moisture_g',
        'protein_g',
        'fat_g',
        'carbohydrate_g',
        'sugars_g',
        'dietary_fiber_g',
        'sodium_mg',
        'beta_carotene_mcg',
        'cholesterol_mg',
        'saturated_fatty_acids_g',
        'trans_fatty_acids_g',
        'fructose_g',
        'lactose_g',
        'sucrose_g',
        'glucose_g',
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = $this->argument('path') ?? base_path('../DB.csv');

        if (! is_file($path)) {
            $this->error("CSV 파일을 찾을 수 없습니다: {$path}");

            return self::FAILURE;
        }

        if ($this->option('truncate')) {
            Food::query()->truncate();
            $this->info('기존 foods 테이블 데이터를 삭제했습니다.');
        }

        $stream = @fopen($path, 'r');

        if ($stream === false) {
            $this->error('CSV 파일을 열 수 없습니다.');

            return self::FAILURE;
        }

        // consume header row
        fgetcsv($stream);

        $batch = [];
        $batchSize = 500;
        $imported = 0;

        while (($row = fgetcsv($stream)) !== false) {
            if ($this->isEmptyRow($row)) {
                continue;
            }

            $batch[] = $this->mapRowToRecord($row);

            if (count($batch) >= $batchSize) {
                $imported += $this->persistBatch($batch);
                $batch = [];
                $this->info("현재까지 {$imported}건을 반영했습니다...");
            }
        }

        if ($batch !== []) {
            $imported += $this->persistBatch($batch);
        }

        fclose($stream);

        $this->info("총 {$imported}건의 영양 데이터를 저장했습니다.");

        return self::SUCCESS;
    }

    /**
     * @param resource $stream
     */
    private function persistBatch(array $records): int
    {
        Food::query()->upsert($records, ['food_code']);

        return count($records);
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function mapRowToRecord(array $row): array
    {
        $row = array_pad($row, count($this->columnMap), null);
        $record = [];

        foreach ($this->columnMap as $index => $column) {
            $value = isset($row[$index]) ? $this->convertEncoding($row[$index]) : null;

            if (in_array($column, $this->numericColumns, true)) {
                $record[$column] = $this->toNullableFloat($value);
            } else {
                $record[$column] = $value !== null && $value !== '' ? $value : null;
            }
        }

        return $record;
    }

    private function toNullableFloat(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $normalized = Str::of($value)
            ->replace(',', '')
            ->trim()
            ->lower()
            ->toString();

        if ($normalized === '' || $normalized === '-' || $normalized === 'na') {
            return null;
        }

        if ($normalized === 'trace' || $normalized === 'tr') {
            return 0.0;
        }

        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function convertEncoding(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $encoders = [
            fn (string $text) => @iconv('CP949', 'UTF-8//IGNORE', $text),
            fn (string $text) => function_exists('mb_convert_encoding')
                ? @mb_convert_encoding($text, 'UTF-8', 'CP949')
                : false,
            fn (string $text) => $text, // fallback to original bytes if everything fails
        ];

        foreach ($encoders as $encode) {
            $converted = $encode($value);

            if (! is_string($converted) || $converted === '') {
                continue;
            }

            $trimmed = trim($converted);

            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return null;
    }
}
