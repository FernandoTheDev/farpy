#ifndef TOKENKIND_HPP
#define TOKENKIND_HPP

#include <string>

enum TokenType
{
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
    EQUAL_EQUAL,
    BANG_EQUAL,
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
    POWERING,

    // Especials
    BINARY,

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
    FN,
    AS,
    IMPORT,
    FOREACH,

    // End of file
    END_OF_FILE
};

struct Loc
{
    int line;
    int start_column;
    int end_column;
};

struct Token
{
    TokenType type;
    std::string lexeme;
    Loc loc;
};

#endif 
