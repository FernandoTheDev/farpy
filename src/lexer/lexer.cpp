#include <iostream>
#include <string>
#include <vector>
#include <cctype>
#include <unordered_map>
#include <cstdint>

#include "TokenType.hpp"
#include "../error/error.hpp"
#include "lexer.hpp"

char Lexer::peek() const
{
    return current_offset < source.size() ? source[current_offset] : '\0';
}

char Lexer::peekNext() const
{
    return (current_offset + 1) < source.size() ? source[current_offset + 1] : '\0';
}

char Lexer::advance()
{
    char c = source[current_offset];
    current_offset++;
    if (c == '\n')
    {
        current_line++;
        current_column = 0;
    }
    else
    {
        current_column++;
    }
    return c;
}

bool Lexer::match(char expected)
{
    if (peek() == expected)
    {
        advance();
        return true;
    }
    return false;
}

std::vector<Token> Lexer::tokenize()
{
    while (current_offset < source.size())
    {
        char current_char = peek();

        if (std::isspace(current_char))
        {
            advance();
            continue;
        }
        else if (std::isdigit(current_char))
        {
            lexing_number();
            continue;
        }
        else if (current_char == '"')
        {
            lexing_string();
            continue;
        }
        else if (std::isalpha(current_char) || current_char == '_')
        {
            lexing_identifier();
            continue;
        }
        else
        {
            switch (current_char)
            {
            case '=':
                advance();
                if (peek() == '=')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::EQUAL_EQUAL, "=="));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::EQUAL, "="));
                }
                break;
            case '!':
                advance();
                if (peek() == '=')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::BANG_EQUAL, "!="));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::BANG, "!"));
                }
                break;
            case '<':
                advance();
                if (peek() == '=')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::LESS_EQUAL, "<="));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::LESS, "<"));
                }
                break;
            case '>':
                advance();
                if (peek() == '=')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::GREATER_EQUAL, ">="));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::GREATER, ">"));
                }
                break;
            case '&':
                advance();
                if (peek() == '&')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::AND, "&&"));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::AMPERSAND, "&"));
                }
                break;
            case '|':
                advance();
                if (peek() == '|')
                {
                    advance();
                    tokens.push_back(create_token(TokenType::OR, "||"));
                }
                else
                {
                    tokens.push_back(create_token(TokenType::PIPE, "|"));
                }
                break;
            case '+':
                tokens.push_back(create_token(TokenType::PLUS, std::string(1, advance())));
                break;
            case '-':
                tokens.push_back(create_token(TokenType::MINUS, std::string(1, advance())));
                break;
            case '*':
                tokens.push_back(create_token(TokenType::STAR, std::string(1, advance())));
                break;
            case '/':
                tokens.push_back(create_token(TokenType::SLASH, std::string(1, advance())));
                break;
            case '%':
                tokens.push_back(create_token(TokenType::PERCENT, std::string(1, advance())));
                break;
            case '^':
                tokens.push_back(create_token(TokenType::CARET, std::string(1, advance())));
                break;
            case '~':
                tokens.push_back(create_token(TokenType::TILDE, std::string(1, advance())));
                break;
            case '?':
                tokens.push_back(create_token(TokenType::QUESTION, std::string(1, advance())));
                break;
            case ',':
                tokens.push_back(create_token(TokenType::COMMA, std::string(1, advance())));
                break;
            case ';':
                tokens.push_back(create_token(TokenType::SEMICOLON, std::string(1, advance())));
                break;
            case ':':
                tokens.push_back(create_token(TokenType::COLON, std::string(1, advance())));
                break;
            case '.':
                tokens.push_back(create_token(TokenType::DOT, std::string(1, advance())));
                break;
            case '(':
                tokens.push_back(create_token(TokenType::LEFT_PAREN, std::string(1, advance())));
                break;
            case ')':
                tokens.push_back(create_token(TokenType::RIGHT_PAREN, std::string(1, advance())));
                break;
            case '{':
                tokens.push_back(create_token(TokenType::LEFT_BRACE, std::string(1, advance())));
                break;
            case '}':
                tokens.push_back(create_token(TokenType::RIGHT_BRACE, std::string(1, advance())));
                break;
            case '[':
                tokens.push_back(create_token(TokenType::LEFT_BRACKET, std::string(1, advance())));
                break;
            case ']':
                tokens.push_back(create_token(TokenType::RIGHT_BRACKET, std::string(1, advance())));
                break;
            default:
                Error::errorMessage("lexer", "Unknown character", create_loc(std::string(1, advance())), this->filename, this->source);
                exit(-1);
            }
        }
    }
    return tokens;
}

void Lexer::lexing_number()
{
    std::string lexeme;
    while (current_offset < source.size() && std::isdigit(peek()))
    {
        lexeme.push_back(advance());
    }
    tokens.push_back(create_token(TokenType::NUMBER, lexeme));
}

void Lexer::lexing_string()
{
    std::string lexeme;
    // Skip "
    advance();
    while (current_offset < source.size() && peek() != '"')
    {
        lexeme.push_back(advance());
    }
    if (current_offset >= source.size())
    {
        //TODO: imporve error
        std::cerr << "Erro: String not closed in line " << current_line << "\n";
        exit(1);
    }
    // Skip "
    advance();
    tokens.push_back(create_token(TokenType::STRING, lexeme));
}

void Lexer::lexing_identifier()
{
    std::string lexeme;
    while (current_offset < source.size() && (std::isalnum(peek()) || peek() == '_'))
    {
        lexeme.push_back(advance());
    }

    static const std::unordered_map<std::string, TokenType> keywords = {
        {"if", TokenType::IF},
        {"else", TokenType::ELSE},
        {"while", TokenType::WHILE},
        {"for", TokenType::FOR},
        {"foreach", TokenType::FOREACH},
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
}

Token Lexer::create_token(TokenType type, const std::string &lexeme)
{
    Loc loc = create_loc(lexeme);
    return Token{type, lexeme, loc};
}

Loc Lexer::create_loc(const std::string &lexeme)
{
    return Loc{current_line, current_column - static_cast<int>(lexeme.length()), current_column};
}
