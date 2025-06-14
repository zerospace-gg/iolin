#!/bin/bash
# Build JSON files with batch or spinner mode
# Usage: json-build.sh <batch_mode> <gg_version> <gg_at> <gg_ts> <gg_indent>

set -euo pipefail

batch_mode="$1"
gg_version="$2"
gg_at="$3"
gg_ts="$4"
gg_indent="$5"

# Auto-detect CI environment and force batch mode for cleaner output
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ] || [ "${CONTINUOUS_INTEGRATION:-}" = "true" ] || [ "${BUILDKITE:-}" = "true" ] || [ "${JENKINS_URL:-}" != "" ] || [ "${TRAVIS:-}" = "true" ]; then
    batch_mode="true"
fi

# Get terminal width for proper line clearing (fallback for CI)
columns=$(tput cols 2>/dev/null || echo "80")

# Clear current line properly (only in interactive mode)
clear_line() {
    if [ "$batch_mode" != "true" ]; then
        printf "\r%*s\r" "$columns" ""
    fi
}

# Validate that we have Pkl files to process
echo "🔍 Debug: Checking for Pkl files..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Checking zerospace directory:"
ls -la zerospace 2>/dev/null || echo "zerospace directory not found"
echo "Checking meta directory:"
ls -la meta 2>/dev/null || echo "meta directory not found"
echo "Looking for .pkl files:"
find . -name '*.pkl' -type f | head -10 || echo "No .pkl files found anywhere"

if ! find zerospace meta -name '*.pkl' 2>/dev/null | grep -q .; then
    echo "❌ ERROR: No .pkl files found in zerospace or meta directories"
    echo "Available directories:"
    find . -maxdepth 2 -type d | sort
    exit 1
fi

if [ "$batch_mode" = "true" ]; then
    # Batch mode - fast, no progress display
    files=$(find zerospace meta -name '*.pkl')
    if ! pkl eval -m dist/json $files \
        -p gg_version="$gg_version" \
        -p gg_at="$gg_at" \
        -p gg_ts="$gg_ts" \
        -p gg_indent="$gg_indent" > /dev/null; then
        echo "❌ ERROR: Pkl evaluation failed in batch mode"
        exit 1
    fi
else
    # Spinner mode - individual files with progress
    spinner_chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

    # Count total files
    total_files=$(find zerospace meta -name '*.pkl' | wc -l)
    current_file=0

    # Build each file with spinner
    find zerospace meta -name '*.pkl' | while read file; do
        current_file=$((current_file + 1))

        # Get spinner character (cycle through 10 chars)
        spinner_pos=$((current_file % 10))
        if [ $spinner_pos -eq 0 ]; then spinner_pos=10; fi
        spinner_char=$(echo "$spinner_chars" | cut -c$spinner_pos)

        # Build the file with error checking
        if ! pkl eval -m dist/json "$file" \
            -p gg_version="$gg_version" \
            -p gg_at="$gg_at" \
            -p gg_ts="$gg_ts" \
            -p gg_indent="$gg_indent" > /dev/null; then
            clear_line
            echo "❌ ERROR: Failed to build $file"
            exit 1
        fi

        # Show progress with spinner after building (only in interactive mode)
        if [ "$batch_mode" != "true" ]; then
            clear_line
            printf "   %s (%3d/%3d) Rendering %s\r" "$spinner_char" "$current_file" "$total_files" "$file"
        fi
    done

    # Clear the line and show completion
    if [ "$batch_mode" != "true" ]; then
        clear_line
    fi
    printf "   ✓ Rendered %3d files\n" "$total_files"
fi

# Final validation - ensure JSON files were generated
json_count=$(find dist/json -name '*.json' 2>/dev/null | wc -l)
if [ "$json_count" -eq 0 ]; then
    echo "❌ ERROR: No JSON files were generated"
    exit 1
fi

# Validate all JSON files have valid syntax (silently)
if ! find dist/json -name '*.json' -exec jq empty {} \; 2>/dev/null; then
    echo "❌ ERROR: Some generated JSON files have invalid syntax"
    exit 1
fi
