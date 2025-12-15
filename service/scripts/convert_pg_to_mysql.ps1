param(
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

function Convert-PgSqlToMySql {
    <#
    函数: Convert-PgSqlToMySql
    说明: 将PostgreSQL导出SQL转换为MySQL兼容语法。处理标识符引号、模式名、COLLATE、注释、事务关键字、并为建表语句追加MySQL引擎与字符集。
    参数:
      - InputPath: 输入SQL文件路径
      - OutputPath: 输出MySQL版本SQL文件路径
    #>
    param(
        [string]$InputPath,
        [string]$OutputPath
    )

    if (-not (Test-Path -LiteralPath $InputPath)) {
        throw "输入文件不存在: $InputPath"
    }

    $content = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8

    # 去除模式名 "public".
    $content = $content -replace '"public"\.', ''

    # 去除PG的COLLATE定义
    $content = $content -replace '\s+COLLATE\s+"pg_catalog"\."default"', ''

    # 将双引号标识符替换为MySQL反引号
    $content = $content -replace '"', '`'

    # 移除 OWNER TO 语句
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        'ALTER TABLE\s+`[^`]+`\s+OWNER TO\s+`[^`]+`;[\r\n]*',
        '',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    # 移除 COMMENT ON TABLE / COLUMN 语句（MySQL不支持该写法）
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        'COMMENT ON (?:TABLE|COLUMN)[^\r\n]*;',
        '',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    # 将BEGIN转换为START TRANSACTION（MySQL亦支持BEGIN，这里做规范化）
    $content = $content -replace 'BEGIN;', 'START TRANSACTION;'

    # 为CREATE TABLE结尾追加MySQL引擎与字符集
    $pattern = 'CREATE TABLE\s+`([^`]+)`\s*\((.*?)\)\s*;'
    $regex = New-Object System.Text.RegularExpressions.Regex($pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $content = $regex.Replace($content, { param($m)
        $tbl = $m.Groups[1].Value
        $cols = $m.Groups[2].Value

        # 列类型降级以避免 MySQL #1118 错误
        # 规则：
        # 1) 针对常见大文本字段（details/remarks/descriptions/associated_cell_list）强制替换为 TEXT
        # 2) 针对主键/编码/名称/经纬度/时间类字段，缩短为较小 VARCHAR 以便索引
        # 3) 其余残留的 varchar(256) 统一替换为 TEXT（保守策略，避免超宽行）
        $col_defs = $cols

        # 针对特定列名替换为 TEXT
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`details`|`remarks`|`descriptions`|`associated_cell_list`)\s+varchar\s*\(\s*256\s*\)',
            '$1 TEXT',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        # 针对ID/编码/名称/经纬度/时间类字段，缩短为小 VARCHAR
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`(?:work_order_id|nms_alarm_id|asset_tag_number|antenna_serial_number|id)`)\s+varchar\s*\(\s*256\s*\)',
            '$1 VARCHAR(128)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`(?:[^`]*_code|code)`)\s+varchar\s*\(\s*256\s*\)',
            '$1 VARCHAR(64)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`(?:[^`]*_name|name)`)\s+varchar\s*\(\s*256\s*\)',
            '$1 VARCHAR(128)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`(?:longitude|latitude)`)\s+varchar\s*\(\s*256\s*\)',
            '$1 VARCHAR(64)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            '(`[^`]*time[^`]*`)\s+varchar\s*\(\s*256\s*\)',
            '$1 VARCHAR(64)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        # 其余残留统一替换为 TEXT（保守策略）
        $col_defs = [System.Text.RegularExpressions.Regex]::Replace(
            $col_defs,
            'varchar\s*\(\s*256\s*\)',
            'TEXT',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )

        $bt = [char]96
        "CREATE TABLE $bt$tbl$bt ($col_defs) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;"
    })

    # 写出结果
    Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8
}

Convert-PgSqlToMySql -InputPath $InputPath -OutputPath $OutputPath

