#ifndef COLORIZE_HPP
#define COLORIZE_HPP

#include <iostream>
#include <string>

#ifdef _WIN32
#include <windows.h>
// Function to enable ANSI string processing on Windows
void enableVirtualTerminalProcessing()
{
    HANDLE hOut = GetStdHandle(STD_OUTPUT_HANDLE);
    if (hOut == INVALID_HANDLE_VALUE)
        return;
    DWORD dwMode = 0;
    if (!GetConsoleMode(hOut, &dwMode))
        return;
    dwMode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    SetConsoleMode(hOut, dwMode);
}
#endif

class Colorize
{
public:
    // Colors
    static std::string red(const std::string &text) { return "\033[31m" + text + "\033[0m"; }
    static std::string green(const std::string &text) { return "\033[32m" + text + "\033[0m"; }
    static std::string yellow(const std::string &text) { return "\033[33m" + text + "\033[0m"; }
    static std::string blue(const std::string &text) { return "\033[34m" + text + "\033[0m"; }
    static std::string magenta(const std::string &text) { return "\033[35m" + text + "\033[0m"; }
    static std::string cyan(const std::string &text) { return "\033[36m" + text + "\033[0m"; }

    // Styles
    static std::string bold(const std::string &text) { return "\033[1m" + text + "\033[0m"; }
    static std::string italic(const std::string &text) { return "\033[3m" + text + "\033[0m"; }
    static std::string underline(const std::string &text) { return "\033[4m" + text + "\033[0m"; }
};

#endif
