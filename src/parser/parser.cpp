#include <iostream>
#include <vector>
#include <memory>

#include "./parser.hpp"

std::vector<std::shared_ptr<ASTNode>> Parser::parse()
{
    std::vector<std::shared_ptr<ASTNode>> statements{};

    while (!isAtEnd())
    {
        try
        {
            auto stmt = expression(0);
            if (stmt)
            {
                statements.push_back(std::move(stmt));
            }
        }
        catch (const std::exception &e)
        {
            std::cerr << "Erro o parser: " << e.what() << '\n';
            break;
        }
    }
    return statements;
}

std::shared_ptr<ASTNode> Parser::expression(int rbp)
{
    const Token &t = advance();
    auto left = nud(t);
    while (!isAtEnd() && rbp < getPrecedence(peek().type))
    {
        const Token &opToken = advance();
        left = led(left, opToken);
    }
    return left;
}

const Token &Parser ::peek() const
{
    return tokens[pos];
}

bool Parser::isAtEnd()
{
    return pos >= tokens.size() || tokens[pos].type == TokenType::END_OF_FILE;
}

const Token &Parser::advance()
{
    return tokens[pos++];
}

std::shared_ptr<ASTNode> Parser::nud(const Token &token)
{
    switch (token.type)
    {
    case TokenType::NUMBER:
        return std::make_shared<NumberNode>(std::stod(token.lexeme), token.loc);
    case TokenType::STRING:
        return std::make_shared<StringNode>(token.lexeme, token.loc);
    case TokenType::IDENTIFIER:
        return std::make_shared<IdentifierNode>(token.lexeme, token.loc);

    default:
        std::cerr << "Token inválido no início da expressão: " << token.lexeme << std::endl;
        std::exit(1);
    }
    return nullptr;
}

std::shared_ptr<ASTNode> Parser::led(std::shared_ptr<ASTNode> left, const Token &token)
{
    switch (token.type)
    {
    case TokenType::PLUS:
    {
        int precedence = getPrecedence(token.type);
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("+", left, right, token.loc);
    }
    case TokenType::MINUS:
    {
        int precedence = getPrecedence(token.type);
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("-", left, right, token.loc);
    }
    default:
        std::cerr << "Token inválido no início da expressão: " << token.lexeme << std::endl;
        std::exit(1);
    }

    std::cerr << "Token inválido no meio da expressão: " << token.lexeme << std::endl;
    std::exit(1);
    return nullptr;
}

int Parser::getPrecedence(TokenType type)
{
    switch (type)
    {
    // Assignment operators (lowest precedence, right-associative)
    case TokenType::ASSIGN:
    case TokenType::PLUS_ASSIGN:
    case TokenType::MINUS_ASSIGN:
    case TokenType::STAR_ASSIGN:
    case TokenType::SLASH_ASSIGN:
    case TokenType::PERCENT_ASSIGN:
        return 1;

    // Logical operators
    case TokenType::OR:
        return 2;
    case TokenType::AND:
        return 3;

    // Equality operators
    case TokenType::EQUAL_EQUAL:
    case TokenType::BANG_EQUAL:
    case TokenType::NOT_EQUAL:
        return 7;

    // Relational operators
    case TokenType::LESS:
    case TokenType::LESS_EQUAL:
    case TokenType::GREATER:
    case TokenType::GREATER_EQUAL:
        return 8;

    // Bitwise operators
    case TokenType::AMPERSAND:
    case TokenType::PIPE:
    case TokenType::CARET:
        return 9;

    // Additive operators
    case TokenType::PLUS:
    case TokenType::MINUS:
        return 10;

    // Multiplicative operators
    case TokenType::STAR:
    case TokenType::SLASH:
    case TokenType::PERCENT:
        return 20;

    // Exponentiation operator
    case TokenType::POWERING:
        return 30;

    default:
        return 0;
    }
}
