#include <iostream>
#include <string>
#include <filesystem>
#include <vector>
#include <fstream>

#include "src/lexer.hpp"

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        std::cerr << "Usage: " << argv[0] << " <filename>" << '\n';
        return 1;
    }

    std::ifstream file(argv[1]);
    if (!file.is_open())
    {
        std::cerr << "Error: could not open file " << argv[1] << '\n';
        return 1;
    }

    std::string line{};
    std::string source{};

    while (std::getline(file, line))
    {
        source += line;
    }

    file.close();

    Lexer lexer(source, std::filesystem::path(argv[1]).filename().string());
    std::vector<Token> tokens = lexer.tokenize();

    for (const Token &token : tokens)
    {
        std::cout << "Line: " << token.loc.line
                  << ", Start Column: " << token.loc.start_column
                  << ", End Column: " << token.loc.end_column
                  << ", Line Content: " << token.loc.line_content
                  << ", Token Type: " << token.type
                  << '\n';
    }

    return 0;
}
