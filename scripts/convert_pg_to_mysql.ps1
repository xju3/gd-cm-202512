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
        $bt = [char]96
        "CREATE TABLE $bt$tbl$bt ($cols) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;"
    })

    # 写出结果
    Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8
}

Convert-PgSqlToMySql -InputPath $InputPath -OutputPath $OutputPath

