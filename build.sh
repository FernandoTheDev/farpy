if [ ! -d "bin" ]; then
    mkdir bin
    echo "Bin dir created."
fi

if [ -e "bin/farpy" ]; then
    rm -f bin/farpy
    echo "Binary excluded."
fi

g++ farpy.cpp ./src/lexer/lexer.cpp ./src/parser/parser.cpp ./src/error/error.cpp -o bin/farpy -O3
echo "Compiled."
