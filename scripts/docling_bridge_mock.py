#!/usr/bin/env python3
"""
Mock Bridge Python para integração com Docling
Simula a conversão de documentos para demonstração
"""

import sys
import json
import argparse
import re
from pathlib import Path

def convert_document_mock(file_path: str, output_format: str = "markdown") -> dict:
    """
    Simula conversão de documento
    
    Args:
        file_path: Caminho para o arquivo
        output_format: Formato de saída (markdown, html, json)
        
    Returns:
        Dict com conteúdo processado e metadados
    """
    try:
        # Lê o arquivo
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # Simula processamento baseado no formato
        if output_format == "markdown":
            content = original_content  # Markdown permanece igual
        elif output_format == "html":
            # Converte markdown básico para HTML
            content = original_content.replace('# ', '<h1>').replace('\n', '</h1>\n', 1)
            content = content.replace('## ', '<h2>').replace('\n', '</h2>\n')
            content = content.replace('### ', '<h3>').replace('\n', '</h3>\n')
            content = content.replace('- ', '<li>').replace('\n', '</li>\n')
        else:
            content = json.dumps({"content": original_content})
        
        # Calcula metadados básicos
        lines = original_content.split('\n')
        word_count = len(original_content.split())
        
        # Extrai título (primeira linha com #)
        title = ""
        for line in lines:
            if line.strip().startswith('#'):
                title = line.strip('#').strip()
                break
        
        # Conta elementos estruturais
        headers = len([l for l in lines if l.strip().startswith('#')])
        lists = len([l for l in lines if l.strip().startswith(('-', '*', '+'))])
        todos = len(re.findall(r'TODO:|Action:|\[ \]', original_content))
        
        metadata = {
            "title": title or Path(file_path).stem,
            "page_count": max(1, len(lines) // 50),  # Estima páginas
            "tables_count": original_content.count('|'),  # Estima tabelas
            "images_count": original_content.count('!['),  # Conta imagens markdown
            "text_length": len(content),
            "word_count": word_count,
            "headers_count": headers,
            "lists_count": lists,
            "todos_count": todos,
            "source_file": file_path
        }
        
        return {
            "success": True,
            "content": content,
            "metadata": metadata,
            "format": output_format,
            "mock": True,
            "message": "Document processed using mock Docling (install real Docling for full functionality)"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "source_file": file_path
        }

def main():
    parser = argparse.ArgumentParser(description='Mock Docling Bridge para Task Flow PM')
    parser.add_argument('file_path', help='Caminho para o arquivo a ser convertido')
    parser.add_argument('--format', choices=['markdown', 'html', 'json'], 
                       default='markdown', help='Formato de saída')
    
    args = parser.parse_args()
    
    # Verifica se arquivo existe
    if not Path(args.file_path).exists():
        result = {
            "success": False,
            "error": f"File not found: {args.file_path}",
            "source_file": args.file_path
        }
    else:
        # Converte documento
        result = convert_document_mock(args.file_path, args.format)
    
    # Retorna JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main() 