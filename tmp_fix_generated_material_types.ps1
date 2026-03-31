$path = 'src/lib/database.types.ts'
$text = Get-Content -Path $path -Raw

function Replace-FirstMatch {
  param(
    [string]$Source,
    [string]$Old,
    [string]$New,
    [int]$Occurrence = 1
  )

  $index = -1
  $offset = 0

  for ($i = 1; $i -le $Occurrence; $i++) {
    $index = $Source.IndexOf($Old, $offset)
    if ($index -lt 0) {
      throw "Ocorrência $Occurrence não encontrada para trecho: $Old"
    }
    $offset = $index + $Old.Length
  }

  return $Source.Substring(0, $index) + $New + $Source.Substring($index + $Old.Length)
}

$oldRowA = @'
          is_draft: boolean | null
          journey_id: string | null
'@.TrimStart()
$newRowA = @'
          is_draft: boolean | null
          is_template: boolean
          journey_id: string | null
'@.TrimStart()

$oldRowB = @'
          journey_id: string | null
          page_count: number | null
'@.TrimStart()
$newRowB = @'
          journey_id: string | null
          page_config: Json | null
          page_count: number | null
'@.TrimStart()

$oldRowC = @'
          status: Database["public"]["Enums"]["material_status"] | null
          title: string
'@.TrimStart()
$newRowC = @'
          status: Database["public"]["Enums"]["material_status"] | null
          template_cover_url: string | null
          template_description: string | null
          template_instrument: string | null
          template_level: string | null
          title: string
'@.TrimStart()

$oldInsertA = @'
          is_draft?: boolean | null
          journey_id?: string | null
'@.TrimStart()
$newInsertA = @'
          is_draft?: boolean | null
          is_template?: boolean
          journey_id?: string | null
'@.TrimStart()

$oldInsertB = @'
          journey_id?: string | null
          page_count?: number | null
'@.TrimStart()
$newInsertB = @'
          journey_id?: string | null
          page_config?: Json | null
          page_count?: number | null
'@.TrimStart()

$oldInsertC = @'
          status?: Database["public"]["Enums"]["material_status"] | null
          title: string
'@.TrimStart()
$newInsertC = @'
          status?: Database["public"]["Enums"]["material_status"] | null
          template_cover_url?: string | null
          template_description?: string | null
          template_instrument?: string | null
          template_level?: string | null
          title: string
'@.TrimStart()

$oldUpdateC = @'
          status?: Database["public"]["Enums"]["material_status"] | null
          title?: string
'@.TrimStart()
$newUpdateC = @'
          status?: Database["public"]["Enums"]["material_status"] | null
          template_cover_url?: string | null
          template_description?: string | null
          template_instrument?: string | null
          template_level?: string | null
          title?: string
'@.TrimStart()

$text = Replace-FirstMatch -Source $text -Old $oldRowA -New $newRowA
$text = Replace-FirstMatch -Source $text -Old $oldRowB -New $newRowB
$text = Replace-FirstMatch -Source $text -Old $oldRowC -New $newRowC

$text = Replace-FirstMatch -Source $text -Old $oldInsertA -New $newInsertA -Occurrence 1
$text = Replace-FirstMatch -Source $text -Old $oldInsertB -New $newInsertB -Occurrence 1
$text = Replace-FirstMatch -Source $text -Old $oldInsertC -New $newInsertC -Occurrence 1

$text = Replace-FirstMatch -Source $text -Old $oldInsertA -New $newInsertA -Occurrence 2
$text = Replace-FirstMatch -Source $text -Old $oldInsertB -New $newInsertB -Occurrence 2
$text = Replace-FirstMatch -Source $text -Old $oldUpdateC -New $newUpdateC

[System.IO.File]::WriteAllText((Resolve-Path $path), $text, [System.Text.Encoding]::UTF8)
Write-Host 'database.types.ts atualizado com campos de template em generated_materials.'
