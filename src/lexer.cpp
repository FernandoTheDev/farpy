#include <iostream>
#include <string>
#include <vector>
#include <cctype>
#include <unordered_map>

#include "lexer.hpp"

std::vector<Token> Lexer::tokenize()
{
    while (current_offset < source.length())
    {
        char current_char = source[current_offset];

        if (std::isspace(current_char))
        {
            current_column++;
            current_offset++;
        }
        else if (std::isdigit(current_char))
        {
            lexing_number();
        }
        else if (current_char == '"')
        {
            lexing_string();
        }
        else if (std::isalpha(current_char) || current_char == '_')
        {
            lexing_identifier();
        }
        else
        {
            switch (current_char)
            {
            case '+':
                tokens.push_back(create_token(TokenType::PLUS, "+"));
                break;
            case '-':
                tokens.push_back(create_token(TokenType::MINUS, "-"));
                break;
            case '*':
                tokens.push_back(create_token(TokenType::STAR, "*"));
                break;
            case '/':
                tokens.push_back(create_token(TokenType::SLASH, "/"));
                break;
            case '%':
                tokens.push_back(create_token(TokenType::PERCENT, "%"));
                break;
            case '=':
                tokens.push_back(create_token(TokenType::EQUAL, "="));
                break;
            case '!':
                tokens.push_back(create_token(TokenType::BANG, "!"));
                break;
            case '<':
                tokens.push_back(create_token(TokenType::LESS, "<"));
                break;
            case '>':
                tokens.push_back(create_token(TokenType::GREATER, ">"));
                break;
            case '&':
                tokens.push_back(create_token(TokenType::AMPERSAND, "&"));
                break;
            case '|':
                tokens.push_back(create_token(TokenType::PIPE, "|"));
                break;
            case '^':
                tokens.push_back(create_token(TokenType::CARET, "^"));
                break;
            case '~':
                tokens.push_back(create_token(TokenType::TILDE, "~"));
                break;
            case '?':
                tokens.push_back(create_token(TokenType::QUESTION, "?"));
                break;
            case ',':
                tokens.push_back(create_token(TokenType::COMMA, ","));
                break;
            case ';':
                tokens.push_back(create_token(TokenType::SEMICOLON, ";"));
                break;
            case ':':
                tokens.push_back(create_token(TokenType::COLON, ":"));
                break;
            case '.':
                tokens.push_back(create_token(TokenType::DOT, "."));
                break;
            case '(':
                tokens.push_back(create_token(TokenType::LEFT_PAREN, "("));
                break;
            case ')':
                tokens.push_back(create_token(TokenType::RIGHT_PAREN, ")"));
                break;
            case '{':
                tokens.push_back(create_token(TokenType::LEFT_BRACE, "{"));
                break;
            case '}':
                tokens.push_back(create_token(TokenType::RIGHT_BRACE, "}"));
                break;
            case '[':
                tokens.push_back(create_token(TokenType::LEFT_BRACKET, "["));
                break;
            case ']':
                tokens.push_back(create_token(TokenType::RIGHT_BRACKET, "]"));
                break;
            default:
                std::cerr << "Unknow character: " << current_char << '\n';
                exit(0);
                break;
            }
            current_offset++;
            current_column++;
        }
    }
    return tokens;
}

void Lexer::lexing_number()
{
    std::string lexeme;
    while (current_offset < source.length() && std::isdigit(source[current_offset]))
    {
        lexeme += source[current_offset];
        current_offset++;
    }
    tokens.push_back(create_token(TokenType::NUMBER, lexeme));
    current_column += lexeme.length();
}

void Lexer::lexing_string()
{
    std::string lexeme;
    current_offset++;
    while (current_offset < source.length() && source[current_offset] != '"')
    {
        lexeme += source[current_offset];
        current_offset++;
        current_column++;
    }

    if (current_offset >= source.length())
    {
        std::cerr << "Erro: String não fechada na linha " << current_line << '\n';
        exit(1);
    }

    current_offset++;
    tokens.push_back(create_token(TokenType::STRING, lexeme));
    current_column += 2;
}

void Lexer::lexing_identifier()
{
    std::string lexeme;
    while (current_offset < source.length() && (std::isalnum(source[current_offset]) || source[current_offset] == '_'))
    {
        lexeme += source[current_offset];
        current_offset++;
    }

    static const std::unordered_map<std::string, TokenType> keywords = {
        {"if", TokenType::IF},
        {"else", TokenType::ELSE},
        {"while", TokenType::WHILE},
        {"for", TokenType::FOR},
        {"do", TokenType::DO},
        {"break", TokenType::BREAK},
        {"continue", TokenType::CONTINUE},
        {"return", TokenType::RETURN},
        {"true", TokenType::TRUE},
        {"false", TokenType::FALSE}};

    auto it = keywords.find(lexeme);
    if (it != keywords.end())
    {
        tokens.push_back(create_token(it->second, lexeme));
    }
    else
    {
        tokens.push_back(create_token(TokenType::IDENTIFIER, lexeme));
    }

    current_column += lexeme.length();
}

Token Lexer::create_token(TokenType type, const std::string &lexeme)
{
    Loc loc = create_loc(lexeme);
    return Token{type, lexeme, loc};
}

Loc Lexer::create_loc(const std::string &lexeme)
{
    return Loc{current_line, lexeme, current_column, current_column + static_cast<int>(lexeme.length()), filename};
}

// Lexer::Lexer(const std::string &source, const std::string &filename = "repl") : source(source), filename(filename) {}
