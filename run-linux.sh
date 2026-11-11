#!/bin/bash
# This file is part of ZippyServe
# run-linux.sh
# Author(s): Gabriel Mongefranco; Eisenberg Family Depression Center.
# Created: 2026-07-26
# Summary: Linux launch script for ZippyServe. Wraps bin/ZippyServe-linux-amd64,
#          serving this script's own directory by default, and opens the default
#          browser.
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

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXE_PATH="$SCRIPT_DIR/bin/ZippyServe-linux-amd64"

PORT=8010
DIR="$SCRIPT_DIR"
SERVER_ARGS=()

### Parse and forward server flags ###
while [ $# -gt 0 ]; do
    case "$1" in
        --port=*)       PORT="${1#*=}" ;;
        --port)         PORT="$2"; shift ;;
        --dir=*)        DIR="${1#*=}" ;;
        --dir)          DIR="$2"; shift ;;
        --zip=*)        SERVER_ARGS+=("-zip" "${1#*=}") ;;
        --zip)          SERVER_ARGS+=("-zip" "$2"); shift ;;
        --compressed=*) SERVER_ARGS+=("-compressed" "${1#*=}") ;;
        --compressed)   SERVER_ARGS+=("-compressed" "$2"); shift ;;
        --tar=*)        SERVER_ARGS+=("-tar" "${1#*=}") ;;
        --tar)          SERVER_ARGS+=("-tar" "$2"); shift ;;
        --gz=*)         SERVER_ARGS+=("-gz" "${1#*=}") ;;
        --gz)           SERVER_ARGS+=("-gz" "$2"); shift ;;
        --index=*)      SERVER_ARGS+=("-index" "${1#*=}") ;;
        --index)        SERVER_ARGS+=("-index" "$2"); shift ;;
        --mcp)          SERVER_ARGS+=("-mcp") ;;
        --mcp-browser)  SERVER_ARGS+=("-mcp-browser") ;;
        --serve-dotfiles) SERVER_ARGS+=("-serve-dotfiles") ;;
        *)              echo "Unknown argument: $1" >&2; exit 1 ;;
    esac
    shift
done

if [ ! -f "$EXE_PATH" ]; then
    echo "ZippyServe binary not found at '$EXE_PATH'. Run build.sh first, or copy bin/ZippyServe-linux-amd64 alongside this script." >&2
    exit 1
fi
chmod +x "$EXE_PATH"

### Check the port ###
# A leading zero is refused because the server reads 010 as the octal number 8.
case "$PORT" in
    ''|0*|*[!0-9]*|??????*) PORT_OK=no ;;
    *) if [ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ]; then PORT_OK=yes; else PORT_OK=no; fi ;;
esac
if [ "$PORT_OK" != "yes" ]; then
    echo "The port must be a number from 1 to 65535 with no leading zero, such as 8010. Run the script again with a port in that range." >&2
    exit 1
fi

URL="http://localhost:$PORT"

# Succeeds when something answers on the port. The server listens on
# 127.0.0.1 only, so the check asks that address directly. curl is used when
# present; otherwise bash opens the connection itself through /dev/tcp.
port_answers() {
    if command -v curl > /dev/null 2>&1; then
        curl --silent --output /dev/null --max-time 1 --noproxy '*' "http://127.0.0.1:$PORT/"
    else
        (exec 3<> "/dev/tcp/127.0.0.1/$PORT") 2> /dev/null
    fi
}

# Succeeds when the program on the port is this app, found by the page title
# in the answer to a request for the home page. It runs in a subshell, so a
# connection that fails cannot end the script.
app_answers() (
    if command -v curl > /dev/null 2>&1; then
        PAGE="$(curl --silent --max-time 2 --noproxy '*' "http://127.0.0.1:$PORT/" 2> /dev/null | head -c 16384)" || true
        case "$PAGE" in
            *'<title>Agentprise</title>'*) exit 0 ;;
            *) exit 1 ;;
        esac
    fi
    { exec 3<> "/dev/tcp/127.0.0.1/$PORT"; } 2> /dev/null || exit 1
    printf 'GET / HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n' >&3
    LINE_COUNT=0
    while [ "$LINE_COUNT" -lt 100 ] && IFS= read -r -t 2 LINE <&3; do
        case "$LINE" in
            *'<title>Agentprise</title>'*) exit 0 ;;
        esac
        LINE_COUNT=$((LINE_COUNT + 1))
    done
    exit 1
)

if port_answers; then
    if app_answers; then
        if command -v xdg-open > /dev/null 2>&1; then
            xdg-open "$URL" > /dev/null 2>&1 &
            echo "The app is already running on port $PORT in another server window, so this script opened it in your browser. To stop that server, press Ctrl+C in its window or close it."
        else
            echo "The app is already running on port $PORT in another server window. Open $URL in your browser. To stop that server, press Ctrl+C in its window or close it."
        fi
        exit 0
    fi
    if [ "$PORT" -lt 65535 ]; then OTHER_PORT=$((PORT + 1)); else OTHER_PORT=$((PORT - 1)); fi
    echo "Another program is already using port $PORT. Close that program and run this script again. If you cannot close it, add --port $OTHER_PORT to use another port; projects you saved at port $PORT show only at that port." >&2
    exit 1
fi

### Start the server, then open the browser ###
# The server starts as a background process, so the script can open the
# browser once the server answers. The script then waits for the server and
# stops it when the script ends, so Ctrl+C or closing the window leaves
# nothing running.
SERVER_PID=""

# Ignores further signals while it stops the server, so a second Ctrl+C
# cannot end the script before the server has stopped.
stop_server() {
    trap '' HUP INT TERM
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2> /dev/null || true
        wait "$SERVER_PID" 2> /dev/null || true
    fi
}
trap stop_server EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

"$EXE_PATH" -port "$PORT" -dir "$DIR" ${SERVER_ARGS[@]+"${SERVER_ARGS[@]}"} &
SERVER_PID=$!

# Waits up to 10 seconds for the server to answer.
DEADLINE=$((SECONDS + 10))
until port_answers; do
    if ! kill -0 "$SERVER_PID" 2> /dev/null; then
        echo "The server stopped before it could open the app. Read the messages above to see why, then run the script again." >&2
        exit 1
    fi
    if [ "$SECONDS" -ge "$DEADLINE" ]; then
        echo "The server is taking longer than 10 seconds to start. If your browser shows an error, wait a moment and reload the page."
        break
    fi
    sleep 0.1 2> /dev/null || sleep 1
done

### Open the browser ###
if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$URL" > /dev/null 2>&1 &
fi
echo ""
echo "Open $URL to find your saved projects. Your browser keeps projects saved at another address, such as http://127.0.0.1:$PORT, separately."
echo "To stop the server, press Ctrl+C or close this window."

wait "$SERVER_PID"
