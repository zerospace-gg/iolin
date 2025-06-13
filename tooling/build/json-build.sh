#!/bin/bash
# Build JSON files with batch or spinner mode
# Usage: json-build.sh <batch_mode> <gg_version> <gg_at> <gg_ts> <gg_indent>

set -e

batch_mode="$1"
gg_version="$2"
gg_at="$3"
gg_ts="$4"
gg_indent="$5"

# Get terminal width for proper line clearing
columns=$(tput cols)

# Clear current line properly
clear_line() {
    printf "\r%*s\r" "$columns" ""
}

if [ "$batch_mode" = "true" ]; then
    # Batch mode - fast, no progress display
    files=$(find zerospace meta -name '*.pkl')
    pkl eval -m dist/json $files \
        -p gg_version="$gg_version" \
        -p gg_at="$gg_at" \
        -p gg_ts="$gg_ts" \
        -p gg_indent="$gg_indent" > /dev/null
else
    # Spinner mode - individual files with progress
    spinner_chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

    # Count total files
    total_files=$(find zerospace meta -name '*.pkl' | wc -l)
    current_file=0

    # Build each file with spinner
    find zerospace meta -name '*.pkl' | while read file; do
        current_file=$((current_file + 1))
        output="dist/json/$(echo "$file" | sed 's|^[^/]*/||' | sed 's|\.pkl$|.json|')"

        # Create output directory
        mkdir -p "$(dirname "$output")"

        # Get spinner character (cycle through 10 chars)
        spinner_pos=$((current_file % 10))
        if [ $spinner_pos -eq 0 ]; then spinner_pos=10; fi
        spinner_char=$(echo "$spinner_chars" | cut -c$spinner_pos)

        # Build the file
        pkl eval -m dist/json "$file" \
            -p gg_version="$gg_version" \
            -p gg_at="$gg_at" \
            -p gg_ts="$gg_ts" \
            -p gg_indent="$gg_indent" > /dev/null

        # Show progress with spinner after building
        clear_line
        printf "   %s (%3d/%3d) Rendering %s\r" "$spinner_char" "$current_file" "$total_files" "$file"
    done

    # Clear the line and show completion
    clear_line
    printf "   ✓ Rendered %3d files\n" "$total_files"
fi
