#ifndef LEXER_HPP
#define LEXER_HPP

#include <string>
#include <vector>

#include "./TokenType.hpp"

class Lexer
{
public:
    Lexer(const std::string &source, const std::string &filename = "repl") : source(source), filename(filename) {};
    std::vector<Token> tokenize();

private:
    std::string source{};
    std::vector<Token> tokens{};
    int current_offset = 0;
    int current_line = 1;
    int current_column = 0;
    std::string filename{};

    Token create_token(TokenType type, const std::string &lexeme);
    Loc create_loc(const std::string &lexeme);

    void lexing_number();
    void lexing_string();
    void lexing_identifier();
    char peek() const;
    char peekNext() const;
    char advance();
    bool match(char expected);
};

#endif
