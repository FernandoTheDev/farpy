#!/usr/bin/env bash
set -euo pipefail

BIN_NAME="farpy"
INSTALL_PATH="/usr/local/bin/$BIN_NAME"

function build() {
    echo "🔧 Building $BIN_NAME..."
    deno task compile
    echo "✅ Build finished."
}

function install_bin() {
    build
    echo "📦 Installing $BIN_NAME to $INSTALL_PATH..."
    sudo install -m 0755 "$BIN_NAME" "$INSTALL_PATH"
    echo "✅ Installed successfully!"
}

function remove_bin() {
    echo "🗑️  Removing $INSTALL_PATH..."
    if [[ -f "$INSTALL_PATH" ]]; then
        sudo rm -f "$INSTALL_PATH"
        echo "✅ Removed successfully!"
    else
        echo "⚠️  $INSTALL_PATH not found. Nothing to remove."
    fi
}

case "${1:-}" in
install)
    install_bin
    ;;
remove)
    remove_bin
    ;;
*)
    echo "Usage: $0 {install|remove}"
    exit 1
    ;;
esac
