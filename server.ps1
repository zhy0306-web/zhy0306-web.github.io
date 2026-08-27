$root = "F:\桌面\班级论坛"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running at http://localhost:8080/"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
        $path = $ctx.Request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $root $path.TrimStart("/")
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css" { "text/css; charset=utf-8" }
                ".js" { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".svg" { "image/svg+xml" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".ico" { "image/x-icon" }
                default { "application/octet-stream" }
            }
            $buf = [System.IO.File]::ReadAllBytes($filePath)
            $ctx.Response.ContentType = $mime
            $ctx.Response.ContentLength64 = $buf.Length
            $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
        } else {
            $ctx.Response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $ctx.Response.OutputStream.Write($err, 0, $err.Length)
        }
    } catch {
        $ctx.Response.StatusCode = 500
    }
    $ctx.Response.Close()
}
