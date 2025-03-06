#include <iostream>


#include "../utils/colorize.hpp"
#include "../lexer/lexer.hpp"
#include "error.hpp"

void Error::errorMessage(const std::string &local, const std::string &message, const Loc &loc, std::string &filename, std::string &Contents)
{
    // Header
    std::cout << Colorize::red(Colorize::bold(local + " error" + ": ") + message + "\n");
    std::cout << Colorize::bold("---> " + filename + ":" + std::to_string(loc.line) + ":" + std::to_string(loc.start_column) + "\n");

    // Body
    std::cout << Colorize::bold(Colorize::blue("   |\n"));
    std::cout << Colorize::bold(" " + std::to_string(loc.line) + " |    ")
              << Contents[loc.line - 1] << "\n";
    std::cout << Colorize::bold(Colorize::blue("   |    "));

    for (int i = 0; i < (loc.end_column - loc.start_column); i++)
    {
        std::cout << Colorize::bold(Colorize::red("^"));
    }

    std::cout << " " + Colorize::bold(Colorize::red(message));

    std::cout << Colorize::bold(Colorize::blue("\n   |\n"));
}
