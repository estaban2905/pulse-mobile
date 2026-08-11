param(
  [string]$ImagesDirectory = (Join-Path $PSScriptRoot '..\assets\images')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Save-ResizedPng {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height
  )

  $source = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $target = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($source, 0, 0, $Width, $Height)
      }
      finally {
        $graphics.Dispose()
      }
      $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $target.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

function Save-FlattenedResizedPng {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [Parameter(Mandatory = $true)][int]$Width,
    [Parameter(Mandatory = $true)][int]$Height
  )

  $source = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $target = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::FromArgb(11, 11, 15))
        $graphics.DrawImage($source, 0, 0, $Width, $Height)
      }
      finally {
        $graphics.Dispose()
      }
      $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $target.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

function Remove-GreenScreen {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $sourceImage = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $source = New-Object System.Drawing.Bitmap($sourceImage)
  }
  finally {
    $sourceImage.Dispose()
  }

  try {
    $target = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
          $pixel = $source.GetPixel($x, $y)

          # Distance from the sampled green-screen colour (6, 249, 6).
          # A soft range preserves anti-aliased edges instead of leaving a hard halo.
          $distance = [Math]::Sqrt(
            (($pixel.R - 6) * ($pixel.R - 6)) +
            (($pixel.G - 249) * ($pixel.G - 249)) +
            (($pixel.B - 6) * ($pixel.B - 6))
          )
          $alpha = [Math]::Max(0.0, [Math]::Min(1.0, ($distance - 28.0) / 152.0))

          if ($alpha -le 0.04) {
            $target.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            continue
          }

          # Remove green spill without amplifying low-alpha pixels into a magenta halo.
          $red = $pixel.R
          $blue = $pixel.B
          $green = [Math]::Min($pixel.G, [Math]::Round(($pixel.R + $pixel.B) / 2.0))
          $alphaByte = [Math]::Max(0, [Math]::Min(255, [Math]::Round($alpha * 255.0)))

          $target.SetPixel(
            $x,
            $y,
            [System.Drawing.Color]::FromArgb([int]$alphaByte, [int]$red, [int]$green, [int]$blue)
          )
        }
      }
      $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $target.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

function Save-MonochromePng {
  param(
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $sourceImage = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $source = New-Object System.Drawing.Bitmap($sourceImage)
  }
  finally {
    $sourceImage.Dispose()
  }

  try {
    $target = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
          $alpha = $source.GetPixel($x, $y).A
          $target.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
        }
      }
      $target.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $target.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

$sourceIcon = Join-Path $ImagesDirectory 'pulse-app-icon-source.png'
$chromaIcon = Join-Path $ImagesDirectory 'pulse-adaptive-chroma-source.png'
$transparentOriginal = Join-Path $ImagesDirectory 'pulse-adaptive-transparent-source.png'
$icon = Join-Path $ImagesDirectory 'icon.png'
$adaptiveIcon = Join-Path $ImagesDirectory 'adaptive-icon.png'
$monochromeIcon = Join-Path $ImagesDirectory 'adaptive-icon-monochrome.png'
$splashIcon = Join-Path $ImagesDirectory 'splash-icon.png'
$playStoreIcon = Join-Path $ImagesDirectory 'play-store-icon-512.png'

Remove-GreenScreen -InputPath $chromaIcon -OutputPath $transparentOriginal
Save-FlattenedResizedPng -InputPath $sourceIcon -OutputPath $icon -Width 1024 -Height 1024
Save-ResizedPng -InputPath $transparentOriginal -OutputPath $adaptiveIcon -Width 1024 -Height 1024
Save-ResizedPng -InputPath $transparentOriginal -OutputPath $splashIcon -Width 1024 -Height 1024
Save-FlattenedResizedPng -InputPath $sourceIcon -OutputPath $playStoreIcon -Width 512 -Height 512
Save-MonochromePng -InputPath $adaptiveIcon -OutputPath $monochromeIcon

Write-Output "Brand assets generated in $ImagesDirectory"
