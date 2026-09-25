#!/bin/bash
set -euo pipefail

script_directory="$(cd "$(dirname "$0")" && pwd)"
app_directory="$script_directory/dist/Factory Control.app"
contents_directory="$app_directory/Contents"
resources_directory="$contents_directory/Resources"
backend_directory="$resources_directory/backend"
swift_compiler="$(xcrun --find swiftc)"
clang_compiler="$(xcrun --find clang)"
macos_sdk_path="$(xcrun --sdk macosx --show-sdk-path)"
module_cache_directory="${TMPDIR:-/tmp}/factory-control-swift-module-cache"

runtime_files=(
    bridge.mjs
    engine.mjs
    runtime.mjs
    job-runner.mjs
    coordinator-schema.json
    worker-schema.json
)

for runtime_file in "${runtime_files[@]}"; do
    if [[ ! -f "$script_directory/$runtime_file" ]]; then
        printf 'Missing backend runtime file: %s\n' "$script_directory/$runtime_file" >&2
        exit 1
    fi
done

mkdir -p "$resources_directory" "$backend_directory" "$contents_directory/MacOS" "$module_cache_directory"
cp "$script_directory/mac/Info.plist" "$contents_directory/Info.plist"

"$clang_compiler" \
    -std=c11 \
    -O2 \
    -Wall \
    -Wextra \
    -Werror \
    -target arm64-apple-macosx14.0 \
    -isysroot "$macos_sdk_path" \
    "$script_directory/mac/FactoryLock.c" \
    -o "$contents_directory/MacOS/Factory Backend"

codesign --force --sign - "$contents_directory/MacOS/Factory Backend"

"$swift_compiler" \
    -swift-version 5 \
    -parse-as-library \
    -sdk "$macos_sdk_path" \
    -module-cache-path "$module_cache_directory" \
    -target arm64-apple-macosx14.0 \
    -framework AppKit \
    -framework SwiftUI \
    "$script_directory/mac/FactoryControl.swift" \
    -o "$contents_directory/MacOS/Factory Control"

for runtime_file in "${runtime_files[@]}"; do
    cp "$script_directory/$runtime_file" "$backend_directory/$runtime_file"
done

codesign --force --sign - "$app_directory"
printf 'Built %s\n' "$app_directory"
