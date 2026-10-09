$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path $PSScriptRoot '../../desktop/Edon.Desktop/Assets'
New-Item -ItemType Directory -Force $assetDir | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(32,33,31))
$graphics.ScaleTransform(8,8)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(238,237,232))
$shape = New-Object System.Drawing.Drawing2D.GraphicsPath
$shape.AddArc(4,4,24,24,90,180)
$shape.AddLine(16,4,23,4)
$shape.AddLine(23,4,23,10)
$shape.AddLine(23,10,16,10)
$shape.AddArc(10,10,12,12,270,-180)
$shape.AddLine(16,22,23,22)
$shape.AddLine(23,22,23,28)
$shape.CloseFigure()
$graphics.FillPath($brush,$shape)
$graphics.FillRectangle($brush,17,13,6,6)
$graphics.FillEllipse($brush,14,13,6,6)
$graphics.FillEllipse($brush,25,13,6,6)
$memory = New-Object System.IO.MemoryStream
$bitmap.Save($memory,[System.Drawing.Imaging.ImageFormat]::Png)
$png = $memory.ToArray()
$file = [System.IO.File]::Create((Join-Path $assetDir 'edon.ico'))
$writer = New-Object System.IO.BinaryWriter $file
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png)
$writer.Dispose(); $memory.Dispose(); $shape.Dispose(); $graphics.Dispose(); $brush.Dispose(); $bitmap.Dispose()
