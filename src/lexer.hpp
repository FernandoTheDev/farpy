#ifndef LEXER_HPP
#define LEXER_HPP

#include <string>
#include <vector>

enum TokenType
{
    KEYWORD,
    IDENTIFIER,
    NUMBER,
    STRING,

    // Operators
    PLUS,
    MINUS,
    STAR,
    SLASH,
    PERCENT,
    EQUAL,
    NOT_EQUAL,
    LESS,
    LESS_EQUAL,
    GREATER,
    GREATER_EQUAL,
    AND,
    OR,
    NOT,
    ASSIGN,
    PLUS_ASSIGN,
    MINUS_ASSIGN,
    STAR_ASSIGN,
    SLASH_ASSIGN,
    PERCENT_ASSIGN,
    INCREMENT,
    DECREMENT,

    // Punctuation
    COMMA,
    SEMICOLON,
    COLON,
    DOT,
    LEFT_PAREN,
    RIGHT_PAREN,
    LEFT_BRACE,
    RIGHT_BRACE,
    LEFT_BRACKET,
    RIGHT_BRACKET,
    BANG,
    AMPERSAND,
    PIPE,
    CARET,
    TILDE,
    QUESTION,

    // Keywords
    IF,
    ELSE,
    WHILE,
    FOR,
    DO,
    BREAK,
    CONTINUE,
    RETURN,
    TRUE,
    FALSE,

    // End of file
    END_OF_FILE
};

struct Loc
{
    int line;
    std::string line_content;
    int start_column;
    int end_column;
    std::string filename;
};

struct Token
{
    TokenType type;
    std::string lexeme;
    Loc loc;
};

class Lexer
{
public:
    Lexer(const std::string &source, const std::string &filename = "repl") : source(source), filename(filename) {};
    std::vector<Token> tokenize();

private:
    std::string source{};
    std::vector<Token> tokens{};
    int current_offset = 0;
    int current_line = 0;
    int current_column = 0;
    std::string filename{};

    Token create_token(TokenType type, const std::string &lexeme);
    Loc create_loc(const std::string &lexeme);

    void lexing_number();
    void lexing_string();
    void lexing_identifier();
};

#endif
