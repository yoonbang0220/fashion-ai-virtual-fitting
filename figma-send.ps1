param(
  [string]$channel,
  [string]$command,
  [string]$port = "3055"
)

npx wscat -c "ws://localhost:$port" `
  -x "{\"type\":\"join\",\"channel\":\"$channel\"}" `
  -x "$command"
