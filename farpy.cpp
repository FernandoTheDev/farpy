#include <iostream>
#include <string>
#include <filesystem>
#include <vector>
#include <fstream>
#include <algorithm>
#include <typeinfo>
#include <nlohmann/json.hpp>

#include "src/lexer.hpp"
#include "src/parser.hpp"

bool build = false;
std::string code{};

using json = nlohmann::json;

int main(int argc, char **argv)
{

    if (argc < 2)
    {
        std::cerr << "Usage: " << argv[0] << " <filename>" << '\n';
        return 1;
    }

    if (argv[1] == nullptr)
    {
        std::cerr << "Error: filename is null" << '\n';
        return 1;
    }

    if (std::string(argv[1]) == "build")
    {
        std::ifstream file(argv[2]);
        if (!file.is_open())
        {
            std::cerr << "Error: could not open file " << argv[2] << '\n';
            return 1;
        }
        std::string line;
        std::string source;

        while (std::getline(file, line))
        {
            source += line + "\n";
        }

        file.close();
        code = source;
    }
    else
    {
        std::ifstream file(argv[1]);
        if (!file.is_open())
        {
            std::cerr << "Error: could not open file " << argv[1] << '\n';
            return 1;
        }
        std::string line;
        std::string source;

        while (std::getline(file, line))
        {
            source += line + "\n";
        }

        file.close();
        code = source;
    }

    Lexer lexer(code, std::filesystem::path(argv[1]).filename().string());
    std::vector<Token> tokens = lexer.tokenize();

    Parser parser(tokens);
    auto program = parser.parse();

    for (const Token &token : tokens)
    {
        std::cout << "Line: " << token.loc.line
                  << ", Start Column: " << token.loc.start_column
                  << ", End Column: " << token.loc.end_column
                  << ", Line Content: " << token.loc.line_content
                  << ", Token Type: " << token.type
                  << '\n';
    }

    json ast_json = json::array();
    for (const auto &node : program)
    {
        ast_json.push_back(node->toJson());
    }

    std::cout << ast_json.dump(4) << std::endl;

    return 0;
}
