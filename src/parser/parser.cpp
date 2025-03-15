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
    if (!left)
    {
        return nullptr;
    }

    while (!isAtEnd() && rbp < getPrecedence(peek().type))
    {
        const Token &opToken = advance();
        auto right = led(left, opToken);
        if (!right)
        {
            break;
        }
        left = right;
    }
    return left;
}

const Token &Parser ::peek() const
{
    return tokens[pos];
}

const Token &Parser::consume(TokenType t, std::string message)
{
    if (peek().type == t)
    {
        pos++;
        return tokens[pos - 2];
    }
    // ERR
    std::cerr << "Error: " + message + '\n';
    std::cerr << "Value: " + peek().lexeme + '\n';
    exit(-1);
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
    if (token.type == TokenType::END_OF_FILE)
    {
        return nullptr;
    }

    switch (token.type)
    {
    case TokenType::NUMBER:
        return std::make_shared<NumberNode>(std::stod(token.lexeme), token.loc);
    case TokenType::STRING:
        return std::make_shared<StringNode>(token.lexeme, token.loc);
    case TokenType::IDENTIFIER:
        return std::make_shared<IdentifierNode>(token.lexeme, token.loc);
    case TokenType::NEW:
        return parse_new_decl();
    default:
        throw std::runtime_error("Token inválido no início da expressão: " + token.lexeme);
    }
}

std::shared_ptr<ASTNode> Parser::led(std::shared_ptr<ASTNode> left, const Token &token)
{
    int precedence = getPrecedence(token.type);
    switch (token.type)
    {
    case TokenType::PLUS:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("+", left, right, token.loc);
    }
    case TokenType::MINUS:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("-", left, right, token.loc);
    }
    case TokenType::STAR:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("*", left, right, token.loc);
    }
    case TokenType::SLASH:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("/", left, right, token.loc);
    }
    case TokenType::PERCENT:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("%", left, right, token.loc);
    }
    case TokenType::POWERING:
    {
        // Right-associative: lower the precedence for the recursive call.
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("**", left, right, token.loc);
    }
    case TokenType::OR:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("or", left, right, token.loc);
    }
    case TokenType::AND:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("and", left, right, token.loc);
    }
    case TokenType::EQUAL_EQUAL:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("==", left, right, token.loc);
    }
    case TokenType::BANG_EQUAL:
    case TokenType::NOT_EQUAL:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("!=", left, right, token.loc);
    }
    case TokenType::LESS:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("<", left, right, token.loc);
    }
    case TokenType::LESS_EQUAL:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("<=", left, right, token.loc);
    }
    case TokenType::GREATER:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>(">", left, right, token.loc);
    }
    case TokenType::GREATER_EQUAL:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>(">=", left, right, token.loc);
    }
    case TokenType::AMPERSAND:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("&", left, right, token.loc);
    }
    case TokenType::PIPE:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("|", left, right, token.loc);
    }
    case TokenType::CARET:
    {
        auto right = expression(precedence);
        return std::make_shared<BinaryOpNode>("^", left, right, token.loc);
    }
    case TokenType::ASSIGN:
    {
        // Right-associative: lower the precedence for the recursive call.
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("=", left, right, token.loc);
    }
    case TokenType::PLUS_ASSIGN:
    {
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("+=", left, right, token.loc);
    }
    case TokenType::MINUS_ASSIGN:
    {
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("-=", left, right, token.loc);
    }
    case TokenType::STAR_ASSIGN:
    {
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("*=", left, right, token.loc);
    }
    case TokenType::SLASH_ASSIGN:
    {
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("/=", left, right, token.loc);
    }
    case TokenType::PERCENT_ASSIGN:
    {
        auto right = expression(precedence - 1);
        return std::make_shared<BinaryOpNode>("%=", left, right, token.loc);
    }
    default:
        std::cerr << "Token inválido no início da expressão: " << token.lexeme << std::endl;
        std::exit(1);
    }
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

std::shared_ptr<ASTNode> Parser::parse_new_decl()
{
    bool isMutable = false;
    std::cout << "Before new Token\n";
    std::cout << peek().lexeme + "\n";

    const Token &newToken = consume(TokenType::NEW, "Expected 'new'");

    std::cout << "After new Token\n";
    std::cout << peek().lexeme + "\n";

    if (peek().type == TokenType::MUT)
    {
        isMutable = true;
        consume(TokenType::MUT, "Expected 'mut'");
    }

    std::cout << "After mut Token\n";
    std::cout << peek().lexeme + "\n";

    const Token &varName = consume(TokenType::IDENTIFIER, "Expected identifier for variable name");

    std::cout << "After varname\n";
    std::cout << peek().lexeme + "\n";

    consume(TokenType::COLON, "Expected ':' after variable name");

    std::cout << "After ':'\n";
    std::cout << peek().lexeme + "\n";

    const Token &typeToken = consume(TokenType::IDENTIFIER, "Expected type after ':'");

    std::cout << "After typeToken\n";
    std::cout << peek().lexeme + "\n";

    consume(TokenType::EQUAL, "Expected '=' after type");

    std::cout << "After '='\n";
    std::cout << peek().lexeme + "\n";

    auto value = expression(0); // Passar 0 como precedência inicial
    if (!value)
    {
        throw std::runtime_error("Expected expression after '='");
    }

    return std::make_shared<VarDeclarationNode>(varName, std::move(value), isMutable, newToken.loc);
}
