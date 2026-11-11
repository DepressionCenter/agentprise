# This file is part of ZippyServe
# run-windows.ps1
# Author(s): Gabriel Mongefranco; Eisenberg Family Depression Center.
# Created: 2026-07-26
# Summary: Windows launch script for ZippyServe. Wraps bin\ZippyServe.exe, serving
#          this script's own directory by default, and opens the default browser.
# Notes: See README file for documentation and full license information.
#
# Copyright © 2026 The Regents of the University of Michigan
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License along
# with this program. If not, see <https://www.gnu.org/licenses/>.

param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8010,
    [string]$Dir = $PSScriptRoot,
    [string]$Zip = "",
    [string]$Compressed = "",
    [string]$Tar = "",
    [string]$Gz = "",
    [string]$Index = "",
    [switch]$Mcp,
    [switch]$McpBrowser,
    [switch]$ServeDotfiles
)

$ExePath = Join-Path $PSScriptRoot "bin\ZippyServe.exe"

if (-not (Test-Path $ExePath)) {
    Write-Error "ZippyServe binary not found at '$ExePath'. Run build.ps1 first, or copy bin\ZippyServe.exe alongside this script."
    exit 1
}

### Build server argument list ###
# -dir defaults to this script's own directory (not the exe's directory) so the
# copied-in project root is served, not the bin\ folder the exe lives in. main.go's
# own priority order (Index > Zip/Tar/Gz > Dir) still applies, so passing -dir here
# alongside a -Zip/-Index override is safe and does not conflict.
$ServerArgs = @("-port", $Port, "-dir", $Dir)
if ($Zip -ne "")        { $ServerArgs += @("-zip", $Zip) }
if ($Compressed -ne "") { $ServerArgs += @("-compressed", $Compressed) }
if ($Tar -ne "")         { $ServerArgs += @("-tar", $Tar) }
if ($Gz -ne "")          { $ServerArgs += @("-gz", $Gz) }
if ($Index -ne "")       { $ServerArgs += @("-index", $Index) }
if ($Mcp)                { $ServerArgs += @("-mcp") }
if ($McpBrowser)         { $ServerArgs += @("-mcp-browser") }
if ($ServeDotfiles)      { $ServerArgs += @("-serve-dotfiles") }

### Check the port ###
# Returns $true when something answers on the port. The server listens on
# 127.0.0.1 only, so the check asks that address directly. Windows retries a
# refused connection for about 2 seconds, so the check waits only 250
# milliseconds; a server on the same computer answers well within that time.
function Test-ServerPort {
    param([int]$Port)
    $Client = New-Object System.Net.Sockets.TcpClient
    try {
        $Attempt = $Client.ConnectAsync("127.0.0.1", $Port)
        return ($Attempt.Wait(250) -and $Client.Connected)
    } catch {
        return $false
    } finally {
        $Client.Close()
    }
}

# Returns $true when the program on the port is this app, found by the page
# title in the answer to a request for the home page. The request skips any
# proxy, because the server listens on this computer only.
function Test-AppPage {
    param([int]$Port)
    try {
        $Request = [System.Net.WebRequest]::Create("http://127.0.0.1:$Port/")
        $Request.Proxy = $null
        $Request.Timeout = 2000
        $Request.ReadWriteTimeout = 2000
        $Response = $Request.GetResponse()
        try {
            $Reader = New-Object System.IO.StreamReader($Response.GetResponseStream())
            $Buffer = New-Object char[] 16384
            $Count = $Reader.ReadBlock($Buffer, 0, $Buffer.Length)
            return [string]::new($Buffer, 0, $Count).Contains("<title>Agentprise</title>")
        } finally {
            $Response.Close()
        }
    } catch {
        return $false
    }
}

# "Run with PowerShell" closes the window as soon as the script ends, so the
# script waits for Enter to give the person time to read the message.
function Wait-BeforeClose {
    try {
        [void](Read-Host "Press Enter to close this window")
    } catch {
        # A session that cannot ask for input ends without waiting.
    }
}

$Url = "http://localhost:$Port"
if (Test-ServerPort -Port $Port) {
    if (Test-AppPage -Port $Port) {
        Start-Process $Url
        Write-Host "The app is already running on port $Port in another server window, so this script opened it in your browser. To stop that server, press Ctrl+C in its window or close it."
        exit 0
    }
    $OtherPort = if ($Port -lt 65535) { $Port + 1 } else { $Port - 1 }
    $Host.UI.WriteErrorLine("Another program is already using port $Port. Close that program and run this script again. If you cannot close it, add -Port $OtherPort to use another port; projects you saved at port $Port show only at that port.")
    Wait-BeforeClose
    exit 1
}

### Open the browser once the server answers ###
# The server runs in the foreground below, so Ctrl+C or closing this window
# stops it and leaves nothing running. A second runspace on another thread
# waits up to 10 seconds for the port to answer, then opens the browser and
# writes the address note to the console.
$AddressNote = "Open $Url to find your saved projects. Your browser keeps projects saved at another address, such as http://127.0.0.1:$Port, separately."
$Opener = [powershell]::Create()
[void]$Opener.AddScript({
    param([string]$ProbeText, [int]$Port, [string]$Url, [string]$AddressNote)
    # A script block cannot run on another runspace's thread, so the port
    # check is rebuilt here from its text.
    $Probe = [scriptblock]::Create($ProbeText)
    $Deadline = [DateTime]::UtcNow.AddSeconds(10)
    $Answered = $false
    while (-not $Answered -and [DateTime]::UtcNow -lt $Deadline) {
        $Answered = & $Probe -Port $Port
        if (-not $Answered) { Start-Sleep -Milliseconds 100 }
    }
    if (-not $Answered) {
        [Console]::WriteLine("The server is taking longer than 10 seconds to start. If your browser shows an error, wait a moment and reload the page.")
    }
    Start-Process $Url
    [Console]::WriteLine("")
    [Console]::WriteLine($AddressNote)
    [Console]::WriteLine("To stop the server, press Ctrl+C or close this window.")
})
[void]$Opener.AddArgument(${function:Test-ServerPort}.ToString())
[void]$Opener.AddArgument($Port)
[void]$Opener.AddArgument($Url)
[void]$Opener.AddArgument($AddressNote)
[void]$Opener.BeginInvoke()

### Start the server ###
try {
    & $ExePath @ServerArgs
} finally {
    # Stops the browser step if the server ends first, such as when it cannot open the folder.
    $Opener.Stop()
    $Opener.Dispose()
}
exit $LASTEXITCODE
